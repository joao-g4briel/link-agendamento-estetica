// PLACEHOLDER DO BANCO DE DADOS.
// Guarda tudo no localStorage deste navegador, com dados de exemplo na
// primeira visita. Serve para o link e o painel funcionarem de ponta a ponta
// no mesmo aparelho. Com um backend de verdade, este arquivo some e o api.js
// passa a chamar o servidor.

import { createSeed, SCHEMA_VERSION } from './seed.js';

const KEY = 'estetica.placeholder.v1';
const listeners = new Set();
let memory = null;

function readStorage() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStorage(db) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    // Navegação privada ou armazenamento cheio: segue só em memória.
  }
}

export function load() {
  if (memory) return memory;
  const stored = readStorage();
  memory = stored && stored.version === SCHEMA_VERSION ? stored : createSeed();
  if (!stored || stored.version !== SCHEMA_VERSION) writeStorage(memory);
  return memory;
}

/** Aplica uma alteração e grava. `fn` recebe o banco e pode devolver um resultado. */
export function mutate(fn) {
  const db = load();
  const result = fn(db);
  writeStorage(db);
  listeners.forEach((cb) => cb());
  return result;
}

export function reset() {
  memory = createSeed();
  writeStorage(memory);
  listeners.forEach((cb) => cb());
  return memory;
}

/** Avisa quando os dados mudam, inclusive em outra aba (ex.: um agendamento novo pelo link). */
export function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

window.addEventListener('storage', (event) => {
  if (event.key !== KEY) return;
  memory = null;
  listeners.forEach((cb) => cb());
});
