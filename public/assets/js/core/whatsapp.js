// Mensagens de WhatsApp com 1 clique (wa.me). Nada é enviado sozinho: o link
// abre o WhatsApp do dono já com o texto pronto, e ele só aperta enviar.

import { diffDays, today } from './dates.js';
import { firstName, formatDateLong, formatElapsed, normalizePhone } from './format.js';

export const DEFAULT_RETURN_TEMPLATE =
  'Oi, {nome}! Aqui é da {estetica}. Faz {tempo} que cuidamos do seu {carro} ({servico}). ' +
  'Tá na hora de {acao}. Escolha um horário por aqui: {link}';

export function waLink(phone, text) {
  const digits = normalizePhone(phone);
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/55${digits}${query}`;
}

export function fillTemplate(template, values) {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match));
}

export function returnLink(baseUrl, token) {
  return `${baseUrl.replace(/\/$/, '')}/?retorno=${token}`;
}

export function returnMessage({ settings, ret, customer, service, baseUrl }) {
  const since = ret.serviceDate ? diffDays(ret.serviceDate, today()) : null;
  return fillTemplate(settings.returnTemplate || DEFAULT_RETURN_TEMPLATE, {
    nome: firstName(customer.name),
    estetica: settings.name,
    tempo: since !== null && since > 0 ? formatElapsed(since) : 'um tempo',
    carro: ret.vehicle || 'carro',
    servico: service.name.toLowerCase(),
    acao: service.returnAction || `repetir ${service.name.toLowerCase()}`,
    link: returnLink(baseUrl, ret.token),
  });
}

export function appointmentMessage({ settings, appointment, customer, service }) {
  return (
    `Oi, ${firstName(customer.name)}! Aqui é da ${settings.name}. ` +
    `Confirmando: ${service.name.toLowerCase()} na ${formatDateLong(appointment.date)}. Pode trazer o carro ${settings.bookingMode === 'horario' ? 'às' : 'a partir das'} ${appointment.start}. ` +
    `Endereço: ${settings.address}. Qualquer coisa, é só responder aqui.`
  );
}
