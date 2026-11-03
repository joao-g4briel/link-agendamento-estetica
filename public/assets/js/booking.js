// Link público de agendamento: serviço → dia → dados → pintado no muro.
// O cliente escolhe só o dia; o carro chega a partir da abertura.

import * as api from './data/api.js';
import { addDays, nowMinutes, parseISODate, toMinutes, today, weekday } from './core/dates.js';
import {
  firstName, formatDateLong, formatDateShort, formatInterval, formatMonthYear,
  formatPhone, formatPlate, formatPrice, formatRelativeDay, html, isValidPhone, MONTHS, raw,
  WEEKDAYS, WEEKDAYS_SHORT,
} from './core/format.js';
import { icon } from './core/icons.js';
import { waLink } from './core/whatsapp.js';

const $ = (selector) => document.querySelector(selector);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const state = {
  profile: null,
  invite: null,
  service: null,
  days: [],
  date: null,
  time: null,
  submitting: false,
  idempotencyKey: crypto.randomUUID(),
};
let availabilityRequest = 0;

const CLIENT_KEY = 'estetica.cliente';

// ---------------------------------------------------------------------------
// Textos

function hourLabel(hhmm) {
  const [h, m] = hhmm.split(':');
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

function openingLine(hours) {
  const wd = weekday(today());
  const todayHours = hours?.[wd];
  const blocked = date => state.profile?.closedDates?.some(b => date >= b.from && date <= (b.to || b.from));
  if (!blocked(today()) && todayHours?.open && nowMinutes() < toMinutes(todayHours.close)) {
    if (nowMinutes() < toMinutes(todayHours.open)) return `Abre hoje às ${hourLabel(todayHours.open)}`;
    if (todayHours.breakStart && nowMinutes() >= toMinutes(todayHours.breakStart) && nowMinutes() < toMinutes(todayHours.breakEnd)) return `Em pausa. Volta às ${hourLabel(todayHours.breakEnd)}`;
    return `Aberto agora · até ${hourLabel(todayHours.close)}`;
  }
  for (let i = 1; i <= 7; i++) {
    const next = hours?.[(wd + i) % 7];
    if (next?.open && !blocked(addDays(today(), i))) {
      const when = i === 1 ? 'amanhã' : WEEKDAYS[(wd + i) % 7];
      return `Fechado agora. Abre ${when} às ${hourLabel(next.open)}`;
    }
  }
  return 'Horário a combinar pelo WhatsApp';
}

function cycleLabel(code) {
  if (code === '1m') return 'refazer todo mês';
  if (code === '12m') return 'renovar todo ano';
  return `refazer a cada ${formatInterval(code)}`;
}

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

function mapsUrl(address) {
  const query = `${address.replace(/\s*·\s*/g, ', ')}, Brasil`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Endereço com o trecho "número · cidade" sem quebra, para o ponto não ficar sozinho no fim da linha. */
function addressHTML(address) {
  const [street, ...rest] = address.split(' · ');
  if (!rest.length) return address;
  const cut = street.lastIndexOf(' ');
  return html`${street.slice(0, cut + 1)}<span class="sem-quebra">${street.slice(cut + 1)} · ${rest.join(' · ')}</span>`;
}

// ---------------------------------------------------------------------------
// Letreiro, tabela e rodapé

function renderHeader() {
  const { shop, nextFree } = state.profile;
  document.title = `${shop.name} · Agende seu horário`;
  $('#aviso-exemplo').hidden = !shop.isExample && !state.profile.local;
  if (state.profile.local) $('#aviso-exemplo').textContent = 'Validação local · dados de teste separados da produção';
  $('#letreiro').removeAttribute('aria-busy');
  $('#logo').alt = shop.tagline ? `${shop.name} — ${shop.tagline}` : shop.name;

  $('#info').innerHTML = html`
    ${shop.address ? html`<li>${icon('map-pin')}<a href="${mapsUrl(shop.address)}" target="_blank" rel="noopener">${addressHTML(shop.address)}</a></li>` : ''}
    <li>${icon('clock')}<span>${openingLine(shop.hours)}</span></li>
  `;

  const note = $('#nota-giz');
  const invite = state.invite;
  if (invite && !invite.alreadyBooked) {
    note.innerHTML = html`${icon('repeat')}<span>Voltou, <strong>${firstName(invite.name)}</strong>! Hora de ${invite.returnAction || 'voltar'}${invite.vehicle ? ` do ${invite.vehicle}` : ''}.</span>`;
    note.hidden = false;
  } else if (invite && invite.alreadyBooked) {
    note.innerHTML = html`${icon('check')}<span>Esse retorno já está agendado, ${firstName(invite.name)}. Quer marcar outro serviço? É só escolher abaixo.</span>`;
    note.hidden = false;
  } else {
    note.hidden = true;
  }

  const free = $('#nota-livre');
  if (nextFree && !(invite && !invite.alreadyBooked)) {
    free.innerHTML = html`<span>Próximo dia livre<strong>${formatRelativeDay(nextFree.date)}</strong></span><svg class="giz-seta" aria-hidden="true"><use href="#giz-seta"/></svg>`;
    free.hidden = false;
  } else {
    free.hidden = true;
  }

  $('#horario').innerHTML = html`${hoursBoard(shop.hours).map(([days, text]) => html`<li><span>${days}</span><span>${text}</span></li>`)}`;
}

/** Linhas do quadro de horário: dias seguidos com o mesmo horário viram uma linha. */
function hoursBoard(hours) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const label = (h) => (h?.open ? `${hourLabel(h.open)} às ${hourLabel(h.close)}${h.breakStart ? ` · pausa ${hourLabel(h.breakStart)}–${hourLabel(h.breakEnd)}` : ''}` : 'fechado');
  const rows = [];
  for (const wd of order) {
    const text = label(hours?.[wd]);
    const last = rows[rows.length - 1];
    if (last && last.text === text) last.to = wd;
    else rows.push({ from: wd, to: wd, text });
  }
  return rows.map((r) => [
    r.from === r.to ? WEEKDAYS_SHORT[r.from] : `${WEEKDAYS_SHORT[r.from]} a ${WEEKDAYS_SHORT[r.to]}`,
    r.text,
  ]);
}

function renderServices() {
  const list = $('#tabela');
  const { services, shop } = state.profile;
  const closed = shop.bookingOpen === false;
  list.removeAttribute('aria-busy');
  if (closed) {
    $('#ajuda-servico').innerHTML = html`A agenda online está fechada no momento.
      ${shop.whatsapp ? html`<a href="${waLink(shop.whatsapp, 'Oi! Queria agendar um horário.')}" target="_blank" rel="noopener">Chame no WhatsApp</a> para marcar.` : ''}`;
    $('#ajuda-servico').classList.add('etapa__ajuda--fechada');
  }
  if (!services.length) {
    list.innerHTML = html`<li class="vazio-giz">A tabela de serviços ainda está sendo pintada.
      ${shop.whatsapp ? html`<a href="${waLink(shop.whatsapp, 'Oi! Queria agendar um horário.')}" target="_blank" rel="noopener">Chame no WhatsApp</a> para agendar.` : ''}</li>`;
    return;
  }
  list.innerHTML = services.map((s) => html`
    <li>
      <button type="button" class="servico" data-id="${s.id}" aria-pressed="false" ${closed ? html`disabled` : ''}>
        <span class="servico__nome">${s.name}</span>
        <span class="servico__pontos" aria-hidden="true"></span>
        <span class="servico__preco">${s.priceFrom ? html`<small>a partir de</small>` : ''}${formatPrice(s.priceCents)}</span>
        ${s.returnInterval ? html`<span class="servico__meta">${cycleLabel(s.returnInterval)}</span>` : ''}
        ${s.description ? html`<span class="servico__desc" role="list">${s.description.split(/\r?\n/).map(line => line.trim().replace(/^[-•]\s*/, '')).filter(Boolean).map(line => html`<span role="listitem">${line}</span>`)}</span>` : ''}
      </button>
    </li>`).join('');
}

function renderFooter() {
  const { shop } = state.profile;
  $('#rodape').innerHTML = html`
    <ul class="rodape__links" role="list">
      ${shop.whatsapp ? html`<li><a href="${waLink(shop.whatsapp)}" target="_blank" rel="noopener">${icon('whatsapp')}${formatPhone(shop.whatsapp)}</a></li>` : ''}
      ${shop.instagram ? html`<li><a href="https://instagram.com/${shop.instagram}" target="_blank" rel="noopener">${icon('instagram')}@${shop.instagram}</a></li>` : ''}
    </ul>
  `;
}

function renderLoadError() {
  $('#letreiro').removeAttribute('aria-busy');
  $('#tabela').removeAttribute('aria-busy');
  $('#tabela').innerHTML = html`<li class="vazio-giz">Não deu para carregar a tabela de serviços.
    <button type="button" class="link-giz" id="tentar-de-novo">Tentar de novo</button></li>`;
  $('#tentar-de-novo').addEventListener('click', () => window.location.reload());
}

function renderSkeleton() {
  $('#tabela').innerHTML = Array.from({ length: 4 }, () => '<li><div class="servico servico--esqueleto"></div></li>').join('');
}

// ---------------------------------------------------------------------------
// Serviço, dia e horário

function revealStep(selector, { scroll = true } = {}) {
  const step = $(selector);
  const wasHidden = step.hidden;
  step.hidden = false;
  if (!scroll) return;
  const rect = step.getBoundingClientRect();
  const offscreen = rect.top > window.innerHeight * 0.55 || rect.top < 0;
  if (wasHidden || offscreen) {
    requestAnimationFrame(() => step.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' }));
  }
}

async function selectService(id, { scroll = true } = {}) {
  state.idempotencyKey = crypto.randomUUID();
  const service = state.profile.services.find((s) => s.id === id);
  if (!service) return;
  state.service = service;
  state.date = null;
  state.time = null;

  document.querySelectorAll('.servico').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.id === id));
  });
  $('#etapa-servico').classList.add('feita');
  $('#etapa-quando').classList.remove('feita');
  $('#etapa-dados').hidden = true;

  $('#ajuda-quando').textContent =
    `${service.name}. Escolha o dia e confira a orientação de chegada.`;
  $('#dias').classList.add('dias--carregando');
  $('#dias').setAttribute('aria-busy', 'true');
  $('#dias').innerHTML = Array.from({ length: 7 }, () =>
    '<span class="dia" aria-hidden="true"><span class="dia__sem">—</span><span class="dia__num">00</span><span class="dia__vagas">—</span></span>').join('');
  $('#horarios').innerHTML = '';
  revealStep('#etapa-quando', { scroll });

  const request = ++availabilityRequest;
  try {
    const days = await api.getAvailability(id);
    if (request !== availabilityRequest) return;
    state.days = days;
    state.date = null;
    renderDays();
    renderDayNote();
  } catch {
    if (request !== availabilityRequest) return;
    $('#dias').classList.remove('dias--carregando');
    $('#dias').innerHTML = '';
    $('#horarios').innerHTML = html`<p class="vazio-giz">Não deu para ver os dias livres agora.
      <button type="button" class="link-giz" data-acao="recarregar">Tentar de novo</button></p>`;
  }
}

