# Mão de Ouro — link de agendamento

Link para a bio do Instagram da **Mão de Ouro Estética Automotiva** (Rua Maria Elizabete Soares Lira, 419 · Igarassu-PE · WhatsApp (81) 97312-7101 · @maodeouroestetica_automotiva): o cliente escolhe o serviço, vê só os horários que estão livres e o agendamento cai direto na agenda. Quando o serviço é concluído, o sistema marca quando aquele carro deve voltar (renovar a vitrificação, nova higienização) e, no dia, coloca o cliente na fila de retornos do painel com a mensagem de WhatsApp pronta.

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

Os dados ficam no `localStorage` do navegador. Nome, endereço, WhatsApp e Instagram já são os da Mão de Ouro; **serviços, preços e clientes ainda são de exemplo** (telefones no formato (81) 9 0000-0xxx, que não existe). Troque os serviços em **Painel → Serviços** e zere os clientes em **Painel → Ajustes → Começar do zero**.

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

Hoje tudo é estático: a pasta `public/` pode ir para qualquer hospedagem de site estático. Lembre do aviso acima sobre os dados. Depois de publicar:

- coloque o endereço final em **Painel → Ajustes → Link para a bio**: é ele que vai nas mensagens de retorno;
- em `public/index.html`, troque `content="assets/img/compartilhar.jpg"` da tag `og:image` pelo endereço completo (ex.: `https://seudominio.com.br/assets/img/compartilhar.jpg`), para a prévia com a logo aparecer quando o link for colado no WhatsApp.

## Estrutura

```
public/
  index.html               link público
  painel/index.html        painel do dono
  assets/
    css/muro.css           visual do link (letreiro dourado sobre preto)
    css/painel.css         visual do painel
    js/booking.js          comportamento do link
    js/painel/*.js         telas do painel
    js/core/               datas, formatação, horários livres, WhatsApp, ícones
    js/data/api.js         a única porta para os dados (trocar pelo backend)
    js/data/store.js       placeholder no localStorage
    js/data/seed.js        dados de exemplo
    fonts/                 Saira, normal e itálico (licença OFL junto)
    img/logo-*.webp        logo da Mão de Ouro, fundo transparente (original em brand/)
    img/compartilhar.jpg   prévia do link no WhatsApp/Instagram
    icons.svg              ícones Lucide (ISC) e Simple Icons (CC0)
server.mjs                 servidor local sem dependências
PRODUCT.md                 contexto do produto (usado pela skill impeccable)
DESIGN.md                  sistema visual
```

## Design

O visual foi feito com a skill [impeccable](https://github.com/pbakaus/impeccable), instalada em `.claude/skills/impeccable`, a partir da logo da Mão de Ouro: preto envernizado, dourado cromado da logo nos títulos e no que o cliente escolhe, prata nos rótulos e Saira larga e inclinada como as letras da marca. A tabela de serviços é montada como um letreiro, horários livres aparecem em contorno prateado e o escolhido fica dourado; ao confirmar, um brilho de polimento passa pela data. O painel usa a mesma faixa preta com a logo, a busca em forma de placa Mercosul e o quadro do dia. Detalhes em `DESIGN.md`.

Para trocar a logo, substitua `public/assets/img/logo-700.webp` e `logo-1400.webp` (fundo transparente) e `compartilhar.jpg`.
