// API usada pelas telas. Hoje responde a partir do placeholder (store.js);
// quando houver backend, troque o corpo de cada função por um fetch() para o
// endpoint equivalente — as telas não precisam mudar.

import { blockFor, dayLoad, daySlots, firstFree, hoursFor, rangeSlots } from '../core/availability.js';
import { addDays, addInterval, diffDays, nowMinutes, parseInterval, toMinutes, today } from '../core/dates.js';
import { formatPlate, isValidPhone, normalizePhone } from '../core/format.js';
import { load, mutate, reset, subscribe } from './store.js';

export { subscribe };

export class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const latency = (min = 120, spread = 180) =>
  new Promise((resolve) => setTimeout(resolve, min + Math.random() * spread));

const clone = (value) => JSON.parse(JSON.stringify(value));
const uid = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const SAFE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = (size) => Array.from({ length: size }, () => SAFE[Math.floor(Math.random() * SAFE.length)]).join('');

function activeServices(db) {
  return db.services.filter((s) => s.active).sort((a, b) => a.order - b.order);
}

function findService(db, id) {
  const service = db.services.find((s) => s.id === id);
  if (!service) throw new ApiError('NOT_FOUND', 'Esse serviço não existe mais.');
  return service;
}

function nowRef() {
  return { date: today(), minutes: nowMinutes() };
}

function baseContext(db) {
  return { settings: db.settings, appointments: db.appointments, blocks: db.blocks, now: nowRef() };
}

// ---------------------------------------------------------------------------
// Link público
// ---------------------------------------------------------------------------

export async function getPublicProfile() {
  await latency(60, 80);
  const db = load();
  const services = activeServices(db);
  const shortest = services.reduce((min, s) => (!min || s.durationMin < min.durationMin ? s : min), null);
  const next = shortest
    ? firstFree({ ...baseContext(db), duration: shortest.durationMin })
    : null;
  const { name, tagline, address, whatsapp, instagram, hours, horizonDays, capacity, isExample } = db.settings;
  return clone({
    shop: { name, tagline, address, whatsapp, instagram, hours, horizonDays, capacity, isExample },
    services,
    nextFree: next,
  });
}

export async function getAvailability(serviceId, from = today(), days) {
  await latency();
  const db = load();
  const service = findService(db, serviceId);
  return rangeSlots({
    ...baseContext(db),
    from,
    days: days || db.settings.horizonDays || 30,
    duration: service.durationMin,
  });
}

/** Convite de retorno (link mandado pelo WhatsApp). */
export async function getReturnInvite(token) {
  await latency(60, 80);
  const db = load();
  const ret = db.returns.find((r) => r.token === token);
  if (!ret || ret.status === 'descartado') return null;
  const customer = db.customers.find((c) => c.id === ret.customerId);
  const service = db.services.find((s) => s.id === ret.serviceId && s.active);
  if (!customer || !service) return null;
  return clone({
    token,
    alreadyBooked: ret.status === 'reagendado',
    serviceId: service.id,
    serviceName: service.name,
    returnAction: service.returnAction,
    serviceDate: ret.serviceDate,
    name: customer.name,
    phone: customer.phone,
    vehicle: ret.vehicle,
    plate: ret.plate,
  });
}

function upsertCustomer(db, name, phone) {
  const digits = normalizePhone(phone);
  let customer = db.customers.find((c) => c.phone === digits);
  if (customer) {
    customer.name = name;
  } else {
    customer = { id: uid('cli'), name, phone: digits, createdAt: today() };
    db.customers.push(customer);
  }
  return customer;
}

function validateBooking(input) {
  const errors = {};
  if (!input.serviceId) errors.serviceId = 'Escolha um serviço.';
  if (!input.date || !input.start) errors.start = 'Escolha um dia e um horário.';
  if (!input.name || input.name.trim().length < 2) errors.name = 'Diga seu nome para a gente te chamar.';
  if (!isValidPhone(input.phone)) errors.phone = 'Confira o WhatsApp: DDD e número, só com dígitos.';
  if (!input.vehicle || input.vehicle.trim().length < 2) errors.vehicle = 'Diga qual é o carro (modelo e cor).';
  if (Object.keys(errors).length) {
    const error = new ApiError('INVALID', 'Faltou preencher alguns campos.');
    error.fields = errors;
    throw error;
  }
}

