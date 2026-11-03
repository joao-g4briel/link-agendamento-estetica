// API usada pelas telas: cada função chama uma rota /api do servidor
// (server/app.mjs), que lê e grava no banco (Neon). As regras de negócio
// ficam no servidor (server/regras.js).

export class ApiError extends Error {
  constructor(code, message, fields) {
    super(message);
    this.code = code;
    this.fields = fields;
  }
}

const BASE = new URL('../../../api/', import.meta.url).pathname;
const listeners = new Set();
let cachedSettings = null;
let unauthorizedHandler = null;

/** O painel registra aqui o que fazer quando a sessão acaba no meio do uso. */
export function onUnauthorized(cb) {
  unauthorizedHandler = cb;
}

/** Avisa as telas do painel quando algo muda (para atualizarem as listas). */
export function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function changed() {
  listeners.forEach((cb) => cb());
}

async function call(path, { method = 'GET', body, query } = {}) {
  const url = new URL(path, new URL(BASE, window.location.origin));
  if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null) url.searchParams.set(k, v);
  let response;
  try {
    response = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('OFFLINE', 'Sem conexão. Confira a internet e tente de novo.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const e = data?.error || {};
    if (e.code === 'UNAUTHORIZED') unauthorizedHandler?.();
    throw new ApiError(e.code || 'SERVER', e.message || 'Algo deu errado. Tente de novo.', e.fields);
  }
  if (method !== 'GET') changed();
  return data;
}

// ---------------------------------------------------------------------------
// Link público

export const getPublicProfile = () => call('perfil');
export const getAvailability = (serviceId, from, days) => call('horarios', { query: { servico: serviceId, de: from, dias: days } });
export const getReturnInvite = (token) => call(`retorno/${encodeURIComponent(token)}`);
export const getManagedBooking = token => call(`reserva/${encodeURIComponent(token)}`);
export const manageBooking = (token, body) => call(`reserva/${encodeURIComponent(token)}`, { method: 'PATCH', body });
export const createBooking = (input, { source = 'link', force = false } = {}) =>
  source === 'painel'
    ? call('painel/agendamentos', { method: 'POST', body: { dados: input, encaixe: force } })
    : call('agendamentos', { method: 'POST', body: input });

// ---------------------------------------------------------------------------
// Sessão do painel

export const getSession = () => call('sessao');
export const login = (senha) => call('login', { method: 'POST', body: { senha } });
export const logout = () => call('logout', { method: 'POST' });

// ---------------------------------------------------------------------------
// Painel

export const getHome = () => call('painel/inicio');
export const getAppointment = id => call(`painel/agendamentos/${id}`);
export const editAppointment = (id, dados, encaixe = false) => call(`painel/agendamentos/${id}`, { method: 'PUT', body: { dados, encaixe } });
export const saveCustomer = (id, body) => call(`painel/clientes/${id}`, { method: 'PATCH', body });
export const anonymizeCustomer = id => call(`painel/clientes/${id}`, { method: 'DELETE' });
export const getOperations = (from, to) => call('painel/operacao', { query: { de: from, ate: to } });
export const exportData = () => call('painel/exportar');
export const saveWaitlist = body => call('painel/espera', { method: 'POST', body });
export const closeWaitlist = id => call(`painel/espera/${id}`, { method: 'DELETE' });
export const search = (q) => call('painel/busca', { query: { q } });
export const listCustomers = (offset = 0, q = '') => call('painel/clientes', { query: { offset, q } });
export const getCustomer = id => call(`painel/clientes/${id}`);
export const getAgenda = (from, days = 7) => call('painel/agenda', { query: { de: from, dias: days } });
export const setAppointmentStatus = (id, status) => call(`painel/agendamentos/${id}`, { method: 'PATCH', body: { status } });
export const getSlotsForPanel = (serviceId, date, ignoreId) => call('painel/horarios', { query: { servico: serviceId, data: date, ignorar: ignoreId } });
export const listReturns = () => call('painel/retornos');
export const getReturnMessageData = (id) => call(`painel/retornos/${id}`);
export const markReturnNotified = (id) => call(`painel/retornos/${id}/avisado`, { method: 'POST' });
export const snoozeReturn = (id, days = 7) => call(`painel/retornos/${id}/adiar`, { method: 'POST', body: { dias: days } });
export const setReturnStatus = (id, status) => call(`painel/retornos/${id}`, { method: 'PATCH', body: { status } });
export const listServices = () => call('painel/servicos');
export const deleteService = (id) => call(`painel/servicos/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const saveService = (input) => call('painel/servicos', { method: 'PUT', body: input });
export const moveService = (id, direction) => call(`painel/servicos/${id}/mover`, { method: 'POST', body: { direcao: direction } });
export const addBlock = (input) => call('painel/folgas', { method: 'POST', body: input });
export const removeBlock = (id) => call(`painel/folgas/${id}`, { method: 'DELETE' });

export async function getSettings() {
  const data = await call('painel/ajustes');
  cachedSettings = data.settings;
  return data;
}

export async function saveSettings(patch) {
  const settings = await call('painel/ajustes', { method: 'PATCH', body: patch });
  cachedSettings = settings;
  return settings;
}

/** Endereço público do link (para as mensagens de retorno). */
export function publicBaseUrl() {
  return (cachedSettings && cachedSettings.publicUrl) || window.location.origin;
}
