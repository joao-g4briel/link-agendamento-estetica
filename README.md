# Revisão da auditoria: validação local

Use `npm run local` para validar as alterações sem acessar o banco de produção. O site fica em `http://127.0.0.1:5173/` e o painel em `http://127.0.0.1:5173/painel/`. A senha vem de `PAINEL_SENHA` no `.env.local`. Esse comando força armazenamento local em `.local/validacao.json` e prepara dados fictícios descartáveis.

Execute `npm test` para os testes de regressão. Com o servidor rodando, `node --env-file-if-exists=.env.local scripts/validar-local.mjs` valida o fluxo por HTTP. O roteiro visual e o prompt para o Codex Desktop estão em [VALIDACAO-DESKTOP.md](VALIDACAO-DESKTOP.md).

Antes de publicar esta revisão, execute e valide a migração aditiva de `db/schema.sql` em PostgreSQL de homologação. A migração torna a duração opcional, cria identidade por veículo, idempotência, tokens de gestão, eventos, espera e armazenamento de sessões/limites. Somente depois de validá-la planeje a aplicação no banco de produção. Nenhuma migração remota foi executada nesta revisão.

As instruções anteriores abaixo descrevem a base original; para os fluxos atuais consulte também “Implementação desta revisão” em [AUDITORIA.md](AUDITORIA.md).


# HC Estética Automotiva — link de agendamento

Link para a bio do Instagram da **HC Estética Automotiva** (Rua Irajá, 236 · Cidade Tabajara, Olinda-PE · WhatsApp (81) 99675-0258 · @hc.esteticar): o cliente escolhe o serviço e o dia (sem escolher horário: traz o carro a partir da abertura) e o agendamento cai direto na agenda. Quando o serviço é concluído, o sistema marca quando aquele carro deve voltar (renovar a vitrificação, nova higienização) e, no dia, coloca o cliente na fila de retornos do painel com a mensagem de WhatsApp pronta.

## Rodar no computador

Precisa do Node 22 ou mais novo.

1. `npm install`
2. Crie um arquivo `.env.local` na raiz (ele é ignorado pelo git; nunca suba esse arquivo):

   ```
   DATABASE_URL=postgresql://...   (string de conexão do Neon)
   PAINEL_SENHA=uma-senha-forte
   ```
3. `npm run banco` cria as tabelas no Neon e coloca a configuração inicial (só se o banco estiver vazio).
4. `npm start`

- Link público: http://localhost:5173/
- Painel (pede a senha): http://localhost:5173/painel/

## O que tem

**Link público** (`public/index.html`)
- Tabela de serviços com tempo, preço e de quanto em quanto tempo refazer.
- Agendamento por dia: o cliente vê só os dias com vaga (com quantas vagas restam) e traz o carro a partir da abertura. O dia lota no limite de carros por dia; dias fechados, folgas e a antecedência mínima também contam.
- Ficha curta (nome, WhatsApp, carro, placa) e confirmação com "salvar na agenda", "como chegar" e a data do próximo retorno.
- Link de retorno (`/?retorno=<código>`): abre com o serviço já escolhido e os dados do cliente preenchidos.

**Painel** (`public/painel/`)
- **Início:** busca por placa, nome, carro ou WhatsApp; quadro do dia por vaga; carros de hoje com "Concluir"; retornos que vencem hoje.
- **Agenda:** semana a semana, com concluir, "não veio", cancelar e voltar atrás.
- **Retornos:** atrasados, de hoje e dos próximos 30 dias, cada um com o botão de WhatsApp que abre a mensagem pronta. Avisados, quem voltou e quem fica para mais adiante.
- **Serviços:** nome, descrição, duração, preço, ciclo de retorno e o texto "Tá na hora de…" da mensagem.
- **Ajustes:** agenda online aberta ou fechada, dados da estética, horário de funcionamento, vagas, limite de carros por dia, intervalo entre horários, antecedência, folgas, texto da mensagem de retorno e o endereço do link.
- **Fechar a agenda:** em Ajustes ou no Início. Com a agenda fechada, o link mostra os serviços e preços, mas não aceita agendamento e pede para chamar no WhatsApp; pelo painel o dono continua agendando.
- **Limite de carros por dia:** quando o dia chega no limite, ele aparece lotado no link. Pelo painel ainda dá para encaixar.
- **Agenda por dia ou por horário:** em Ajustes → Regras da agenda. Por dia, o cliente escolhe só o dia e o carro chega a partir da abertura. Por horário, ele escolhe a hora de chegada; "Carros por horário" define quantos cabem em cada um, junto com o limite diário.

### Como o retorno funciona