function dayTag(day) {
  if (day.slots.length) {
    const { free, time } = day.slots[0];
    if (free === 1) return { short: 'última vaga', long: `última vaga, chegada a partir das ${hourLabel(time)}` };
    if (free) return { short: `${free} vagas`, long: `${free} vagas, chegada a partir das ${hourLabel(time)}` };
    return { short: 'livre', long: `livre, chegada a partir das ${hourLabel(time)}` };
  }
  if (day.reason === 'fechado') return { short: 'fechado', long: 'fechado' };
  if (day.reason === 'lotado') return { short: 'lotado', long: 'sem vaga' };
  if (day.reason === 'encerrado') return { short: 'encerrado', long: 'não dá mais para hoje' };
  return { short: 'folga', long: day.reason || 'folga' };
}

function renderDays() {
  const container = $('#dias');
  container.classList.remove('dias--carregando');
  container.removeAttribute('aria-busy');

  if (!state.days.some((d) => d.slots.length)) {
    const { shop } = state.profile;
    container.innerHTML = '';
    $('#horarios').innerHTML = html`<p class="vazio-giz">Sem dia livre para ${state.service.name.toLowerCase()} nos próximos ${state.days.length} dias.
      ${shop.whatsapp ? html`<a href="${waLink(shop.whatsapp, `Oi! Queria um encaixe para ${state.service.name.toLowerCase()}.`)}" target="_blank" rel="noopener">Peça um encaixe no WhatsApp</a>.` : ''}</p>`;
    return;
  }

  let month = null;
  const parts = [];
  for (const day of state.days) {
    const date = parseISODate(day.date);
    if (month !== null && date.getMonth() !== month) {
      parts.push(html`<span class="dias__mes" aria-hidden="true">${MONTHS[date.getMonth()]}</span>`);
    }
    month = date.getMonth();
    const tag = dayTag(day);
    const rel = formatRelativeDay(day.date);
    const top = rel === 'hoje' || rel === 'amanhã' ? rel : WEEKDAYS_SHORT[date.getDay()];
    parts.push(html`
      <button type="button" class="dia" data-date="${day.date}" aria-pressed="${String(day.date === state.date)}"
        aria-label="${capitalize(formatDateLong(day.date))}: ${tag.long}" ${day.slots.length ? '' : raw('disabled')}>
        <span class="dia__sem">${top}</span>
        <span class="dia__num">${date.getDate()}</span>
        <span class="dia__vagas">${tag.short}</span>
      </button>`);
  }
  container.innerHTML = parts.join('');
  const selected = container.querySelector('[aria-pressed="true"]');
  if (selected) selected.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/** Embaixo dos dias: o aviso de erro (dia que lotou) ou a hora de chegada do dia escolhido. */
function renderDayNote(message = '') {
  const day = state.days.find((d) => d.date === state.date && d.slots.length);
  $('#horarios').innerHTML = html`
    ${message ? html`<p class="vazio-giz" role="alert">${message}</p>` : ''}
    ${day ? html`<p class="giz-nota">${icon('clock')}<span>Traga o carro na ${formatDateLong(day.date)}, <strong>a partir das ${hourLabel(day.slots[0].time)}</strong>.</span></p>` : ''}
  `;
}

function selectDay(date) {
  state.idempotencyKey = crypto.randomUUID();
  const day = state.days.find((d) => d.date === date);
  if (!day || !day.slots.length) return;
  state.date = date;
  state.time = day.slots[0].time;
  document.querySelectorAll('.dia').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.date === date));
  });
  $('#etapa-quando').classList.add('feita');
  renderDayNote();
  renderSummary();
  revealStep('#etapa-dados');
}

