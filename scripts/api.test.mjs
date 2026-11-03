import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { handle } from '../server/app.mjs';

test('fluxo completo da API em base local isolada e revogação de sessão', async () => {
  const previous = { mode: process.env.STORE_MODE, file: process.env.LOCAL_DATA_FILE, password: process.env.PAINEL_SENHA };
  process.env.STORE_MODE = 'local'; process.env.LOCAL_DATA_FILE = `.local/test-${randomUUID()}.json`; process.env.PAINEL_SENHA = 'senha-apenas-para-teste';
  const file = process.env.LOCAL_DATA_FILE;
  let cookie = '';
  const call = async (path, method = 'GET', data, auth = true, extra = {}) => {
    const response = await handle(new Request(`http://localhost/api/${path}`, { method, headers: { ...(cookie && auth ? { cookie } : {}), ...(data ? { 'content-type': 'application/json' } : {}), ...extra }, body: data ? JSON.stringify(data) : undefined }));
    return { response, data: await response.json() };
  };
  try {
    const login = await call('login', 'POST', { senha: process.env.PAINEL_SENHA }); assert.equal(login.response.status, 200);
    cookie = login.response.headers.get('set-cookie').split(';')[0];
    assert.equal((await call('sessao')).data.logado, true);
    const profile = (await call('perfil')).data;
    const service = profile.services[0];
    const days = (await call(`horarios?servico=${service.id}`)).data;
    const day = days.find(d => d.slots.length);
    const payload = { name: 'Cliente API', phone: '81912345678', vehicle: 'Carro de teste', plate: 'ABC1D23', serviceId: service.id, date: day.date, start: day.slots[0].time, idempotencyKey: randomUUID() };
    const created = await call('agendamentos', 'POST', payload, false); assert.equal(created.response.status, 200);
    const duplicate = await call('agendamentos', 'POST', payload, false); assert.equal(duplicate.data.appointment.id, created.data.appointment.id);
    const agenda = (await call(`painel/agenda?de=${day.date}&dias=1`)).data; assert.equal(agenda.days[0].items.length, 1);
    assert.equal((await call('painel/ajustes', 'GET', undefined, false)).response.status, 401);
    assert.equal((await call('painel/ajustes', 'PATCH', { maxCarsPerDay: 5 }, true, { origin: 'https://outra-origem.invalid' })).response.status, 403);
    const exported = (await call('painel/exportar')).data;
    assert.equal(exported.appointments[0].manageToken, undefined);
    await call('logout', 'POST', {});
    assert.equal((await call('sessao')).data.logado, false);
    assert.equal((await call('painel/agenda')).response.status, 401);
    for (let i = 0; i < 20; i++) assert.equal((await call('agendamentos', 'POST', {}, false, { 'x-forwarded-for': 'ip-isolado-do-teste' })).response.status, 400);
    const limited = await call('agendamentos', 'POST', {}, false, { 'x-forwarded-for': 'ip-isolado-do-teste' });
    assert.equal(limited.response.status, 429);
    assert.equal(limited.response.headers.get('retry-after'), '900');
  } finally {
    await rm(file, { force: true });
    for (const [key, value] of Object.entries({ STORE_MODE: previous.mode, LOCAL_DATA_FILE: previous.file, PAINEL_SENHA: previous.password })) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