1. Cada serviço tem um ciclo (ex.: vitrificação = 1 ano, higienização = 6 meses).
2. Ao tocar em **Concluir**, o retorno nasce com a data certa. Se o dono esquecer, dias que já passaram são concluídos sozinhos (dá para desligar em Ajustes e corrigir para "não veio").
3. No dia, o cliente aparece em **Retornos** e no **Início**. Um toque abre o WhatsApp com a mensagem e o link de retorno.
4. Quando o cliente agenda por esse link (ou agenda o mesmo serviço de novo), o retorno sai da fila e vai para "Voltaram".

## Como funciona por dentro

- **Banco:** Postgres no Neon (São Paulo). Tabelas em `db/schema.sql`.
- **Servidor:** `server/app.mjs` tem as rotas `/api`; `server/regras.js` tem as regras (horários livres, retorno plantado ao concluir, filas). Na Vercel, `api/index.js` recebe todas as chamadas.
- **Sem horário duplicado:** cada gravação acontece numa transação com trava no banco; se dois clientes tentam a última vaga juntos, um deles recebe "esse horário acabou de ser ocupado".
- **Painel com senha:** `PAINEL_SENHA`; o aparelho fica conectado por 30 dias (cookie assinado). Dá para sair em **Ajustes → Sair do painel**.
- **Fuso:** "hoje" e "agora" são sempre os de Olinda (America/Sao_Paulo), mesmo com o servidor em outro país.

## Publicar na Vercel

1. Em vercel.com, **Add New → Project** e importe o repositório deste projeto (`link-hcestetica`) do GitHub. Não precisa mudar nada nas configurações de build: o `vercel.json` já diz que o site está em `public/`.
2. Antes de clicar em Deploy, abra **Environment Variables** e crie:
   - `DATABASE_URL` = a string de conexão do Neon
   - `PAINEL_SENHA` = a senha que o dono vai usar no painel
3. Deploy. O endereço sai como `algumacoisa.vercel.app` (dá para trocar o nome em Settings → Domains, ou ligar um domínio próprio).
4. Abra `/painel/` no endereço novo, entre com a senha e, em **Ajustes → Link para a bio**, cole o endereço do site: é ele que vai nas mensagens de retorno.
5. Em `public/index.html`, troque `content="assets/img/compartilhar.jpg"` da tag `og:image` pelo endereço completo (ex.: `https://hcestetica.vercel.app/assets/img/compartilhar.jpg`) para a logo aparecer quando o link for colado no WhatsApp.

Antes de divulgar: ajuste os **serviços e preços** em Painel → Serviços (enquanto isso, o link mostra "serviços e preços são exemplos"), o horário de funcionamento e as vagas em Ajustes.

## Estrutura

```
public/
  index.html               link público
  painel/index.html        painel do dono
  assets/
    css/muro.css           visual do link (emblema prata e ouro sobre preto)
    css/painel.css         visual do painel
    js/booking.js          comportamento do link
    js/painel/*.js         telas do painel
    js/core/               datas, formatação, horários livres, WhatsApp, ícones
    js/data/api.js         chamadas às rotas /api
    fonts/                 Saira, normal e itálico (licença OFL junto)
    img/logo-*.webp        logo da HC, fundo transparente (original em brand/)
    img/favicon.png        ícone da aba (apple-touch-icon.png para o iPhone)
    img/compartilhar.jpg   prévia do link no WhatsApp/Instagram
    icons.svg              ícones Lucide (ISC) e Simple Icons (CC0)
api/index.js               função da Vercel (todas as rotas /api)
server/app.mjs             rotas e login do painel
server/regras.js           regras de agendamento e retorno
server/banco.js            leitura e gravação no Neon, com trava
server/inicial.js          configuração inicial e serviços de exemplo
db/schema.sql              tabelas
scripts/banco.mjs          cria as tabelas (npm run banco)
server.mjs                 servidor local (npm start)
vercel.json                configuração da Vercel
PRODUCT.md                 contexto do produto (usado pela skill impeccable)
DESIGN.md                  sistema visual
```

## Design

O visual foi feito com a skill [impeccable](https://github.com/pbakaus/impeccable), instalada em `.claude/skills/impeccable`, a partir da logo da HC: preto envernizado, títulos em prata cromada com filete dourado como as letras do "HC", dourado do anel da logo no que o cliente escolhe, prata nos rótulos e Saira larga, pesada e inclinada como o monograma. A tabela de serviços é montada como um letreiro, horários livres aparecem em contorno prateado e o escolhido fica dourado; ao confirmar, um brilho de polimento passa pela data. O painel usa a mesma faixa preta com a logo, a busca em forma de placa Mercosul e o quadro do dia. Detalhes em `DESIGN.md`.

Para trocar a logo, substitua `public/assets/img/logo-480.webp` e `logo-960.webp` (quadradas, fundo transparente), `favicon.png`, `apple-touch-icon.png` e `compartilhar.jpg`.