/**
 * Cria o agendamento. Valida de novo o horário (pode ter sido ocupado
 * enquanto o cliente preenchia). `force` permite encaixe pelo painel.
 */
export async function createBooking(input, { source = 'link', force = false } = {}) {
  await latency(260, 240);
  validateBooking(input);
  return mutate((db) => {
    const service = findService(db, input.serviceId);
    if (!force) {
      const day = daySlots({ ...baseContext(db), date: input.date, duration: service.durationMin });
      if (!day.slots.some((s) => s.time === input.start)) {
        throw new ApiError('SLOT_TAKEN', 'Esse horário acabou de ser ocupado. Escolha outro, por favor.');
      }
    }
    const customer = upsertCustomer(db, input.name.trim(), input.phone);
    const appointment = {
      id: uid('ag'),
      code: code(4),
      customerId: customer.id,
      serviceId: service.id,
      date: input.date,
      start: input.start,
      durationMin: service.durationMin,
      priceCents: service.priceCents,
      vehicle: input.vehicle.trim(),
      plate: formatPlate(input.plate || ''),
      notes: (input.notes || '').trim(),
      status: 'agendado',
      source: input.returnToken ? 'retorno' : source,
      createdAt: today(),
      completedAt: null,
    };
    db.appointments.push(appointment);

    // Quem volta para o mesmo serviço fecha o retorno que estava aberto.
    for (const ret of db.returns) {
      const sameReturn = input.returnToken && ret.token === input.returnToken;
      const sameCustomer = ret.customerId === customer.id && ret.serviceId === service.id;
      if ((sameReturn || sameCustomer) && (ret.status === 'pendente' || ret.status === 'avisado')) {
        ret.status = 'reagendado';
        ret.bookedAppointmentId = appointment.id;
      }
    }

    return clone({
      appointment,
      service,
      customer,
      nextReturn: service.returnInterval
        ? { date: addInterval(input.date, service.returnInterval), action: service.returnAction }
        : null,
      shop: { name: db.settings.name, address: db.settings.address, whatsapp: db.settings.whatsapp },
    });
  });
}

// ---------------------------------------------------------------------------
// Painel
// ---------------------------------------------------------------------------

function plantReturn(db, appointment) {
  const service = db.services.find((s) => s.id === appointment.serviceId);
  if (!service || !service.returnInterval) return null;
  // Um retorno aberto por cliente + serviço: o mais novo substitui o anterior.
  for (const ret of db.returns) {
    if (ret.customerId === appointment.customerId && ret.serviceId === service.id &&
        (ret.status === 'pendente' || ret.status === 'avisado')) {
      ret.status = 'descartado';
    }
  }
  const ret = {
    id: uid('ret'),
    token: code(10).toLowerCase(),
    customerId: appointment.customerId,
    serviceId: service.id,
    appointmentId: appointment.id,
    vehicle: appointment.vehicle,
    plate: appointment.plate,
    serviceDate: appointment.date,
    dueDate: addInterval(appointment.date, service.returnInterval),
    status: 'pendente',
    notifiedAt: null,
    bookedAppointmentId: null,
    createdAt: today(),
  };
  db.returns.push(ret);
  return ret;
}

/** Dias que já terminaram com carro "agendado" viram "concluído" sozinhos. */
function autoComplete(db) {
  if (!db.settings.autoComplete) return;
  const t = today();
  for (const a of db.appointments) {
    if (a.status === 'agendado' && a.date < t) {
      a.status = 'concluido';
      a.completedAt = a.date;
      a.autoCompleted = true;
      plantReturn(db, a);
    }
  }
}

