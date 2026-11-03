// Novo agendamento pelo painel: para quem chamou no WhatsApp ou passou na porta.

import * as api from '../data/api.js';
import { addDays, today } from '../core/dates.js';
import { formatDateLong, formatPhone, formatPlate, formatPrice } from '../core/format.js';
import { $, capitalize, html, icon, showFieldErrors, toast } from './ui.js';

export default async function novo(root, { params }) {
  const [services, { settings }] = await Promise.all([api.listServices(), api.getSettings()]);
  const active = services.filter((s) => s.active);
  const editId = params.get('editar');
  let cars = [];

  // Pré-preenchimento: cliente da busca ou retorno da fila.
  let preset = { serviceId: active[0]?.id, name: '', phone: '', vehicle: '', plate: '', returnToken: undefined };
  if (params.get('cliente')) {
    const c = await api.getCustomer(params.get('cliente'));
    if (c) {
      cars = c.cars;
      const car = c.cars[c.cars.length - 1] || {};
      preset = { ...preset, name: c.name, phone: c.phone, vehicle: car.vehicle || '', plate: car.plate || '', vehicleId: car.id };
    }
  }
  if (params.get('retorno')) {
    try {
      const { ret } = await api.getReturnMessageData(params.get('retorno'));
      preset = {
        serviceId: ret.serviceId, name: ret.customer.name, phone: ret.customer.phone,
        vehicle: ret.vehicle, plate: ret.plate, returnToken: ret.token, vehicleId: ret.vehicleId,
      };
    } catch {
      // Retorno sumiu: segue com o formulário vazio.
    }
  }

  if (editId) {
    const a = await api.getAppointment(editId);
    if (!active.some(s => s.id === a.serviceId)) active.push(a.service);
    preset = { ...a, name: a.customer.name, phone: a.customer.phone, returnToken: undefined };
  }
  const state = { date: preset.date || params.get('data') || today(), time: null, encaixe: false, key: crypto.randomUUID() };

  root.innerHTML = String(html`
    <div class="faixa">
      <div class="faixa__topo"><h1 class="faixa__titulo">${editId ? 'Editar / remarcar' : 'Novo agendamento'}</h1></div>
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
              ${active.map((s) => html`<option value="${s.id}" ${s.id === preset.serviceId ? html`selected` : ''}>${s.name} · ${formatPrice(s.priceCents)}</option>`)}
            </select>
          </div>
          <div class="campo">
            <label for="n-dia">Dia</label>
            <input id="n-dia" name="date" type="date" min="${today()}" max="${addDays(today(), 365)}" value="${state.date}">
          </div>
        </div>
        <div class="campo">
          <span class="campo__rotulo" id="n-horarios-rotulo">Horários de chegada</span>
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
        ${cars.length ? html`<div class="campo"><label for="n-veiculo">Veículo do cliente</label><select id="n-veiculo">${cars.map(c => html`<option value="${c.id}" ${c.id === preset.vehicleId ? html`selected` : ''}>${c.vehicle} ${c.plate || ''}</option>`)}<option value="">Outro veículo</option></select></div>` : ''}
        <div class="form__linha form__linha--2">
          <div class="campo"><label for="n-nome">Nome</label><input id="n-nome" name="name" value="${preset.name}" autocomplete="off" autocapitalize="words"></div>
          <div class="campo"><label for="n-whats">WhatsApp</label><input id="n-whats" name="phone" type="tel" inputmode="numeric" value="${formatPhone(preset.phone)}" placeholder="(81) 91234-5678"></div>
          <div class="campo"><label for="n-carro">Carro</label><input id="n-carro" name="vehicle" value="${preset.vehicle}" placeholder="Modelo e cor"></div>
          <div class="campo"><label for="n-placa">Placa <span class="campo__dica">(opcional)</span></label><input id="n-placa" name="plate" value="${preset.plate}" autocapitalize="characters" spellcheck="false" maxlength="8" placeholder="ABC1D23"></div>
        </div>
        <div class="campo"><label for="n-obs">Observação <span class="campo__dica">(opcional)</span></label><textarea id="n-obs" name="notes" rows="2" maxlength="300">${preset.notes || ''}</textarea></div>
      </fieldset>
      <div class="form__acoes">
        <button type="submit" class="btn btn--primario" id="n-salvar">${icon('check')}${editId ? 'Salvar e remarcar' : 'Agendar'}</button>
        <a class="btn btn--texto" href="#/agenda">Cancelar</a>
        <span class="campo__dica" id="n-resumo"></span>
      </div>
    </form>
  `);

  if (!active.length) return null;

  const form = $('#form-novo', root);
  const slotsBox = $('#n-horarios', root);
  const summary = $('#n-resumo', root);
  let sequence = 0;
  let selectedBeforeLoad = preset.start;
  // Editando sem trocar o dia, a chegada original continua valendo mesmo sem vaga livre.
  const keptArrival = () => (editId && form.date.value === preset.date ? preset.start : null);
  const chosenTime = () => (state.encaixe ? form.startManual.value : state.time || keptArrival());
  $('#n-veiculo', root)?.addEventListener('change', event => {
    const car = cars.find(c => c.id === event.target.value);
    preset.vehicleId = car?.id;
    form.elements.vehicle.value = car?.vehicle || '';
    form.elements.plate.value = car?.plate || '';
  });

  function updateSummary() {
    const s = active.find((x) => x.id === form.serviceId.value);
    const time = chosenTime();
    summary.textContent = s && time ? `${capitalize(formatDateLong(state.date))}, às ${time} · ${s.name}` : '';
  }

  async function loadSlots() {
    const request = ++sequence;
    state.time = null;
    updateSummary();
    if (!form.date.value) {
      slotsBox.innerHTML = String(html`<p class="campo__dica">Escolha um dia.</p>`);
      return;
    }
    state.date = form.date.value;
    slotsBox.innerHTML = String(html`<p class="campo__dica">Procurando horários…</p>`);
    let day;
    try { day = await api.getSlotsForPanel(form.serviceId.value, state.date, editId); }
    catch (error) {
      if (request !== sequence) return;
      slotsBox.innerHTML = String(html`<p class="campo__dica">${error.message}</p><button type="button" class="btn btn--linha" data-retry>Tentar de novo</button>`);
      return;
    }
    if (request !== sequence) return;
    if (!day.slots.length) {
      const why = { fechado: 'A estética está fechada nesse dia.', passou: 'Esse dia já passou.', lotado: 'Dia lotado: limite diário atingido.', encerrado: 'Não há mais horários de chegada neste dia.' }[day.reason] || `Folga: ${day.reason}.`;
      slotsBox.innerHTML = String(keptArrival()
        ? html`<p class="campo__dica">Chegada mantida às ${keptArrival()}. Para remarcar, escolha outro dia.</p>`
        : html`<p class="campo__dica">${why} Escolha outro dia ou use o encaixe.</p>`);
      updateSummary();
      return;
    }
    slotsBox.innerHTML = String(html`<div class="slots">${day.slots.map((s) => html`<button type="button" class="slot" data-hora="${s.time}" aria-pressed="false">${s.time}</button>`)}</div>`);
    if (selectedBeforeLoad) { slotsBox.querySelector(`[data-hora="${selectedBeforeLoad}"]`)?.click(); selectedBeforeLoad = null; }
    updateSummary();
  }

  slotsBox.addEventListener('click', (event) => {
    if (event.target.closest('[data-retry]')) { loadSlots(); return; }
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
  form.addEventListener('input', () => { if (!$('#n-salvar', root).disabled) state.key = crypto.randomUUID(); });
  form.phone.addEventListener('blur', () => { form.phone.value = formatPhone(form.phone.value); });
  form.plate.addEventListener('blur', () => { form.plate.value = formatPlate(form.plate.value); });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const start = chosenTime();
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
      vehicleId: preset.vehicleId,
      idempotencyKey: state.key,
    };
    if (!start) {
      toast('Escolha um horário livre ou marque o encaixe.');
      (slotsBox.querySelector('.slot') || form.date).focus();
      return;
    }
    const button = $('#n-salvar', root);
    if (button.disabled) return;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    try {
      const { appointment } = editId ? await api.editAppointment(editId, data, state.encaixe) : await api.createBooking(data, { source: 'painel', force: state.encaixe });
      toast(`${editId ? 'Alterações salvas' : 'Agendado'}: ${formatDateLong(appointment.date)}, às ${appointment.start}.`);
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