function renderSummary() {
  const s = state.service;
  $('#resumo').innerHTML = html`
    <p class="resumo__servico">${s.name}</p>
    <p class="resumo__quando">${capitalize(formatDateLong(state.date))}</p>
    <p>Chegada a partir das ${hourLabel(state.time)} · ${s.priceFrom ? 'a partir de ' : ''}${formatPrice(s.priceCents)}, pago na estética</p>
  `;
}

// ---------------------------------------------------------------------------
// Ficha

const fields = {
  name: () => $('#f-nome'),
  phone: () => $('#f-whats'),
  vehicle: () => $('#f-carro'),
  plate: () => $('#f-placa'),
  notes: () => $('#f-obs'),
};

function readRememberedClient() {
  try {
    return JSON.parse(window.localStorage.getItem(CLIENT_KEY) || 'null');
  } catch {
    return null;
  }
}

function rememberClient(data) {
  try {
    window.localStorage.setItem(CLIENT_KEY, JSON.stringify(data));
  } catch {
    // Sem armazenamento: só não lembra na próxima visita.
  }
}

function prefill(data) {
  if (!data) return;
  if (data.name) fields.name().value = data.name;
  if (data.phone) fields.phone().value = formatPhone(data.phone);
  if (data.vehicle) fields.vehicle().value = data.vehicle;
  if (data.plate) fields.plate().value = formatPlate(data.plate);
}

