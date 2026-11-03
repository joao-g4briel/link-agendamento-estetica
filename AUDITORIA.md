# Auditoria — HC Estética Automotiva

Data: 31/10/2026. Escopo: site público, painel e regras do projeto.

## Implementação desta revisão

As correções abaixo foram implementadas no código local. A descrição original dos achados foi mantida como referência; a tabela registra o estado atual.

| Itens | Estado atual |
|---|---|
| 1–3 | Agenda por dia; duração removida das telas, APIs e novas gravações; limite diário compartilhado; chegada do painel preservada; fechamento online não bloqueia o painel. Migração aditiva do PostgreSQL preparada. |
| 4–5 | Formulários capturam referência antes de aguardar a API, tratam falhas e bloqueiam envio repetido. Folgas não escondem atendimentos. Cancelados aparecem em seção própria. |
| 6–7 | Identidade de veículo e retornos separados por carro; cancelamento de reagendamento recupera a fila; correção de conclusão descarta retornos gerados. Migração identifica veículos antigos por placa; sem placa, não faz fusão por nome. |
| 8 | WhatsApp abre a conversa; um botão separado registra que o operador confirmou o envio. |
| 9–11 | Idempotência com índice único preparado; cadastro existente não é sobrescrito por reserva pública; validação de datas reais, valores finitos, limites, horários, pausas e URLs no servidor. |
| 12–13 | Consultas não concluem atendimentos; fila “Para revisar”. Telas têm DOM independente, descarte de respostas antigas, retry de horários e atualização ao retornar à aba/periodicamente. |
| 14–15 | Centavos preservados; texto de funcionamento considera abertura, pausa, folga e fuso da estética. |
| 16 | Limites persistentes de requisições para login, reservas e gestão; sessão individual revogável no logout; verificação de origem para mutações. Sem teste de carga em produção. |
| 17 | GETs usam transação somente leitura, sem trava exclusiva. Perfil público evita dados privados; Serviços e Ajustes carregam apenas suas tabelas; ficha individual é filtrada por cliente; lista de clientes tem páginas de 50, filtro e paginação no SQL. O painel de operação/exportação ainda precisa ler seu conjunto completo; medir performance com volume real após validar a migração. |
| 18 | Referências ARIA de erro são limpas; abas têm foco móvel e Home/End; ações de listas usam alvo mínimo de 44px. Contraste, teclado, zoom e toque aguardam validação no Desktop. |
| 19 | Duração removida; descrição de até 2.000 caracteres, textarea com expansão e itens em linhas separadas no site. Revisão de preços/ciclos reais continua com o dono. |

Também foram implementados edição/remarcação, ficha e histórico por veículo, confirmação do dia seguinte, estados de atendimento, anonimização de dados pessoais, link seguro de gestão da reserva, lista de espera, registro de alterações, exportação JSON e relatório por período. Pagamentos, fotos próprias e restauração de backups do provedor permanecem como etapas futuras; não foram criados materiais ou regras comerciais sem informação do dono.

**Evidências:** `npm test` passou com 24 testes. `node --env-file-if-exists=.env.local scripts/validar-local.mjs` verificou o fluxo por HTTP com a base local isolada. A inspeção visual e a migração em PostgreSQL ainda não foram executadas. Nenhum deploy nem migração no banco de produção foi feito.

**Validação local:** `npm run local` serve o site em `http://127.0.0.1:5173/` e o painel em `http://127.0.0.1:5173/painel/`. Dados de teste ficam em `.local/validacao.json`, ignorado pelo Git. Esse modo não usa `DATABASE_URL`. O roteiro completo está em [VALIDACAO-DESKTOP.md](VALIDACAO-DESKTOP.md).

O sistema já tem uma base útil, mas a confiabilidade da agenda e dos retornos precisa vir antes de novas funcionalidades. Foram identificados **19 grupos de problemas: 11 P1 e 8 P2**. Nenhum P0 foi comprovado neste recorte.

P1 = corrigir antes de ampliar o uso; P2 = próxima rodada. Melhorias de produto aparecem separadas dos defeitos.

## Exigências atualizadas do cliente

