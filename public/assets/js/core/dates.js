// Datas "de parede": dias como "AAAA-MM-DD" e horas como "HH:MM", sempre no
// horário local da estética. No placeholder o relógio é o do navegador; com
// backend, quem decide "agora" é o servidor (fuso America/Sao_Paulo).

export const pad = (n) => String(n).padStart(2, '0');

export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today() {
  return toISODate(new Date());
}

export function addDays(iso, days) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function addMonths(iso, months) {
  const d = parseISODate(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISODate(d);
}

/**
 * Intervalo de calendário: "15d" (dias) ou "6m" (meses). Meses usam o
 * calendário de verdade: 4 de abril + 6m = 4 de outubro.
 */
export function parseInterval(code) {
  const match = /^(\d+)([dm])$/.exec(String(code || ''));
  return match ? { n: Number(match[1]), unit: match[2] } : null;
}

export function addInterval(iso, code, sign = 1) {
  const it = parseInterval(code);
  if (!it) return iso;
  return it.unit === 'm' ? addMonths(iso, it.n * sign) : addDays(iso, it.n * sign);
}

/** Dias corridos de `from` até `to` (negativo se `to` vem antes). */
export function diffDays(from, to) {
  return Math.round((parseISODate(to) - parseISODate(from)) / 86_400_000);
}

export function weekday(iso) {
  return parseISODate(iso).getDay();
}

export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(total) {
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/** Início da semana (segunda-feira) que contém `iso`. */
export function startOfWeek(iso) {
  const wd = weekday(iso);
  return addDays(iso, wd === 0 ? -6 : 1 - wd);
}
