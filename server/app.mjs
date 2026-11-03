// Rotas /api do link público e do painel. Usado pela função da Vercel
// (api/index.js) e pelo servidor local (server.mjs).
//
// Variáveis de ambiente:
//   DATABASE_URL    string de conexão do Neon (obrigatória)
//   PAINEL_SENHA    senha do painel do dono (obrigatória)
//   SESSION_SECRET  opcional; se faltar, é derivada da senha e do banco

// O "hoje" e o "agora" da estética são os de Olinda, não os do servidor.
process.env.TZ = 'America/Sao_Paulo';

import { createHash, createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { withDb, securityState } from './banco.js';
import * as regras from './regras.js';

const { ApiError } = regras;
const SESSION_DAYS = 30;
const COOKIE = 'mdo_sessao';

// ---------------------------------------------------------------------------
// Respostas

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data ?? null), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

function fail(error) {
  if (error instanceof ApiError) {
    return json({ error: { code: error.code, message: error.message, fields: error.fields } }, error.status || 400, error.status === 429 ? { 'retry-after': '900' } : {});
  }
  console.error(error);
  return json({ error: { code: 'SERVER', message: 'Algo deu errado do nosso lado. Tente de novo em instantes.' } }, 500);
}

async function body(request) {
  const raw = await request.text();
  if (raw.length > 20_000) throw new ApiError('INVALID', 'Requisição grande demais.');
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw 0;
    return parsed;
  } catch {
    throw new ApiError('INVALID', 'Requisição inválida.');
  }
}

// ---------------------------------------------------------------------------
// Sessão do painel: cookie assinado "expira.assinatura"

function secret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  return createHash('sha256')
    .update(`painel|${process.env.PAINEL_SENHA || ''}|${process.env.DATABASE_URL || ''}`)
    .digest('hex');
}

function sign(value) {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

function readCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) { try { return decodeURIComponent(v.join('=')); } catch { return null; } }
  }
  return null;
}

async function isLogged(request) {
  const value = readCookie(request, COOKIE);
  if (!value) return false;
  const [expires, id, signature] = value.split('.');
  if (!/^\d+$/.test(expires || '') || !/^[\w-]{36}$/.test(id || '') || !signature || Number(expires) < Date.now() || !safeEqual(signature, sign(`${expires}.${id}`))) return false;
  return securityState(`session:${id}`, state => Boolean(!state.revoked && state.expires > Date.now()));
}

async function limit(request, scope, max, windowMs) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  const key = `limit:${scope}:${createHash('sha256').update(ip).digest('hex')}`;
  const allowed = await securityState(key, state => {
    if (!state.reset || state.reset <= Date.now()) Object.assign(state, { count: 0, reset: Date.now() + windowMs });
    state.count++;
    return state.count <= max;
  });
  if (!allowed) throw new ApiError('RATE_LIMIT', 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.', 429);
}

async function revoke(request) {
  const value = readCookie(request, COOKIE);
  const id = value?.split('.')[1];
  if (id && await isLogged(request)) await securityState(`session:${id}`, state => { state.revoked = true; });
}

function sessionCookie(request, value, maxAge) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

async function login(request) {
  await limit(request, 'login', 10, 15 * 60000);
  const { senha } = await body(request);
  const expected = process.env.PAINEL_SENHA;
  if (!expected) throw new ApiError('CONFIG', 'Senha do painel não configurada no servidor (PAINEL_SENHA).', 500);
  if (!senha || !safeEqual(senha, expected)) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    throw new ApiError('LOGIN', 'Senha incorreta.', 401);
  }
  const expires = String(Date.now() + SESSION_DAYS * 86_400_000);
  const id = randomUUID();
  await securityState(`session:${id}`, state => { state.expires = Number(expires); state.revoked = false; });
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie(request, `${expires}.${id}.${sign(`${expires}.${id}`)}`, SESSION_DAYS * 86_400) });
}

// ---------------------------------------------------------------------------
// Rotas

