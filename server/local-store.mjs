import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { SERVICES, SETTINGS } from './inicial.js';

let queue = Promise.resolve();
export function localStore(fn, { readOnly = false } = {}) {
  const run = queue.then(async () => {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw new Error('Base local não permitida em produção.');
    const file = resolve(process.env.LOCAL_DATA_FILE || '.local/validacao.json');
    let data;
    try { data = JSON.parse(await readFile(file, 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      data = { settings: { ...structuredClone(SETTINGS), autoComplete: false }, services: structuredClone(SERVICES).map(({ durationMin, ...s }) => s),
        customers: [], appointments: [], returns: [], blocks: [], vehicles: [], events: [], waitlist: [], security: {} };
    }
    const result = await fn(data);
    if (!readOnly) {
      await mkdir(dirname(file), { recursive: true });
      const temp = `${file}.tmp`;
      await writeFile(temp, JSON.stringify(data, null, 2), 'utf8');
      await rename(temp, file);
    }
    return result;
  });
  queue = run.catch(() => {});
  return run;
}
