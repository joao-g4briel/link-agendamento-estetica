// Início: a busca no muro, o quadro do dia e as listas de hoje.

import * as api from '../data/api.js';
import { today, weekday } from '../core/dates.js';
import { formatDateShort, formatDateShortYear, formatPhone, formatRelativeDay, statusLabel, WEEKDAYS } from '../core/format.js';
import { waLink } from '../core/whatsapp.js';
import {
  $, appointmentRow, bindAppointmentActions, bindReturnActions, hourLabel, html, icon,
  placa, returnRow, toast,
} from './ui.js';

function board(home) {
  const count = home.load.cars;
  const limit = home.maxCarsPerDay;
  return html`<div class="quadro"><p class="quadro__legenda"><strong>${count}${limit ? ` / ${limit}` : ''} carros</strong>
    <span>${home.block ? home.block.reason : home.hours ? `${home.hours.open} - ${home.hours.close}` : 'Fechado'}</span></p>
    ${limit ? html`<progress class="ocupacao-dia" max="${limit}" value="${count}" aria-label="Carros no dia"></progress>` : ''}
    <p>${home.load.full ? 'Dia lotado.' : limit ? `${Math.max(0, limit - count)} vagas no dia.` : 'Sem limite diário configurado.'}</p></div>`;
}

function sections(home, settings, baseUrl) {
  const done = home.today.filter((a) => a.status === 'concluido').length;
  return html`
    <div class="inicio__principal">
    ${home.review?.length ? html`<section class="secao"><h2 class="secao__titulo">Para revisar</h2><p>Atendimentos anteriores que ainda precisam de uma decisão.</p><ul class="lista" role="list">${home.review.map(a => appointmentRow(a, { settings, showDate: true }))}</ul></section>` : ''}
    ${home.confirmations?.length ? html`<section class="secao"><h2 class="secao__titulo">Confirmar amanhã</h2><ul class="lista" role="list">${home.confirmations.map(a => appointmentRow(a, { settings, showDate: true }))}</ul></section>` : ''}
    <section class="secao secao--hoje" aria-labelledby="t-hoje">
      <div class="secao__cabeca">
        <h2 class="secao__titulo" id="t-hoje">Hoje <small>${home.today.length ? `${done} de ${home.today.length} prontos` : ''}</small></h2>
        <a class="btn btn--texto btn--pequeno" href="#/agenda">Semana ${icon('chevron-right')}</a>
      </div>
      ${home.today.length
        ? html`<ul class="lista" role="list">${home.today.map((a) => appointmentRow(a, { settings }))}</ul>`
        : html`<p class="vazio"><strong>Nenhum carro hoje.</strong> O link segue aberto; quem agendar aparece aqui na hora.</p>`}
    </section>

    <section class="secao secao--proximos" aria-labelledby="t-proximos">
      <div class="secao__cabeca">
        <h2 class="secao__titulo" id="t-proximos">Próximos dias</h2>
      </div>
      ${home.upcoming.length
        ? html`<ul class="lista" role="list">${home.upcoming.map((a) => appointmentRow(a, { settings, showDate: true }))}</ul>`
        : html`<p class="vazio">Nada marcado para os próximos dias ainda.</p>`}
    </section>
    </div>

    <section class="secao inicio__lateral" aria-labelledby="t-retornos">
      <div class="secao__cabeca">
        <h2 class="secao__titulo" id="t-retornos">Avisar hoje <small>${home.returnsDue.length || ''}</small></h2>
        <a class="btn btn--texto btn--pequeno" href="#/retornos">Fila completa ${icon('chevron-right')}</a>
      </div>
      ${home.returnsDue.length
        ? html`<ul class="lista" role="list">${home.returnsDue.map((r) => returnRow(r, { settings, baseUrl }))}</ul>`
        : html`<p class="vazio"><strong>Ninguém para avisar hoje.</strong> ${home.returnsWeek ? `${home.returnsWeek} ${home.returnsWeek === 1 ? 'retorno vence' : 'retornos vencem'} nos próximos 7 dias.` : 'Quando um retorno vencer, ele aparece aqui com a mensagem pronta.'}</p>`}
    </section>`;
}

