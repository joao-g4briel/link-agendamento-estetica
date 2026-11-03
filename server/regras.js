// Regras do negócio: agendar, concluir, plantar retornos, filas e buscas.
// Trabalham sobre um retrato do banco em memória (`db`) e alteram esse retrato;
// quem chama (server/app.mjs) carrega do Postgres, roda a regra dentro de uma
// transação e grava o que mudou.

import { randomBytes, randomUUID } from 'node:crypto';
import { blockFor, dayLoad, dayOpening, daySlots, firstFreeDay, hoursFor, rangeDays, OCCUPYING } from '../public/assets/js/core/availability.js';
import { addDays, addInterval, diffDays, isISODate, nowMinutes, parseInterval, today } from '../public/assets/js/core/dates.js';
import { formatPlate, isValidPhone, normalizePhone } from '../public/assets/js/core/format.js';

export class ApiError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const clone = (value) => JSON.parse(JSON.stringify(value));
const uid = (prefix) => `${prefix}-${randomUUID()}`;
const SAFE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = (size) => Array.from(randomBytes(size), n => SAFE[n % SAFE.length]).join('');
const text = (value, max) => String(value ?? '').trim().slice(0, max);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const OPEN = new Set(['agendado', 'confirmado', 'recebido', 'em_servico', 'pronto']);
const sameVehicle = (a, b) => a.vehicleId && b.vehicleId ? a.vehicleId === b.vehicleId : Boolean(a.plate && b.plate && formatPlate(a.plate) === formatPlate(b.plate));
function record(db, action, id, detail = {}) {
  (db.events ||= []).push({ id: uid('evt'), action, targetId: id, detail, at: new Date().toISOString() });
}

function vehicleFor(db, customer, input) {
  db.vehicles ||= [];
  const plate = formatPlate(input.plate || '');
  let vehicle = input.vehicleId && db.vehicles.find(v => v.id === input.vehicleId && v.customerId === customer.id);
  if (vehicle && plate && vehicle.plate !== plate) vehicle = null;
  if (!vehicle && plate) vehicle = db.vehicles.find(v => v.customerId === customer.id && v.plate === plate);
  // Sem placa, só reutiliza identidade explícita; nomes parecidos não são prova.
  if (!vehicle) {
    vehicle = { id: uid('car'), customerId: customer.id, vehicle: text(input.vehicle, 60), plate };
    db.vehicles.push(vehicle);
  }
  return vehicle;
}

function bookingResult(db, appointment) {
  const service = findService(db, appointment.serviceId);
  const customer = db.customers.find(c => c.id === appointment.customerId);
  return clone({ appointment, service, customer: { name: appointment.customerName || customer.name, phone: customer.phone },
    nextReturn: service.returnInterval ? { date: addInterval(appointment.date, service.returnInterval), action: service.returnAction } : null,
    shop: { name: db.settings.name, address: db.settings.address, whatsapp: db.settings.whatsapp } });
}

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

/** A agenda online fecha pelo painel; o painel continua agendando. */
const isBookingOpen = (settings) => settings.bookingOpen !== false;

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
  const bookingOpen = isBookingOpen(db.settings);
  const next = services.length && bookingOpen ? firstFreeDay(baseContext(db)) : null;
  const { name, tagline, address, whatsapp, instagram, hours, horizonDays, capacity, isExample } = db.settings;
  return clone({
    shop: { name, tagline, address, whatsapp, instagram, hours, horizonDays, capacity, isExample, bookingOpen },
    local: process.env.STORE_MODE === 'local',
    services,
    nextFree: next,
    closedDates: db.blocks.map(b => ({ from: b.from, to: b.to })),
  });
}

export function getAvailability(db, serviceId, from, days) {
  const service = findService(db, serviceId);
  const horizon = db.settings.horizonDays || 30;
  if (!isBookingOpen(db.settings) || !service.active) return [];
  const start = isISODate(from) && from >= today() && from < addDays(today(), horizon) ? from : today();
  // O link agenda por dia: sem escolha de horário.
  return rangeDays({
    ...baseContext(db),
    from: start,
    days: Math.min(Math.max(Math.floor(Number(days)) || horizon, 1), diffDays(start, addDays(today(), horizon))),
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
    vehicleId: ret.vehicleId,
  });
}

