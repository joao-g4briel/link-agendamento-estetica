// Dados com que o banco nasce: os dados reais da HC Estética Automotiva e uma tabela de
// serviços DE EXEMPLO (preços e durações para o dono trocar no painel).
// Nenhum cliente nem agendamento de exemplo.

import { DEFAULT_RETURN_TEMPLATE } from '../public/assets/js/core/whatsapp.js';

const SEMANA = { open: '08:00', close: '18:00', breakStart: '12:00', breakEnd: '13:00' };

export const SETTINGS = {
  name: 'HC Estética Automotiva',
  tagline: '',
  address: 'Rua Irajá, 236 · Cidade Tabajara, Olinda - PE',
  whatsapp: '81996750258',
  instagram: 'hc.esteticar',
  capacity: 2,
  // Carros por dia no link (0 = sem limite). O dono ajusta em Ajustes.
  maxCarsPerDay: 4,
  // false fecha o link para novos agendamentos; o painel continua agendando.
  bookingOpen: true,
  slotStep: 30,
  minNoticeMinutes: 120,
  horizonDays: 30,
  autoComplete: false,
  hours: {
    0: null,
    1: SEMANA, 2: SEMANA, 3: SEMANA, 4: SEMANA, 5: SEMANA,
    6: { open: '08:00', close: '13:00', breakStart: '', breakEnd: '' },
  },
  returnTemplate: DEFAULT_RETURN_TEMPLATE,
  publicUrl: '',
  // Enquanto true, o link mostra "serviços e preços são exemplos".
  // Vira false quando o dono salva um serviço ou os ajustes.
  isExample: true,
};

export const SERVICES = [
  ['svc-lavagem', 'Lavagem detalhada', 'Lavagem técnica com descontaminação leve, rodas, caixas de roda e acabamento dos plásticos.', 12000, true, '1m', 'fazer a lavagem de manutenção'],
  ['svc-higienizacao', 'Higienização interna', 'Bancos, carpete, teto e painel limpos a fundo, com extração e secagem.', 35000, true, '6m', 'fazer uma nova higienização'],
  ['svc-vitrificacao', 'Vitrificação de pintura', 'Polimento e camada cerâmica que protege a pintura e deixa a lavagem mais fácil por meses.', 150000, true, '12m', 'renovar a vitrificação'],
  ['svc-polimento', 'Polimento técnico', 'Tira riscos finos e marcas de lavagem e devolve brilho e profundidade à pintura.', 65000, true, '12m', 'revisar o polimento'],
  ['svc-couro', 'Hidratação de couro', 'Limpeza e hidratação dos bancos de couro para não ressecar nem trincar.', 22000, false, '4m', 'hidratar o couro de novo'],
  ['svc-oxi', 'Oxi-sanitização', 'Tira odores, fungos e bactérias do ar-condicionado e do interior.', 12000, false, '6m', 'repetir a oxi-sanitização'],
].map(([id, name, description, priceCents, priceFrom, returnInterval, returnAction], order) => ({
  id, name, description, priceCents, priceFrom, returnInterval, returnAction, active: true, order,
}));
