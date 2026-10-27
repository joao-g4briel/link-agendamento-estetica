// Clientes: todo mundo que já agendou, com carros, visitas e retorno aberto.

import * as api from '../data/api.js';
import { formatDateShort, formatDateShortYear, formatPhone, formatRelativeDay } from '../core/format.js';
import { waLink } from '../core/whatsapp.js';
import { $, html, icon, placa } from './ui.js';

function row(c) {
  return html`
    <li class="item item--sem-hora" data-busca="${[c.name, c.phone, ...c.cars.map((car) => `${car.vehicle} ${car.plate}`)].join(' ').toLowerCase()}">
      <div class="item__corpo">
        <p class="item__titulo">${c.name} ${c.cars.map((car) => placa(car.plate))}</p>
        <p class="item__sub">${c.cars.map((car) => car.vehicle).join(' · ')} · ${formatPhone(c.phone)}</p>
        <p class="item__sub">${c.visits} ${c.visits === 1 ? 'visita' : 'visitas'}${c.last ? ` · última em ${formatDateShortYear(c.last.date)}` : ''}${c.next ? ` · próxima ${formatRelativeDay(c.next.date)} às ${c.next.start}` : ''}${c.openReturn ? ` · retorno ${formatDateShortYear(c.openReturn.dueDate)}` : ''}</p>
      </div>
      <div class="item__acoes">
        <a class="btn btn--linha btn--pequeno" href="#/novo?cliente=${c.id}">${icon('calendar-plus')}Agendar</a>
        ${c.phone ? html`<a class="btn btn--texto btn--pequeno" href="${waLink(c.phone)}" target="_blank" rel="noopener">${icon('whatsapp')}WhatsApp</a>` : ''}
      </div>
    </li>`;
}

export default async function clientes(root) {
  root.innerHTML = String(html`
    <div class="faixa">
      <div class="faixa__topo"><h1 class="faixa__titulo">Clientes</h1></div>
      <div class="busca">
        <span class="busca__faixa" aria-hidden="true">BRASIL</span>
        ${icon('search')}
        <label class="visualmente-oculto" for="filtro">Filtrar clientes</label>
        <input id="filtro" type="search" placeholder="Filtrar por nome, carro, placa ou WhatsApp" autocomplete="off" spellcheck="false">
      </div>
    </div>
    <section class="secao" aria-labelledby="t-clientes">
      <div class="secao__cabeca"><h2 class="secao__titulo" id="t-clientes">Todos <small id="clientes-total"></small></h2></div>
      <div id="lista-clientes"><div class="esqueleto"></div></div>
    </section>
  `);

  const box = $('#lista-clientes', root);
  const filter = $('#filtro', root);

  function applyFilter() {
    const q = filter.value.trim().toLowerCase().replace(/-/g, '');
    let shown = 0;
    box.querySelectorAll('[data-busca]').forEach((li) => {
      const match = !q || li.dataset.busca.replace(/-/g, '').includes(q);
      li.hidden = !match;
      if (match) shown++;
    });
    $('#clientes-total', root).textContent = q ? `${shown} de ${box.querySelectorAll('[data-busca]').length}` : String(shown);
  }

  async function load() {
    const list = await api.listCustomers();
    box.innerHTML = String(list.length
      ? html`<ul class="lista" role="list">${list.map(row)}</ul>`
      : html`<p class="vazio">Ninguém ainda. Quem agendar pelo link entra aqui sozinho.</p>`);
    applyFilter();
  }

  filter.addEventListener('input', applyFilter);
  await load();
  return { refresh: load };
}
