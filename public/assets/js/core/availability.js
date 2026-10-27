// Cálculo de horários livres. Funções puras: recebem configurações e
// agendamentos e devolvem horários. O backend real deve usar a mesma regra
// (e validar de novo na hora de gravar).
//
// Regras:
// - O carro pode chegar entre a abertura e o fechamento, menos na pausa.
// - O serviço tem que terminar até o fechamento (pode atravessar a pausa:
//   o carro fica no box).
// - Cada horário aceita até `capacity` carros ao mesmo tempo (vagas/boxes).
// - Folgas bloqueiam o dia inteiro.
// - Com `maxCarsPerDay`, o dia lota quando chega a esse número de carros.
// - Respeita a antecedência mínima a partir de agora.

import { addDays, diffDays, fromMinutes, nowMinutes, toMinutes, today, weekday } from './dates.js';

export const OCCUPYING = new Set(['agendado', 'concluido']);

export function hoursFor(settings, date) {
  const h = settings.hours?.[weekday(date)];
  return h && h.open && h.close ? h : null;
}

export function blockFor(blocks, date) {
  return (blocks || []).find((b) => date >= b.from && date <= (b.to || b.from)) || null;
}

/** Maior número de carros ao mesmo tempo dentro de [start, end). */
function peakUsage(intervals, start, end) {
  const points = [start];
  for (const it of intervals) if (it.start > start && it.start < end) points.push(it.start);
  let peak = 0;
  for (const p of points) {
    let count = 0;
    for (const it of intervals) if (it.start <= p && it.end > p) count++;
    if (count > peak) peak = count;
  }
  return peak;
}

function occupiedIntervals(appointments, date, ignoreId) {
  return appointments
    .filter((a) => a.date === date && OCCUPYING.has(a.status) && a.id !== ignoreId)
    .map((a) => {
      const start = toMinutes(a.start);
      return { start, end: start + a.durationMin };
    });
}

/**
 * Horários livres de um dia para um serviço com `duration` minutos.
 * Devolve { date, closed, reason, slots: [{ time, free }] }.
 */
export function daySlots({ settings, appointments, blocks, date, duration, now, ignoreId }) {
  const ref = now || { date: today(), minutes: nowMinutes() };
  const hours = hoursFor(settings, date);
  if (!hours) return { date, closed: true, reason: 'fechado', slots: [] };
  const block = blockFor(blocks, date);
  if (block) return { date, closed: true, reason: block.reason || 'folga', slots: [] };

  const offset = diffDays(ref.date, date);
  if (offset < 0) return { date, closed: true, reason: 'passou', slots: [] };

  const open = toMinutes(hours.open);
  const close = toMinutes(hours.close);
  const pauseStart = hours.breakStart ? toMinutes(hours.breakStart) : null;
  const pauseEnd = hours.breakEnd ? toMinutes(hours.breakEnd) : null;
  const earliest = ref.minutes + (settings.minNoticeMinutes || 0) - offset * 1440;
  const step = settings.slotStep || 30;
  const capacity = Math.max(1, settings.capacity || 1);
  const intervals = occupiedIntervals(appointments, date, ignoreId);
  const limit = settings.maxCarsPerDay || 0;
  if (limit && intervals.length >= limit) return { date, closed: false, reason: 'lotado', slots: [] };

  const slots = [];
  for (let t = open; t + duration <= close; t += step) {
    if (pauseStart !== null && t >= pauseStart && t < pauseEnd) continue;
    if (t < earliest) continue;
    const used = peakUsage(intervals, t, t + duration);
    if (used < capacity) slots.push({ time: fromMinutes(t), free: capacity - used });
  }
  const tooLong = duration > close - open;
  return {
    date,
    closed: false,
    reason: slots.length ? null : tooLong ? 'não cabe no dia' : 'lotado',
    slots,
  };
}

/**
 * Agendamento por dia (link público): o cliente escolhe só o dia e traz o
 * carro a partir da abertura. O dia lota quando chega em `maxCarsPerDay`
 * (0 = sem limite). Hoje só vale se ainda der para chegar com a antecedência
 * mínima antes de fechar.
 * Devolve o mesmo formato de daySlots: um único "horário", o da abertura.
 */
export function dayOpening({ settings, appointments, blocks, date, now, ignoreId }) {
  const ref = now || { date: today(), minutes: nowMinutes() };
  const hours = hoursFor(settings, date);
  if (!hours) return { date, closed: true, reason: 'fechado', slots: [] };
  const block = blockFor(blocks, date);
  if (block) return { date, closed: true, reason: block.reason || 'folga', slots: [] };

  const offset = diffDays(ref.date, date);
  if (offset < 0) return { date, closed: true, reason: 'passou', slots: [] };
  if (offset === 0 && ref.minutes + (settings.minNoticeMinutes || 0) >= toMinutes(hours.close)) {
    return { date, closed: true, reason: 'encerrado', slots: [] };
  }

  const cars = occupiedIntervals(appointments, date, ignoreId).length;
  const limit = settings.maxCarsPerDay || 0;
  if (limit && cars >= limit) return { date, closed: false, reason: 'lotado', slots: [] };
  return { date, closed: false, reason: null, slots: [{ time: hours.open, free: limit ? limit - cars : null }] };
}

export function rangeDays({ from, days, ...rest }) {
  return Array.from({ length: days }, (_, i) => dayOpening({ ...rest, date: addDays(from, i) }));
}

/** Primeiro dia com vaga a partir de hoje, dentro do horizonte de agendamento. */
export function firstFreeDay({ settings, horizon, ...rest }) {
  const limit = horizon || settings.horizonDays || 30;
  const start = (rest.now && rest.now.date) || today();
  for (let i = 0; i < limit; i++) {
    const day = dayOpening({ settings, ...rest, date: addDays(start, i) });
    if (day.slots.length) return { date: day.date, time: day.slots[0].time };
  }
  return null;
}

export function rangeSlots({ from, days, ...rest }) {
  return Array.from({ length: days }, (_, i) => daySlots({ ...rest, date: addDays(from, i) }));
}

/** Primeiro horário livre a partir de hoje, dentro do horizonte de agendamento. */
export function firstFree({ settings, horizon, ...rest }) {
  const limit = horizon || settings.horizonDays || 30;
  const start = (rest.now && rest.now.date) || today();
  for (let i = 0; i < limit; i++) {
    const day = daySlots({ settings, ...rest, date: addDays(start, i) });
    if (day.slots.length) return { date: day.date, time: day.slots[0].time };
  }
  return null;
}

/** Ocupação de um dia em minutos-vaga, para o painel. */
export function dayLoad({ settings, appointments, blocks, date }) {
  const hours = hoursFor(settings, date);
  if (!hours || blockFor(blocks, date)) return { open: false, ratio: 0, cars: 0, full: false };
  const open = toMinutes(hours.open);
  const close = toMinutes(hours.close);
  const capacityMinutes = (close - open) * Math.max(1, settings.capacity || 1);
  const items = appointments.filter((a) => a.date === date && OCCUPYING.has(a.status));
  const used = items.reduce((sum, a) => {
    const s = toMinutes(a.start);
    return sum + Math.max(0, Math.min(close, s + a.durationMin) - Math.max(open, s));
  }, 0);
  const limit = settings.maxCarsPerDay || 0;
  return { open: true, ratio: Math.min(1, used / capacityMinutes), cars: items.length, full: Boolean(limit) && items.length >= limit };
}
