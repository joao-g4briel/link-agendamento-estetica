# Link de agendamento — estética automotiva

Link para a bio do Instagram: o cliente escolhe o serviço, vê só os horários que estão livres e o agendamento cai direto na agenda. Quando o serviço é concluído, o sistema marca quando aquele carro deve voltar (renovar a vitrificação, nova higienização) e, no dia, coloca o cliente na fila de retornos do painel com a mensagem de WhatsApp pronta.

## Rodar

Precisa só do Node (20 ou mais novo). Não tem dependências para instalar.

```bash
npm start
```

- Link público: http://localhost:5173/
- Painel da estética: http://localhost:5173/painel/

## O que tem

**Link público** (`public/index.html`)
- Tabela de serviços com tempo, preço e de quanto em quanto tempo refazer.
- Dias e horários livres calculados de verdade: vagas simultâneas, duração do serviço, pausa do almoço, folgas e antecedência mínima.
- Ficha curta (nome, WhatsApp, carro, placa) e confirmação com "salvar na agenda", "como chegar" e a data do próximo retorno.
- Link de retorno (`/?retorno=<código>`): abre com o serviço já escolhido e os dados do cliente preenchidos.

**Painel** (`public/painel/`)
- **Início:** busca por placa, nome, carro ou WhatsApp; quadro do dia por vaga; carros de hoje com "Concluir"; retornos que vencem hoje.
- **Agenda:** semana a semana, com concluir, "não veio", cancelar e voltar atrás.
- **Retornos:** atrasados, de hoje e dos próximos 30 dias, cada um com o botão de WhatsApp que abre a mensagem pronta. Avisados, quem voltou e quem fica para mais adiante.
- **Serviços:** nome, descrição, duração, preço, ciclo de retorno e o texto "Tá na hora de…" da mensagem.
- **Ajustes:** dados da estética, horário de funcionamento, vagas, intervalo entre horários, antecedência, folgas, texto da mensagem de retorno e o endereço do link.

### Como o retorno funciona

1. Cada serviço tem um ciclo (ex.: vitrificação = 1 ano, higienização = 6 meses).
2. Ao tocar em **Concluir**, o retorno nasce com a data certa. Se o dono esquecer, dias que já passaram são concluídos sozinhos (dá para desligar em Ajustes e corrigir para "não veio").
3. No dia, o cliente aparece em **Retornos** e no **Início**. Um toque abre o WhatsApp com a mensagem e o link de retorno.
4. Quando o cliente agenda por esse link (ou agenda o mesmo serviço de novo), o retorno sai da fila e vai para "Voltaram".

## Importante: o banco de dados ainda é placeholder

Os dados ficam no `localStorage` do navegador, com dados de exemplo (nome, serviços, preços, clientes e telefones fictícios; os telefones usam o formato 9 0000-0xxx, que não existe).

Isso quer dizer que **o link e o painel só conversam no mesmo navegador**. Se você publicar como está, o agendamento que um cliente fizer no celular dele **não chega** no painel do dono. Para usar de verdade, falta um backend.

A troca foi pensada para ser localizada: todas as telas falam só com `public/assets/js/data/api.js`. Cada função de lá vira uma chamada ao servidor, e `store.js` e `seed.js` deixam de existir. As regras de horário livre estão em `public/assets/js/core/availability.js` e devem ser repetidas no servidor na hora de gravar, para dois clientes não pegarem a mesma vaga.

| Função em `api.js` | Endpoint sugerido |
|---|---|
| `getPublicProfile()` | `GET /api/perfil` |
| `getAvailability(servico, de, dias)` | `GET /api/horarios?servico=&de=&dias=` |
| `getReturnInvite(token)` | `GET /api/retornos/convite/:token` |
| `createBooking(dados)` | `POST /api/agendamentos` (valida a vaga de novo) |
| `getHome()`, `getAgenda(de, dias)` | `GET /api/painel/hoje`, `GET /api/painel/agenda` |
| `search(q)`, `listCustomers()` | `GET /api/clientes?q=` |
| `setAppointmentStatus(id, status)` | `PATCH /api/agendamentos/:id` (concluir cria o retorno) |
| `listReturns()`, `markReturnNotified`, `snoozeReturn`, `setReturnStatus` | `GET/PATCH /api/retornos` |
| `listServices()`, `saveService()`, `moveService()` | `GET/PUT /api/servicos` |
| `getSettings()`, `saveSettings()`, `addBlock()`, `removeBlock()` | `GET/PATCH /api/ajustes`, `POST/DELETE /api/folgas` |

Com o backend, também entram: login no painel (hoje ele não tem senha) e o envio automático por API de WhatsApp, se um dia quiser trocar o "1 clique" por envio sozinho.

## Publicar

Hoje tudo é estático: a pasta `public/` pode ir para qualquer hospedagem de site estático. Lembre do aviso acima sobre os dados. Depois de publicar, coloque o endereço final em **Painel → Ajustes → Link para a bio**: é ele que vai nas mensagens de retorno.

## Estrutura

```
public/
  index.html               link público
  painel/index.html        painel do dono
  assets/
    css/muro.css           visual do link (o muro pintado)
    css/painel.css         visual do painel
    js/booking.js          comportamento do link
    js/painel/*.js         telas do painel
    js/core/               datas, formatação, horários livres, WhatsApp, ícones
    js/data/api.js         a única porta para os dados (trocar pelo backend)
    js/data/store.js       placeholder no localStorage
    js/data/seed.js        dados de exemplo
    fonts/                 Londrina Solid, Yellowtail, Archivo (licenças junto)
    icons.svg              ícones Lucide (ISC) e Simple Icons (CC0)
server.mjs                 servidor local sem dependências
PRODUCT.md                 contexto do produto (usado pela skill impeccable)
DESIGN.md                  sistema visual
```

## Design

O visual foi feito com a skill [impeccable](https://github.com/pbakaus/impeccable), instalada em `.claude/skills/impeccable`. O link público é o muro pintado da estética: letreiro em letra de pincel com sombra, tabela de serviços como as de lava-jato, horários livres riscados a giz e o horário escolhido pintado por cima. O painel usa o mesmo muro como faixa de topo, com a busca e o quadro do dia (carro = tinta, vaga livre = giz). Detalhes em `DESIGN.md`.