const db = (fn) => withDb(fn);
const read = (fn, options = {}) => withDb(fn, { ...options, readOnly: true });

const PUBLIC = [
  ['GET', /^\/perfil$/, () => read((d) => regras.getPublicProfile(d), { publicOnly: true })],
  ['GET', /^\/horarios$/, (req, m, url) => read((d) => regras.getAvailability(d, url.searchParams.get('servico'), url.searchParams.get('de'), url.searchParams.get('dias')), { publicOnly: true })],
  ['GET', /^\/retorno\/([a-z0-9]{6,20})$/, (req, m) => read((d) => regras.getReturnInvite(d, m[1]), { tables: ['returns', 'customers', 'services', 'vehicles'], inviteToken: m[1] })],
  ['GET', /^\/reserva\/([\w-]{32})$/, (req, m) => read(d => regras.manageBooking(d, m[1]))],
  ['PATCH', /^\/reserva\/([\w-]{32})$/, async (req, m) => { await limit(req, 'manage', 30, 15 * 60000); const input = await body(req); return db(d => regras.manageBooking(d, m[1], input)); }],
  ['POST', /^\/agendamentos$/, async (req) => {
    await limit(req, 'booking', 20, 60 * 60000);
    const input = await body(req);
    return db((d) => regras.createBooking(d, input, { source: 'link', force: false }));
  }],
];

const PAINEL = [
  ['GET', /^\/painel\/operacao$/, (req, m, url) => read(d => regras.getOperations(d, url.searchParams.get('de'), url.searchParams.get('ate')))],
  ['GET', /^\/painel\/exportar$/, () => read(d => regras.exportData(d))],
  ['GET', /^\/painel\/agendamentos\/([\w-]+)$/, (req, m) => read(d => regras.getAppointment(d, m[1]))],
  ['PUT', /^\/painel\/agendamentos\/([\w-]+)$/, async (req, m) => { const { dados, encaixe } = await body(req); return db(d => regras.editAppointment(d, m[1], dados || {}, { force: encaixe === true })); }],
  ['PATCH', /^\/painel\/clientes\/([\w-]+)$/, async (req, m) => { const input = await body(req); return db(d => regras.saveCustomer(d, m[1], input)); }],
  ['DELETE', /^\/painel\/clientes\/([\w-]+)$/, (req, m) => db(d => regras.anonymizeCustomer(d, m[1]))],
  ['POST', /^\/painel\/espera$/, async req => { const input = await body(req); return db(d => regras.saveWaitlist(d, input)); }],
  ['DELETE', /^\/painel\/espera\/([\w-]+)$/, (req, m) => db(d => regras.closeWaitlist(d, m[1]))],
  ['GET', /^\/painel\/inicio$/, () => read((d) => regras.getHome(d))],
  ['GET', /^\/painel\/busca$/, (req, m, url) => read((d) => regras.search(d, url.searchParams.get('q')))],
  ['GET', /^\/painel\/clientes$/, (req, m, url) => read(d => regras.listCustomers(d, url.searchParams.get('offset'), url.searchParams.get('q')), { tables: ['services', 'customers', 'appointments', 'returns'], customerList: { offset: url.searchParams.get('offset'), query: url.searchParams.get('q') } })],
  ['GET', /^\/painel\/clientes\/([\w-]+)$/, (req, m) => read(d => regras.getCustomer(d, m[1]), { customerId: m[1], tables: ['services', 'customers', 'appointments', 'returns', 'vehicles'] })],
  ['GET', /^\/painel\/agenda$/, (req, m, url) => read((d) => regras.getAgenda(d, url.searchParams.get('de'), url.searchParams.get('dias')))],
  ['POST', /^\/painel\/agendamentos$/, async (req) => {
    const { dados, encaixe } = await body(req);
    return db((d) => regras.createBooking(d, dados || {}, { source: 'painel', force: encaixe === true }));
  }],
  ['PATCH', /^\/painel\/agendamentos\/([\w-]+)$/, async (req, m) => {
    const { status } = await body(req);
    return db((d) => regras.setAppointmentStatus(d, m[1], status));
  }],
  ['GET', /^\/painel\/horarios$/, (req, m, url) => read((d) => regras.getSlotsForPanel(d, url.searchParams.get('servico'), url.searchParams.get('data'), url.searchParams.get('ignorar')))],
  ['GET', /^\/painel\/retornos$/, () => read((d) => regras.listReturns(d))],
  ['GET', /^\/painel\/retornos\/([\w-]+)$/, (req, m) => read((d) => regras.getReturnMessageData(d, m[1]))],
  ['POST', /^\/painel\/retornos\/([\w-]+)\/avisado$/, (req, m) => db((d) => regras.markReturnNotified(d, m[1]))],
  ['POST', /^\/painel\/retornos\/([\w-]+)\/adiar$/, async (req, m) => {
    const { dias } = await body(req);
    return db((d) => regras.snoozeReturn(d, m[1], dias));
  }],
  ['PATCH', /^\/painel\/retornos\/([\w-]+)$/, async (req, m) => {
    const { status } = await body(req);
    return db((d) => regras.setReturnStatus(d, m[1], status));
  }],
  ['GET', /^\/painel\/servicos$/, () => read((d) => regras.listServices(d), { tables: ['services'] })],
  ['DELETE', /^\/painel\/servicos\/([\w-]+)$/, (req, m) => db((d) => regras.deleteService(d, m[1]))],
  ['PUT', /^\/painel\/servicos$/, async (req) => {
    const input = await body(req);
    return db((d) => regras.saveService(d, input));
  }],
  ['POST', /^\/painel\/servicos\/([\w-]+)\/mover$/, async (req, m) => {
    const { direcao } = await body(req);
    return db((d) => regras.moveService(d, m[1], direcao));
  }],
  ['GET', /^\/painel\/ajustes$/, () => read((d) => regras.getSettings(d), { tables: ['blocks'] })],
  ['PATCH', /^\/painel\/ajustes$/, async (req) => {
    const patch = await body(req);
    return db((d) => regras.saveSettings(d, patch));
  }],
  ['POST', /^\/painel\/folgas$/, async (req) => {
    const input = await body(req);
    return db((d) => regras.addBlock(d, input));
  }],
  ['DELETE', /^\/painel\/folgas\/([\w-]+)$/, (req, m) => db((d) => regras.removeBlock(d, m[1]))],
];