function syncedDb() {
  const db = load();
  if (db.appointments.some((a) => a.status === 'agendado' && a.date < today()) && db.settings.autoComplete) {
    return mutate((d) => { autoComplete(d); return d; });
  }
  return db;
}

function expandAppointment(db, a) {
  return {
    ...a,
    end: toMinutes(a.start) + a.durationMin,
    customer: db.customers.find((c) => c.id === a.customerId) || { name: 'Cliente removido', phone: '' },
    service: db.services.find((s) => s.id === a.serviceId) || { name: 'Serviço removido' },
    plantedReturn: db.returns.find((r) => r.appointmentId === a.id && r.status !== 'descartado') || null,
  };
}

function expandReturn(db, r) {
  const t = today();
  return {
    ...r,
    customer: db.customers.find((c) => c.id === r.customerId) || { name: 'Cliente removido', phone: '' },
    service: db.services.find((s) => s.id === r.serviceId) || { name: 'Serviço removido' },
    daysLate: diffDays(r.dueDate, t),
    booked: r.bookedAppointmentId ? db.appointments.find((a) => a.id === r.bookedAppointmentId) || null : null,
  };
}

const byTime = (a, b) => (a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date));

export async function getHome() {
  await latency(60, 60);
  const db = syncedDb();
  const t = today();
  const todays = db.appointments
    .filter((a) => a.date === t && a.status !== 'cancelado')
    .sort(byTime)
    .map((a) => expandAppointment(db, a));
  const upcoming = db.appointments
    .filter((a) => a.date > t && a.status === 'agendado')
    .sort(byTime)
    .slice(0, 6)
    .map((a) => expandAppointment(db, a));
  const returnsDue = db.returns
    .filter((r) => r.status === 'pendente' && r.dueDate <= t)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map((r) => expandReturn(db, r));
  const returnsWeek = db.returns
    .filter((r) => r.status === 'pendente' && r.dueDate > t && r.dueDate <= addDays(t, 7)).length;
  return clone({
    date: t,
    load: dayLoad({ ...baseContext(db), date: t }),
    hours: hoursFor(db.settings, t),
    block: blockFor(db.blocks, t),
    capacity: db.settings.capacity,
    today: todays,
    upcoming,
    returnsDue,
    returnsWeek,
    shop: { name: db.settings.name, isExample: db.settings.isExample },
    exampleData: Boolean(db.exampleData),
  });
}

/** Busca por placa, nome ou WhatsApp. */
export async function search(query) {
  await latency(40, 60);
  const db = syncedDb();
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const plateQ = q.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const digits = q.replace(/\D/g, '');
  const matches = db.customers.filter((c) => {
    const plates = db.appointments.filter((a) => a.customerId === c.id).map((a) => (a.plate || '').replace(/-/g, ''));
    const cars = db.appointments.filter((a) => a.customerId === c.id).map((a) => (a.vehicle || '').toLowerCase());
    return (
      c.name.toLowerCase().includes(q) ||
      (digits.length >= 4 && c.phone.includes(digits)) ||
      (plateQ.length >= 3 && plates.some((p) => p.includes(plateQ))) ||
      cars.some((v) => v.includes(q))
    );
  });
  return clone(matches.slice(0, 12).map((c) => customerCard(db, c)));
}

function customerCard(db, c) {
  const t = today();
  const history = db.appointments.filter((a) => a.customerId === c.id).sort(byTime);
  const next = history.find((a) => a.date >= t && a.status === 'agendado') || null;
  const last = [...history].reverse().find((a) => a.status === 'concluido') || null;
  const openReturn = db.returns
    .filter((r) => r.customerId === c.id && (r.status === 'pendente' || r.status === 'avisado'))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] || null;
  const cars = [...new Map(history.map((a) => [a.plate || a.vehicle, { vehicle: a.vehicle, plate: a.plate }])).values()];
  return {
    ...c,
    cars,
    visits: history.filter((a) => a.status === 'concluido').length,
    next: next && expandAppointment(db, next),
    last: last && expandAppointment(db, last),
    openReturn: openReturn && expandReturn(db, openReturn),
    history: history.slice(-8).reverse().map((a) => expandAppointment(db, a)),
  };
}

