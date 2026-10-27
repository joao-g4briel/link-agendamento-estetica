import { raw } from './format.js';

// Sprite em assets/icons.svg (Lucide + Simple Icons). Resolve o caminho a
// partir deste arquivo para funcionar no link e no painel.
const sprite = new URL('../../icons.svg', import.meta.url).href;

export function icon(name, className = 'icone') {
  return raw(
    `<svg class="${className}" aria-hidden="true" focusable="false"><use href="${sprite}#${name}"/></svg>`,
  );
}
