import test from 'node:test';
import assert from 'node:assert/strict';
import { createViewHost } from '../public/assets/js/painel/view-host.js';
import { deleteService, listServices, getAvailability } from '../server/regras.js';
import { handle } from '../server/app.mjs';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function hostFixture() {
  const host = { replaceChildren(root) { this.child = root; } };
  return { host, views: createViewHost(host, () => ({ content: '' })) };
}

test('resposta atrasada de outra aba não substitui Serviços e limpa recursos', async () => {
  const { host, views } = hostFixture();
  const pending = deferred();
  let cleaned = 0;
  const old = views.show(async (root) => {
    await pending.promise;
    root.content = 'Retornos';
    return { cleanup() { cleaned++; } };
  }, assert.fail);
  await views.show(async (root) => { root.content = 'Serviços'; }, assert.fail);
  pending.resolve();
  assert.equal(await old, false);
  assert.equal(host.child.content, 'Serviços');
  assert.equal(cleaned, 1);
});

test('erro atrasado não mostra a mensagem de falha na aba atual', async () => {
  const { host, views } = hostFixture();
  const pending = deferred();
  let errors = 0;
  const old = views.show(() => pending.promise, () => { errors++; });
  await views.show(async (root) => { root.content = 'Serviços'; }, assert.fail);
  pending.reject(new TypeError("Cannot set properties of null (setting 'textContent')"));
  await old;
  assert.equal(errors, 0);
  assert.equal(host.child.content, 'Serviços');
});

test('navegação limpa a tela anterior e atualiza somente a tela ativa', async () => {
  const { views } = hostFixture();
  let cleaned = 0, refreshed = 0;
  await views.show(async () => ({ cleanup() { cleaned++; }, refresh() { assert.fail('tela antiga'); } }), assert.fail);
  await views.show(async () => ({ refresh() { refreshed++; } }), assert.fail);
  await views.refresh();
  assert.equal(cleaned, 1);
  assert.equal(refreshed, 1);
});

test('erro da tela atual continua disponível para recuperação', async () => {
  const { host, views } = hostFixture();
  await views.show(async () => { throw new Error('Sem conexão'); }, (error, root) => { root.content = error.message; });
  assert.equal(host.child.content, 'Sem conexão');
});

const fixture = () => ({
  services: [
    { id: 'svc-a', name: 'Lavagem', active: true, order: 0 },
    { id: 'svc-b', name: 'Polimento', active: false, order: 1 },
    { id: 'svc-c', name: 'Higienização', active: true, order: 2 },
  ],
  appointments: [], returns: [],
});

test('exclui serviço sem vínculos e mantém ordem coerente', () => {
  const db = fixture();
  assert.deepEqual(deleteService(db, 'svc-b'), { ok: true });
  assert.deepEqual(listServices(db).map(({ id, order }) => ({ id, order })), [
    { id: 'svc-a', order: 0 }, { id: 'svc-c', order: 1 },
  ]);
  assert.throws(() => getAvailability(db, 'svc-b'), error => error.code === 'NOT_FOUND');
});

test('último serviço pode ser excluído e deixa a lista vazia', () => {
  const db = fixture();
  for (const id of ['svc-a', 'svc-b', 'svc-c']) deleteService(db, id);
  assert.deepEqual(listServices(db), []);
});

test('preserva agendamentos e retornos de qualquer situação', () => {
  for (const key of ['appointments', 'returns']) {
    for (const status of ['agendado', 'concluido', 'cancelado', 'descartado']) {
      const db = fixture();
      db[key].push({ id: 'registro', serviceId: 'svc-a', status });
      const before = structuredClone(db);
      assert.throws(() => deleteService(db, 'svc-a'), error => error.code === 'SERVICE_IN_USE' && error.status === 409);
      assert.deepEqual(db, before);
    }
  }
});

test('excluir serviço inexistente responde NOT_FOUND', () => {
  assert.throws(() => deleteService(fixture(), 'ausente'), error => error.code === 'NOT_FOUND');
});

test('rota de exclusão exige autenticação antes de acessar o banco', async () => {
  const response = await handle(new Request('http://localhost/api/painel/servicos/svc-a', { method: 'DELETE' }));
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, 'UNAUTHORIZED');
});
