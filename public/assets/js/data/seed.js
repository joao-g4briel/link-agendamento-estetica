// Dados de EXEMPLO do placeholder. Nome, endereço, serviços, preços, clientes
// e telefones são fictícios (telefones no formato 9 0000-0xxx, que não existem)
// e servem só para o sistema ter o que mostrar. Troque tudo pelo painel.

import { addDays, addInterval, today, weekday } from '../core/dates.js';
import { DEFAULT_RETURN_TEMPLATE } from '../core/whatsapp.js';

export const SCHEMA_VERSION = 2;

const SHOP_HOURS = {
  0: null,
  1: { open: '08:00', close: '18:00', breakStart: '12:00', breakEnd: '13:00' },
  2: { open: '08:00', close: '18:00', breakStart: '12:00', breakEnd: '13:00' },
  3: { open: '08:00', close: '18:00', breakStart: '12:00', breakEnd: '13:00' },
  4: { open: '08:00', close: '18:00', breakStart: '12:00', breakEnd: '13:00' },
  5: { open: '08:00', close: '18:00', breakStart: '12:00', breakEnd: '13:00' },
  6: { open: '08:00', close: '13:00', breakStart: '', breakEnd: '' },
};

const SERVICES = [
  {
    id: 'svc-lavagem',
    name: 'Lavagem detalhada',
    description: 'Lavagem técnica com descontaminação leve, rodas, caixas de roda e acabamento dos plásticos.',
    durationMin: 120,
    priceCents: 12000,
    priceFrom: true,
    returnInterval: '1m',
    returnAction: 'fazer a lavagem de manutenção',
  },
  {
    id: 'svc-higienizacao',
    name: 'Higienização interna',
    description: 'Bancos, carpete, teto e painel limpos a fundo, com extração e secagem.',
    durationMin: 240,
    priceCents: 35000,
    priceFrom: true,
    returnInterval: '6m',
    returnAction: 'fazer uma nova higienização',
  },
  {
    id: 'svc-vitrificacao',
    name: 'Vitrificação de pintura',
    description: 'Polimento e camada cerâmica que protege a pintura e deixa a lavagem mais fácil por meses.',
    durationMin: 540,
    priceCents: 150000,
    priceFrom: true,
    returnInterval: '12m',
    returnAction: 'renovar a vitrificação',
  },
  {
    id: 'svc-polimento',
    name: 'Polimento técnico',
    description: 'Tira riscos finos e marcas de lavagem e devolve brilho e profundidade à pintura.',
    durationMin: 360,
    priceCents: 65000,
    priceFrom: true,
    returnInterval: '12m',
    returnAction: 'revisar o polimento',
  },
  {
    id: 'svc-couro',
    name: 'Hidratação de couro',
    description: 'Limpeza e hidratação dos bancos de couro para não ressecar nem trincar.',
    durationMin: 120,
    priceCents: 22000,
    priceFrom: false,
    returnInterval: '4m',
    returnAction: 'hidratar o couro de novo',
  },
  {
    id: 'svc-oxi',
    name: 'Oxi-sanitização',
    description: 'Tira odores, fungos e bactérias do ar-condicionado e do interior.',
    durationMin: 60,
    priceCents: 12000,
    priceFrom: false,
    returnInterval: '6m',
    returnAction: 'repetir a oxi-sanitização',
  },
].map((s, i) => ({ ...s, active: true, order: i }));

const CUSTOMERS = [
  ['cli-rafael', 'Rafael Moura', '11900000101', 'Honda Civic prata', 'FHK2B31'],
  ['cli-juliana', 'Juliana Prado', '11900000102', 'Jeep Compass branco', 'GDA7C54'],
  ['cli-marcos', 'Marcos Tavares', '11900000103', 'Toyota Hilux preta', 'QWE3F18'],
  ['cli-camila', 'Camila Rocha', '11900000104', 'VW T-Cross cinza', 'RTY5H22'],
  ['cli-bruno', 'Bruno Lima', '11900000105', 'Fiat Toro vermelha', 'BRL4A90'],
  ['cli-patricia', 'Patrícia Nunes', '11900000106', 'Hyundai Creta azul', 'PNC8D12'],
  ['cli-diego', 'Diego Ferraz', '11900000107', 'BYD Dolphin verde', 'DFZ1E77'],
  ['cli-larissa', 'Larissa Couto', '11900000108', 'Chevrolet Onix branco', 'LCT6G03'],
  ['cli-felipe', 'Felipe Andrade', '11900000109', 'Toyota Corolla preto', 'FAD9J45'],
  ['cli-aline', 'Aline Barros', '11900000110', 'VW Nivus prata', 'ABR3K68'],
];

function openDayFrom(start, skip) {
  let date = start;
  let found = -1;
  for (let i = 0; i < 30; i++) {
    if (SHOP_HOURS[weekday(date)]) {
      found++;
      if (found === skip) return date;
    }
    date = addDays(date, 1);
  }
  return date;
}

