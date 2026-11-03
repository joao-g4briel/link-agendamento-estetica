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
const sized = () => {
  const db = fixture();
  const s = r.saveService(db, { name: 'Simples', pricesBySize: { P: 4000, M: 5000, G: 6000 }, addon: { name: 'Cera Premium', prices: { P: 1000, M: 1500, G: 2000 } } });
  return { db, s };
};
test('serviço por porte usa o menor valor como referência e valida cada preço', () => {
  const { s } = sized();
  assert.equal(s.priceCents, 4000); assert.equal(s.priceFrom, true);
  assert.equal(r.saveService(fixture(), { name: 'Detalhada', pricesBySize: { P: 15000, M: 15000, G: 15000 } }).priceFrom, false);
  assert.throws(() => r.saveService(fixture(), { name: 'Erro', pricesBySize: { P: 1, M: -1, G: 1 } }), e => Boolean(e.fields.priceM));
  assert.throws(() => r.saveService(fixture(), { name: 'Erro', priceCents: 1, addon: { name: '', prices: { P: 1, M: 1, G: 1 } } }), e => Boolean(e.fields.addonName));
});
test('reserva calcula o valor no servidor pelo porte e adicional', () => {
  const { db, s } = sized();
  assert.throws(() => book(db, { serviceId: s.id }), e => Boolean(e.fields?.size));
  const a = book(db, { serviceId: s.id, size: 'M', addon: true, priceCents: 1 });
  assert.equal(a.priceCents, 6500); assert.equal(a.addonCents, 1500); assert.equal(a.addonName, 'Cera Premium'); assert.equal(a.size, 'M');
  assert.equal(db.vehicles[0].size, 'M');
  assert.equal(book(db, { serviceId: s.id, size: 'G', plate: 'XYZ1A23', date: addDays(today(), 2) }).priceCents, 6000);
  assert.equal(book(db, { size: 'G', plate: 'XYZ1A24', addon: true, date: addDays(today(), 3) }).priceCents, 4050);
});
test('preço único sem adicional segue funcionando sem porte', () => {
  const db = fixture(); const a = book(db);
  assert.equal(a.priceCents, 4050); assert.equal(a.size, null); assert.equal(a.addonCents, 0);
});
test('mudar porte recalcula; atendimento antigo sem porte mantém o valor', () => {
  const { db, s } = sized();
  const a = book(db, { serviceId: s.id, size: 'P' });
  r.editAppointment(db, a.id, input({ serviceId: s.id, date: a.date, start: a.start, size: 'G', addon: true }));
  assert.equal(db.appointments[0].priceCents, 8000); assert.equal(db.vehicles[0].size, 'G');
  const antigo = db.appointments[0]; Object.assign(antigo, { size: null, addonName: null, addonCents: 0, priceCents: 3000 });
  r.editAppointment(db, a.id, input({ serviceId: s.id, date: a.date, start: a.start, notes: 'Só nota' }));
  assert.equal(antigo.priceCents, 3000);
});
test('remarcar pelo link do cliente mantém porte e adicional', () => {
  const { db, s } = sized();
  const a = book(db, { serviceId: s.id, size: 'M', addon: true });
  r.manageBooking(db, a.manageToken, { action: 'remarcar', date: addDays(today(), 2) });
  assert.equal(db.appointments[0].priceCents, 6500); assert.equal(db.appointments[0].addonName, 'Cera Premium');
});
test('convite de retorno traz o porte do veículo', () => {
  const { db, s } = sized(); s.returnInterval = '1m'; db.services.find(x => x.id === s.id).returnInterval = '1m';
  const a = book(db, { serviceId: s.id, size: 'G' });
  db.appointments[0].date = addDays(today(), -1);
  const { planted } = r.setAppointmentStatus(db, a.id, 'concluido');
  assert.equal(r.getReturnInvite(db, planted.token).size, 'G');
});
const hourly = (carsPerSlot = 1, maxCarsPerDay = 0) => { const db = fixture(); Object.assign(db.settings, { bookingMode: 'horario', carsPerSlot, maxCarsPerDay }); return db; };
test('agenda por dia continua gravando a abertura, mesmo pedindo outra hora', () => {
  const db = fixture();
  assert.equal(book(db, { start: '15:00' }).start, '08:00');
  assert.equal(r.getAvailability(db, 'svc')[1].slots.length, 1);
});
test('agenda por horário preserva a hora, oferece todos e tira o que lotou', () => {
  const db = hourly();
  const day = r.getAvailability(db, 'svc')[1];
  assert.ok(day.slots.length > 1);
  assert.equal(book(db, { start: '15:00' }).start, '15:00');
  assert.ok(!r.getAvailability(db, 'svc')[1].slots.some(s => s.time === '15:00'));
  assert.throws(() => book(db, { start: '15:00', phone: '81912345679' }), e => e.code === 'SLOT_TAKEN');
  assert.ok(book(db, { start: '15:30', phone: '81912345679' }));
  assert.ok(book(db, { start: '15:00', phone: '81912345670' }, { source: 'painel', force: true }));
});
test('carros por horário e limite diário valem juntos', () => {
  const db = hourly(2, 3);
  book(db, { start: '09:00' }); book(db, { start: '09:00', phone: '81912345671' });
  assert.throws(() => book(db, { start: '09:00', phone: '81912345672' }), e => e.code === 'SLOT_TAKEN');
  book(db, { start: '10:00', phone: '81912345672' });
  const day = r.getAvailability(db, 'svc')[1];
  assert.equal(day.reason, 'lotado'); assert.equal(day.slots.length, 0);
  assert.throws(() => book(db, { start: '11:00', phone: '81912345673' }), e => e.code === 'SLOT_TAKEN');
});
test('dia por horário informa as vagas reais, não a quantidade de horários', () => {
  const db = hourly(1, 4); db.settings.slotStep = 60;
  const before = r.getAvailability(db, 'svc')[1];
  assert.ok(before.slots.length > 4); assert.equal(before.free, 4);
  book(db, { start: '09:00' });
  assert.equal(r.getAvailability(db, 'svc')[1].free, 3);
  db.settings.maxCarsPerDay = 0;
  assert.equal(r.getAvailability(db, 'svc')[1].free, null);
  db.settings.maxCarsPerDay = 50; db.settings.hours[new Date(`${before.date}T12:00`).getDay()] = { open: '09:00', close: '11:00' };
  assert.equal(r.getAvailability(db, 'svc')[1].free, 1);
});
test('painel respeita o limite por horário sem marcar encaixe', () => {
  const db = hourly();
  book(db, { start: '09:00' });
  assert.throws(() => book(db, { start: '09:00', phone: '81912345674' }, { source: 'painel' }), e => e.code === 'SLOT_TAKEN');
});
test('remarcar pelo link por horário exige um horário livre e aceita mudar só a hora', () => {
  const db = hourly();
  const a = book(db, { start: '09:00' }); book(db, { start: '10:00', phone: '81912345675' });
  assert.throws(() => r.manageBooking(db, a.manageToken, { action: 'remarcar', date: a.date, start: '10:00' }), e => e.code === 'SLOT_TAKEN');
  assert.throws(() => r.manageBooking(db, a.manageToken, { action: 'remarcar', date: a.date }), e => e.code === 'SLOT_TAKEN');
  r.manageBooking(db, a.manageToken, { action: 'remarcar', date: a.date, start: '11:00' });
  assert.equal(db.appointments[0].start, '11:00');
});
test('ajustes validam o modo e os carros por horário', () => {
  const db = fixture();
  assert.throws(() => r.saveSettings(db, { bookingMode: 'semana' }));
  assert.throws(() => r.saveSettings(db, { carsPerSlot: 0 }));
  assert.equal(r.saveSettings(db, { bookingMode: 'horario', carsPerSlot: 2 }).carsPerSlot, 2);
  assert.equal(r.getPublicProfile(db).shop.bookingMode, 'horario');
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
