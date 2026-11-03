// Peças compartilhadas do painel.

import * as api from '../data/api.js';
import { diffDays, today } from '../core/dates.js';
import {
  formatDateLong, formatDateShort, formatDateShortYear, formatPhone, formatPrice, formatRelativeDay, html, raw, STATUS_LABELS,
} from '../core/format.js';
import { icon } from '../core/icons.js';
import { sizeLabel } from '../core/precos.js';
import { appointmentMessage, returnMessage, waLink } from '../core/whatsapp.js';

export { html, raw, icon };

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

export function placa(plate) {
  return plate ? html`<span class="placa-mini" aria-label="placa ${plate.split('').join(' ')}">${plate}</span>` : '';
}

export function hourLabel(hhmm) {
  const [h, m] = hhmm.split(':');
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`;
}


// ---------------------------------------------------------------------------
// Aviso flutuante com "Desfazer"

let toastTimer;
export function toast(message, { undo, duration = 5200 } = {}) {
  const box = $('#aviso');
  clearTimeout(toastTimer);
  box.innerHTML = html`<span>${message}</span>${undo ? html`<button type="button" class="btn btn--pequeno" data-desfazer>Desfazer</button>` : ''}`;
  box.hidden = false;
  if (undo) {
    $('[data-desfazer]', box).addEventListener('click', async () => {
      box.hidden = true;
      try { await undo(); } catch (error) { toast(error.message || 'Não deu para desfazer.'); }
    }, { once: true });
  }
  toastTimer = setTimeout(() => { box.hidden = true; }, duration);
}

// ---------------------------------------------------------------------------
// Estados

const STATUS = {
  agendado: null,
  confirmado: { cls: 'feito', icon: 'check', label: STATUS_LABELS.confirmado },
  recebido: { cls: 'feito', icon: 'check', label: STATUS_LABELS.recebido },
  em_servico: { cls: 'feito', icon: 'wrench', label: STATUS_LABELS.em_servico },
  pronto: { cls: 'feito', icon: 'check', label: STATUS_LABELS.pronto },
  concluido: { cls: 'feito', icon: 'check', label: STATUS_LABELS.concluido },
  faltou: { cls: 'faltou', icon: 'x', label: STATUS_LABELS.faltou },
  cancelado: { cls: 'cancelado', icon: 'ban', label: STATUS_LABELS.cancelado },
};

export function statusSelo(appointment) {
  const s = STATUS[appointment.status];
  if (!s) return '';
  return html`<span class="selo selo--${s.cls}">${icon(s.icon)}${s.label}${appointment.autoCompleted ? ' sozinho' : ''}</span>`;
}

export function dueLabel(ret) {
  const late = diffDays(ret.dueDate, today());
  if (late > 0) return html`<span class="selo selo--atraso">${icon('alarm-clock')}venceu há ${late} ${late === 1 ? 'dia' : 'dias'}</span>`;
  if (late === 0) return html`<span class="selo selo--hoje">${icon('alarm-clock')}vence hoje</span>`;
  const days = -late;
  return html`<span class="selo selo--retorno">${days === 1 ? 'amanhã' : `em ${days} dias`} · ${formatDateShortYear(ret.dueDate)}</span>`;
}

// ---------------------------------------------------------------------------
// Linha de agendamento

export function appointmentRow(a, { settings, showDate = false, highlight = false } = {}) {
  const isToday = a.date === today();
  const finished = ['concluido', 'faltou', 'cancelado'].includes(a.status);
  const canComplete = !finished && a.date <= today();
  const cls = ['item', `item--${{ concluido: 'feito', faltou: 'faltou', cancelado: 'cancelado' }[a.status] || 'aberto'}`, highlight ? 'item--novo' : ''].join(' ');
  const rel = formatRelativeDay(a.date);
  return html`
    <li class="${cls}" data-agendamento="${a.id}" data-status="${a.status}">
      <div class="item__hora">${showDate && !isToday ? html`<small>${rel}</small>` : ''}${a.start}<small>chegada</small></div>
      <div class="item__corpo">
        <p class="item__titulo">${a.vehicle} ${placa(a.plate)} ${statusSelo(a)}</p>
        <p class="item__sub">${a.service.name} · ${a.customer.name}${a.source === 'retorno' ? html` · <span class="selo selo--retorno">${icon('repeat')}voltou pelo retorno</span>` : ''}</p>
        ${a.size || a.addonName ? html`<p class="item__sub">${[a.size ? `Porte ${sizeLabel(a.size).toLowerCase()}` : '', a.addonName ? `com ${a.addonName}` : '', formatPrice(a.priceCents)].filter(Boolean).join(' · ')}</p>` : ''}
        ${a.notes ? html`<p class="item__nota">“${a.notes}”</p>` : ''}
        ${a.status === 'concluido' && a.plantedReturn ? html`<p class="item__sub">${icon('repeat')} Retorno em ${formatDateLong(a.plantedReturn.dueDate)}</p>` : ''}
      </div>
      <div class="item__acoes">
        ${canComplete ? html`<button type="button" class="btn btn--primario btn--pequeno" data-acao="concluir">${icon('check')}Concluir</button>` : ''}
        ${a.status === 'agendado' && !canComplete && a.customer.phone && settings ? html`<a class="btn btn--linha btn--pequeno" data-acao="link" href="${waLink(a.customer.phone, appointmentMessage({ settings, appointment: a, customer: a.customer, service: a.service }))}" target="_blank" rel="noopener">${icon('whatsapp')}Confirmar</a>` : ''}
        <details class="menu">
          <summary class="btn btn--texto btn--icone" aria-label="Mais ações para ${a.vehicle}">${icon('ellipsis')}</summary>
          <div class="menu__painel">
            <a class="btn btn--texto" href="#/novo?editar=${a.id}">${icon('pencil')}Editar / remarcar</a>
            ${!finished ? ['confirmado', 'recebido', 'em_servico', 'pronto'].filter(s => s !== a.status).map(s => html`<button type="button" class="btn btn--texto" data-acao="${s}">${STATUS[s].label}</button>`) : ''}
            ${a.customer.phone ? html`<a class="btn btn--texto" data-acao="link" href="${waLink(a.customer.phone)}" target="_blank" rel="noopener">${icon('whatsapp')}WhatsApp do cliente</a>` : ''}
            ${!finished ? html`
              <button type="button" class="btn btn--texto" data-acao="faltou">${icon('x')}Não veio</button>
              <button type="button" class="btn btn--texto btn--perigo" data-acao="cancelar">${icon('ban')}Cancelar horário</button>` : ''}
            ${finished ? html`<button type="button" class="btn btn--texto" data-acao="reabrir">${icon('undo-2')}Voltar para agendado</button>` : ''}
          </div>
        </details>
      </div>
    </li>`;
}

/** Liga os botões das linhas de agendamento dentro de `root`. */
export function bindAppointmentActions(root, onChange) {
  root.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-acao]');
    const row = event.target.closest('[data-agendamento]');
    if (!target || !row) return;
    const id = row.dataset.agendamento;
    const action = target.dataset.acao;

    if (action === 'link') return;

    const next = { concluir: 'concluido', faltou: 'faltou', cancelar: 'cancelado', reabrir: 'agendado', confirmado: 'confirmado', recebido: 'recebido', em_servico: 'em_servico', pronto: 'pronto' }[action];
    if (!next) return;
    target.closest('details')?.removeAttribute('open');
    if (target.disabled) return;
    target.disabled = true;
    target.setAttribute('aria-busy', 'true');
    try {
      const before = row.dataset.status;
      const result = await api.setAppointmentStatus(id, next);
      const undo = async () => { await api.setAppointmentStatus(id, before); onChange?.(); };
      if (next === 'concluido') {
        const when = result.planted ? ` Retorno marcado para ${formatDateLong(result.planted.dueDate)}.` : '';
        toast(`Concluído.${when}`, { undo });
      } else if (next === 'faltou') {
        toast('Marcado como “não veio”.', { undo });
      } else if (next === 'cancelado') {
        toast('Horário cancelado e liberado no link.', { undo });
      } else {
        toast(next === 'agendado' ? 'Voltou para agendado.' : 'Situação atualizada.');
      }
      onChange?.();
    } catch (error) {
      toast(error.message || 'Não deu para salvar. Tente de novo.');
    } finally {
      target.disabled = false;
      target.removeAttribute('aria-busy');
    }
  });
}

// ---------------------------------------------------------------------------
// Linha de retorno

export function returnRow(r, { settings, baseUrl, mode = 'avisar' }) {
  const message = returnMessage({ settings, ret: r, customer: r.customer, service: r.service, baseUrl });
  const phone = r.customer.phone;
  return html`
    <li class="item item--sem-hora" data-retorno="${r.id}">
      <div class="item__corpo">
        <p class="item__titulo">${r.customer.name} ${placa(r.plate)}
          ${mode === 'avisar' ? dueLabel(r) : ''}
          ${mode === 'aguardando' ? html`<span class="selo selo--avisado">${icon('whatsapp')}avisado ${r.notifiedAt ? formatRelativeDay(r.notifiedAt) : ''}</span>` : ''}
          ${mode === 'voltaram' && r.booked ? html`<span class="selo selo--feito">${icon('calendar')}${formatRelativeDay(r.booked.date)}, ${r.booked.start}</span>` : ''}
        </p>
        <p class="item__sub">${r.vehicle} · ${r.service.name} feita em ${formatDateShortYear(r.serviceDate)}${mode === 'mais-tarde' ? ` · retorno ${formatDateShortYear(r.dueDate)}` : ''}</p>
        ${mode !== 'voltaram' ? html`
          <details class="dobra">
            <summary>Ver mensagem ${icon('chevron-down')}</summary>
            <div class="dobra__conteudo"><p class="mensagem-previa">${message}</p></div>
          </details>` : ''}
      </div>
      ${mode !== 'voltaram' ? html`
        <div class="item__acoes">
          ${phone ? html`<a class="btn btn--whats btn--pequeno" data-acao="avisar" aria-label="${mode === 'aguardando' ? 'Chamar de novo' : 'Avisar'} ${r.customer.name} no WhatsApp" href="${waLink(phone, message)}" target="_blank" rel="noopener">${icon('whatsapp')}${mode === 'aguardando' ? 'Chamar de novo' : 'Avisar'}</a>` : html`<span class="selo selo--cancelado">sem WhatsApp</span>`}
          ${phone && mode !== 'aguardando' ? html`<button type="button" class="btn btn--linha btn--pequeno" data-acao="enviado">Marcar como enviado</button>` : ''}
          <a class="btn btn--linha btn--pequeno" href="#/novo?retorno=${r.id}">${icon('calendar-plus')}Agendar</a>
          <details class="menu">
            <summary class="btn btn--texto btn--icone" aria-label="Mais ações para o retorno de ${r.customer.name}">${icon('ellipsis')}</summary>
            <div class="menu__painel">
              <button type="button" class="btn btn--texto" data-acao="adiar" data-dias="7">${icon('alarm-clock')}Lembrar em 7 dias</button>
              <button type="button" class="btn btn--texto" data-acao="adiar" data-dias="30">${icon('alarm-clock')}Lembrar em 30 dias</button>
              <button type="button" class="btn btn--texto btn--perigo" data-acao="descartar">${icon('trash')}Tirar da fila</button>
            </div>
          </details>
        </div>` : ''}
    </li>`;
}

export function bindReturnActions(root, onChange) {
  root.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-acao]');
    const row = event.target.closest('[data-retorno]');
    if (!target || !row) return;
    const id = row.dataset.retorno;
    const action = target.dataset.acao;

    if (action === 'avisar') {
      toast('O WhatsApp foi aberto. Após enviar, toque em “Marcar como enviado”.');
      return;
    }
    if (target.disabled) return;
    target.disabled = true;
    try {
    if (action === 'enviado') {
      const before = await api.getReturnMessageData(id);
      await api.markReturnNotified(id);
      toast('Marcado como avisado. Ele sai da fila de hoje.', {
        undo: async () => { await api.setReturnStatus(id, before.ret.status); onChange?.(); },
      });
      setTimeout(() => onChange?.(), 400);
      return;
    }
    target.closest('details')?.removeAttribute('open');
    if (action === 'adiar') {
      const days = Number(target.dataset.dias);
      await api.snoozeReturn(id, days);
      toast(`Vai voltar para a fila em ${days} dias.`);
      onChange?.();
    }
    if (action === 'descartar') {
      await api.setReturnStatus(id, 'descartado');
      toast('Retorno tirado da fila.', {
        undo: async () => { await api.setReturnStatus(id, 'pendente'); onChange?.(); },
      });
      onChange?.();
    }
    } catch (error) { toast(error.message || 'Não deu para atualizar o retorno.'); }
    finally { target.disabled = false; }
  });
}

// ---------------------------------------------------------------------------
// Erros de formulário

export function showFieldErrors(form, fields = {}) {
  $$('.campo[data-erro]', form).forEach((campo) => {
    delete campo.dataset.erro;
    campo.querySelector('.campo__erro')?.remove();
    campo.querySelectorAll('[aria-invalid]').forEach((el) => { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); });
  });
  let first = null;
  for (const [name, message] of Object.entries(fields)) {
    const input = form.querySelector(`[name="${name}"]`);
    if (!input) continue;
    const campo = input.closest('.campo');
    campo.dataset.erro = '';
    input.setAttribute('aria-invalid', 'true');
    const p = document.createElement('p');
    p.className = 'campo__erro';
    p.id = `erro-${name}`;
    p.innerHTML = String(html`${icon('circle-alert')}<span>${message}</span>`);
    input.setAttribute('aria-describedby', p.id);
    campo.append(p);
    first ||= input;
  }
  first?.focus();
}

export function phoneDisplay(phone) {
  return phone ? formatPhone(phone) : '';
}

export function bindSubmit(form, action) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    if (button?.disabled) return;
    if (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); }
    try { await action(event); }
    catch (error) { if (error.fields) showFieldErrors(form, error.fields); else toast(error.message || 'Não deu para salvar. Tente de novo.'); }
    finally { if (button) { button.disabled = false; button.removeAttribute('aria-busy'); } }
  });
}
