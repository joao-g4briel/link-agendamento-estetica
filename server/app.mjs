// Rotas /api do link público e do painel. Usado pela função da Vercel
// (api/index.js) e pelo servidor local (server.mjs).
//
// Variáveis de ambiente:
//   DATABASE_URL    string de conexão do Neon (obrigatória)
//   PAINEL_SENHA    senha do painel do dono (obrigatória)
//   SESSION_SECRET  opcional; se faltar, é derivada da senha e do banco

// O "hoje" e o "agora" da estética são os de Olinda, não os do servidor.
process.env.TZ = 'America/Sao_Paulo';

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { withDb } from './banco.js';
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
    return json({ error: { code: error.code, message: error.message, fields: error.fields } }, error.status || 400);
  }
  console.error(error);
  return json({ error: { code: 'SERVER', message: 'Algo deu errado do nosso lado. Tente de novo em instantes.' } }, 500);
}

async function body(request) {
  const raw = await request.text();
  if (raw.length > 20_000) throw new ApiError('INVALID', 'Requisição grande demais.');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
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
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function isLogged(request) {
  const value = readCookie(request, COOKIE);
  if (!value) return false;
  const [expires, signature] = value.split('.');
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  return safeEqual(signature, sign(expires));
}

function sessionCookie(request, value, maxAge) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

async function login(request) {
  const { senha } = await body(request);
  const expected = process.env.PAINEL_SENHA;
  if (!expected) throw new ApiError('CONFIG', 'Senha do painel não configurada no servidor (PAINEL_SENHA).', 500);
  if (!senha || !safeEqual(senha, expected)) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    throw new ApiError('LOGIN', 'Senha incorreta.', 401);
  }
  const expires = String(Date.now() + SESSION_DAYS * 86_400_000);
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie(request, `${expires}.${sign(expires)}`, SESSION_DAYS * 86_400) });
}

// ---------------------------------------------------------------------------
// Rotas

const db = (fn) => withDb(fn);

const PUBLIC = [
  ['GET', /^\/perfil$/, () => db((d) => regras.getPublicProfile(d))],
  ['GET', /^\/horarios$/, (req, m, url) => db((d) => regras.getAvailability(d, url.searchParams.get('servico'), url.searchParams.get('de'), url.searchParams.get('dias')))],
  ['GET', /^\/retorno\/([a-z0-9]{6,20})$/, (req, m) => db((d) => regras.getReturnInvite(d, m[1]))],
  ['POST', /^\/agendamentos$/, async (req) => {
    const input = await body(req);
    return db((d) => regras.createBooking(d, input, { source: 'link', force: false }));
  }],
];

const PAINEL = [
  ['GET', /^\/painel\/inicio$/, () => db((d) => regras.getHome(d))],
  ['GET', /^\/painel\/busca$/, (req, m, url) => db((d) => regras.search(d, url.searchParams.get('q')))],
  ['GET', /^\/painel\/clientes$/, () => db((d) => regras.listCustomers(d))],
  ['GET', /^\/painel\/agenda$/, (req, m, url) => db((d) => regras.getAgenda(d, url.searchParams.get('de'), url.searchParams.get('dias')))],
  ['POST', /^\/painel\/agendamentos$/, async (req) => {
    const { dados, encaixe } = await body(req);
    return db((d) => regras.createBooking(d, dados || {}, { source: 'painel', force: Boolean(encaixe) }));
  }],
  ['PATCH', /^\/painel\/agendamentos\/([\w-]+)$/, async (req, m) => {
    const { status } = await body(req);
    return db((d) => regras.setAppointmentStatus(d, m[1], status));
  }],
  ['GET', /^\/painel\/horarios$/, (req, m, url) => db((d) => regras.getSlotsForPanel(d, url.searchParams.get('servico'), url.searchParams.get('data')))],
  ['GET', /^\/painel\/retornos$/, () => db((d) => regras.listReturns(d))],
  ['GET', /^\/painel\/retornos\/([\w-]+)$/, (req, m) => db((d) => regras.getReturnMessageData(d, m[1]))],
  ['POST', /^\/painel\/retornos\/([\w-]+)\/avisado$/, (req, m) => db((d) => regras.markReturnNotified(d, m[1]))],
  ['POST', /^\/painel\/retornos\/([\w-]+)\/adiar$/, async (req, m) => {
    const { dias } = await body(req);
    return db((d) => regras.snoozeReturn(d, m[1], dias));
  }],
  ['PATCH', /^\/painel\/retornos\/([\w-]+)$/, async (req, m) => {
    const { status } = await body(req);
    return db((d) => regras.setReturnStatus(d, m[1], status));
  }],
  ['GET', /^\/painel\/servicos$/, () => db((d) => regras.listServices(d))],
  ['PUT', /^\/painel\/servicos$/, async (req) => {
    const input = await body(req);
    return db((d) => regras.saveService(d, input));
  }],
  ['POST', /^\/painel\/servicos\/([\w-]+)\/mover$/, async (req, m) => {
    const { direcao } = await body(req);
    return db((d) => regras.moveService(d, m[1], direcao));
  }],
  ['GET', /^\/painel\/ajustes$/, () => db((d) => regras.getSettings(d))],
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

    if (path === '/login' && method === 'POST') return await login(request);
    if (path === '/logout' && method === 'POST') return json({ ok: true }, 200, { 'set-cookie': sessionCookie(request, '', 0) });
    if (path === '/sessao' && method === 'GET') return json({ logado: isLogged(request) });

    for (const [verb, pattern, handler] of PUBLIC) {
      const match = method === verb && path.match(pattern);
      if (match) return json(await handler(request, match, url));
    }
    for (const [verb, pattern, handler] of PAINEL) {
      const match = method === verb && path.match(pattern);
      if (!match) continue;
      if (!isLogged(request)) throw new ApiError('UNAUTHORIZED', 'Entre com a senha do painel.', 401);
      return json(await handler(request, match, url));
    }
    throw new ApiError('NOT_FOUND', 'Rota não encontrada.', 404);
  } catch (error) {
    return fail(error);
  }
}
