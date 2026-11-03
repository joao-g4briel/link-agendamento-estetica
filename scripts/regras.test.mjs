import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import * as r from '../server/regras.js';
import { addDays, today, isISODate } from '../public/assets/js/core/dates.js';
import { dayOpening } from '../public/assets/js/core/availability.js';
import { formatPrice } from '../public/assets/js/core/format.js';

const fixture = () => ({ settings: { name: 'HC Teste', bookingOpen: true, maxCarsPerDay: 4, slotStep: 30, minNoticeMinutes: 120, horizonDays: 30,
  hours: Object.fromEntries(Array.from({ length: 7 }, (_, i) => [i, { open: '08:00', close: '18:00', breakStart: '12:00', breakEnd: '13:00' }])) },
  services: [{ id: 'svc', name: 'Lavagem', active: true, order: 0, priceCents: 4050, returnInterval: '6m' }],
  customers: [], appointments: [], returns: [], blocks: [], vehicles: [], events: [], waitlist: [] });
const input = extra => ({ serviceId: 'svc', date: addDays(today(), 1), start: '14:00', name: 'Cliente Teste', phone: '81912345678', vehicle: 'Carro azul', plate: 'ABC1D23', ...extra });
const book = (db, extra, options) => r.createBooking(db, input(extra), options).appointment;

