// Preço por porte do carro e adicional opcional: a mesma conta no link, no painel e no servidor.

import { formatPrice } from './format.js';

export const SIZES = [
  { code: 'P', label: 'Pequeno' },
  { code: 'M', label: 'Médio' },
  { code: 'G', label: 'Grande' },
];

export const isSize = (code) => SIZES.some((s) => s.code === code);
export const sizeLabel = (code) => SIZES.find((s) => s.code === code)?.label || '';

/** O adicional também varia por porte, então ele exige saber o tamanho do carro. */
export const needsSize = (service) => Boolean(service?.pricesBySize || service?.addon);

export const priceForSize = (service, size) => service.pricesBySize?.[size] ?? service.priceCents;

export function totalFor(service, size, withAddon) {
  return priceForSize(service, size) + (withAddon && service.addon ? service.addon.prices[size] ?? 0 : 0);
}

/** "P R$ 40 · M R$ 50 · G R$ 60" */
export const sizesLine = (prices) => SIZES.map(({ code }) => `${code} ${formatPrice(prices[code])}`).join(' · ');
