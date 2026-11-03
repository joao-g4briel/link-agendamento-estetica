# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS (ES modules, no build step) for the screens. Data goes through `/api` routes (`server/app.mjs`, rules in `server/regras.js`) backed by Postgres on Neon; on Vercel, `api/index.js` serves every route, and `server.mjs` serves the same locally.

## Users

- **Cliente da estética (primary, public link):** dono(a) de carro que chega pelo link na bio do Instagram, quase sempre no celular e dentro do navegador do próprio Instagram. Quer escolher o serviço, ver um horário que realmente está livre e garantir a vaga sem trocar mensagens.
- **Dono(a) da estética automotiva (operator, painel):** atende os carros e cuida da agenda ao mesmo tempo. Abre o painel no celular entre um carro e outro (às vezes no computador da recepção) para ver o dia, marcar o serviço como concluído e mandar os avisos de retorno.

## Product Purpose

Um link de agendamento para a bio de uma única estética automotiva: o cliente escolhe o serviço, vê os horários livres e o agendamento cai direto na agenda do dono. Depois do atendimento, o sistema guarda quando aquele carro deve voltar (renovar a vitrificação, nova higienização) e, no dia certo, coloca o cliente na fila de retorno do painel com a mensagem de WhatsApp pronta.

Sucesso: agendamentos que chegam sem conversa no direct/WhatsApp, e carros atendidos que voltam no tempo certo sem o dono precisar lembrar.

## Positioning

Cada serviço tem o seu ciclo de retorno. Quando o carro é concluído, o próximo retorno já nasce marcado; no dia, o painel entrega a mensagem pronta no WhatsApp com um link que reabre o mesmo serviço já com os dados do cliente. "O carro que você atendeu hoje volta sozinho."

## Operating Context

- Público em português do Brasil, preços em real (R$), fuso America/Sao_Paulo.
- Entrada principal: link na bio do Instagram, aberto no navegador interno do app, em telas de celular.
- WhatsApp é o canal de conversa com o cliente. Aviso de retorno é por **WhatsApp com 1 clique** (link wa.me com mensagem pronta, aberto a partir do painel); não há envio automático por API.
- Agendamento por dia ou por horário (o dono escolhe em Ajustes), com limite de carros por dia e por horário. Por exigência do dono, não há cadastro nem cálculo de duração dos serviços ou ocupação por tempo de box.

## Capabilities and Constraints

- Uma estética só; sem multiempresa, sem cadastro de outros negócios.
- Link público: escolher serviço → ver dias livres → informar nome, WhatsApp e carro → confirmação, com link seguro para consultar, remarcar ou cancelar dentro do prazo.
- Painel do dono: agenda por dia/semana, editar/remarcar, estados de atendimento e revisão dos dias passados, fila de retornos por veículo, confirmação manual de envio no WhatsApp, serviços com descrição em lista, preço e intervalo de retorno, funcionamento, limite diário e folgas. Inclui ficha de clientes/veículos, lista de espera, exportação e registro de alterações.
- Dados no Postgres (Neon), compartilhados entre o link público e o painel. Painel protegido por senha (`PAINEL_SENHA`).
- Undecided: pagamento/sinal online, lembrete na véspera, serviços e preços reais.

## Brand Commitments

- **Nome:** Mão de Ouro — Estética Automotiva.
- **Logo (binding):** silhueta de carro esportivo em traço dourado sobre o nome "MÃO DE OURO" em letras largas, pesadas e inclinadas com acabamento cromado dourado, e "ESTÉTICA AUTOMOTIVA" em caixa alta prateada bem espaçada, ladeada por filetes dourados. Fundo preto. Original fornecido pelo dono: `brand/logo-original.png`; versões web em `public/assets/img/logo-700.webp` e `logo-1400.webp` (fundo preto convertido em transparência).
- **Cores (pinned pelo dono: "as cores conforme a logo"):** preto, dourado metálico (do claro ao bronze) e prata/branco.
- **Tipografia (pinned: "uma fonte que combine com a estética da logo"):** sans larga, pesada e inclinada para títulos; caixa alta prateada com espaçamento largo para rótulos.
- **Contato:** Rua Maria Elizabete Soares Lira, 419 · Igarassu (PE) · WhatsApp (81) 97312-7101 · Instagram @maodeouroestetica_automotiva.

## Evidence on Hand

- Logo oficial (acima). Endereço, WhatsApp e Instagram reais.
- Não há fotos de trabalhos, depoimentos, avaliações, número de clientes nem preços reais. Os serviços e valores ainda são de exemplo e devem ser identificados como exemplo; não inventar depoimentos, notas, contagens de clientes ou selos.

## Product Principles

1. **Agendar sem conversa.** Do link ao horário confirmado em poucos toques no celular, sem precisar chamar ninguém.
2. **Horário mostrado é horário real.** A disponibilidade sai da agenda, das vagas e das folgas; nunca um formulário de "pedido de horário".
3. **Todo atendimento planta o próximo.** Concluir um serviço já agenda o retorno daquele carro.
4. **WhatsApp é o canal.** Mensagens prontas, em português natural, que o dono envia com um toque.
5. **Operável com uma mão.** O painel funciona no celular, no meio do trabalho.

## Accessibility & Inclusion

WCAG 2.2 AA como padrão: contraste, alvos de toque de pelo menos 44px, navegação por teclado no painel, respeito a `prefers-reduced-motion`.
