// Clientes: todo mundo que já agendou, com carros, visitas e retorno aberto.

import * as api from '../data/api.js';
import { formatDateShort, formatDateShortYear, formatPhone, formatRelativeDay, statusLabel } from '../core/format.js';
import { waLink } from '../core/whatsapp.js';
import { $, html, icon, placa, toast, bindSubmit } from './ui.js';

const titleLine = (c) => html`${c.name} ${c.cars.map((car) => placa(car.plate))}`;
const carsLine = (c) => `${c.cars.map((car) => car.vehicle).join(' · ')} · ${formatPhone(c.phone)}`;

function row(c) {
  return html`
    <li class="item item--sem-hora" data-busca="${[c.name, c.phone, ...c.cars.map((car) => `${car.vehicle} ${car.plate}`)].join(' ').toLowerCase()}">
      <div class="item__corpo">
        <p class="item__titulo">${titleLine(c)}</p>
        <p class="item__sub">${carsLine(c)}</p>
        <p class="item__sub">${c.visits} ${c.visits === 1 ? 'visita' : 'visitas'}${c.last ? ` · última em ${formatDateShortYear(c.last.date)}` : ''}${c.next ? ` · próxima ${formatRelativeDay(c.next.date)} às ${c.next.start}` : ''}${c.openReturn ? ` · retorno ${formatDateShortYear(c.openReturn.dueDate)}` : ''}</p>
        <details class="dobra"><summary>Ficha, veículos e histórico</summary>
          <div class="dobra__conteudo">
            ${c.cars.map(car => html`<details class="dobra"><summary>${car.vehicle} ${car.plate || 'sem placa'}</summary>
              <ul class="historico" role="list">${c.history.filter(a => car.id ? a.vehicleId === car.id : a.plate === car.plate && a.vehicle === car.vehicle).map(a => html`<li>${formatDateShortYear(a.date)} · ${a.service.name} · ${statusLabel(a.status)} <a href="#/novo?editar=${a.id}">Abrir / remarcar</a></li>`)}</ul></details>`)}
            <form data-cliente="${c.id}" class="form">
              <div class="campo"><label for="cliente-nome-${c.id}">Nome</label><input id="cliente-nome-${c.id}" name="name" value="${c.name}" maxlength="80" required></div>
              <div class="campo"><label for="cliente-phone-${c.id}">WhatsApp</label><input id="cliente-phone-${c.id}" name="phone" value="${formatPhone(c.phone)}" type="tel" required></div>
              <button class="btn btn--primario" type="submit">Salvar contato</button>
              <button class="btn btn--texto btn--perigo" type="button" data-anonimizar="${c.id}">Remover dados pessoais</button>
            </form>
          </div>
        </details>
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
  let nextOffset = null;
  let sequence = 0;
  let debounce;

  async function load(append = false) {
    const request = ++sequence;
    const result = await api.listCustomers(append ? nextOffset : 0, filter.value.trim());
    if (request !== sequence) return;
    const list = result.items;
    nextOffset = result.nextOffset;
    box.querySelector('[data-mais-clientes]')?.remove();
    const content = String(list.length
      ? html`<ul class="lista" role="list">${list.map(row)}</ul>`
      : html`<p class="vazio">Ninguém ainda. Quem agendar pelo link entra aqui sozinho.</p>`);
    if (append) box.insertAdjacentHTML('beforeend', content); else box.innerHTML = content;
    if (nextOffset !== null) box.insertAdjacentHTML('beforeend', String(html`<button type="button" class="btn btn--linha" data-mais-clientes>Carregar mais clientes</button>`));
    box.querySelectorAll('form[data-cliente]:not([data-bound])').forEach(form => { form.dataset.bound = 'true'; bindSubmit(form, async () => {
      const saved = await api.saveCustomer(form.dataset.cliente, Object.fromEntries(new FormData(form)));
      // A lista não recarrega com a ficha aberta: atualiza a linha aqui.
      const item = form.closest('[data-busca]');
      $('.item__titulo', item).innerHTML = String(titleLine(saved));
      $('.item__sub', item).textContent = carsLine(saved);
      form.elements.phone.value = formatPhone(saved.phone);
      toast('Contato salvo. O histórico dos atendimentos foi preservado.');
    }); });
    $('#clientes-total', root).textContent = `${box.querySelectorAll('[data-busca]').length} de ${result.total}`;
  }

  filter.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(() => load().catch(error => toast(error.message)), 250); });
  box.addEventListener('click', async event => {
    const more = event.target.closest('[data-mais-clientes]');
    if (more) { more.disabled = true; try { await load(true); } catch (error) { toast(error.message); more.disabled = false; } return; }
    const button = event.target.closest('[data-anonimizar]');
    if (!button || !confirm('Remover nome, WhatsApp, placas e observações deste cliente? O histórico ficará anônimo. Esta ação não pode ser desfeita.')) return;
    button.disabled = true;
    try { await api.anonymizeCustomer(button.dataset.anonimizar); await load(); toast('Dados pessoais removidos.'); }
    catch (error) { toast(error.message); }
    finally { button.disabled = false; }
  });
  await load();
  return { refresh: () => { if (!root.querySelector('details[open], form:focus-within')) return load(); }, cleanup: () => { clearTimeout(debounce); sequence++; } };
}
