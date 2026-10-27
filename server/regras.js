// Regras do negócio: agendar, concluir, plantar retornos, filas e buscas.
// Trabalham sobre um retrato do banco em memória (`db`) e alteram esse retrato;
// quem chama (server/app.mjs) carrega do Postgres, roda a regra dentro de uma
// transação e grava o que mudou.

import { blockFor, dayLoad, daySlots, firstFree, hoursFor, rangeSlots } from '../public/assets/js/core/availability.js';
import { addDays, addInterval, diffDays, nowMinutes, parseInterval, toMinutes, today } from '../public/assets/js/core/dates.js';
import { formatPlate, isValidPhone, normalizePhone } from '../public/assets/js/core/format.js';

export class ApiError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const clone = (value) => JSON.parse(JSON.stringify(value));
const uid = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const SAFE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = (size) => Array.from({ length: size }, () => SAFE[Math.floor(Math.random() * SAFE.length)]).join('');
const text = (value, max) => String(value ?? '').trim().slice(0, max);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function invalid(message, fields) {
  const error = new ApiError('INVALID', message);
  error.fields = fields;
  return error;
}

function activeServices(db) {
  return db.services.filter((s) => s.active).sort((a, b) => a.order - b.order);
}

function findService(db, id) {
  const service = db.services.find((s) => s.id === id);
  if (!service) throw new ApiError('NOT_FOUND', 'Esse serviço não existe mais.', 404);
  return service;
}

function baseContext(db) {
  return {
    settings: db.settings,
    appointments: db.appointments,
    blocks: db.blocks,
    now: { date: today(), minutes: nowMinutes() },
  };
}

// ---------------------------------------------------------------------------
// Link público
// ---------------------------------------------------------------------------

export function getPublicProfile(db) {
  const services = activeServices(db);
  const shortest = services.reduce((min, s) => (!min || s.durationMin < min.durationMin ? s : min), null);
  const next = shortest ? firstFree({ ...baseContext(db), duration: shortest.durationMin }) : null;
  const { name, tagline, address, whatsapp, instagram, hours, horizonDays, capacity, isExample } = db.settings;
  return clone({
    shop: { name, tagline, address, whatsapp, instagram, hours, horizonDays, capacity, isExample },
    services,
    nextFree: next,
  });
}

export function getAvailability(db, serviceId, from, days) {
  const service = findService(db, serviceId);
  const horizon = db.settings.horizonDays || 30;
  return rangeSlots({
    ...baseContext(db),
    from: ISO_DATE.test(from || '') ? from : today(),
    days: Math.min(Number(days) || horizon, horizon),
    duration: service.durationMin,
  });
}

/** Convite de retorno (link mandado pelo WhatsApp). */
export function getReturnInvite(db, token) {
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
  if (!ISO_DATE.test(input.date || '') || !HHMM.test(input.start || '')) errors.start = 'Escolha um dia e um horário.';
  if (!input.name || String(input.name).trim().length < 2) errors.name = 'Diga seu nome para a gente te chamar.';
  if (!isValidPhone(input.phone)) errors.phone = 'Confira o WhatsApp: DDD e número, só com dígitos.';
  if (!input.vehicle || String(input.vehicle).trim().length < 2) errors.vehicle = 'Diga qual é o carro (modelo e cor).';
  if (Object.keys(errors).length) throw invalid('Faltou preencher alguns campos.', errors);
}

/**
 * Cria o agendamento. Valida de novo o horário (pode ter sido ocupado
 * enquanto o cliente preenchia). `force` permite encaixe pelo painel.
 */
