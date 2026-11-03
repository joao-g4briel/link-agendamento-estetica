# Mão de Ouro — link de agendamento

Link para a bio do Instagram da **Mão de Ouro Estética Automotiva** (Rua Maria Elizabete Soares Lira, 419 · Igarassu-PE · WhatsApp (81) 97312-7101 · @maodeouroestetica_automotiva): o cliente escolhe o serviço e o dia (ou o horário, se o dono preferir) e o agendamento cai direto na agenda. Quando o serviço é concluído, o sistema marca quando aquele carro deve voltar e, no dia, coloca o cliente na fila de retornos do painel com a mensagem de WhatsApp pronta.

Este projeto usa a mesma base do link da HC Estética Automotiva (veja "Base compartilhada").

## Rodar no computador

Precisa do Node 22 ou mais novo.

1. `npm install`
2. Crie um arquivo `.env.local` na raiz (ele é ignorado pelo git; nunca suba esse arquivo):

   ```
   DATABASE_URL=postgresql://...   (string de conexão do Neon da Mão de Ouro)
   PAINEL_SENHA=uma-senha-forte
   ```
3. `npm run banco` cria as tabelas no Neon e coloca a configuração inicial (só se o banco estiver vazio).
4. `npm start`

Para testar sem banco, `npm run local` usa dados fictícios em `.local/validacao.json` (precisa só de `PAINEL_SENHA`). `npm test` roda os testes.

- Link público: http://localhost:5173/
- Painel (pede a senha): http://localhost:5173/painel/

## O que tem

**Link público** (`public/index.html`)
- Tabela de serviços com preço (único ou por porte do carro), descrição em lista e de quanto em quanto tempo refazer.
- Agendamento por dia ou por horário, à escolha do dono. O cliente só vê o que tem vaga; folgas, antecedência mínima e os limites de carros contam.
- Porte do carro e adicional opcional (ex.: cera), com o total calculado pelo servidor.
- Ficha curta (nome, WhatsApp, carro, placa), confirmação com "salvar na agenda", "como chegar" e link seguro para consultar, remarcar ou cancelar.
- Link de retorno (`/?retorno=<código>`): abre com o serviço já escolhido e os dados do cliente preenchidos.

**Painel** (`public/painel/`)
- **Início:** busca por placa, nome, carro ou WhatsApp; quadro do dia; atendimentos para revisar e para confirmar; retornos que vencem hoje.
- **Agenda:** semana a semana, com estados do atendimento, editar/remarcar, cancelados e encaixe.
- **Retornos:** atrasados, de hoje e dos próximos 30 dias, com WhatsApp em um toque e "marcar como enviado".
- **Serviços:** nome, descrição, preço único ou por porte, adicional, ciclo de retorno e o texto da mensagem.
- **Ajustes:** agenda online aberta ou fechada, dados da estética, funcionamento, agenda por dia ou por horário, limites de carros, folgas, mensagem de retorno e endereço do link.
- **Clientes e Operação:** ficha por veículo, lista de espera, registro de alterações e exportação.

## Publicar na Vercel

1. Crie um banco novo no Neon só para a Mão de Ouro (não use o da HC).
2. Com a string desse banco, rode `npm run banco` uma vez.
3. Em vercel.com, **Add New → Project** e importe este repositório. O `vercel.json` já diz que o site está em `public/`.
4. Antes do deploy, em **Environment Variables**, crie `DATABASE_URL` (o banco da Mão de Ouro) e `PAINEL_SENHA`.
5. Depois do deploy, abra `/painel/`, entre com a senha e, em **Ajustes → Link para a bio**, cole o endereço do site.
6. Em `public/index.html`, troque o `og:image` pelo endereço completo da imagem (ex.: `https://seu-site.vercel.app/assets/img/compartilhar.jpg`) para a prévia aparecer no WhatsApp.

Antes de divulgar, ajuste serviços, preços, horários e limites pelo painel.

## Base compartilhada

O código vem do link da HC (`joao-g4briel/agendamento-hc-estetica`), configurado aqui como o remoto `base`. O que é só da Mão de Ouro: logo e favicon (`public/assets/img/`), tons de dourado e tamanho da logo (`muro.css`, `painel.css`), textos de `index.html`, `painel/index.html`, `server/inicial.js`, `PRODUCT.md`, `DESIGN.md` e este README.

Para trazer uma correção feita na base:

```
git fetch base
git merge base/main
```

Em conflito, mantenha a marca da Mão de Ouro e o código da base. Depois rode `npm test`.

Se a correção trouxer mudança em `db/schema.sql`, rode `npm run banco` no banco da Mão de Ouro **antes** de publicar o código.

## Logo

`public/assets/img/logo-700.webp` e `logo-1400.webp` (horizontal, 4:1, fundo transparente; original em `brand/logo-original.png`), `favicon.svg` e `compartilhar.jpg`.
