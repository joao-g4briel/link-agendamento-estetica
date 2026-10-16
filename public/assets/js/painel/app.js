// Painel da estética: navegação por hash e troca de telas.

import * as api from '../data/api.js';
import { $, html, icon } from './ui.js';
import inicio from './inicio.js';
import agenda from './agenda.js';
import retornos from './retornos.js';
import servicos from './servicos.js';
import ajustes from './ajustes.js';
import novo from './novo.js';
import clientes from './clientes.js';

const TABS = [
  { route: '', label: 'Início', icon: 'house' },
  { route: 'agenda', label: 'Agenda', icon: 'calendar' },
  { route: 'retornos', label: 'Retornos', icon: 'repeat', badge: true },
  { route: 'servicos', label: 'Serviços', icon: 'wrench' },
  { route: 'ajustes', label: 'Ajustes', icon: 'sliders-horizontal' },
];

const VIEWS = { '': inicio, agenda, retornos, servicos, ajustes, novo, clientes };
const TAB_OF = { novo: 'agenda', clientes: '' };

let current = { cleanup: null, refresh: null };
let badge = 0;

function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path, query] = raw.split('?');
  const [route = '', ...rest] = path.split('/');
  return { route: VIEWS[route] ? route : '', rest, params: new URLSearchParams(query || '') };
}

function renderTabs(route) {
  const active = TAB_OF[route] ?? route;
  $('#abas').innerHTML = TABS.map((tab) => html`
    <li class="aba">
      <a href="#/${tab.route}" ${tab.route === active ? html`aria-current="page"` : ''}>
        ${icon(tab.icon)}<span>${tab.label}</span>
        ${tab.badge && badge ? html`<span class="contador" aria-label="${badge} para avisar">${badge}</span>` : ''}
      </a>
    </li>`).join('');
}

async function updateChrome() {
  const [returns, { settings }] = await Promise.all([api.listReturns(), api.getSettings()]);
  badge = returns.late.length + returns.today.length;
  $('#marca img').alt = `${settings.name} — início do painel`;
  renderTabs(parseHash().route);
}

async function render() {
  const { route, rest, params } = parseHash();
  renderTabs(route);
  current.cleanup?.();
  current = { cleanup: null, refresh: null };
  const root = $('#conteudo');
  try {
    const result = await VIEWS[route](root, { params, rest });
    if (result) current = { cleanup: result.cleanup || null, refresh: result.refresh || null };
  } catch (error) {
    console.error(error);
    root.innerHTML = String(html`
      <div class="secao">
        <h1 class="secao__titulo">Não deu para abrir esta tela</h1>
        <p class="secao__nota">${error.message || 'Erro inesperado.'}</p>
        <button type="button" class="btn btn--primario" id="recarregar">Tentar de novo</button>
      </div>`);
    $('#recarregar').addEventListener('click', render);
  }
  window.scrollTo(0, 0);
  if (document.activeElement && document.activeElement !== document.body && !root.contains(document.activeElement)) {
    root.focus({ preventScroll: true });
  }
  updateChrome();
}

let pending;
api.subscribe(() => {
  clearTimeout(pending);
  pending = setTimeout(() => {
    current.refresh?.();
    updateChrome();
  }, 80);
});

window.addEventListener('hashchange', render);

// Fecha menus abertos ao clicar fora ou apertar Esc.
document.addEventListener('click', (event) => {
  document.querySelectorAll('details.menu[open]').forEach((menu) => {
    if (!menu.contains(event.target)) menu.removeAttribute('open');
  });
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  document.querySelectorAll('details.menu[open]').forEach((menu) => {
    menu.removeAttribute('open');
    menu.querySelector('summary')?.focus();
  });
});

render();
