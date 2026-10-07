// Servidor estático sem dependências, só para rodar o projeto localmente.
// O agendamento e o painel são arquivos estáticos; os dados ficam no
// placeholder do navegador (assets/js/data/store.js) até existir um backend.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

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

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
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
}).listen(port, () => {
  console.log(`Link de agendamento:  http://localhost:${port}/`);
  console.log(`Painel da estética:   http://localhost:${port}/painel/`);
});
