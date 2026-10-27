// Agenda da semana: um bloco por dia, ocupação em tinta sobre giz.

import * as api from '../data/api.js';
import { addDays, parseISODate, startOfWeek, today } from '../core/dates.js';
import { formatDateLong, MONTHS } from '../core/format.js';
import { $, appointmentRow, bindAppointmentActions, capitalize, hourLabel, html, icon } from './ui.js';

function weekLabel(from) {
  const a = parseISODate(from);
  const b = parseISODate(addDays(from, 6));
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} a ${b.getDate()} de ${MONTHS[b.getMonth()]}`
    : `${a.getDate()} de ${MONTHS[a.getMonth()]} a ${b.getDate()} de ${MONTHS[b.getMonth()]}`;
}

function dayBlock(day, settings) {
  const isToday = day.date === today();
  const past = day.date < today();
  const active = day.items.filter((a) => a.status !== 'cancelado');
  let status;
  if (day.block) status = html`<p class="vazio">Folga: ${day.block.reason}. O link não mostra horários neste dia.</p>`;
  else if (!day.hours) status = html`<p class="vazio">Fechado.</p>`;
  else if (!active.length) status = html`<p class="vazio">${past ? 'Nenhum carro.' : 'Nenhum carro ainda. Todos os horários estão livres no link.'}</p>`;

  return html`
    <section class="secao dia-agenda${isToday ? ' dia-agenda--hoje' : ''}" aria-labelledby="d-${day.date}" id="dia-${day.date}">
      <div class="secao__cabeca">
        <h2 class="secao__titulo" id="d-${day.date}">${capitalize(formatDateLong(day.date))} ${isToday ? html`<span class="selo selo--hoje">hoje</span>` : ''}</h2>
        ${day.hours && !day.block ? html`
          <span class="carga" title="${Math.round(day.load.ratio * 100)}% das vagas ocupadas">
            <span class="carga__texto">${active.length} ${active.length === 1 ? 'carro' : 'carros'} · ${hourLabel(day.hours.open)}–${hourLabel(day.hours.close)}</span>
            <span class="carga__barra" aria-hidden="true"><span style="width:${Math.round(day.load.ratio * 100)}%"></span></span>
          </span>` : ''}
      </div>
      ${status || html`<ul class="lista" role="list">${active.map((a) => appointmentRow(a, { settings }))}</ul>`}
    </section>`;
}

export default async function agenda(root, { params }) {
  const from = startOfWeek(params.get('semana') || today());
  const thisWeek = startOfWeek(today());

  root.innerHTML = String(html`
    <div class="faixa">
      <div class="faixa__topo">
        <h1 class="faixa__titulo">Agenda</h1>
        <a class="btn btn--cal btn--pequeno" href="#/novo">${icon('plus')}Novo agendamento</a>
      </div>
      <p class="faixa__sub" id="semana-rotulo">${capitalize(weekLabel(from))}</p>
      <div class="faixa__acoes">
        <a class="btn btn--giz btn--pequeno" href="#/agenda?semana=${addDays(from, -7)}">${icon('chevron-left')}Semana anterior</a>
        ${from !== thisWeek ? html`<a class="btn btn--giz btn--pequeno" href="#/agenda">Esta semana</a>` : ''}
        <a class="btn btn--giz btn--pequeno" href="#/agenda?semana=${addDays(from, 7)}">Próxima semana${icon('chevron-right')}</a>
      </div>
    </div>
    <div id="dias-agenda"><div class="secao"><div class="esqueleto"></div><div class="esqueleto"></div></div></div>
  `);

  const list = $('#dias-agenda', root);
  bindAppointmentActions(list);

  async function load() {
    const [data, { settings }] = await Promise.all([api.getAgenda(from, 7), api.getSettings()]);
    list.innerHTML = String(html`${data.days.map((d) => dayBlock(d, settings))}`);
  }

  await load();
  if (from === thisWeek) {
    const todayBlock = $(`#dia-${today()}`, root);
    if (todayBlock && todayBlock.getBoundingClientRect().top > window.innerHeight * 0.8) {
      requestAnimationFrame(() => todayBlock.scrollIntoView({ block: 'start' }));
    }
  }
  return { refresh: load };
}
