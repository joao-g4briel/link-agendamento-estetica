// Retornos: quem deve voltar, com a mensagem de WhatsApp pronta.

import * as api from '../data/api.js';
import { $, bindReturnActions, html, returnRow } from './ui.js';

const TABS = [
  { id: 'avisar', label: 'Para avisar' },
  { id: 'aguardando', label: 'Avisados' },
  { id: 'voltaram', label: 'Voltaram' },
  { id: 'mais-tarde', label: 'Mais adiante' },
];

function group(title, items, ctx, { late = false, note = '' } = {}) {
  if (!items.length) return '';
  return html`
    <section class="secao" aria-label="${title}">
      <div class="secao__cabeca">
        <h2 class="secao__titulo${late ? ' secao__titulo--atraso' : ''}">${title} <small>${items.length}</small></h2>
      </div>
      ${note ? html`<p class="secao__nota">${note}</p>` : ''}
      <ul class="lista" role="list">${items.map((r) => returnRow(r, ctx))}</ul>
    </section>`;
}

function empty(message) {
  return html`<section class="secao"><p class="vazio">${message}</p></section>`;
}

export default async function retornos(root, { params }) {
  let tab = TABS.some((t) => t.id === params.get('aba')) ? params.get('aba') : 'avisar';

  root.innerHTML = String(html`
    <div class="faixa">
      <div class="faixa__topo">
        <h1 class="faixa__titulo">Retornos</h1>
      </div>
      <p class="faixa__sub" id="retornos-resumo">Cada serviço concluído marca quando o carro deve voltar.</p>
      <div class="faixa__acoes segmentos" role="tablist" aria-label="Filtrar retornos" id="abas-retorno"></div>
    </div>
    <div id="fila" role="tabpanel"><div class="secao"><div class="esqueleto"></div><div class="esqueleto"></div></div></div>
  `);

  const list = $('#fila', root);
  bindReturnActions(list);

  async function load() {
    const [data, { settings }] = await Promise.all([api.listReturns(), api.getSettings()]);
    const ctx = { settings, baseUrl: api.publicBaseUrl() };
    const counts = {
      avisar: data.late.length + data.today.length + data.soon.length,
      aguardando: data.waiting.length,
      voltaram: data.booked.length,
      'mais-tarde': data.later.length,
    };
    const dueNow = data.late.length + data.today.length;
    $('#retornos-resumo', root).textContent = dueNow
      ? `${dueNow} ${dueNow === 1 ? 'cliente para avisar hoje' : 'clientes para avisar hoje'}. Um toque abre o WhatsApp com a mensagem pronta.`
      : 'Ninguém para avisar hoje. Cada serviço concluído marca quando o carro deve voltar.';

    $('#abas-retorno', root).innerHTML = String(html`${TABS.map((t) => html`
      <button type="button" role="tab" id="aba-${t.id}" aria-controls="fila" aria-selected="${String(t.id === tab)}" data-aba="${t.id}">
        ${t.label}<small>${counts[t.id]}</small>
      </button>`)}`);
    list.setAttribute('aria-labelledby', `aba-${tab}`);

    if (tab === 'avisar') {
      list.innerHTML = String(counts.avisar
        ? html`
          ${group('Atrasados', data.late, ctx, { late: true })}
          ${group('Vencem hoje', data.today, ctx)}
          ${group('Próximos 30 dias', data.soon, ctx, { note: 'Pode avisar antes, se quiser: o link já abre o serviço certo.' })}`
        : empty('Fila limpa. Quando um retorno vencer, ele aparece aqui com a mensagem pronta.'));
    } else if (tab === 'aguardando') {
      list.innerHTML = String(data.waiting.length
        ? group('Avisados, esperando resposta', data.waiting, { ...ctx, mode: 'aguardando' }, { note: 'Quando o cliente agenda pelo link do retorno, ele sai daqui sozinho.' })
        : empty('Ninguém esperando resposta.'));
    } else if (tab === 'voltaram') {
      list.innerHTML = String(data.booked.length
        ? group('Voltaram pelo retorno', data.booked.slice(0, 30), { ...ctx, mode: 'voltaram' })
        : empty('Quando um cliente agendar a partir do aviso, ele aparece aqui.'));
    } else {
      list.innerHTML = String(data.later.length
        ? group('Mais adiante', data.later, { ...ctx, mode: 'mais-tarde' })
        : empty('Nenhum retorno marcado para depois de 30 dias.'));
    }
  }

  $('#abas-retorno', root).addEventListener('click', (event) => {
    const button = event.target.closest('[data-aba]');
    if (!button || button.dataset.aba === tab) return;
    tab = button.dataset.aba;
    window.history.replaceState(null, '', `#/retornos?aba=${tab}`);
    load().then(() => $(`#aba-${tab}`, root)?.focus());
  });

  $('#abas-retorno', root).addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const i = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(i + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
    $(`#aba-${next.id}`, root)?.click();
  });

  await load();
  return { refresh: load };
}