function setFieldError(name, message) {
  const input = fields[name]?.();
  const error = $(`#e-${name}`);
  if (!input || !error) return;
  const wrapper = input.closest('.campo');
  if (message) {
    wrapper.dataset.erro = '';
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', error.id);
    error.innerHTML = html`${icon('circle-alert')}<span>${message}</span>`;
    error.hidden = false;
  } else {
    delete wrapper.dataset.erro;
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
    error.hidden = true;
  }
}

function clientValidate(data) {
  const errors = {};
  if (!data.name || data.name.trim().length < 2) errors.name = 'Diga seu nome para a gente te chamar.';
  if (!isValidPhone(data.phone)) errors.phone = 'Confira o WhatsApp: DDD e número, ex.: (81) 91234-5678.';
  if (!data.vehicle || data.vehicle.trim().length < 2) errors.vehicle = 'Diga qual é o carro (modelo e cor).';
  return errors;
}

function showErrors(errors) {
  ['name', 'phone', 'vehicle'].forEach((name) => setFieldError(name, errors[name]));
  const box = $('#ficha-erro');
  const count = Object.keys(errors).length;
  if (!count) {
    box.hidden = true;
    return;
  }
  box.innerHTML = html`${icon('circle-alert')}<span>${count === 1 ? 'Falta um detalhe' : 'Faltam alguns detalhes'} para confirmar. Confira ${count === 1 ? 'o campo marcado' : 'os campos marcados'}.</span>`;
  box.hidden = false;
  const first = ['name', 'phone', 'vehicle'].find((name) => errors[name]);
  fields[first]().focus();
}