function upsertCustomer(db, name, phone) {
  const digits = normalizePhone(phone);
  let customer = db.customers.find((c) => c.phone === digits);
  if (!customer) {
    customer = { id: uid('cli'), name, phone: digits, createdAt: today() };
    db.customers.push(customer);
  }
  return customer;
}

function validateBooking(input) {
  const errors = {};
  if (!input.serviceId) errors.serviceId = 'Escolha um serviço.';
  if (!isISODate(input.date) || !HHMM.test(input.start || '')) errors.start = 'Escolha um dia e uma hora de chegada válidos.';
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
  if (input.idempotencyKey && !/^[a-zA-Z0-9-]{16,80}$/.test(input.idempotencyKey)) throw invalid('Tentativa de agendamento inválida.');
  const fingerprint = JSON.stringify([input.serviceId, input.date, input.start, text(input.name, 80), normalizePhone(input.phone), input.vehicle, input.plate || '', input.notes || '', source]);
  const existing = input.idempotencyKey && db.appointments.find(a => a.idempotencyKey === input.idempotencyKey);
  if (existing) {
    if (existing.requestFingerprint !== fingerprint) throw new ApiError('IDEMPOTENCY_CONFLICT', 'Os dados desta tentativa mudaram. Inicie um novo agendamento.', 409);
    return bookingResult(db, existing);
  }
  validateBooking(input);
  const service = findService(db, input.serviceId);
  if (!service.active) throw new ApiError('NOT_FOUND', 'Esse serviço não está mais disponível.', 404);
  if (input.date < today() || input.date > addDays(today(), source === 'painel' ? 365 : (db.settings.horizonDays || 30) - 1)) throw invalid('Escolha uma data dentro do período disponível.', { start: 'Data fora do período disponível.' });
  if (!force) {
    if (source !== 'painel' && !isBookingOpen(db.settings)) {
      throw new ApiError('CLOSED', 'A agenda online está fechada no momento. Chame a estética no WhatsApp para marcar.', 409);
    }
    const day = source === 'painel' ? daySlots({ ...baseContext(db), date: input.date }) : dayOpening({ ...baseContext(db), date: input.date });
    if (!day.slots.length) {
      throw new ApiError('SLOT_TAKEN', 'Esse dia acabou de lotar. Escolha outro, por favor.', 409);
    }
    // Pelo link o carro chega a partir da abertura: o horário gravado é o dela.
    if (source === 'painel') {
      if (!day.slots.some(s => s.time === input.start)) throw new ApiError('SLOT_TAKEN', 'Escolha uma hora de chegada disponível.', 409);
    } else input = { ...input, start: day.slots[0].time };
  }
  const customer = upsertCustomer(db, text(input.name, 80), input.phone);
  const invite = input.returnToken && db.returns.find(r => r.token === input.returnToken && r.customerId === customer.id && r.serviceId === service.id && ['pendente', 'avisado'].includes(r.status));
  if (input.returnToken && !invite) throw invalid('Esse convite não corresponde aos dados do agendamento.');
  const vehicle = vehicleFor(db, customer, { ...input, vehicleId: invite?.vehicleId || (source === 'painel' ? input.vehicleId : undefined) });
  const appointment = {
    id: uid('ag'),
    code: code(4),
    customerId: customer.id,
    serviceId: service.id,
    date: input.date,
    start: input.start,
    customerName: text(input.name, 80),
    vehicleId: vehicle.id,
    idempotencyKey: input.idempotencyKey || null,
    requestFingerprint: fingerprint,
    manageToken: randomBytes(24).toString('base64url'),
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
    const sameReturn = invite && ret.id === invite.id;
    const sameCustomer = ret.customerId === customer.id && ret.serviceId === service.id && sameVehicle(ret, appointment);
    if ((sameReturn || sameCustomer) && (ret.status === 'pendente' || ret.status === 'avisado')) {
      if (sameReturn && !ret.vehicleId) ret.vehicleId = vehicle.id;
      ret.status = 'reagendado';
      ret.bookedAppointmentId = appointment.id;
    }
  }

  record(db, 'agendamento.criado', appointment.id, { source });
  return bookingResult(db, appointment);
}

// ---------------------------------------------------------------------------
// Painel
// ---------------------------------------------------------------------------