export async function listCustomers() {
  await latency(60, 60);
  const db = syncedDb();
  return clone(
    db.customers
      .map((c) => customerCard(db, c))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  );
}

export async function getAgenda(from, days = 7) {
  await latency(60, 80);
  const db = syncedDb();
  const list = Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    const hours = hoursFor(db.settings, date);
    return {
      date,
      hours,
      block: blockFor(db.blocks, date),
      load: dayLoad({ ...baseContext(db), date }),
      items: db.appointments
        .filter((a) => a.date === date && a.status !== 'cancelado')
        .sort(byTime)
        .map((a) => expandAppointment(db, a)),
    };
  });
  return clone({ capacity: db.settings.capacity, days: list });
}

export async function setAppointmentStatus(id, status) {
  await latency(80, 80);
  return mutate((db) => {
    const a = db.appointments.find((x) => x.id === id);
    if (!a) throw new ApiError('NOT_FOUND', 'Esse agendamento não existe mais.');
    const before = a.status;
    a.status = status;
    a.completedAt = status === 'concluido' ? today() : null;
    let planted = null;
    if (status === 'concluido' && before !== 'concluido') planted = plantReturn(db, a);
    if (before === 'concluido' && status !== 'concluido') {
      db.returns = db.returns.filter((r) => !(r.appointmentId === a.id && r.status === 'pendente'));
    }
    return clone({ appointment: expandAppointment(db, a), planted: planted && expandReturn(db, planted) });
  });
}

export async function getSlotsForPanel(serviceId, date) {
  await latency(40, 40);
  const db = load();
  const service = findService(db, serviceId);
  // O dono pode encaixar alguém para daqui a pouco: sem antecedência mínima.
  const ctx = baseContext(db);
  return clone(daySlots({ ...ctx, settings: { ...ctx.settings, minNoticeMinutes: 0 }, date, duration: service.durationMin }));
}

export async function listReturns() {
  await latency(60, 80);
  const db = syncedDb();
  const t = today();
  const all = db.returns.map((r) => expandReturn(db, r));
  const pend = all.filter((r) => r.status === 'pendente').sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return clone({
    late: pend.filter((r) => r.dueDate < t),
    today: pend.filter((r) => r.dueDate === t),
    soon: pend.filter((r) => r.dueDate > t && r.dueDate <= addDays(t, 30)),
    later: pend.filter((r) => r.dueDate > addDays(t, 30)),
    waiting: all.filter((r) => r.status === 'avisado').sort((a, b) => (a.notifiedAt || '').localeCompare(b.notifiedAt || '')),
    booked: all
      .filter((r) => r.status === 'reagendado')
      .sort((a, b) => (b.booked?.date || '').localeCompare(a.booked?.date || '')),
  });
}

export async function getReturnMessageData(id) {
  const db = load();
  const r = db.returns.find((x) => x.id === id);
  if (!r) throw new ApiError('NOT_FOUND', 'Esse retorno não existe mais.');
  return clone({ ret: expandReturn(db, r), settings: db.settings });
}

export async function markReturnNotified(id) {
  await latency(40, 40);
  return mutate((db) => {
    const r = db.returns.find((x) => x.id === id);
    if (r && r.status !== 'reagendado') {
      r.status = 'avisado';
      r.notifiedAt = today();
    }
    return clone(r);
  });
}

export async function snoozeReturn(id, days = 7) {
  await latency(40, 40);
  return mutate((db) => {
    const r = db.returns.find((x) => x.id === id);
    if (r) {
      r.dueDate = addDays(today() > r.dueDate ? today() : r.dueDate, days);
      r.status = 'pendente';
    }
    return clone(r);
  });
}

export async function setReturnStatus(id, status) {
  await latency(40, 40);
  return mutate((db) => {
    const r = db.returns.find((x) => x.id === id);
    if (r) r.status = status;
    return clone(r);
  });
}