function customerResult(c) {
  return html`
    <li class="item item--sem-hora">
      <div class="item__corpo">
        <p class="item__titulo">${c.name} ${c.cars.map((car) => placa(car.plate))}</p>
        <p class="item__sub">${c.cars.map((car) => car.vehicle).join(' · ')} · ${formatPhone(c.phone)}</p>
        <p class="item__sub">
          ${c.next ? html`${icon('calendar')} Próximo: ${c.next.service.name}, ${formatRelativeDay(c.next.date)} às ${c.next.start}` : c.last ? `Última visita: ${c.last.service.name} em ${formatDateShortYear(c.last.date)}` : 'Ainda sem visitas'}
          ${c.openReturn ? html` · ${icon('repeat')} retorno ${formatDateShortYear(c.openReturn.dueDate)}` : ''}
        </p>
        ${c.history.length ? html`
          <details class="dobra">
            <summary>Histórico (${c.visits} ${c.visits === 1 ? 'visita' : 'visitas'}) ${icon('chevron-down')}</summary>
            <ul class="historico dobra__conteudo" role="list">
              ${c.history.map((a) => html`<li>${formatDateShortYear(a.date)} · ${a.service.name} · ${a.vehicle} · ${statusLabel(a.status)}</li>`)}
            </ul>
          </details>` : ''}
      </div>
      <div class="item__acoes">
        <a class="btn btn--primario btn--pequeno" href="#/novo?cliente=${c.id}">${icon('calendar-plus')}Agendar</a>
        ${c.phone ? html`<a class="btn btn--linha btn--pequeno" href="${waLink(c.phone)}" target="_blank" rel="noopener">${icon('whatsapp')}WhatsApp</a>` : ''}
      </div>
    </li>`;
}

