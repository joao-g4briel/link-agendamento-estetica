// Fixtures descartáveis, somente para o modo de validação local.
process.env.STORE_MODE = 'local';
process.env.LOCAL_DATA_FILE = '.local/validacao.json';
const { localStore } = await import('../server/local-store.mjs');
const r = await import('../server/regras.js');
const { today, addDays } = await import('../public/assets/js/core/dates.js');
await localStore(db => {
  if (db.localFixturesVersion) { console.log('Dados locais de validação já preparados.'); return; }
  const service = r.saveService(db, { name: 'Lavagem Simples · teste', description: 'Lavagem externa\nAspiração interna\nAcabamento dos pneus', priceCents: 4050, priceFrom: true, returnInterval: '1m', returnAction: 'fazer uma nova lavagem', active: true });
  const base = { name: 'Cliente de teste local', phone: '81900000000', vehicle: 'Carro azul de teste', plate: 'ABC1D23', serviceId: service.id, date: today(), start: '08:00' };
  const previous = r.createBooking(db, base, { source: 'painel', force: true }).appointment;
  db.appointments.find(a => a.id === previous.id).date = addDays(today(), -45);
  r.setAppointmentStatus(db, previous.id, 'concluido');
  const review = r.createBooking(db, { ...base, plate: 'DEF4G56', vehicle: 'Segundo carro de teste' }, { source: 'painel', force: true }).appointment;
  db.appointments.find(a => a.id === review.id).date = addDays(today(), -1);
  const nextDate = r.getPublicProfile(db).nextFree?.date || addDays(today(), 2);
  r.createBooking(db, { ...base, date: nextDate, name: 'Outro cliente local', phone: '81900000001', plate: 'GHI7J89' }, { source: 'painel', force: true });
  r.saveWaitlist(db, { ...base, name: 'Pessoa na espera de teste' });
  db.localFixturesVersion = 1;
  console.log('Fixtures locais preparadas: descrição em lista, preço com centavos, retorno vencido, revisão pendente e lista de espera.');
});
