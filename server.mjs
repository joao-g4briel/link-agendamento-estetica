// Servidor local: arquivos de public/ e as rotas /api (as mesmas da Vercel).
// Lê DATABASE_URL e PAINEL_SENHA do .env.local (npm start).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handle } from './server/app.mjs';

const root = fileURLToPath(new URL('./public', import.meta.url));
const port = Number(process.env.PORT) || 5173;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

async function resolveFile(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  const target = join(root, clean);
  if (target !== root && !target.startsWith(root + sep)) return null;
  try {
    const info = await stat(target);
    if (info.isDirectory()) return resolveFile(join(clean, 'index.html'));
    return target;
  } catch {
    return null;
  }
}

async function api(req, res) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const request = new Request(new URL(req.url, `http://${req.headers.host}`), {
    method: req.method,
    headers: req.headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
  });
  const response = await handle(request);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname.startsWith('/api/')) return api(req, res);
  let file = await resolveFile(pathname);
  if (!file && !extname(pathname)) {
    // /painel/qualquer-coisa cai no painel; o resto cai no link público.
    file = await resolveFile(pathname.startsWith('/painel') ? '/painel/index.html' : '/index.html');
  }
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Não encontrado');
    return;
  }
  const body = await readFile(file);
  res.writeHead(200, {
    'content-type': types[extname(file)] || 'application/octet-stream',
    'cache-control': 'no-cache',
  });
  res.end(body);
}).listen(port, '127.0.0.1', () => {
  console.log(`Link de agendamento:  http://localhost:${port}/`);
  console.log(`Painel da estética:   http://localhost:${port}/painel/`);
});