function plantReturn(db, appointment) {
  const service = db.services.find((s) => s.id === appointment.serviceId);
  if (!service || !service.returnInterval) return null;
  // Um retorno aberto por cliente + serviço: o mais novo substitui o anterior.
  for (const ret of db.returns) {
    if (ret.customerId === appointment.customerId && ret.serviceId === service.id && sameVehicle(ret, appointment) &&
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
    vehicleId: appointment.vehicleId,
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

function expandAppointment(db, a) {
  return {
    ...a,
    customer: { ...(db.customers.find((c) => c.id === a.customerId) || { name: 'Cliente removido', phone: '' }), ...(a.customerName ? { name: a.customerName } : {}) },
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
  const t = today();
  const todays = db.appointments
    .filter((a) => a.date === t && a.status !== 'cancelado')
    .sort(byTime)
    .map((a) => expandAppointment(db, a));
  const upcoming = db.appointments
    .filter((a) => a.date > t && OPEN.has(a.status))
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
    maxCarsPerDay: db.settings.maxCarsPerDay || 0,
    bookingOpen: isBookingOpen(db.settings),
    today: todays,
    upcoming,
    review: db.appointments.filter(a => a.date < t && OPEN.has(a.status)).sort(byTime).map(a => expandAppointment(db, a)),
    confirmations: db.appointments.filter(a => a.date === addDays(t, 1) && a.status === 'agendado').map(a => expandAppointment(db, a)),
    returnsDue,
    returnsWeek,
    shop: { name: db.settings.name, isExample: db.settings.isExample },
    exampleData: false,
  });
}

function customerCard(db, c) {
  const t = today();
  const history = db.appointments.filter((a) => a.customerId === c.id).sort(byTime);
  const next = history.find((a) => a.date >= t && OPEN.has(a.status)) || null;
  const last = [...history].reverse().find((a) => a.status === 'concluido') || null;
  const openReturn = db.returns
    .filter((r) => r.customerId === c.id && (r.status === 'pendente' || r.status === 'avisado'))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] || null;
  const cars = [...new Map(history.map((a) => [a.vehicleId || a.plate || a.id, { id: a.vehicleId, vehicle: a.vehicle, plate: a.plate }])).values()];
  return {
    ...c,
    cars,
    visits: history.filter((a) => a.status === 'concluido').length,
    next: next && expandAppointment(db, next),
    last: last && expandAppointment(db, last),
    openReturn: openReturn && expandReturn(db, openReturn),
    history: history.slice().reverse().map((a) => expandAppointment(db, a)),
  };
}

/** Busca por placa, nome, carro ou WhatsApp. */
export function search(db, query) {
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
      (digits.length >= 4 && (c.phone || '').includes(digits)) ||
      (plateQ.length >= 3 && plates.some((p) => p.includes(plateQ))) ||
      cars.some((v) => v.includes(q))
    );
  });
  return clone(matches.slice(0, 12).map((c) => customerCard(db, c)));
}