export function createBooking(db, input, { source = 'link', force = false } = {}) {
  validateBooking(input);
  const service = findService(db, input.serviceId);
  if (!force) {
    if (!service.active) throw new ApiError('NOT_FOUND', 'Esse serviço não está mais disponível.', 404);
    const horizon = db.settings.horizonDays || 30;
    const day = input.date <= addDays(today(), horizon)
      ? daySlots({ ...baseContext(db), date: input.date, duration: service.durationMin })
      : { slots: [] };
    if (!day.slots.some((s) => s.time === input.start)) {
      throw new ApiError('SLOT_TAKEN', 'Esse horário acabou de ser ocupado. Escolha outro, por favor.', 409);
    }
  }
  const customer = upsertCustomer(db, text(input.name, 80), input.phone);
  const appointment = {
    id: uid('ag'),
    code: code(4),
    customerId: customer.id,
    serviceId: service.id,
    date: input.date,
    start: input.start,
    durationMin: service.durationMin,
    priceCents: service.priceCents,
    vehicle: text(input.vehicle, 60),
    plate: formatPlate(input.plate || ''),
    notes: text(input.notes, 300),
    status: 'agendado',
    source: input.returnToken ? 'retorno' : source,
    createdAt: today(),
    completedAt: null,
    autoCompleted: false,
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
export function autoComplete(db) {
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
  return {
    ...r,
    customer: db.customers.find((c) => c.id === r.customerId) || { name: 'Cliente removido', phone: '' },
    service: db.services.find((s) => s.id === r.serviceId) || { name: 'Serviço removido' },
    daysLate: diffDays(r.dueDate, today()),
    booked: r.bookedAppointmentId ? db.appointments.find((a) => a.id === r.bookedAppointmentId) || null : null,
  };
}

const byTime = (a, b) => (a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date));

export function getHome(db) {
  autoComplete(db);
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
    exampleData: false,
  });
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

/** Busca por placa, nome, carro ou WhatsApp. */
export function search(db, query) {
  autoComplete(db);
  const q = String(query || '').trim().toLowerCase();
  if (q.length < 2) return [];
  const plateQ = q.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const digits = q.replace(/\D/g, '');
  const matches = db.customers.filter((c) => {
    const mine = db.appointments.filter((a) => a.customerId === c.id);
    const plates = mine.map((a) => (a.plate || '').replace(/-/g, ''));
    const cars = mine.map((a) => (a.vehicle || '').toLowerCase());
    return (
      c.name.toLowerCase().includes(q) ||
      (digits.length >= 4 && c.phone.includes(digits)) ||
      (plateQ.length >= 3 && plates.some((p) => p.includes(plateQ))) ||
      cars.some((v) => v.includes(q))
    );
  });
  return clone(matches.slice(0, 12).map((c) => customerCard(db, c)));
}