test('agenda por dia não usa duração e preserva chegada escolhida no painel fechado ao público', () => {
  const db = fixture(); db.settings.bookingOpen = false;
  const a = book(db, {}, { source: 'painel' });
  assert.equal(a.start, '14:00'); assert.equal(a.durationMin, undefined);
  assert.throws(() => book(db), e => e.code === 'CLOSED');
});
test('limite diário é respeitado mesmo com chegadas distintas; encaixe é explícito', () => {
  const db = fixture(); db.settings.maxCarsPerDay = 1;
  book(db);
  assert.throws(() => book(db, { start: '15:00' }, { source: 'painel' }), e => e.code === 'SLOT_TAKEN');
  assert.ok(book(db, {}, { source: 'painel', force: true }));
});
test('hoje a chegada respeita antecedência e pula a pausa', () => {
  const db = fixture();
  const day = dayOpening({ ...db, date: today(), now: { date: today(), minutes: 10 * 60 + 30 } });
  assert.equal(day.slots[0].time, '13:00');
});
test('idempotência devolve a reserva original e rejeita mudança dos dados', () => {
  const db = fixture(), key = randomUUID();
  const a = book(db, { idempotencyKey: key });
  const again = book(db, { idempotencyKey: key });
  assert.equal(a.id, again.id); assert.equal(a.manageToken, again.manageToken); assert.equal(db.appointments.length, 1);
  assert.throws(() => book(db, { idempotencyKey: key, name: 'Mudou' }), e => e.code === 'IDEMPOTENCY_CONFLICT');
});
test('reserva pública não altera nome do cadastro e mantém nome informado na reserva', () => {
  const db = fixture(); book(db);
  const a = book(db, { name: 'Outro nome' });
  assert.equal(db.customers[0].name, 'Cliente Teste'); assert.equal(a.customerName, 'Outro nome');
});
test('carros diferentes têm retornos independentes e sem placa não se fundem pelo nome', () => {
  const db = fixture();
  const a = book(db, { date: today() }, { source: 'painel', force: true });
  const b = book(db, { date: today(), plate: 'DEF4G56' }, { source: 'painel', force: true });
  r.setAppointmentStatus(db, a.id, 'concluido'); r.setAppointmentStatus(db, b.id, 'concluido');
  assert.equal(db.returns.filter(r => r.status === 'pendente').length, 2);
  const c = book(db, { plate: '' }); const d = book(db, { plate: '' });
  assert.notEqual(c.vehicleId, d.vehicleId);
});
test('cancelar reagendamento recupera a fila e corrigir conclusão descarta aviso', () => {
  const db = fixture(); const a = book(db, { date: today() }, { source: 'painel', force: true });
  r.setAppointmentStatus(db, a.id, 'concluido'); const ret = db.returns[0];
  const next = book(db, { returnToken: ret.token });
  assert.equal(ret.status, 'reagendado'); r.setAppointmentStatus(db, next.id, 'cancelado');
  assert.equal(ret.status, 'pendente'); r.markReturnNotified(db, ret.id);
  r.setAppointmentStatus(db, a.id, 'faltou'); assert.equal(ret.status, 'descartado');
});
test('consultas são puras e antigos agendados ficam para revisão', () => {
  const db = fixture(); const a = book(db); a.date = addDays(today(), -1); db.appointments[0].date = a.date; db.settings.autoComplete = true;
  const before = structuredClone(db);
  assert.equal(r.getHome(db).review.length, 1);
  r.getAgenda(db); r.listReturns(db); r.listCustomers(db); r.search(db, 'Cliente');
  assert.deepEqual(db, before);
});
test('agenda mantém compromissos em folgas e inclui cancelados', () => {
  const db = fixture(); const a = book(db); r.setAppointmentStatus(db, a.id, 'cancelado');
  db.blocks.push({ id: 'folga', from: a.date, to: a.date });
  const day = r.getAgenda(db, a.date, 1).days[0]; assert.equal(day.items.length, 1); assert.ok(day.block);
});
test('remarcação mantém identidade, revalida limite e registra alteração', () => {
  const db = fixture(); const a = book(db);
  const result = r.editAppointment(db, a.id, input({ date: addDays(today(), 2), start: '15:00', notes: 'Teste' }));
  assert.equal(result.appointment.id, a.id); assert.equal(result.appointment.start, '15:00'); assert.equal(db.appointments[0].manageToken, a.manageToken);
  assert.ok(db.events.some(e => e.action === 'agendamento.remarcado'));
});
test('corrigir dados de atendimento antigo não reabre, não troca preço nem descarta retorno', () => {
  const db = fixture(); const a = book(db);
  const stored = db.appointments[0];
  stored.date = addDays(today(), -30);
  r.setAppointmentStatus(db, a.id, 'concluido');
  db.services[0].priceCents = 9900;
  const result = r.editAppointment(db, a.id, input({ date: stored.date, start: stored.start, notes: 'Corrigido' }));
  assert.equal(result.appointment.notes, 'Corrigido'); assert.equal(stored.status, 'concluido'); assert.equal(stored.priceCents, 4050);
  assert.equal(db.returns[0].status, 'pendente');
  assert.ok(db.events.some(e => e.action === 'agendamento.editado'));
  assert.throws(() => r.editAppointment(db, a.id, input({ date: addDays(today(), -29), start: stored.start })), e => e.code === 'INVALID');
});
test('remarcar para outro dia continua voltando para agendado', () => {
  const db = fixture(); const a = book(db);
  r.setAppointmentStatus(db, a.id, 'confirmado');
  r.editAppointment(db, a.id, input({ date: addDays(today(), 2) }));
  assert.equal(db.appointments[0].status, 'agendado');
});
test('lista de espera aponta o campo inválido', () => {
  assert.throws(() => r.saveWaitlist(fixture(), { name: 'A', phone: '1', serviceId: 'svc' }), e => Boolean(e.fields.name && e.fields.phone));
});
test('valida datas reais, números finitos, pausas, URLs e descrição', () => {
  assert.equal(isISODate('2026-02-30'), false);
  const db = fixture();
  assert.throws(() => r.saveSettings(db, { maxCarsPerDay: -1 }));
  assert.throws(() => r.saveSettings(db, { slotStep: 0 }));
  assert.throws(() => r.saveSettings(db, { hours: { 1: { open: '18:00', close: '08:00' } } }));
  assert.throws(() => r.saveSettings(db, { publicUrl: 'javascript:alert(1)' }));
  assert.throws(() => r.saveService(db, { name: 'Teste', priceCents: Infinity }));
  const s = r.saveService(db, { name: 'Teste', priceCents: 100, description: 'Item\n'.repeat(100) });
  assert.equal(s.description.split('\n').length, 100); assert.equal(s.durationMin, undefined);
  assert.match(formatPrice(4050), /40,5/);
});
test('link de gestão usa token forte, não código curto e respeita cancelamento', () => {
  const db = fixture(); const a = book(db);
  assert.equal(a.manageToken.length, 32);
  assert.throws(() => r.manageBooking(db, a.code), e => e.status === 404);
  assert.ok(r.manageBooking(db, a.manageToken).canChange);
  r.manageBooking(db, a.manageToken, { action: 'cancelar' });
  assert.equal(r.manageBooking(db, a.manageToken).canChange, false);
});
test('anonimização remove identificadores e tokens, preservando estatísticas', () => {
  const db = fixture(); const a = book(db); r.setAppointmentStatus(db, a.id, 'cancelado');
  const c = db.customers[0]; r.anonymizeCustomer(db, c.id);
  assert.equal(c.phone, null); assert.equal(db.appointments[0].manageToken, null); assert.equal(db.appointments[0].plate, '');
  assert.equal(r.getOperations(db, today(), addDays(today(), 2)).canceled, 1);
  assert.throws(() => r.manageBooking(db, a.manageToken), e => e.status === 404);
});

test('paginação de clientes mantém páginas limitadas e permite busca', () => {
  const db = fixture();
  for (let i = 0; i < 55; i++) db.customers.push({ id: `cli-${i}`, name: `Pessoa ${String(i).padStart(2, '0')}`, phone: `8190000${String(i).padStart(4, '0')}` });
  const page = r.listCustomers(db);
  assert.equal(page.items.length, 50); assert.equal(page.nextOffset, 50); assert.equal(page.total, 55);
  assert.equal(r.listCustomers(db, 50).items.length, 5);
  assert.equal(r.listCustomers(db, 0, 'Pessoa 03').items.length, 1);
});