- **Remover a duração dos serviços.** Este cliente agenda por dia e não precisa cadastrar tempo de execução, mostrar “2h de serviço” ou calcular o fim de cada atendimento.
- **Controlar disponibilidade por dia:** funcionamento, folgas, limite de carros e antecedência para chegada. A duração e a ocupação por tempo de cada box deixam de ser critérios de disponibilidade deste projeto.
- **Melhorar o campo de descrição no painel e sua apresentação no site.** Cada item incluído deve poder ser escrito em uma linha e aparecer um embaixo do outro, como no exemplo solicitado para Lavagem Simples.
- Manter nome, preço e opção “a partir de”. O intervalo de retorno continua sendo uma configuração independente; ele indica quando o cliente deve voltar, não a duração do atendimento.

Estas exigências substituem as recomendações anteriores que pediam cálculo por duração/box. A seção de implementação acima registra as mudanças já realizadas.

## O que foi realmente verificado

- Produção: [site público](https://hcestetica.vercel.app/), [painel](https://hcestetica.vercel.app/painel), perfil público, disponibilidade, login, ajustes, serviços e horários do painel via HTTP/API.
- Login válido confirmado. API de ajustes sem sessão respondeu **401**.
- HTML das duas páginas e JavaScript de agendamento, ajustes e ações compartilhadas publicados coincidem com os arquivos locais consultados.
- Produção usa 2 boxes, limite de 4 carros/dia, antecedência de 120 minutos, horizonte de 30 dias e conclusão automática ativada. Há 3 serviços públicos ativos.
- Na auditoria original, foram reproduzidos 13 cenários com funções reais do projeto e dados fictícios em memória: `node scripts/auditoria.mjs`. O script é um registro do comportamento anterior. Casos que cobram duração ou ocupação simultânea deixam de representar defeitos segundo as exigências atualizadas; revisar esses asserts ao implementar a agenda por dia.
- Não foram criados, cancelados ou concluídos agendamentos reais. Rotas GET que executam conclusão automática não foram chamadas nesta auditoria.
- **Limite:** o navegador estava indisponível. Não houve navegação visual, screenshots, medição de Core Web Vitals, validação de teclado, leitor de tela, layout em diferentes larguras ou teste físico de toque. A auditoria técnica não substitui esses testes.
- Há uma alteração anterior do usuário em `public/assets/css/painel.css`; ela foi preservada.

## Correções prioritárias

### 1. [P1] O painel grava horário diferente do escolhido

**Local:** `server/regras.js`, `createBooking`; `public/assets/js/painel/novo.js`.

O painel oferece horários como 14:00. Sem marcar encaixe, o servidor passa pela regra do link e substitui o horário pela abertura, 08:00. Reprodução isolada confirmada. A API publicada oferece esses horários intermediários.

**Impacto:** confirmação errada, sobreposição e desencontro com o cliente.

**Correção:** separar o horário de chegada do tempo de execução do serviço. Quando o painel permitir escolher uma hora de chegada, preservar o valor escolhido e validá-lo contra funcionamento, pausa e antecedência, sem calcular duração ou término. Usar a mesma regra de limite diário no painel e no link; encaixe deve ser uma exceção explícita.

### 2. [P1] Remover duração e unificar a agenda por dia

**Local:** cadastro de serviços, site público, resumo e confirmação, agenda do painel, `server/regras.js`, `public/assets/js/core/availability.js` e persistência dos agendamentos.

A duração ainda aparece como “2h de serviço”, é exigida no cadastro e alimenta horários de término e indicadores de ocupação do painel. Esses elementos não são necessários para este cliente. Reservar vários carros para o mesmo dia passa a ser válido até o limite diário definido, sem exigir cálculo de ocupação simultânea dos boxes.

**Correção e critérios de aceite:**

- Retirar o campo “Duração” do cadastro e da edição de serviço.
- Retirar “2h de serviço”, “leva X horas”, “até HH:MM” e equivalentes das telas públicas e do painel.
- Remover a obrigatoriedade de duração nas APIs e no banco, com migração compatível com os registros existentes.
- Substituir cálculos e barras de ocupação por tempo pela contagem de carros do dia em relação ao limite configurado.
- Usar funcionamento, pausas de chegada, folgas, antecedência e limite diário como regras de reserva; não exigir que um serviço “caiba” no expediente.
- Para reservas feitas hoje, mostrar uma orientação de chegada válida a partir do momento permitido, sem apresentar a abertura já passada como se fosse um horário futuro.
- Preservar o histórico existente durante a migração, sem pedir ao operador que preencha durações fictícias.

### 3. [P1] Fechar o link também bloqueia o painel

**Local:** `server/regras.js`, `createBooking`; texto de Ajustes.

A interface informa que o dono continua agendando quando fecha a agenda online. O servidor devolve `CLOSED` para o agendamento normal do painel. Só o encaixe ignora a condição.

**Correção:** aplicar `bookingOpen` às reservas públicas; preservar validação de disponibilidade no painel.

### 4. [P1] Formulários podem salvar e falhar depois do salvamento

**Local:** `public/assets/js/painel/ajustes.js:267` e `:281`.

Regras da agenda acessam `event.currentTarget.querySelector` depois de `await`; folgas acessam `event.currentTarget.reset` depois de duas esperas. `currentTarget` já está nulo quando o evento terminou. A gravação pode acontecer antes do erro, deixando o dono sem confirmação e incentivando nova tentativa. A nulidade foi reproduzida com EventTarget.

**Correção:** capturar o formulário antes da primeira espera, tratar erros e bloquear o botão enquanto salva.

### 5. [P1] Folgas podem esconder compromissos existentes na agenda semanal

**Local:** `public/assets/js/painel/agenda.js`, `dayBlock`.

Quando existe folga ou o dia está fechado, `status` ganha uma mensagem e a expressão `status || lista` deixa de renderizar os agendamentos. A criação de folga avisa a quantidade afetada, mas a semana pode ocultar justamente os carros que precisam ser remarcados.

**Correção:** mostrar o aviso junto com todos os compromissos existentes, destacando conflitos e oferecendo remarcação.

### 6. [P1] Retornos de veículos diferentes se misturam

**Local:** `server/regras.js`, `createBooking` e `plantReturn`.

O vínculo usa cliente + serviço, sem veículo. Agendar o carro B pode marcar o retorno do carro A como reagendado. Concluir dois carros pode descartar o retorno anterior. Reprodução isolada confirmada.

**Correção:** criar identidade própria de veículo, vinculada ao cliente; associar agendamento e retorno a esse veículo. Tratar veículos sem placa sem fundi-los automaticamente.

### 7. [P1] Cancelamento e correção não reconciliam retornos

**Local:** `server/regras.js`, `setAppointmentStatus`.

Cancelar um agendamento de retorno deixa o retorno como `reagendado`. Corrigir conclusão para “não veio” remove somente retornos pendentes, mantendo os que já foram avisados. Ambos reproduzidos.

**Correção:** definir transições de estado para agendamento e retorno juntos; recuperar a fila quando o reagendamento for cancelado e invalidar retornos originados de atendimento que não ocorreu. Preservar histórico dessas decisões.

### 8. [P2] Abrir WhatsApp é tratado como mensagem enviada

**Local:** `public/assets/js/painel/ui.js`, `bindReturnActions`.

O clique em “Avisar” abre o WhatsApp e já marca o retorno como avisado, mesmo que a pessoa feche a janela sem enviar.

**Correção:** distinguir “mensagem aberta” de “envio confirmado pelo operador”. Usar um botão “Marcar como enviado” após a ação. Sem integração de envio, o sistema não tem como confirmar entrega automaticamente.

### 9. [P1] Repetir requisição cria reserva duplicada

**Local:** `server/regras.js`, `createBooking`; banco sem chave de idempotência.

O botão público bloqueia cliques enquanto espera, mas uma resposta perdida seguida de nova tentativa pode criar outro registro. Duas chamadas idênticas geram duas reservas no teste isolado.

**Correção:** chave de idempotência por tentativa, validada no servidor com unicidade no banco. Recuperar a confirmação original no retry.

### 10. [P1] Telefone informado permite sobrescrever nome cadastrado

**Local:** `server/regras.js`, `upsertCustomer`.

Uma nova reserva pública com um telefone existente altera o nome do cadastro compartilhado, sem verificar identidade. Isso pode alterar a identificação exibida em agendamentos anteriores. Reprodução isolada confirmada.

**Correção:** preservar o cadastro existente em reservas públicas e guardar os dados informados na própria reserva. Permitir atualização controlada pelo painel ou por um fluxo de verificação do cliente.

### 11. [P1] Validação de configurações é insuficiente no servidor

**Local:** `server/regras.js`, `saveSettings`, `saveService` e validação de datas.

O formulário valida parte dos horários, mas o servidor aceita um funcionamento com abertura 18:00 e fechamento 08:00. Limite diário, antecedência, horizonte e estrutura de horários precisam de validação equivalente no backend. Data é validada apenas por regex, sem garantir existência no calendário. Valores monetários também precisam ser finitos e ter limites.

**Correção:** esquema central de validação no servidor; inteiros e limites para números; datas reais; horários e pausas consistentes; URLs e tipos válidos. O navegador deve ajudar a preencher, enquanto o servidor garante a integridade.

### 12. [P2] Conclusão automática presume atendimento e altera dados em GET

**Local:** `server/regras.js`, `autoComplete`, `getHome`, `getAgenda`, busca, clientes e retornos.

Está ativada em produção. Um agendamento de dia passado vira concluído ao consultar certas telas, sem comprovação de presença. Isso cria retornos e aumenta visitas, inclusive para faltas ainda não registradas. A automação depende da leitura de uma tela.

**Correção:** preferir uma fila “Atendimentos para revisar”. Se a conclusão automática for mantida, explicitar a regra, registrar a origem e permitir corrigir todos os efeitos. Separar consultas de mudanças de estado.

### 13. [P2] Falhas de rede e respostas atrasadas têm tratamento desigual

**Local:** `public/assets/js/painel/novo.js`, `app.js`, `ajustes.js` e `ui.js`.

Várias ações assíncronas não têm `catch`. O carregamento de horários do painel não descarta respostas antigas quando o usuário troca rapidamente data ou serviço. A navegação também não invalida renders anteriores. A agenda semanal não tem atualização periódica como o Início; reservas públicas novas podem exigir reabrir a tela.

**Correção:** capturar erros por ação, preservar campos, oferecer retry e impedir envio duplicado; usar contador de requisição ou AbortController; atualizar ao retornar à aba e periodicamente nas telas operacionais.

### 14. [P2] Preços com centavos são arredondados na exibição

**Local:** `public/assets/js/core/format.js`, `formatPrice`.

`maximumFractionDigits: 0` faz R$ 40,50 aparecer como R$ 41. Reprodução confirmada. Os preços públicos atuais são inteiros, então este defeito aparece ao cadastrar um preço fracionário.

**Correção:** preservar duas casas quando existirem centavos e manter o mesmo valor em tabela, resumo e confirmação.

### 15. [P2] Mensagens de funcionamento não representam pausa e folga

**Local:** `public/assets/js/booking.js`, `openingLine` e `hoursBoard`.

Antes de abrir e durante a pausa, a indicação pode dizer “Aberto hoje”. A tabela não apresenta o intervalo de almoço. Folgas não entram no cálculo do texto do cabeçalho. O navegador usa seu próprio fuso para “hoje”, enquanto o servidor decide em São Paulo.

**Correção:** estados claros “abre às”, “em pausa”, “fechado hoje”, com próxima abertura real. Usar referência de data/hora da estética de forma consistente.

### 16. [P1] Falta proteção de abuso na aplicação

**Local:** `server/app.mjs`, `login` e POST público de agendamentos.

O login usa atraso fixo de 600ms para senha incorreta, mas não há limite de tentativas no código. A criação pública também não limita requisições por origem. Tentativas paralelas ou reservas automatizadas podem afetar acesso e agenda. Regras externas de firewall da Vercel não foram inspecionadas; não foi feito teste de carga ou força bruta.

**Correção:** limites persistentes apropriados a serverless, monitoramento e bloqueio de abuso, sem depender de memória local da função. A sessão assinada dura 30 dias e não tem revogação individual; adicionar controle de sessões conforme a necessidade de uso em aparelhos compartilhados.

### 17. [P2] Cada consulta carrega e trava o banco inteiro da estética

**Local:** `server/banco.js`, `withDb` e `load`.

Inclusive consultas públicas obtêm uma trava exclusiva e fazem `select *` em todas as tabelas, com clientes, agendamentos e retornos. Isso reduz concorrência e cresce com o histórico. A trava é positiva para evitar corrida de gravação, mas desnecessária para todas as leituras.

**Correção:** consultas específicas, paginação e filtros SQL; manter transação e proteção de concorrência na reserva. Só medir ganho de performance depois de mudar o acesso aos dados; não foram medidas latências percentis nesta rodada.

### 18. [P2] Acessibilidade precisa de validação renderizada

**Local:** `public/assets/js/painel/ui.js`, `showFieldErrors`; CSS e abas de retornos.

Ao limpar erros, o painel remove a mensagem, mas mantém `aria-describedby` apontando para o elemento removido. Alguns controles têm 32–38px de altura, abaixo da meta de 44px do projeto; isso isoladamente não comprova violação de WCAG AA, pois espaçamento e exceções importam. As abas usam setas, mas não implementam uma navegação de foco completa do padrão de tabs.

**Correção:** limpar referências ARIA, completar comportamento de abas e verificar foco, contraste, zoom, teclado e toque em telas reais.

O detector automático apontou contraste 1,6:1 no painel e vários avisos de tokens. O contraste deve ser confirmado no estado exato antes de ser classificado como falha comprovada. Parte dos avisos é ruído: tamanhos como 0,9375rem e cores de gradientes constam no DESIGN.md; as hachuras têm função documentada. Não aplicar os alertas cegamente.

### 19. [P2] Descrição precisa aceitar e mostrar um item por linha

**Local:** `public/assets/js/painel/servicos.js`, campo de descrição; `server/regras.js`, `saveService`; `public/assets/js/booking.js`, `renderServices`; `public/assets/css/muro.css`, `.servico__desc`.

A referência enviada mostra “Lavagem externa - Aspiração interna” na mesma linha. O cliente quer cada item incluído separado verticalmente. Hoje o painel usa um textarea de 3 linhas e limite de 200 caracteres, e a exibição pública não preserva as quebras como lista. Isso dificulta cadastrar e ler serviços com vários itens.

**Correção e critérios de aceite:**

- No painel, usar um campo de descrição multilinha mais alto, com altura inicial para pelo menos 6 itens, expansão conforme o conteúdo e instrução “Escreva um item por linha”.
- Ampliar o limite atual de 200 caracteres de forma consistente no formulário e no servidor, para não cortar silenciosamente descrições completas.
- Salvar as quebras de linha e renderizar cada linha não vazia como um item de lista no site. Aceitar os hífens já cadastrados sem duplicar marcadores.
- Permitir que um item longo quebre dentro da largura do cartão, com espaçamento legível e sem deslocar nome ou preço, inclusive no celular.
- Manter a descrição legível quando o serviço estiver selecionado, preservando as cores e a identidade atuais.
- Não exibir a duração acima da descrição.

**Resultado esperado para Lavagem Simples:**

```text
LAVAGEM SIMPLES                 A PARTIR DE R$ 40

• Lavagem externa
• Aspiração interna
```

**Revisão complementar de conteúdo:** “Lavagem Completa” está com retorno em 6 meses; os outros dois serviços públicos estão sem retorno. Validar os intervalos com o dono. Há serviços inativos com nomes e descrições divergentes: “Selante nos pneus” tem descrição de bancos de couro; revisar antes de publicar. Revisar escopo, preço e retorno sem alterar valores ou ciclos automaticamente.

## O que falta para ser um sistema melhor

| Prioridade | Entrega | Benefício e critério de conclusão |
|---|---|---|
| Alta | Serviços sem duração | Cadastro, API, disponibilidade e telas funcionam sem tempo de execução; agenda usa limite de carros por dia. |
| Alta | Descrição com um item por linha | Campo amplo no painel, quebras preservadas e lista vertical no site, sem corte de conteúdo ou transbordamento no celular. |
| Alta | Editar e remarcar uma reserva pelo painel | Alterar dia, horário, serviço, veículo e observações sem cancelar e recadastrar; revalidar vaga e preservar histórico. |
| Alta | Ficha do cliente e de cada veículo | Editar contato, ver histórico completo, próximos agendamentos e retornos por carro. A API já monta parte do histórico, mas a tela de clientes não o expõe. |
| Alta | Recuperar reservas canceladas | Lista ou filtro de cancelados, motivo e possibilidade de restauração com nova validação de capacidade. Hoje cancelados desaparecem da agenda principal. |
| Alta | Acompanhamento antes do atendimento | Fila “confirmar amanhã”, status de confirmação e ação WhatsApp; estado de envio confirmado pelo operador. |
| Alta | Revisar atendimento do dia | Diferenciar agendado, confirmado, recebido, em serviço, pronto, entregue e falta, conforme a operação realmente precisar. Conclusão deve refletir serviço feito. |
| Alta | Privacidade e controle dos dados | Explicar uso de telefone, placa e histórico; opção de não lembrar dados no dispositivo e de limpar o preenchimento salvo; fluxo no painel para pedidos de correção e remoção. |
| Média | Link seguro para consultar/remarcar/cancelar | Cliente acessa sua reserva por token próprio e prazo configurado; não usar apenas código curto como autorização. Hoje a orientação é falar no WhatsApp. |
| Média | Exportação e recuperação | Exportar clientes/agenda e verificar restauração dos backups do banco. A existência de backups contratados não foi avaliada. |
| Média | Registro de alterações | Guardar quem/quando alterou status, preço, configuração e remarcação; facilitar correção de enganos. |
| Média | Lista de espera | Aproveitar cancelamentos para oferecer vaga a quem aguarda, com contato controlado pelo operador. |
| Média | Relatório operacional simples | Atendimentos feitos, faltas, cancelamentos e retorno de clientes por período; corrigir estados antes de confiar nas métricas. |
| Depois | Pagamentos e sinal | Avaliar somente após regras de reserva, cancelamento e acompanhamento estarem confiáveis. |
| Depois | Fotos próprias e dúvidas frequentes | Explicar diferença entre lavagens, tamanho do veículo, variação do “a partir de” e tempo de entrega. Usar material real autorizado. |

## Pontos positivos a preservar

- Fluxo público curto, sem cadastro obrigatório.
- Identidade visual específica da marca, fontes locais e imagens WebP.
- Valores em centavos e preço guardado no agendamento.
- API protegida por sessão, cookie HttpOnly/SameSite e comparação de senha em tempo constante.
- HTML dinâmico normalmente usa helper que escapa dados.
- Transação e trava no banco oferecem uma base para evitar conflitos de gravação.
- Folgas, limite diário, serviços inativos e fila de retorno já existem.
- Labels nos formulários, foco visível no CSS e alternativas de movimento reduzido estão previstos.

## Avaliação técnica parcial

| Dimensão | Nota provisória | Evidência e limite |
|---|---|---|
| Acessibilidade | 2/4 | Há estrutura acessível, com gaps de ARIA; contraste e uso real pendentes. |
| Performance | 3/4 | Frontend pequeno e recursos locais; leitura integral do banco é o principal risco técnico. Não mede velocidade percebida. |
| Consistência visual | 3/4 | Tokens e identidade documentados; detector tem falsos positivos e a inspeção visual não ocorreu. |
| Responsividade | Não avaliada | Breakpoints e ajustes mobile existem no CSS, mas não comprovam funcionamento em tela/toque. |
| Integridade da implementação | 2/4 | Sistema visual coerente; textos e regras operacionais divergem, especialmente sobre disponibilidade. |

Não há nota global /20: atribuí-la sem verificar a interface renderizada passaria uma confiança que esta rodada não oferece.

## Ordem de execução recomendada

1. Implementar as exigências do cliente: remover duração em todo o fluxo e adotar limite de carros por dia (item 2); ampliar a descrição e mostrar um item por linha (item 19).
2. Corrigir regras e transições: itens 1, 3–7, 9–11 e 16; atualizar os testes para a agenda por dia e adicionar regressões dos defeitos que continuam aplicáveis.
3. Aplicar **`$impeccable harden`** às ações do painel: erros, estado de envio, respostas atrasadas e formulários; resolver itens 8, 12–15.
4. Entregar remarcação e ficha por veículo; depois acompanhamento de confirmação e exportação.
5. Rodar **`$impeccable adapt`** e **`$impeccable audit`** com navegador funcional em celular e desktop, teclado, zoom e toque; confirmar o item 18 e medir performance real.
6. Aplicar **`$impeccable clarify`** ao catálogo e às mensagens de funcionamento.
7. Finalizar com **`$impeccable polish`**, preservando a identidade existente.

Esta ordem pertence ao diagnóstico original. Consulte a seção de implementação no início do documento para saber o que já foi feito. Repetir a auditoria visual no Desktop e validar a migração em uma base de homologação antes de publicar.
