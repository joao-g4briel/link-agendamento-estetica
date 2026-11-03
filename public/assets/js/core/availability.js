// Reservas por dia. Horários representam chegada, nunca duração de serviço.
import { addDays, diffDays, fromMinutes, nowMinutes, toMinutes, today, weekday } from './dates.js';
export const OCCUPYING = new Set(['agendado', 'confirmado', 'recebido', 'em_servico', 'pronto', 'concluido']);
export function hoursFor(settings, date) {
  const h = settings.hours?.[weekday(date)];
  return h?.open && h?.close ? h : null;
}
export function blockFor(blocks, date) {
  return (blocks || []).find(b => date >= b.from && date <= (b.to || b.from)) || null;
}
export function dayOpening({ settings, appointments, blocks, date, now, ignoreId }) {
  const ref = now || { date: today(), minutes: nowMinutes() };
  const h = hoursFor(settings, date);
  const closed = reason => ({ date, closed: true, reason, slots: [] });
  if (!h) return closed('fechado');
  const block = blockFor(blocks, date);
  if (block) return closed(block.reason || 'folga');
  const offset = diffDays(ref.date, date);
  if (offset < 0) return closed('passou');
  const count = appointments.filter(a => a.id !== ignoreId && a.date === date && OCCUPYING.has(a.status)).length;
  const limit = settings.maxCarsPerDay || 0;
  if (limit && count >= limit) return { date, closed: false, reason: 'lotado', slots: [] };
  const step = settings.slotStep || 30;
  let first = Math.max(toMinutes(h.open), Math.ceil((ref.minutes + (settings.minNoticeMinutes || 0) - offset * 1440) / step) * step);
  if (h.breakStart && h.breakEnd && first >= toMinutes(h.breakStart) && first < toMinutes(h.breakEnd)) first = toMinutes(h.breakEnd);
  if (first >= toMinutes(h.close)) return closed('encerrado');
  return { date, closed: false, reason: null, slots: [{ time: fromMinutes(first), free: limit ? limit - count : null }] };
}
export function daySlots(ctx) {
  const day = dayOpening(ctx);
  if (!day.slots.length) return day;
  const h = hoursFor(ctx.settings, ctx.date);
  const slots = [];
  for (let t = toMinutes(day.slots[0].time); t < toMinutes(h.close); t += ctx.settings.slotStep || 30) {
    if (h.breakStart && h.breakEnd && t >= toMinutes(h.breakStart) && t < toMinutes(h.breakEnd)) continue;
    slots.push({ time: fromMinutes(t), free: day.slots[0].free });
  }
  return { ...day, slots };
}
export function rangeDays({ from, days, ...ctx }) {
  return Array.from({ length: days }, (_, i) => dayOpening({ ...ctx, date: addDays(from, i) }));
}
export function firstFreeDay({ settings, horizon, ...ctx }) {
  const start = ctx.now?.date || today();
  for (let i = 0; i < (horizon || settings.horizonDays || 30); i++) {
    const day = dayOpening({ settings, ...ctx, date: addDays(start, i) });
    if (day.slots.length) return { date: day.date, time: day.slots[0].time };
  }
  return null;
}
export function dayLoad({ settings, appointments, blocks, date }) {
  const cars = appointments.filter(a => a.date === date && OCCUPYING.has(a.status)).length;
  const limit = settings.maxCarsPerDay || 0;
  return { open: Boolean(hoursFor(settings, date)) && !blockFor(blocks, date), ratio: limit ? Math.min(1, cars / limit) : 0, cars, full: Boolean(limit && cars >= limit) };
}