async function submit(event) {
  event.preventDefault();
  if (state.submitting || !state.service || !state.time) return;
  const data = {
    serviceId: state.service.id,
    date: state.date,
    start: state.time,
    name: fields.name().value.trim(),
    phone: fields.phone().value,
    vehicle: fields.vehicle().value.trim(),
    plate: fields.plate().value,
    notes: fields.notes().value,
    returnToken: state.invite && !state.invite.alreadyBooked ? state.invite.token : undefined,
    idempotencyKey: state.idempotencyKey,
  };
  const errors = clientValidate(data);
  showErrors(errors);
  if (Object.keys(errors).length) return;

  const button = $('#confirmar');
  state.submitting = true;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  button.querySelector('.placa-botao__texto').textContent = 'Agendando…';

  try {
    const result = await api.createBooking(data);
    if ($('#lembrar-dados').checked) rememberClient({ name: data.name, phone: data.phone, vehicle: data.vehicle, plate: data.plate });
    else { try { localStorage.removeItem(CLIENT_KEY); } catch {} }
    renderPainted(result);
  } catch (error) {
    if (error.code === 'SLOT_TAKEN') {
      state.idempotencyKey = crypto.randomUUID();
      state.time = null;
      $('#etapa-dados').hidden = true;
      $('#etapa-quando').classList.remove('feita');
      const days = await api.getAvailability(state.service.id).catch(() => state.days);
      state.days = days;
      // O dia lotou: o cliente escolhe outro.
      if (!days.find((d) => d.date === state.date)?.slots.length) state.date = null;
      renderDays();
      renderDayNote(error.message);
      $('#etapa-quando').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    } else if (error.fields) {
      showErrors(error.fields);
    } else if (error.code === 'CLOSED') {
      const box = $('#ficha-erro');
      box.innerHTML = html`${icon('circle-alert')}<span>${error.message}</span>`;
      box.hidden = false;
      box.focus();
    } else {
      const box = $('#ficha-erro');
      box.innerHTML = html`${icon('circle-alert')}<span>Não deu para confirmar agora. Seus dados continuam aqui; tente de novo em instantes.</span>`;
      box.hidden = false;
      box.focus();
    }
  } finally {
    state.submitting = false;
    button.disabled = false;
    button.removeAttribute('aria-busy');
    button.querySelector('.placa-botao__texto').textContent = 'Confirmar agendamento';
  }
}

