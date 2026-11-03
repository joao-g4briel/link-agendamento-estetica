// Painel da estética: navegação por hash e troca de telas.

import * as api from '../data/api.js';
import { $, html, icon, toast } from './ui.js';
import inicio from './inicio.js';
import agenda from './agenda.js';
import retornos from './retornos.js';
import servicos from './servicos.js';
import ajustes from './ajustes.js';
import novo from './novo.js';
import clientes from './clientes.js';
import operacao from './operacao.js';
import { createViewHost } from './view-host.js';

const TABS = [
  { route: '', label: 'Início', icon: 'house' },
  { route: 'agenda', label: 'Agenda', icon: 'calendar' },
  { route: 'retornos', label: 'Retornos', icon: 'repeat', badge: true },
  { route: 'servicos', label: 'Serviços', icon: 'wrench' },
  { route: 'ajustes', label: 'Ajustes', icon: 'sliders-horizontal' },
];

const VIEWS = { '': inicio, agenda, retornos, servicos, ajustes, novo, clientes, operacao };
const TAB_OF = { novo: 'agenda', clientes: '', operacao: 'ajustes' };

const viewHost = createViewHost($('#conteudo'));
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
  if (document.body.classList.contains('sem-sessao')) return;
  const [returns, { settings }] = await Promise.all([api.listReturns(), api.getSettings()]).catch(() => [null, {}]);
  if (!returns) return;
  badge = returns.late.length + returns.today.length;
  $('#marca img').alt = `${settings.name} — início do painel`;
  renderTabs(parseHash().route);
}

async function render() {
  const { route, rest, params } = parseHash();
  renderTabs(route);
  const shown = await viewHost.show((root) => VIEWS[route](root, { params, rest }), (error, root) => {
    if (error.code === 'UNAUTHORIZED') {
      renderLogin();
      return;
    }
    console.error(error);
    root.innerHTML = String(html`
      <div class="secao">
        <h1 class="secao__titulo">Não deu para abrir esta tela</h1>
        <p class="secao__nota">${error.message || 'Erro inesperado.'}</p>
        <button type="button" class="btn btn--primario" id="recarregar">Tentar de novo</button>
      </div>`);
    $('#recarregar', root).addEventListener('click', render);
  });
  if (!shown) return;
  const root = $('#conteudo');
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
    viewHost.refresh().catch((error) => { if (error.code === 'UNAUTHORIZED') renderLogin(); else toast(error.message || 'Não deu para atualizar esta tela.'); });
    updateChrome();
  }, 80);
});

window.addEventListener('hashchange', render);
const refreshActive = () => {
  if (document.visibilityState === 'visible' && !document.body.classList.contains('sem-sessao')) viewHost.refresh().catch(error => { if (error.code === 'UNAUTHORIZED') renderLogin(); else toast(error.message || 'Não deu para atualizar.'); });
};
document.addEventListener('visibilitychange', refreshActive);
setInterval(refreshActive, 45000);

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

/** Tela de entrada do painel: só a senha do dono. */
function renderLogin(message = '') {
  document.body.classList.add('sem-sessao');
  const logo = new URL('../../img/logo-480.webp', import.meta.url).href;
  const root = viewHost.mount();
  root.innerHTML = String(html`
    <div class="faixa entrada">
      <img class="entrada__logo" src="${logo}" width="480" height="480" alt="HC Estética Automotiva">
      <h1 class="faixa__titulo">Painel</h1>
    </div>
    <form class="form entrada__form" id="entrar" novalidate>
      <div class="form__grupo">
        <div class="campo">
          <label for="senha">Senha do painel</label>
          <input id="senha" name="senha" type="password" autocomplete="current-password" required>
          ${message ? html`<p class="campo__erro" role="alert">${icon('circle-alert')}<span>${message}</span></p>` : ''}
        </div>
        <div class="form__acoes" style="padding:0">
          <button class="btn btn--primario" type="submit">${icon('check')}Entrar</button>
        </div>
      </div>
    </form>`);
  const form = $('#entrar');
  const input = $('#senha');
  input.focus();
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      await api.login(input.value);
      document.body.classList.remove('sem-sessao');
      render();
    } catch (error) {
      renderLogin(error.code === 'LOGIN' ? 'Senha incorreta. Tente de novo.' : error.message);
    }
  });
}

api.getSession()
  .then(({ logado, local }) => { $('#ambiente-local').hidden = !local; return logado ? render() : renderLogin(); })
  .catch(() => renderLogin('Não deu para falar com o servidor. Confira a internet.'));