export function listCustomers(db) {
  autoComplete(db);
  return clone(db.customers.map((c) => customerCard(db, c)).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
}

export function getAgenda(db, from, days = 7) {
  autoComplete(db);
  const start = ISO_DATE.test(from || '') ? from : today();
  const count = Math.min(Math.max(Number(days) || 7, 1), 31);
  const list = Array.from({ length: count }, (_, i) => {
    const date = addDays(start, i);
    return {
      date,
      hours: hoursFor(db.settings, date),
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

const STATUSES = new Set(['agendado', 'concluido', 'faltou', 'cancelado']);

export function setAppointmentStatus(db, id, status) {
  if (!STATUSES.has(status)) throw new ApiError('INVALID', 'Situação inválida.');
  const a = db.appointments.find((x) => x.id === id);
  if (!a) throw new ApiError('NOT_FOUND', 'Esse agendamento não existe mais.', 404);
  const before = a.status;
  a.status = status;
  a.completedAt = status === 'concluido' ? today() : null;
  let planted = null;
  if (status === 'concluido' && before !== 'concluido') planted = plantReturn(db, a);
  if (before === 'concluido' && status !== 'concluido') {
    db.returns = db.returns.filter((r) => !(r.appointmentId === a.id && r.status === 'pendente'));
  }
  return clone({ appointment: expandAppointment(db, a), planted: planted && expandReturn(db, planted) });
}

export function getSlotsForPanel(db, serviceId, date) {
  const service = findService(db, serviceId);
  // O dono pode encaixar alguém para daqui a pouco: sem antecedência mínima.
  const ctx = baseContext(db);
  return clone(daySlots({
    ...ctx,
    settings: { ...ctx.settings, minNoticeMinutes: 0 },
    date: ISO_DATE.test(date || '') ? date : today(),
    duration: service.durationMin,
  }));
}

export function listReturns(db) {
  autoComplete(db);
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

export function getReturnMessageData(db, id) {
  const r = db.returns.find((x) => x.id === id);
  if (!r) throw new ApiError('NOT_FOUND', 'Esse retorno não existe mais.', 404);
  return clone({ ret: expandReturn(db, r), settings: db.settings });
}

export function markReturnNotified(db, id) {
  const r = db.returns.find((x) => x.id === id);
  if (r && r.status !== 'reagendado') {
    r.status = 'avisado';
    r.notifiedAt = today();
  }
  return clone(r || null);
}

export function snoozeReturn(db, id, days = 7) {
  const r = db.returns.find((x) => x.id === id);
  const n = Math.min(Math.max(Number(days) || 7, 1), 365);
  if (r) {
    r.dueDate = addDays(today() > r.dueDate ? today() : r.dueDate, n);
    r.status = 'pendente';
  }
  return clone(r || null);
}

const RETURN_STATUSES = new Set(['pendente', 'avisado', 'reagendado', 'descartado']);

export function setReturnStatus(db, id, status) {
  if (!RETURN_STATUSES.has(status)) throw new ApiError('INVALID', 'Situação inválida.');
  const r = db.returns.find((x) => x.id === id);
  if (r) r.status = status;
  return clone(r || null);
}

export function listServices(db) {
  return clone(db.services.slice().sort((a, b) => a.order - b.order));
}

export function saveService(db, input) {
  const errors = {};
  if (!input.name || String(input.name).trim().length < 2) errors.name = 'Dê um nome ao serviço.';
  if (!(Number(input.durationMin) >= 15 && Number(input.durationMin) <= 720)) errors.durationMin = 'Duração entre 15 minutos e 12 horas.';
  if (!(Number(input.priceCents) >= 0)) errors.priceCents = 'Informe o preço (pode ser 0).';
  if (Object.keys(errors).length) throw invalid('Confira os campos do serviço.', errors);
  let service = db.services.find((s) => s.id === input.id);
  if (!service) {
    service = { id: uid('svc'), active: true, order: db.services.length };
    db.services.push(service);
  }
  Object.assign(service, {
    name: text(input.name, 40),
    description: text(input.description, 200),
    durationMin: Math.round(Number(input.durationMin)),
    priceCents: Math.round(Number(input.priceCents)),
    priceFrom: Boolean(input.priceFrom),
    returnInterval: parseInterval(input.returnInterval) ? input.returnInterval : null,
    returnAction: text(input.returnAction, 60),
    active: input.active !== false,
  });
  db.settings.isExample = false;
  return clone(service);
}

export function moveService(db, id, direction) {
  const list = db.services.slice().sort((a, b) => a.order - b.order);
  const i = list.findIndex((s) => s.id === id);
  const j = i + (Number(direction) < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= list.length) return null;
  [list[i], list[j]] = [list[j], list[i]];
  list.forEach((s, order) => { s.order = order; });
  return true;
}

export function getSettings(db) {
  return clone({ settings: db.settings, blocks: db.blocks.slice().sort((a, b) => a.from.localeCompare(b.from)) });
}

const SETTINGS_KEYS = [
  'name', 'tagline', 'address', 'whatsapp', 'instagram', 'capacity', 'slotStep', 'minNoticeMinutes',
  'horizonDays', 'autoComplete', 'hours', 'returnTemplate', 'publicUrl',
];

export function saveSettings(db, patch) {
  const clean = Object.fromEntries(Object.entries(patch || {}).filter(([k]) => SETTINGS_KEYS.includes(k)));
  if ('name' in clean && (!clean.name || String(clean.name).trim().length < 2)) {
    throw invalid('Confira as configurações.', { name: 'O nome da estética aparece no topo do link.' });
  }
  if ('whatsapp' in clean && clean.whatsapp && !isValidPhone(clean.whatsapp)) {
    throw invalid('Confira as configurações.', { whatsapp: 'WhatsApp com DDD, 10 ou 11 dígitos.' });
  }
  Object.assign(db.settings, clean, { isExample: false });
  if (clean.whatsapp) db.settings.whatsapp = normalizePhone(clean.whatsapp);
  return clone(db.settings);
}

export function addBlock(db, { from, to, reason } = {}) {
  if (!ISO_DATE.test(from || '')) throw new ApiError('INVALID', 'Escolha o dia da folga.');
  const block = {
    id: uid('blk'),
    from,
    to: ISO_DATE.test(to || '') && to >= from ? to : from,
    reason: text(reason, 40) || 'folga',
  };
  db.blocks.push(block);
  const affected = db.appointments.filter(
    (a) => a.status === 'agendado' && a.date >= block.from && a.date <= block.to,
  ).length;
  return clone({ block, affected });
}

export function removeBlock(db, id) {
  db.blocks = db.blocks.filter((b) => b.id !== id);
  return true;
}