// ---------------------------------------------------------------------------
// Pintado no muro

// Evento de dia inteiro: o agendamento é por dia, com chegada a partir da abertura.
const calendarDay = (date) => date.replace(/-/g, '');

function googleCalendarUrl({ appointment, service, shop }) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${service.name} · ${shop.name}`,
    dates: `${calendarDay(appointment.date)}/${calendarDay(addDays(appointment.date, 1))}`,
    ctz: 'America/Sao_Paulo',
    location: shop.address || '',
    details: `Traga o carro a partir das ${hourLabel(appointment.start)}. Carro: ${appointment.vehicle}${appointment.plate ? ` (${appointment.plate})` : ''}. Código: ${appointment.code}.`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function icsFile({ appointment, service, shop }) {
  const escape = (text) => String(text).replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const body = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Link de agendamento//PT-BR', 'BEGIN:VEVENT',
    `UID:${appointment.id}@agendamento`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${calendarDay(appointment.date)}`,
    `DTEND;VALUE=DATE:${calendarDay(addDays(appointment.date, 1))}`,
    `SUMMARY:${escape(`${service.name} · ${shop.name}`)}`,
    `LOCATION:${escape(shop.address || '')}`,
    `DESCRIPTION:${escape(`Traga o carro a partir das ${hourLabel(appointment.start)}. Carro: ${appointment.vehicle}. Código: ${appointment.code}.`)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  return URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }));
}

function renderPainted(result) {
  const { appointment: a, service, nextReturn, shop } = result;
  const date = parseISODate(a.date);
  const rel = formatRelativeDay(a.date);
  const dayWord = rel === 'hoje' || rel === 'amanhã' ? rel : WEEKDAYS[date.getDay()].replace('-feira', '');
  const shopMessage = `Oi! Agendei ${service.name.toLowerCase()} para ${formatDateLong(a.date)} (código ${a.code}).`;

  const section = $('#pintado');
  section.innerHTML = html`
    <h2 class="pintado__dia" id="pintado-titulo">
      <span class="visualmente-oculto">Agendamento confirmado:</span>
      <svg class="pintado__check" aria-hidden="true"><use href="#pincel-check"/></svg>
      <span class="tinta" style="--i:0">${dayWord}</span>
      <span class="tinta" style="--i:1">${formatDateShort(a.date)}</span>
      <span class="pintado__hora pintado__hora--chegada tinta" style="--i:2">a partir das ${hourLabel(a.start)}</span>
    </h2>
    <dl class="pintado__ficha">
      <div><dt>Serviço</dt><dd>${service.name}</dd></div>
      <div><dt>Carro</dt><dd>${a.vehicle}${a.plate ? ` · ${a.plate}` : ''}</dd></div>
      ${shop.address ? html`<div><dt>Onde</dt><dd>${addressHTML(shop.address)}</dd></div>` : ''}
      <div><dt>Código</dt><dd class="pintado__codigo">${a.code}</dd></div>
    </dl>
    ${nextReturn ? html`<p class="giz-nota giz-nota--retorno">${icon('repeat')}<span>Em <strong>${formatMonthYear(nextReturn.date)}</strong> é hora de ${nextReturn.action || 'voltar'}. A estética te chama no WhatsApp.</span></p>` : ''}
    <div class="pintado__acoes">
      <a class="placa-botao placa-botao--cal" href="${googleCalendarUrl({ appointment: a, service, shop })}" target="_blank" rel="noopener">${icon('calendar-plus')}Salvar na agenda</a>
      <div class="duas">
        ${shop.address ? html`<a class="botao-giz" href="${mapsUrl(shop.address)}" target="_blank" rel="noopener">${icon('navigation')}Como chegar</a>` : ''}
        ${shop.whatsapp ? html`<a class="botao-giz" href="${waLink(shop.whatsapp, shopMessage)}" target="_blank" rel="noopener">${icon('whatsapp')}WhatsApp</a>` : ''}
      </div>
    </div>
    <div class="pintado__mais">
      ${a.manageToken ? html`<a href="?reserva=${a.manageToken}">Consultar, remarcar ou cancelar este agendamento</a>` : ''}
      <a href="${icsFile(result)}" download="agendamento-${a.code}.ics">Usa iPhone ou Outlook? Baixe o arquivo da agenda</a>
      <button type="button" class="link-giz" data-acao="outro">Agendar outro serviço</button>
    </div>
  `;
  $('#agendar').hidden = true;
  section.hidden = false;
  $('#nota-giz').hidden = true;
  $('#nota-livre').hidden = true;
  if (state.invite) {
    state.invite = null;
    const url = new URL(window.location.href);
    url.searchParams.delete('retorno');
    window.history.replaceState(null, '', url);
  }
  section.scrollIntoView({ behavior: 'auto', block: 'start' });
  section.focus({ preventScroll: true });
}

function startOver() {
  state.idempotencyKey = crypto.randomUUID();
  state.service = null;
  state.date = null;
  state.time = null;
  $('#pintado').hidden = true;
  $('#pintado').innerHTML = '';
  $('#agendar').hidden = false;
  $('#etapa-quando').hidden = true;
  $('#etapa-dados').hidden = true;
  ['#etapa-servico', '#etapa-quando', '#etapa-dados'].forEach((s) => $(s).classList.remove('feita'));
  document.querySelectorAll('.servico').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  fields.notes().value = '';
  api.getPublicProfile().then((profile) => {
    state.profile = profile;
    renderHeader();
  });
  $('#etapa-servico').scrollIntoView({ block: 'start' });
}

// ---------------------------------------------------------------------------
// Eventos

function bindEvents() {
  $('#ficha').addEventListener('input', () => { if (!state.submitting) state.idempotencyKey = crypto.randomUUID(); });
  $('#limpar-dados').addEventListener('click', () => {
    try { localStorage.removeItem(CLIENT_KEY); } catch {}
    Object.values(fields).forEach(get => { get().value = ''; });
    $('#lembrar-dados').checked = false;
  });
  $('#tabela').addEventListener('click', (event) => {
    const button = event.target.closest('.servico');
    if (button && button.dataset.id) selectService(button.dataset.id);
  });
  $('#dias').addEventListener('click', (event) => {
    const button = event.target.closest('.dia');
    if (button && !button.disabled && button.dataset.date) selectDay(button.dataset.date);
  });
  $('#horarios').addEventListener('click', (event) => {
    if (event.target.closest('[data-acao="recarregar"]') && state.service) selectService(state.service.id, { scroll: false });
  });
  $('#pintado').addEventListener('click', (event) => {
    if (event.target.closest('[data-acao="outro"]')) startOver();
  });

  const phone = fields.phone();
  phone.addEventListener('input', () => {
    if (phone.selectionStart === phone.value.length) phone.value = formatPhone(phone.value);
    if (phone.closest('[data-erro]') && isValidPhone(phone.value)) setFieldError('phone', '');
  });
  phone.addEventListener('blur', () => { phone.value = formatPhone(phone.value); });

  const plate = fields.plate();
  plate.addEventListener('input', () => {
    const cursor = plate.selectionStart;
    plate.value = plate.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    plate.setSelectionRange(cursor, cursor);
  });
  plate.addEventListener('blur', () => { plate.value = formatPlate(plate.value); });

  ['name', 'vehicle'].forEach((name) => {
    fields[name]().addEventListener('input', (event) => {
      if (event.target.closest('[data-erro]') && event.target.value.trim().length >= 2) setFieldError(name, '');
    });
  });

  $('#ficha').addEventListener('submit', submit);
}

// ---------------------------------------------------------------------------

async function init() {
  renderSkeleton();
  bindEvents();
  const params = new URLSearchParams(window.location.search);
  const token = params.get('retorno');
  const reservation = params.get('reserva');
  const preset = params.get('servico');
  try {
    const [profile, invite] = await Promise.all([
      api.getPublicProfile(),
      token ? api.getReturnInvite(token).catch(() => null) : null,
    ]);
    state.profile = profile;
    state.invite = invite;
    renderHeader();
    renderServices();
    renderFooter();

    if (reservation) { await renderManaged(reservation); return; }

    if (profile.shop.bookingOpen === false) {
      // Agenda fechada: só a tabela de serviços, sem escolher horário.
    } else if (invite && !invite.alreadyBooked) {
      prefill(invite);
      selectService(invite.serviceId, { scroll: false });
    } else {
      prefill(readRememberedClient());
      if (preset) selectService(preset);
    }
  } catch {
    renderLoadError();
  }
}

async function renderManaged(token) {
  $('#agendar').hidden = true;
  const section = $('#pintado');
  section.hidden = false;
  try {
    const result = await api.getManagedBooking(token);
    const a = result.appointment;
    const days = result.canChange ? await api.getAvailability(a.serviceId) : [];
    section.innerHTML = html`<h2 class="etapa__titulo" id="pintado-titulo">Seu agendamento</h2>
      <p>${result.service.name} · ${formatDateLong(a.date)} · chegada ${a.start}</p>
      <p>${a.vehicle} · situação: ${a.status}</p>
      <p>${result.cancelNotice}</p>
      ${result.canChange ? html`<form id="gerir-reserva" class="ficha"><div class="campo"><label for="nova-data">Remarcar para</label>
        <select id="nova-data" name="date">${days.filter(d => d.slots.length).map(d => html`<option value="${d.date}">${formatDateLong(d.date)}</option>`)}</select></div>
        <button class="placa-botao" type="submit">Remarcar</button>
        <button class="botao-giz" type="button" id="cancelar-reserva">Cancelar agendamento</button></form>` : ''}
      <p id="gerir-status" role="status"></p><a class="link-giz" href="./">Voltar aos serviços</a>`;
    const status = $('#gerir-status');
    const form = $('#gerir-reserva');
    async function change(patch) {
      form.querySelectorAll('button').forEach(b => b.disabled = true);
      try { await api.manageBooking(token, patch); await renderManaged(token); }
      catch (error) { status.textContent = error.message; form.querySelectorAll('button').forEach(b => b.disabled = false); }
    }
    form?.addEventListener('submit', event => { event.preventDefault(); change({ action: 'remarcar', date: form.elements.date.value }); });
    $('#cancelar-reserva')?.addEventListener('click', () => { if (confirm('Cancelar este agendamento e liberar a vaga?')) change({ action: 'cancelar' }); });
  } catch (error) { section.innerHTML = html`<h2 id="pintado-titulo">Não foi possível abrir a reserva</h2><p>${error.message}</p><a href="./" class="link-giz">Voltar ao site</a>`; }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

// Mantém o "hoje" honesto se a página ficar aberta de um dia para o outro.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.profile && state.days[0] && state.days[0].date !== today()) {
    window.location.reload();
  }
});