export function listCustomers(db, offset = 0, query = '') {
  if (db.customerPage) return clone({ items: db.customers.map(c => customerCard(db, c)).sort((a,b) => a.name.localeCompare(b.name, 'pt-BR')), total: db.customerPage.total, nextOffset: db.customerPage.offset + 50 < db.customerPage.total ? db.customerPage.offset + 50 : null });
  const q = String(query || '').toLowerCase().trim();
  const list = db.customers.filter(c => !q || [c.name, c.phone, ...db.appointments.filter(a => a.customerId === c.id).flatMap(a => [a.vehicle, a.plate])].join(' ').toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const start = Math.max(0, Math.floor(Number(offset)) || 0);
  return clone({ items: list.slice(start, start + 50).map(c => customerCard(db, c)), total: list.length, nextOffset: start + 50 < list.length ? start + 50 : null });
}

export function getCustomer(db, id) {
  const c = db.customers.find(c => c.id === id);
  if (!c) throw new ApiError('NOT_FOUND', 'Cliente não encontrado.', 404);
  return clone(customerCard(db, c));
}

export function getAgenda(db, from, days = 7) {
  const start = isISODate(from) ? from : today();
  const count = Math.min(Math.max(Number(days) || 7, 1), 31);
  const list = Array.from({ length: count }, (_, i) => {
    const date = addDays(start, i);
    return {
      date,
      hours: hoursFor(db.settings, date),
      block: blockFor(db.blocks, date),
      load: dayLoad({ ...baseContext(db), date }),
      items: db.appointments
        .filter((a) => a.date === date)
        .sort(byTime)
        .map((a) => expandAppointment(db, a)),
    };
  });
  return clone({ capacity: db.settings.capacity, maxCarsPerDay: db.settings.maxCarsPerDay || 0, days: list });
}

const STATUSES = new Set([...OPEN, 'concluido', 'faltou', 'cancelado']);

export function setAppointmentStatus(db, id, status) {
  if (!STATUSES.has(status)) throw new ApiError('INVALID', 'Situação inválida.');
  const a = db.appointments.find((x) => x.id === id);
  if (!a) throw new ApiError('NOT_FOUND', 'Esse agendamento não existe mais.', 404);
  const before = a.status;
  if (before === status) return clone({ appointment: expandAppointment(db, a), planted: null });
  if (status === 'concluido' && a.date > today()) throw invalid('Conclua o atendimento somente no dia ou depois dele.');
  if (OPEN.has(status) && !OCCUPYING.has(before)) {
    if (a.date < today() || !daySlots({ ...baseContext(db), date: a.date, ignoreId: a.id }).slots.some(s => s.time === a.start)) throw new ApiError('SLOT_TAKEN', 'Esse dia ou chegada não está disponível para reabrir. Remarque o atendimento.', 409);
  }
  a.status = status;
  a.autoCompleted = false;
  a.completedAt = status === 'concluido' ? today() : null;
  let planted = null;
  if (status === 'concluido' && before !== 'concluido') planted = plantReturn(db, a);
  if (before === 'concluido' && status !== 'concluido') {
    for (const r of db.returns) if (r.appointmentId === a.id) { r.status = 'descartado'; }
  }
  if (status === 'cancelado' || status === 'faltou') {
    for (const r of db.returns) if (r.bookedAppointmentId === a.id && r.status === 'reagendado') { r.status = 'pendente'; r.bookedAppointmentId = null; }
  }
  record(db, 'agendamento.status', id, { before, status });
  return clone({ appointment: expandAppointment(db, a), planted: planted && expandReturn(db, planted) });
}

export function getSlotsForPanel(db, serviceId, date, ignoreId) {
  findService(db, serviceId);
  // A chegada normal respeita a antecedência; encaixes são explícitos ao gravar.
  const ctx = baseContext(db);
  return clone(daySlots({
    ...ctx,
    date: isISODate(date) ? date : today(),
    ignoreId,
  }));
}

export function listReturns(db) {
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
  if (r && ['pendente', 'avisado'].includes(r.status)) {
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
    r.notifiedAt = null;
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

export function deleteService(db, id) {
  findService(db, id);
  if (db.appointments.some((a) => a.serviceId === id) || db.returns.some((r) => r.serviceId === id) || (db.waitlist || []).some(w => w.serviceId === id)) {
    throw new ApiError('SERVICE_IN_USE', 'Este serviço tem agendamentos ou retornos vinculados. Para preservar o histórico, edite o serviço e desmarque “Mostrar este serviço no link de agendamento”.', 409);
  }
  db.services = db.services.filter((s) => s.id !== id);
  db.services.sort((a, b) => a.order - b.order).forEach((s, order) => { s.order = order; });
  return { ok: true };
}

export function saveService(db, input) {
  const errors = {};
  if (!input.name || String(input.name).trim().length < 2) errors.name = 'Dê um nome ao serviço.';
  if (!Number.isSafeInteger(input.priceCents) || input.priceCents < 0 || input.priceCents > 100000000) errors.priceCents = 'Informe um preço válido (pode ser 0).';
  if (String(input.description || '').length > 2000) errors.description = 'Use até 2.000 caracteres na descrição.';
  if (input.returnInterval && (!parseInterval(input.returnInterval) || parseInterval(input.returnInterval).n < 1 || parseInterval(input.returnInterval).n > 365)) errors.returnInterval = 'Informe um intervalo de retorno válido.';
  if (Object.keys(errors).length) throw invalid('Confira os campos do serviço.', errors);
  let service = db.services.find((s) => s.id === input.id);
  if (input.id && !service) throw new ApiError('NOT_FOUND', 'Serviço não encontrado.', 404);
  if (!service) {
    service = { id: uid('svc'), active: true, order: db.services.length };
    db.services.push(service);
  }
  Object.assign(service, {
    name: text(input.name, 40),
    description: text(input.description, 2000),
    priceCents: Math.round(Number(input.priceCents)),
    priceFrom: Boolean(input.priceFrom),
    returnInterval: parseInterval(input.returnInterval) ? input.returnInterval : null,
    returnAction: text(input.returnAction, 60),
    active: input.active !== false,
  });
  db.settings.isExample = false;
  record(db, 'servico.salvo', service.id);
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
  'horizonDays', 'hours', 'returnTemplate', 'publicUrl', 'maxCarsPerDay', 'bookingOpen',
];

export function saveSettings(db, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw invalid('Configurações inválidas.');
  const clean = Object.fromEntries(Object.entries(patch || {}).filter(([k]) => SETTINGS_KEYS.includes(k)));
  if ('name' in clean && (!clean.name || String(clean.name).trim().length < 2)) {
    throw invalid('Confira as configurações.', { name: 'O nome da estética aparece no topo do link.' });
  }
  if ('whatsapp' in clean && clean.whatsapp && !isValidPhone(clean.whatsapp)) {
    throw invalid('Confira as configurações.', { whatsapp: 'WhatsApp com DDD, 10 ou 11 dígitos.' });
  }
  const numbers = { capacity: [1, 12], slotStep: [5, 120], minNoticeMinutes: [0, 10080], horizonDays: [1, 90], maxCarsPerDay: [0, 50] };
  for (const [key, [min, max]] of Object.entries(numbers)) if (key in clean && (!Number.isInteger(clean[key]) || clean[key] < min || clean[key] > max)) throw invalid('Confira as regras da agenda.', { [key]: `Informe um inteiro entre ${min} e ${max}.` });
  if ('bookingOpen' in clean && typeof clean.bookingOpen !== 'boolean') throw invalid('Situação da agenda inválida.');
  if ('hours' in clean) {
    if (!clean.hours || typeof clean.hours !== 'object' || Array.isArray(clean.hours)) throw invalid('Horários inválidos.');
    for (let i = 0; i < 7; i++) {
      const h = clean.hours[i];
      if (h === null) continue;
      if (!h || !HHMM.test(h.open || '') || !HHMM.test(h.close || '') || h.close <= h.open ||
          ((h.breakStart || h.breakEnd) && (!HHMM.test(h.breakStart || '') || !HHMM.test(h.breakEnd || '') || h.breakStart < h.open || h.breakEnd > h.close || h.breakEnd <= h.breakStart))) throw invalid('Confira abertura, fechamento e pausa de cada dia.');
    }
  }
  for (const [key, max] of Object.entries({ name: 40, tagline: 40, address: 160, instagram: 30, returnTemplate: 2000, publicUrl: 300 })) if (key in clean) {
    if (typeof clean[key] !== 'string' || clean[key].length > max) throw invalid(`Campo ${key} inválido ou longo demais.`);
    clean[key] = clean[key].trim();
  }
  if (clean.publicUrl) { try { const url = new URL(clean.publicUrl); if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw 0; } catch { throw invalid('Use um endereço http:// ou https:// válido, sem parâmetros.'); } }
  if (clean.instagram && !/^[\w.]+$/.test(clean.instagram)) throw invalid('Informe somente o usuário do Instagram.');
  if ('returnTemplate' in clean && !clean.returnTemplate.includes('{link}')) throw invalid('Inclua {link} na mensagem de retorno.');
  Object.assign(db.settings, clean, { isExample: false });
  if (clean.whatsapp) db.settings.whatsapp = normalizePhone(clean.whatsapp);
  record(db, 'ajustes.salvos', 'config', { fields: Object.keys(clean) });
  return clone(db.settings);
}

export function addBlock(db, { from, to, reason } = {}) {
  if (!isISODate(from) || (to && (!isISODate(to) || to < from))) throw new ApiError('INVALID', 'Escolha um período válido para a folga.');
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

export function getAppointment(db, id) {
  const a = db.appointments.find(a => a.id === id);
  if (!a) throw new ApiError('NOT_FOUND', 'Agendamento não encontrado.', 404);
  return clone(expandAppointment(db, a));
}

export function editAppointment(db, id, input, { force = false } = {}) {
  const a = db.appointments.find(a => a.id === id);
  if (!a) throw new ApiError('NOT_FOUND', 'Agendamento não encontrado.', 404);
  validateBooking(input);
  const service = findService(db, input.serviceId);
  if (!service.active && service.id !== a.serviceId) throw invalid('Escolha um serviço ativo.');
  // Sem mudar o dia e a chegada, a edição é só de dados: atendimentos antigos também podem ser corrigidos.
  const sameArrival = input.date === a.date && input.start === a.start;
  const sameBooking = sameArrival && service.id === a.serviceId;
  if (!sameArrival) {
    if (input.date < today() || input.date > addDays(today(), 365)) throw invalid('Escolha uma data entre hoje e o próximo ano.');
    if (!force && !daySlots({ ...baseContext(db), date: input.date, ignoreId: id }).slots.some(s => s.time === input.start)) throw new ApiError('SLOT_TAKEN', 'Esse dia ou horário de chegada não está disponível.', 409);
  }
  const customer = upsertCustomer(db, text(input.name, 80), input.phone);
  const vehicle = vehicleFor(db, customer, { ...input, vehicleId: input.vehicleId || a.vehicleId });
  const before = { date: a.date, start: a.start, serviceId: a.serviceId, status: a.status };
  for (const r of db.returns) {
    if (r.appointmentId === id && !sameBooking) r.status = 'descartado';
    if (r.bookedAppointmentId === id && (r.serviceId !== service.id || !sameVehicle(r, { vehicleId: vehicle.id }))) { r.status = 'pendente'; r.bookedAppointmentId = null; }
  }
  Object.assign(a, { date: input.date, start: input.start, serviceId: service.id,
    customerId: customer.id, customerName: text(input.name, 80), vehicleId: vehicle.id,
    vehicle: text(input.vehicle, 60), plate: formatPlate(input.plate), notes: text(input.notes, 300) });
  if (!sameBooking) Object.assign(a, { priceCents: service.priceCents, status: 'agendado', completedAt: null, autoCompleted: false });
  record(db, sameBooking ? 'agendamento.editado' : 'agendamento.remarcado', id, { before, date: a.date, start: a.start });
  return clone({ appointment: expandAppointment(db, a) });
}

export function manageBooking(db, token, patch) {
  const a = db.appointments.find(a => a.manageToken === token);
  if (!a || today() > addDays(a.date, 7)) throw new ApiError('NOT_FOUND', 'Link inválido ou expirado.', 404);
  if (!patch) return { ...bookingResult(db, a), canChange: a.date >= today() && OPEN.has(a.status) && (a.date > today() || Number(a.start.slice(0,2)) * 60 + Number(a.start.slice(3)) > nowMinutes()), cancelNotice: 'Alterações são permitidas até a chegada agendada. Depois, fale com a estética.' };
  if (!OPEN.has(a.status) || a.date < today() || (a.date === today() && a.start <= `${String(Math.floor(nowMinutes() / 60)).padStart(2, '0')}:${String(nowMinutes() % 60).padStart(2, '0')}`)) throw new ApiError('CLOSED', 'O prazo de alteração acabou. Fale com a estética.', 409);
  if (patch.action === 'cancelar') return setAppointmentStatus(db, a.id, 'cancelado');
  if (patch.action !== 'remarcar' || !isISODate(patch.date) || patch.date >= addDays(today(), db.settings.horizonDays || 30) || !isBookingOpen(db.settings)) throw invalid('Escolha um dia disponível para remarcar.');
  const day = dayOpening({ ...baseContext(db), date: patch.date, ignoreId: a.id });
  if (!day.slots.length) throw new ApiError('SLOT_TAKEN', 'Esse dia não está disponível.', 409);
  const c = db.customers.find(c => c.id === a.customerId);
  return editAppointment(db, a.id, { ...a, name: a.customerName || c.name, phone: c.phone, date: patch.date, start: day.slots[0].time });
}

export function saveCustomer(db, id, input) {
  const c = db.customers.find(c => c.id === id);
  if (!c) throw new ApiError('NOT_FOUND', 'Cliente não encontrado.', 404);
  if (text(input.name, 80).length < 2 || !isValidPhone(input.phone)) throw invalid('Informe nome e WhatsApp válidos.');
  const phone = normalizePhone(input.phone);
  if (db.customers.some(other => other.id !== id && other.phone === phone)) throw invalid('Esse WhatsApp pertence a outro cadastro.');
  c.name = text(input.name, 80); c.phone = phone;
  record(db, 'cliente.editado', id);
  return clone(customerCard(db, c));
}

export function anonymizeCustomer(db, id) {
  const c = db.customers.find(c => c.id === id);
  if (!c) throw new ApiError('NOT_FOUND', 'Cliente não encontrado.', 404);
  if (db.appointments.some(a => a.customerId === id && OPEN.has(a.status))) throw invalid('Resolva ou cancele os atendimentos em aberto antes de remover os dados.');
  const oldPhone = c.phone;
  c.name = 'Cliente anonimizado'; c.phone = null;
  for (const a of db.appointments.filter(a => a.customerId === id)) Object.assign(a, { customerName: c.name, vehicle: 'Veículo anonimizado', plate: '', notes: '', manageToken: null, requestFingerprint: null });
  for (const v of (db.vehicles || []).filter(v => v.customerId === id)) Object.assign(v, { vehicle: 'Veículo anonimizado', plate: '' });
  for (const r of db.returns.filter(r => r.customerId === id)) Object.assign(r, { vehicle: 'Veículo anonimizado', plate: '', token: code(20).toLowerCase(), status: 'descartado' });
  for (const w of (db.waitlist || []).filter(w => oldPhone && w.phone === oldPhone)) Object.assign(w, { name: c.name, phone: '', vehicle: '', status: 'resolvido' });
  record(db, 'cliente.anonimizado', id);
  return { ok: true };
}

export function getOperations(db, from, to) {
  const start = isISODate(from) ? from : addDays(today(), -30);
  const end = isISODate(to) ? to : today();
  if (end < start) throw invalid('O fim do período deve ser depois do início.');
  const appointments = db.appointments.filter(a => a.date >= start && a.date <= end);
  const complete = appointments.filter(a => a.status === 'concluido');
  return { from: start, to: end, completed: complete.length, canceled: appointments.filter(a => a.status === 'cancelado').length,
    noShow: appointments.filter(a => a.status === 'faltou').length, revenueCents: complete.reduce((n, a) => n + a.priceCents, 0),
    returning: db.returns.filter(r => r.status === 'reagendado' && appointments.some(a => a.id === r.bookedAppointmentId)).length,
    events: (db.events || []).slice().sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100), waitlist: (db.waitlist || []).filter(w => w.status === 'pendente') };
}

export function saveWaitlist(db, input) {
  const errors = {};
  if (text(input.name, 80).length < 2) errors.name = 'Informe o nome.';
  if (!isValidPhone(input.phone)) errors.phone = 'Confira o WhatsApp: DDD e número.';
  if (Object.keys(errors).length) throw invalid('Informe nome e WhatsApp válidos.', errors);
  findService(db, input.serviceId);
  const entry = { id: uid('esp'), name: text(input.name, 80), phone: normalizePhone(input.phone), serviceId: input.serviceId, vehicle: text(input.vehicle, 60), status: 'pendente', createdAt: today() };
  (db.waitlist ||= []).push(entry);
  record(db, 'espera.criada', entry.id);
  return clone(entry);
}

export function closeWaitlist(db, id) {
  const w = (db.waitlist || []).find(w => w.id === id);
  if (!w) throw new ApiError('NOT_FOUND', 'Registro não encontrado.', 404);
  w.status = 'resolvido'; record(db, 'espera.resolvida', id); return { ok: true };
}

export function exportData(db) {
  return clone({ exportedAt: new Date().toISOString(), settings: db.settings, services: db.services, customers: db.customers,
    vehicles: db.vehicles || [], appointments: db.appointments.map(({ manageToken, requestFingerprint, idempotencyKey, ...a }) => a),
    returns: db.returns.map(({ token, ...r }) => r), blocks: db.blocks, events: db.events || [], waitlist: db.waitlist || [] });
}
