# Prompt para o Codex Desktop

Copie o texto abaixo em uma conversa do Codex Desktop com o projeto aberto.

---

Trabalhe no projeto `D:\Projects\link-hcestetica`. Leia `AUDITORIA.md`, principalmente “Implementação desta revisão”, e valide as mudanças no navegador, do começo ao fim. Corrija os defeitos que encontrar no escopo dessas mudanças, preservando as alterações existentes e a identidade visual da HC. Não publique um deploy.

O servidor de validação foi iniciado em:

- Site: http://127.0.0.1:5173/
- Painel: http://127.0.0.1:5173/painel/

Confirme primeiro que `GET /api/sessao` retorna `local: true` e que aparece o aviso de ambiente local. Se o servidor estiver parado, execute `npm run local` em `D:\Projects\link-hcestetica` e aguarde o anúncio da porta. Se precisar reiniciar após editar backend, reinicie somente esse servidor. A senha do painel está na variável `PAINEL_SENHA` do `.env.local`; use-a para o login local sem exibi-la no relatório nem copiar outras credenciais.

O comando `npm run local` força base local em `.local/validacao.json` e ignora `DATABASE_URL`. Os registros dessa base são descartáveis e autorizo criar, editar, concluir, cancelar, excluir e anonimizar esses dados de teste durante a validação, incluindo as confirmações desses fluxos. Não execute `npm run banco`, não conecte ao Neon e não altere a produção. Não mande mensagens reais no WhatsApp; valide somente a abertura e o texto preparado.

Há fixtures com o nome “teste”/“local”: serviço com descrição em três linhas e preço com centavos, cliente com dois carros, retorno vencido, atendimento antigo para revisão e lista de espera. Elas são criadas uma vez por `scripts/preparar-local.mjs`.

Valide em desktop de 1440px e celular de 390px, incluindo 320px e 200% de zoom quando possível. Use teclado para chegar às ações principais. Capture screenshots relevantes e registre erros de console/rede; diga exatamente quais verificações dependem de toque físico ou leitor de tela e ficaram pendentes.

1. **Serviços:** abrir, editar, criar e reordenar; alternar rapidamente entre Início, Retornos, Serviços e Ajustes, inclusive com rede lenta. Não deve aparecer o erro “Cannot set properties of null”. Confirme que não existe campo de duração nem texto de duração em nenhuma tela. A descrição deve aceitar pelo menos seis linhas, expandir sem cortar e mostrar cada item em sua própria linha no serviço selecionado, sem hífen duplicado. Teste uma linha longa, acentos e caracteres como `<`, `>` e aspas. Verifique preço R$ 40,50 e “a partir de”. Exclua um serviço novo sem vínculos; confirme que excluir serviço com histórico é bloqueado com explicação útil.
2. **Reserva pública:** selecione serviço, dia e preencha nome/WhatsApp/carro; valide erros e foco. Confirme e salve o link de gestão exibido. Reenvio/retry da mesma tentativa não pode duplicar a reserva. Verifique que nome informado em uma nova reserva não altera o cadastro anterior de mesmo WhatsApp. Teste lembrar dados apenas com a opção marcada e limpar o armazenamento. Não deve haver duração ou término estimado.
3. **Agenda por dia:** ajuste limite para 1 e reserve uma vaga num dia livre. A segunda reserva normal deve ser recusada nesse dia. O encaixe deve ser explícito. Restaure a configuração após o teste. Feche o link online e confirme que o painel continua criando reservas normais em dias disponíveis. O horário escolhido no painel precisa ser exatamente o gravado. Teste pausas, folgas, antecedência e chegada de hoje sem horário passado. Ao marcar folga sobre um compromisso, ele deve continuar visível na agenda.
4. **Remarcação e cancelados:** use Editar/remarcar no menu de uma reserva e altere data, chegada, serviço e observações. A identidade e o histórico da reserva devem ser preservados, com revalidação de vaga. Cancele e encontre o registro na seção “Cancelados”. Tente reabrir em um dia lotado e confirme que não ultrapassa o limite silenciosamente.
5. **Retornos e atendimento:** conclua dois carros do mesmo cliente/mesmo serviço e confirme retornos independentes. Abrir WhatsApp não deve tirar o cliente da fila; “Marcar como enviado” deve fazê-lo. Teste adiar, descartar e desfazer. Reagende por convite e cancele o novo atendimento; o retorno deve voltar à fila. Corrija um concluído para falta e confirme que o retorno gerado deixa de ser acionável. Abrir as telas não pode concluir atendimentos antigos; eles devem estar em “Para revisar”. Verifique Confirmado, Recebido, Em serviço, Pronto e Concluído.
6. **Cliente e veículo:** pelo Início acesse Clientes e veículos, abra a ficha, confira histórico por carro, edite contato e agende selecionando um dos veículos. Teste busca e paginação se houver mais de 50 clientes. Anonimize somente um cliente descartável sem atendimentos abertos; confira remoção de nome, telefone, placa, notas e links de acesso, mantendo estatísticas anônimas.
7. **Gestão pelo cliente:** abra o link seguro da confirmação em uma aba sem sessão do painel. Consulte, remarque para dia disponível e cancele. Código curto da reserva não pode servir de autorização. Teste token inválido e tentativa fora do prazo. Não exponha tokens nas screenshots do relatório.
8. **Operação:** pelo Início abra Operação e exportação, filtre um período, confira contagens e valor dos serviços concluídos, sem tratá-lo como dinheiro recebido. Cadastre e resolva uma entrada da lista de espera. Confira o registro de alterações. Baixe a exportação e confirme que não contém tokens de reserva, fingerprints, sessões ou credenciais. Não envie o arquivo a nenhum serviço externo.
9. **Ajustes e falhas:** salve regras e folgas; não deve haver erro depois de salvar. Teste horário invertido, pausa inválida, número fora do limite e URL inválida. Simule queda de rede para confirmar mensagens claras, retry e preservação dos dados digitados. Saia do painel e confirme que a sessão anterior deixou de autorizar a API.
10. **Interface:** verifique overflow horizontal, sobreposição da navegação inferior, contraste dos textos e botões, foco visível, abas de retornos com setas/Home/End, mensagens ARIA de formulário e movimento reduzido. Corrija problemas observados, sem mudar marca, preços ou intervalos comerciais reais.

Execute `npm test` e, com o servidor atualizado, `node --env-file-if-exists=.env.local scripts/validar-local.mjs`. Esse último exige `local: true` antes de criar dados e deixa uma reserva HTTP cancelada como evidência descartável. Reinicie o servidor após mudanças de backend antes de repetir os testes.

Registre o resultado em `VALIDACAO-RESULTADOS.md`: verificações aprovadas, defeitos corrigidos, evidências/screenshots e pendências. Não declare validada a produção: a migração aditiva em `db/schema.sql` ainda precisa ser executada e testada em PostgreSQL de homologação antes de qualquer publicação. Testes de volume, restauração de backup do provedor, dispositivo físico e revisão de preços/ciclos dependem de etapas próprias.

Ao terminar, deixe o servidor local rodando e informe as URLs, o resultado dos testes e qualquer pendência real.

---

## Comandos de referência

```powershell
Set-Location D:\Projects\link-hcestetica
npm run local
```

Em outro terminal:

```powershell
npm test
node --env-file-if-exists=.env.local scripts/validar-local.mjs
```

`npm run dev` e `npm start` mantêm o modo PostgreSQL normal. Para esta revisão use **`npm run local`**.