export async function listServices() {
  await latency(40, 60);
  return clone(load().services.slice().sort((a, b) => a.order - b.order));
}

export async function saveService(input) {
  await latency(100, 100);
  const errors = {};
  if (!input.name || input.name.trim().length < 2) errors.name = 'Dê um nome ao serviço.';
  if (!(input.durationMin >= 15)) errors.durationMin = 'Duração mínima de 15 minutos.';
  if (!(input.priceCents >= 0)) errors.priceCents = 'Informe o preço (pode ser 0).';
  if (Object.keys(errors).length) {
    const error = new ApiError('INVALID', 'Confira os campos do serviço.');
    error.fields = errors;
    throw error;
  }
  return mutate((db) => {
    let service = db.services.find((s) => s.id === input.id);
    if (!service) {
      service = { id: uid('svc'), active: true, order: db.services.length };
      db.services.push(service);
    }
    Object.assign(service, {
      name: input.name.trim(),
      description: (input.description || '').trim(),
      durationMin: Number(input.durationMin),
      priceCents: Number(input.priceCents),
      priceFrom: Boolean(input.priceFrom),
      returnInterval: parseInterval(input.returnInterval) ? input.returnInterval : null,
      returnAction: (input.returnAction || '').trim(),
      active: input.active !== false,
    });
    return clone(service);
  });
}

export async function moveService(id, direction) {
  await latency(30, 30);
  return mutate((db) => {
    const list = db.services.slice().sort((a, b) => a.order - b.order);
    const i = list.findIndex((s) => s.id === id);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= list.length) return null;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((s, order) => { s.order = order; });
    return true;
  });
}

export async function getSettings() {
  await latency(40, 40);
  const db = load();
  return clone({ settings: db.settings, blocks: db.blocks.slice().sort((a, b) => a.from.localeCompare(b.from)) });
}

export async function saveSettings(patch) {
  await latency(120, 100);
  if ('name' in patch && (!patch.name || patch.name.trim().length < 2)) {
    const error = new ApiError('INVALID', 'Confira as configurações.');
    error.fields = { name: 'O nome da estética aparece no topo do link.' };
    throw error;
  }
  if ('whatsapp' in patch && patch.whatsapp && !isValidPhone(patch.whatsapp)) {
    const error = new ApiError('INVALID', 'Confira as configurações.');
    error.fields = { whatsapp: 'WhatsApp com DDD, 10 ou 11 dígitos.' };
    throw error;
  }
  return mutate((db) => {
    Object.assign(db.settings, patch, { isExample: false });
    if (patch.whatsapp) db.settings.whatsapp = normalizePhone(patch.whatsapp);
    return clone(db.settings);
  });
}

export async function addBlock({ from, to, reason }) {
  await latency(60, 60);
  if (!from) throw new ApiError('INVALID', 'Escolha o dia da folga.');
  return mutate((db) => {
    const block = { id: uid('blk'), from, to: to && to >= from ? to : from, reason: (reason || '').trim() || 'folga' };
    db.blocks.push(block);
    const affected = db.appointments.filter(
      (a) => a.status === 'agendado' && a.date >= block.from && a.date <= block.to,
    ).length;
    return clone({ block, affected });
  });
}

export async function removeBlock(id) {
  await latency(40, 40);
  return mutate((db) => {
    db.blocks = db.blocks.filter((b) => b.id !== id);
    return true;
  });
}

/** Apaga clientes, agenda, retornos e folgas de exemplo; mantém serviços e ajustes. */
export async function clearExampleData() {
  await latency(120, 80);
  return mutate((db) => {
    db.customers = [];
    db.appointments = [];
    db.returns = [];
    db.blocks = [];
    db.exampleData = false;
    return true;
  });
}

export async function resetPlaceholder() {
  await latency(120, 80);
  reset();
  return true;
}

export function publicBaseUrl() {
  const { publicUrl } = load().settings;
  return publicUrl || window.location.origin;
}
