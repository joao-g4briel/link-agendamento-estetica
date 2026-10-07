// Novo agendamento pelo painel: para quem chamou no WhatsApp ou passou na porta.

import * as api from '../data/api.js';
import { addDays, today } from '../core/dates.js';
import { formatDateLong, formatDuration, formatPhone, formatPlate, formatPrice } from '../core/format.js';
import { $, capitalize, html, icon, showFieldErrors, toast } from './ui.js';

export default async function novo(root, { params }) {
  const [services, { settings }] = await Promise.all([api.listServices(), api.getSettings()]);
  const active = services.filter((s) => s.active);

  // Pré-preenchimento: cliente da busca ou retorno da fila.
  let preset = { serviceId: active[0]?.id, name: '', phone: '', vehicle: '', plate: '', returnToken: undefined };
  if (params.get('cliente')) {
    const customers = await api.listCustomers();
    const c = customers.find((x) => x.id === params.get('cliente'));
    if (c) {
      const car = c.cars[c.cars.length - 1] || {};
      preset = { ...preset, name: c.name, phone: c.phone, vehicle: car.vehicle || '', plate: car.plate || '' };
    }
  }
  if (params.get('retorno')) {
    try {
      const { ret } = await api.getReturnMessageData(params.get('retorno'));
      preset = {
        serviceId: ret.serviceId, name: ret.customer.name, phone: ret.customer.phone,
        vehicle: ret.vehicle, plate: ret.plate, returnToken: ret.token,
      };
    } catch {
      // Retorno sumiu: segue com o formulário vazio.
    }
  }

  const state = { date: params.get('data') || today(), time: null, encaixe: false };

  root.innerHTML = String(html`
    <div class="faixa">
      <div class="faixa__topo"><h1 class="faixa__titulo">Novo agendamento</h1></div>
      <p class="faixa__sub">${preset.returnToken ? `Retorno de ${preset.name}: o serviço já vem escolhido.` : 'Para quem chamou no WhatsApp ou passou na porta. Entra na agenda e some do link na hora.'}</p>
    </div>
    ${active.length ? '' : html`<section class="secao"><p class="vazio">Cadastre um serviço antes. <a href="#/servicos/novo">Criar serviço</a></p></section>`}
    <form class="form" id="form-novo" novalidate ${active.length ? '' : html`hidden`}>
      <fieldset class="form__grupo">
        <legend>Serviço e horário</legend>
        <div class="form__linha form__linha--2">
          <div class="campo">
            <label for="n-servico">Serviço</label>
            <select id="n-servico" name="serviceId">
              ${active.map((s) => html`<option value="${s.id}" ${s.id === preset.serviceId ? html`selected` : ''}>${s.name} · ${formatDuration(s.durationMin)} · ${formatPrice(s.priceCents)}</option>`)}
            </select>
          </div>
          <div class="campo">
            <label for="n-dia">Dia</label>
            <input id="n-dia" name="date" type="date" min="${today()}" max="${addDays(today(), 365)}" value="${state.date}">
          </div>
        </div>
        <div class="campo">
          <span class="campo__rotulo" id="n-horarios-rotulo">Horários livres</span>
          <div id="n-horarios" aria-labelledby="n-horarios-rotulo" aria-live="polite"></div>
        </div>
        <label class="check"><input type="checkbox" name="encaixe" id="n-encaixe">
          <span>Encaixe em outro horário<small>Ignora vagas e horário de funcionamento. Use quando você sabe que dá.</small></span></label>
        <div class="campo" id="n-encaixe-campo" hidden>
          <label for="n-hora">Hora do encaixe</label>
          <input id="n-hora" name="startManual" type="time" step="900" value="08:00">
        </div>
      </fieldset>
      <fieldset class="form__grupo">
        <legend>Cliente e carro</legend>
        <div class="form__linha form__linha--2">
          <div class="campo"><label for="n-nome">Nome</label><input id="n-nome" name="name" value="${preset.name}" autocomplete="off" autocapitalize="words"></div>
          <div class="campo"><label for="n-whats">WhatsApp</label><input id="n-whats" name="phone" type="tel" inputmode="numeric" value="${formatPhone(preset.phone)}" placeholder="(11) 91234-5678"></div>
          <div class="campo"><label for="n-carro">Carro</label><input id="n-carro" name="vehicle" value="${preset.vehicle}" placeholder="Modelo e cor"></div>
          <div class="campo"><label for="n-placa">Placa <span class="campo__dica">(opcional)</span></label><input id="n-placa" name="plate" value="${preset.plate}" autocapitalize="characters" spellcheck="false" maxlength="8" placeholder="ABC1D23"></div>
        </div>
        <div class="campo"><label for="n-obs">Observação <span class="campo__dica">(opcional)</span></label><textarea id="n-obs" name="notes" rows="2"></textarea></div>
      </fieldset>
      <div class="form__acoes">
        <button type="submit" class="btn btn--primario" id="n-salvar">${icon('check')}Agendar</button>
        <a class="btn btn--texto" href="#/agenda">Cancelar</a>
        <span class="campo__dica" id="n-resumo"></span>
      </div>
    </form>
  `);

  if (!active.length) return null;

  const form = $('#form-novo', root);
  const slotsBox = $('#n-horarios', root);
  const summary = $('#n-resumo', root);

  function updateSummary() {
    const s = active.find((x) => x.id === form.serviceId.value);
    const time = state.encaixe ? form.startManual.value : state.time;
    summary.textContent = s && time ? `${capitalize(formatDateLong(state.date))}, às ${time} · ${s.name}` : '';
  }

  async function loadSlots() {
    state.time = null;
    updateSummary();
    if (!form.date.value) {
      slotsBox.innerHTML = String(html`<p class="campo__dica">Escolha um dia.</p>`);
      return;
    }
    state.date = form.date.value;
    slotsBox.innerHTML = String(html`<p class="campo__dica">Procurando horários…</p>`);
    const day = await api.getSlotsForPanel(form.serviceId.value, state.date);
    if (!day.slots.length) {
      const why = { fechado: 'A estética está fechada nesse dia.', passou: 'Esse dia já passou.', lotado: 'Sem horário livre nesse dia.', 'não cabe no dia': 'O serviço não cabe no horário desse dia.' }[day.reason] || `Folga: ${day.reason}.`;
      slotsBox.innerHTML = String(html`<p class="campo__dica">${why} Escolha outro dia ou use o encaixe.</p>`);
      return;
    }
    slotsBox.innerHTML = String(html`<div class="slots">${day.slots.map((s) => html`<button type="button" class="slot" data-hora="${s.time}" aria-pressed="false">${s.time}</button>`)}</div>`);
  }

  slotsBox.addEventListener('click', (event) => {
    const button = event.target.closest('.slot');
    if (!button) return;
    state.time = button.dataset.hora;
    slotsBox.querySelectorAll('.slot').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    updateSummary();
  });

  form.serviceId.addEventListener('change', loadSlots);
  form.date.addEventListener('change', loadSlots);
  form.encaixe.addEventListener('change', () => {
    state.encaixe = form.encaixe.checked;
    $('#n-encaixe-campo', root).hidden = !state.encaixe;
    slotsBox.closest('.campo').hidden = state.encaixe;
    updateSummary();
  });
  form.startManual.addEventListener('input', updateSummary);
  form.phone.addEventListener('blur', () => { form.phone.value = formatPhone(form.phone.value); });
  form.plate.addEventListener('blur', () => { form.plate.value = formatPlate(form.plate.value); });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const start = state.encaixe ? form.startManual.value : state.time;
    const data = {
      serviceId: form.serviceId.value,
      date: form.date.value,
      start,
      name: $('#n-nome', root).value,
      phone: form.phone.value,
      vehicle: form.vehicle.value,
      plate: form.plate.value,
      notes: form.notes.value,
      returnToken: preset.returnToken,
    };
    if (!start) {
      toast('Escolha um horário livre ou marque o encaixe.');
      (slotsBox.querySelector('.slot') || form.date).focus();
      return;
    }
    const button = $('#n-salvar', root);
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    try {
      const { appointment } = await api.createBooking(data, { source: 'painel', force: state.encaixe });
      toast(`Agendado: ${formatDateLong(appointment.date)}, às ${appointment.start}.`);
      window.location.hash = appointment.date === today() ? '#/' : `#/agenda?semana=${appointment.date}`;
    } catch (error) {
      if (error.fields) {
        const map = { ...error.fields };
        delete map.start;
        delete map.serviceId;
        showFieldErrors(form, map);
        if (error.fields.start) toast(error.fields.start);
      } else {
        toast(error.message || 'Não deu para agendar.');
        if (error.code === 'SLOT_TAKEN') loadSlots();
      }
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  });

  await loadSlots();
  return null;
}