function routePath(url) {
  // Na Vercel o caminho chega por /api/index?rota=..., localmente direto em /api/...
  const forwarded = url.searchParams.get('rota');
  const raw = forwarded !== null ? `/${forwarded}` : url.pathname.replace(/^\/api/, '');
  return raw.replace(/\/+$/, '') || '/';
}

export async function handle(request) {
  try {
    const url = new URL(request.url);
    const path = routePath(url);
    const method = request.method.toUpperCase();
    if (!['GET', 'HEAD'].includes(method) && request.headers.get('origin') && request.headers.get('origin') !== url.origin) throw new ApiError('FORBIDDEN', 'Origem da requisição não permitida.', 403);

    if (path === '/login' && method === 'POST') return await login(request);
    if (path === '/logout' && method === 'POST') { await revoke(request); return json({ ok: true }, 200, { 'set-cookie': sessionCookie(request, '', 0) }); }
    if (path === '/sessao' && method === 'GET') return json({ logado: await isLogged(request), local: process.env.STORE_MODE === 'local' });

    for (const [verb, pattern, handler] of PUBLIC) {
      const match = method === verb && path.match(pattern);
      if (match) return json(await handler(request, match, url));
    }
    for (const [verb, pattern, handler] of PAINEL) {
      const match = method === verb && path.match(pattern);
      if (!match) continue;
      if (!await isLogged(request)) throw new ApiError('UNAUTHORIZED', 'Entre com a senha do painel.', 401);
      return json(await handler(request, match, url));
    }
    throw new ApiError('NOT_FOUND', 'Rota não encontrada.', 404);
  } catch (error) {
    return fail(error);
  }
}