let counter = 0;
const id = (prefix) => `${prefix}-${(++counter).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const token = () => Math.random().toString(36).slice(2, 12);

export function createSeed() {
  const t = today();
  const service = Object.fromEntries(SERVICES.map((s) => [s.id, s]));
  const customers = CUSTOMERS.map(([cid, name, phone]) => ({
    id: cid,
    name,
    phone,
    createdAt: addDays(t, -400),
  }));
  const car = Object.fromEntries(CUSTOMERS.map(([cid, , , vehicle, plate]) => [cid, { vehicle, plate }]));

  const appointments = [];
  const returns = [];

  function appointment(customerId, serviceId, date, start, status, extra = {}) {
    const svc = service[serviceId];
    const a = {
      id: id('ag'),
      code: Math.random().toString(36).slice(2, 6).toUpperCase(),
      customerId,
      serviceId,
      date,
      start,
      durationMin: svc.durationMin,
      priceCents: svc.priceCents,
      vehicle: car[customerId].vehicle,
      plate: car[customerId].plate,
      notes: '',
      status,
      source: 'link',
      createdAt: addDays(date, -4),
      completedAt: status === 'concluido' ? date : null,
      ...extra,
    };
    appointments.push(a);
    return a;
  }

  function planted(a, status = 'pendente', extra = {}) {
    const svc = service[a.serviceId];
    const r = {
      id: id('ret'),
      token: token(),
      customerId: a.customerId,
      serviceId: a.serviceId,
      appointmentId: a.id,
      vehicle: a.vehicle,
      plate: a.plate,
      serviceDate: a.date,
      dueDate: addInterval(a.date, svc.returnInterval),
      status,
      notifiedAt: null,
      bookedAppointmentId: null,
      createdAt: a.date,
      ...extra,
    };
    returns.push(r);
    return r;
  }

  // Histórico: serviços concluídos que plantaram retornos. A data do serviço
  // sai do vencimento desejado (ex.: venceu há 3 dias), voltando o ciclo.
  const doneFor = (serviceId, dueOffset) => addInterval(addDays(t, dueOffset), service[serviceId].returnInterval, -1);
  planted(appointment('cli-rafael', 'svc-vitrificacao', doneFor('svc-vitrificacao', 0), '08:00', 'concluido'));
  planted(appointment('cli-juliana', 'svc-higienizacao', doneFor('svc-higienizacao', -3), '09:00', 'concluido'));
  planted(appointment('cli-bruno', 'svc-lavagem', doneFor('svc-lavagem', 2), '14:00', 'concluido'));
  planted(appointment('cli-patricia', 'svc-oxi', doneFor('svc-oxi', 2), '10:00', 'concluido'));
  planted(appointment('cli-aline', 'svc-couro', doneFor('svc-couro', 3), '15:00', 'concluido'));
  planted(appointment('cli-marcos', 'svc-oxi', doneFor('svc-oxi', 10), '16:00', 'concluido'));
  planted(appointment('cli-camila', 'svc-polimento', doneFor('svc-polimento', 65), '08:00', 'concluido'));
  planted(appointment('cli-larissa', 'svc-lavagem', doneFor('svc-lavagem', -2), '09:30', 'concluido'), 'avisado', {
    notifiedAt: addDays(t, -1),
  });
  appointment('cli-felipe', 'svc-lavagem', addDays(t, -5), '10:00', 'faltou');

  // Agenda que vem pela frente.
  const d0 = openDayFrom(t, 0);
  const d1 = openDayFrom(t, 1);
  const d2 = openDayFrom(t, 2);
  const d3 = openDayFrom(t, 3);
  const d5 = openDayFrom(t, 5);
  appointment('cli-marcos', 'svc-polimento', d0, '08:00', 'agendado');
  appointment('cli-camila', 'svc-higienizacao', d0, '08:30', 'agendado', { notes: 'Cadeirinha de bebê no banco de trás.' });
  appointment('cli-larissa', 'svc-oxi', d0, '15:00', 'agendado', { source: 'painel' });
  appointment('cli-felipe', 'svc-vitrificacao', d1, '08:00', 'agendado');
  appointment('cli-aline', 'svc-lavagem', d1, '10:00', 'agendado');
  appointment('cli-patricia', 'svc-couro', d2, '13:00', 'agendado');
  appointment('cli-bruno', 'svc-oxi', d3, '08:30', 'agendado');

  // Um retorno que já virou agendamento.
  const diegoPast = appointment('cli-diego', 'svc-higienizacao', doneFor('svc-higienizacao', -1), '08:00', 'concluido');
  const diegoNext = appointment('cli-diego', 'svc-higienizacao', d5, '09:00', 'agendado', { source: 'retorno' });
  planted(diegoPast, 'reagendado', { notifiedAt: addDays(t, -2), bookedAppointmentId: diegoNext.id });

  return {
    version: SCHEMA_VERSION,
    settings: {
      name: 'Ateliê do Brilho',
      tagline: 'estética automotiva',
      address: 'Rua das Oficinas, 120 · Centro',
      whatsapp: '11900000100',
      instagram: 'ateliedobrilho',
      capacity: 2,
      slotStep: 30,
      minNoticeMinutes: 120,
      horizonDays: 30,
      autoComplete: true,
      hours: SHOP_HOURS,
      returnTemplate: DEFAULT_RETURN_TEMPLATE,
      publicUrl: '',
      isExample: true,
    },
    services: SERVICES,
    exampleData: true,
    customers,
    appointments,
    returns,
    blocks: [],
  };
}
