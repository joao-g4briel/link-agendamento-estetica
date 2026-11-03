import { diffDays, parseInterval, parseISODate, pad, today } from './dates.js';

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
export const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function formatPrice(cents) {
  return Number(cents) % 100 === 0 ? money.format(cents / 100) : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${pad(m)}` : `${h}h`;
}

/** "terça, 14 de outubro" */
export function formatDateLong(iso) {
  const d = parseISODate(iso);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

/** "14/10" */
export function formatDateShort(iso) {
  const d = parseISODate(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** "14/10" no ano corrente; "14/10/25" em outro ano. */
export function formatDateShortYear(iso) {
  const d = parseISODate(iso);
  const short = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  return d.getFullYear() === new Date().getFullYear() ? short : `${short}/${String(d.getFullYear()).slice(2)}`;
}

/** "outubro de 2027" */
export function formatMonthYear(iso) {
  const d = parseISODate(iso);
  return `${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

/** "hoje", "amanhã", "terça" (até 6 dias) ou "14/10". */
export function formatRelativeDay(iso, base = today()) {
  const diff = diffDays(base, iso);
  if (diff === 0) return 'hoje';
  if (diff === 1) return 'amanhã';
  if (diff === -1) return 'ontem';
  if (diff > 1 && diff < 7) return WEEKDAYS[parseISODate(iso).getDay()];
  return formatDateShort(iso);
}

/** Intervalo de retorno em linguagem de balcão: "15 dias", "6 meses", "1 ano". */
export function formatInterval(code) {
  const it = parseInterval(code);
  if (!it) return '';
  if (it.unit === 'd') return it.n === 1 ? '1 dia' : `${it.n} dias`;
  if (it.n % 12 === 0) return it.n === 12 ? '1 ano' : `${it.n / 12} anos`;
  return it.n === 1 ? '1 mês' : `${it.n} meses`;
}

/** Tempo decorrido, para mensagens: "6 meses", "1 ano", "3 semanas". */
export function formatElapsed(days) {
  if (days >= 330) {
    const years = Math.round(days / 365) || 1;
    return years === 1 ? '1 ano' : `${years} anos`;
  }
  if (days >= 45) {
    const months = Math.round(days / 30);
    return months === 1 ? '1 mês' : `${months} meses`;
  }
  if (days >= 14) return `${Math.round(days / 7)} semanas`;
  return days === 1 ? '1 dia' : `${days} dias`;
}

/** Só os dígitos do telefone, sem o 55 do Brasil. */
export function normalizePhone(input) {
  let digits = String(input || '').replace(/\D/g, '');
  if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2);
  return digits;
}

export function isValidPhone(input) {
  const digits = normalizePhone(input);
  return digits.length === 10 || digits.length === 11;
}

/** "(11) 98765-4321" — aceita digitação parcial para máscara de campo. */
export function formatPhone(input) {
  const d = normalizePhone(input).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Placa no padrão Mercosul (ABC1D23) ou antigo (ABC-1234). */
export function formatPlate(input) {
  const raw = String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  return /^[A-Z]{3}\d{4}$/.test(raw) ? `${raw.slice(0, 3)}-${raw.slice(3)}` : raw;
}

export function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

class SafeHTML {
  constructor(value) { this.__html = value; }
  toString() { return this.__html; }
}

export const raw = (value) => new SafeHTML(String(value));

function piece(value) {
  if (value === false || value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(piece).join('');
  if (value instanceof SafeHTML) return value.__html;
  return escapeHTML(value);
}

/** Template literal que escapa as interpolações; listas e outros `html` entram como estão. */
export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((value, i) => { out += piece(value) + strings[i + 1]; });
  return new SafeHTML(out);
}