export default async function inicio(root) {
  const t = today();
  root.innerHTML = String(html`
    <div class="faixa">
      <div class="faixa__topo">
        <h1 class="faixa__titulo">${WEEKDAYS[weekday(t)]} ${formatDateShort(t)}</h1>
        <span class="faixa__marca"><img src="${new URL('../../img/logo-700.webp', import.meta.url).href}" width="136" height="34" alt="" id="inicio-marca"></span>
      </div>
      <form class="busca" role="search" id="busca-form">
        <span class="busca__faixa" aria-hidden="true">BRASIL</span>
        ${icon('search')}
        <label class="visualmente-oculto" for="busca">Buscar por placa, nome, carro ou WhatsApp</label>
        <input id="busca" type="search" name="q" placeholder="Placa, nome ou carro" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">
        <span class="busca__limpar" hidden id="busca-limpar"><button type="button" class="btn btn--texto btn--icone" aria-label="Limpar busca">${icon('x')}</button></span>
      </form>
      <div id="exemplo"></div>
      <div id="online"></div>
      <div id="quadro"></div>
      <div class="faixa__acoes">
        <a class="btn btn--cal btn--pequeno" href="#/novo">${icon('plus')}Novo agendamento</a>
        <a class="btn btn--giz btn--pequeno" href="#/clientes">Clientes e veículos</a>
        <a class="btn btn--giz btn--pequeno" href="#/operacao">Operação e exportação</a>
        <a class="btn btn--giz btn--pequeno" href="#/ajustes?secao=folgas">${icon('calendar-off')}Marcar folga</a>
        <button class="btn btn--giz btn--pequeno" type="button" id="fechar-agenda" data-online="fechar" hidden>${icon('ban')}Fechar agenda</button>
      </div>
    </div>
    <div id="resultados" aria-live="polite"></div>
    <div id="casa" class="inicio__colunas">
      <div class="secao"><div class="esqueleto"></div><div class="esqueleto"></div></div>
    </div>
  `);

  const input = $('#busca', root);
  const results = $('#resultados', root);
  const home = $('#casa', root);
  let query = '';
  let searchSeq = 0;

  async function loadHome() {
    const [data, { settings }] = await Promise.all([api.getHome(), api.getSettings()]);
    const baseUrl = api.publicBaseUrl();
    $('#inicio-marca', root).alt = settings.name;
    $('#quadro', root).innerHTML = String(board(data));
    $('#exemplo', root).innerHTML = data.shop.isExample
      ? String(html`<p class="faixa__exemplo">${icon('info')}<span>Serviços e preços ainda são de exemplo e aparecem assim no link. <a href="#/servicos">Ajustar serviços</a></span></p>`)
      : '';
    $('#online', root).innerHTML = data.bookingOpen
      ? ''
      : String(html`<p class="faixa__exemplo faixa__fechada">${icon('ban')}<span><strong>Agenda online fechada.</strong> O link não aceita novos agendamentos. <button type="button" class="link-faixa" data-online="abrir">Reabrir agenda</button></span></p>`);
    $('#fechar-agenda', root).hidden = !data.bookingOpen;
    home.innerHTML = String(sections(data, settings, baseUrl));
  }

  // Fechar/reabrir a agenda online (o botão e o aviso ficam na faixa, que nasce a cada visita).
  $('.faixa', root).addEventListener('click', async (event) => {
    const button = event.target.closest('[data-online]');
    if (!button) return;
    const open = button.dataset.online === 'abrir';
    if (!open && !window.confirm('Fechar a agenda online? O link para de aceitar agendamentos até você reabrir.')) return;
    button.disabled = true;
    try {
      await api.saveSettings({ bookingOpen: open });
      toast(open ? 'Agenda reaberta. O link voltou a aceitar agendamentos.' : 'Agenda fechada. Reabra aqui ou em Ajustes.');
      await loadHome();
    } catch (error) {
      button.disabled = false;
      toast(error.message);
    }
  });

  async function runSearch() {
    const q = input.value.trim();
    query = q;
    $('#busca-limpar', root).hidden = !q;
    const seq = ++searchSeq;
    if (q.length < 2) {
      results.innerHTML = '';
      home.hidden = false;
      return;
    }
    let found;
    try { found = await api.search(q); }
    catch (error) { if (seq === searchSeq) { results.innerHTML = String(html`<p class="secao" role="alert">${error.message || 'Não deu para buscar. Tente novamente.'}</p>`); } return; }
    if (seq !== searchSeq) return;
    home.hidden = true;
    results.innerHTML = String(html`
      <section class="secao" aria-labelledby="t-busca">
        <div class="secao__cabeca">
          <h2 class="secao__titulo" id="t-busca">${found.length ? `${found.length} ${found.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}` : 'Ninguém encontrado'}</h2>
          <a class="btn btn--texto btn--pequeno" href="#/clientes">Todos os clientes ${icon('chevron-right')}</a>
        </div>
        ${found.length
          ? html`<ul class="lista" role="list">${found.map(customerResult)}</ul>`
          : html`<p class="vazio">Nada com “${q}”. Busque por parte da placa (ex.: ${'FHK'}), do nome, do carro ou do WhatsApp.
              <br><a href="#/novo">Agendar um cliente novo</a></p>`}
      </section>`);
  }

  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(runSearch, 140);
  });
  $('#busca-form', root).addEventListener('submit', (event) => {
    event.preventDefault();
    runSearch();
  });
  $('#busca-limpar button', root).addEventListener('click', () => {
    input.value = '';
    runSearch();
    input.focus();
  });

  bindAppointmentActions(home);
  bindReturnActions(home);

  await loadHome();

  return {
    cleanup: () => { clearTimeout(debounce); searchSeq++; },
    refresh: () => (query ? runSearch() : loadHome()),
  };
}
