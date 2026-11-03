// Serviços: o que aparece no link, com tempo, preço e ciclo de retorno.

import * as api from '../data/api.js';
import { formatInterval, formatPrice } from '../core/format.js';
import { returnMessage } from '../core/whatsapp.js';
import { $, html, icon, showFieldErrors, toast } from './ui.js';

const CYCLES = ['15d', '1m', '2m', '3m', '4m', '6m', '9m', '12m', '24m'];

function cycleText(code) {
  return code ? `retorno em ${formatInterval(code)}` : 'sem retorno';
}

function parsePrice(text) {
  const clean = String(text).replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const value = Number.parseFloat(clean);
  return Number.isFinite(value) ? Math.round(value * 100) : NaN;
}

function priceInput(cents) {
  if (cents === undefined || cents === null) return '';
  const value = cents / 100;
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace('.', ',');
}

async function listView(root) {
  root.innerHTML = String(html`
    <div class="faixa">
      <div class="faixa__topo">
        <h1 class="faixa__titulo">Serviços</h1>
        <a class="btn btn--cal btn--pequeno" href="#/servicos/novo">${icon('plus')}Novo serviço</a>
      </div>
      <p class="faixa__sub">A ordem daqui é a ordem da tabela no link. O retorno define quando o cliente volta para a fila.</p>
    </div>
    <section class="secao" aria-label="Lista de serviços"><div id="lista-servicos"><div class="esqueleto"></div></div></section>
  `);

  const box = $('#lista-servicos', root);

  async function load() {
    const services = await api.listServices();
    box.innerHTML = String(services.length
      ? html`<ul class="lista" role="list">${services.map((s, i) => html`
          <li class="item item--sem-hora" data-servico="${s.id}">
            <div class="item__corpo">
              <p class="item__titulo">${s.name} ${s.active ? '' : html`<span class="selo selo--cancelado">${icon('ban')}fora do link</span>`}</p>
              <p class="item__sub">${s.priceFrom ? 'a partir de ' : ''}${formatPrice(s.priceCents)} · ${cycleText(s.returnInterval)}</p>
            </div>
            <div class="item__acoes">
              <a class="btn btn--linha btn--pequeno" href="#/servicos/${s.id}">${icon('pencil')}Editar</a>
              <button type="button" class="btn btn--texto btn--perigo btn--pequeno" data-excluir="${s.id}" data-nome="${s.name}" aria-label="Excluir ${s.name}">${icon('trash')}Excluir</button>
              <button type="button" class="btn btn--texto btn--icone" data-mover="-1" aria-label="Subir ${s.name} na tabela" ${i === 0 ? html`disabled` : ''}>${icon('chevron-up')}</button>
              <button type="button" class="btn btn--texto btn--icone" data-mover="1" aria-label="Descer ${s.name} na tabela" ${i === services.length - 1 ? html`disabled` : ''}>${icon('chevron-down')}</button>
            </div>
          </li>`)}</ul>`
      : html`<p class="vazio"><strong>Nenhum serviço ainda.</strong> Cadastre o primeiro para o link ter o que mostrar.</p>`);
  }

  box.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-mover], [data-excluir]');
    if (!button) return;
    if (button.disabled) return;
    if (button.dataset.excluir) {
      if (!window.confirm(`Excluir o serviço “${button.dataset.nome}”? Esta ação não pode ser desfeita. Serviços com agendamentos ou retornos não podem ser excluídos.`)) return;
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      try {
        await api.deleteService(button.dataset.excluir);
        await load();
        toast('Serviço excluído.');
        (box.querySelector('[data-excluir]') || root.querySelector('a[href="#/servicos/novo"]'))?.focus();
      } catch (error) {
        toast(error.message || 'Não deu para excluir. Tente de novo.', { duration: 10000 });
      } finally {
        button.disabled = false;
        button.removeAttribute('aria-busy');
      }
      return;
    }
    const id = button.closest('[data-servico]').dataset.servico;
    const label = button.getAttribute('aria-label');
    button.disabled = true;
    try {
      await api.moveService(id, Number(button.dataset.mover));
      await load();
      const again = [...box.querySelectorAll('[data-mover]')].find((b) => b.getAttribute('aria-label') === label && !b.disabled);
      again?.focus();
    } catch (error) {
      toast(error.message || 'Não deu para mudar a ordem. Tente de novo.');
      button.disabled = false;
    }
  });

  await load();
  return { refresh: load };
}

async function editView(root, id) {
  const [services, { settings }] = await Promise.all([api.listServices(), api.getSettings()]);
  const isNew = id === 'novo';
  const service = isNew
    ? { name: '', description: '', priceCents: undefined, priceFrom: true, returnInterval: '6m', returnAction: '', active: true }
    : services.find((s) => s.id === id);
  if (!service) {
    root.innerHTML = String(html`<section class="secao"><p class="vazio">Esse serviço não existe mais. <a href="#/servicos">Voltar para a lista</a></p></section>`);
    return null;
  }

  root.innerHTML = String(html`
    <div class="faixa">
      <div class="faixa__topo">
        <h1 class="faixa__titulo">${isNew ? 'Novo serviço' : 'Editar serviço'}</h1>
      </div>
      <p class="faixa__sub"><a class="btn btn--giz btn--pequeno" href="#/servicos">${icon('chevron-left')}Voltar para a lista</a></p>
    </div>
    <form class="form" id="form-servico" novalidate>
      <fieldset class="form__grupo">
        <legend>O serviço</legend>
        <div class="campo">
          <label for="s-nome">Nome</label>
          <input id="s-nome" name="name" value="${service.name}" required maxlength="40" placeholder="Ex.: Higienização interna">
          <p class="campo__dica">Aparece em letra pintada no link. Nomes curtos ficam melhores.</p>
        </div>
        <div class="campo">
          <label for="s-desc">Descrição</label>
          <textarea id="s-desc" name="description" rows="6" maxlength="2000" aria-describedby="s-desc-ajuda" placeholder="Lavagem externa&#10;Aspiração interna">${service.description}</textarea>
          <p class="campo__dica" id="s-desc-ajuda">Escreva um item por linha. Até 2.000 caracteres.</p>
        </div>
      </fieldset>
      <fieldset class="form__grupo">
        <legend>Preço</legend>
        <div class="form__linha form__linha--2">
          <div class="campo">
            <label for="s-preco">Preço</label>
            <div class="prefixo"><span>R$</span><input id="s-preco" name="priceCents" inputmode="decimal" value="${priceInput(service.priceCents)}" placeholder="350"></div>
          </div>
        </div>
        <label class="check"><input type="checkbox" name="priceFrom" ${service.priceFrom ? html`checked` : ''}>
          <span>Mostrar como “a partir de”<small>Para quando o preço muda com o tamanho do carro.</small></span></label>
      </fieldset>
      <fieldset class="form__grupo">
        <legend>Retorno</legend>
        <div class="form__linha form__linha--2">
          <div class="campo">
            <label for="s-ciclo">Quando o cliente deve voltar</label>
            <select id="s-ciclo" name="returnInterval">
              <option value="">Sem retorno</option>
              ${[...new Set([...CYCLES, service.returnInterval].filter(Boolean))].map((code) => html`<option value="${code}" ${code === service.returnInterval ? html`selected` : ''}>${formatInterval(code)} depois</option>`)}
            </select>
          </div>
          <div class="campo">
            <label for="s-acao">Na mensagem: “Tá na hora de…”</label>
            <input id="s-acao" name="returnAction" value="${service.returnAction}" maxlength="60" placeholder="renovar a vitrificação">
          </div>
        </div>
        <div class="campo">
          <span class="campo__rotulo">Como a mensagem vai sair</span>
          <p class="mensagem-previa" id="previa"></p>
        </div>
      </fieldset>
      <fieldset class="form__grupo">
        <legend>No link</legend>
        <label class="check"><input type="checkbox" name="active" ${service.active ? html`checked` : ''}>
          <span>Mostrar este serviço no link de agendamento<small>Desmarque para esconder sem apagar o histórico.</small></span></label>
      </fieldset>
      <div class="form__acoes">
        <button type="submit" class="btn btn--primario">${icon('check')}${isNew ? 'Criar serviço' : 'Salvar alterações'}</button>
        <a class="btn btn--texto" href="#/servicos">Cancelar</a>
      </div>
    </form>
  `);

  const form = $('#form-servico', root);
  const description = $('#s-desc', root);
  const resize = () => { description.style.height = 'auto'; description.style.height = `${Math.max(description.scrollHeight, 160)}px`; };
  description.addEventListener('input', resize);
  requestAnimationFrame(resize);
  const preview = () => {
    const data = new FormData(form);
    const name = data.get('name') || 'serviço';
    const action = data.get('returnAction') || `repetir ${String(name).toLowerCase()}`;
    const cycle = data.get('returnInterval');
    $('#previa', root).textContent = cycle
      ? returnMessage({
          settings,
          ret: { vehicle: 'Onix branco', token: 'exemplo', serviceDate: null },
          customer: { name: 'Mariana' },
          service: { name, returnAction: action },
          baseUrl: api.publicBaseUrl(),
        })
      : 'Sem retorno: concluir este serviço não coloca o cliente na fila.';
  };
  form.addEventListener('input', preview);
  preview();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const priceCents = parsePrice(data.get('priceCents'));
    const payload = {
      id: isNew ? undefined : service.id,
      name: data.get('name'),
      description: data.get('description'),
      priceCents,
      priceFrom: data.get('priceFrom') === 'on',
      returnInterval: data.get('returnInterval') || null,
      returnAction: data.get('returnAction'),
      active: data.get('active') === 'on',
    };
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      await api.saveService(payload);
      toast(isNew ? 'Serviço criado. Ele já aparece no link.' : 'Serviço salvo.');
      window.location.hash = '#/servicos';
    } catch (error) {
      if (error.fields) showFieldErrors(form, error.fields);
      else toast(error.message || 'Não deu para salvar.');
    } finally {
      button.disabled = false;
    }
  });

  return null;
}

export default async function servicos(root, { rest }) {
  return rest[0] ? editView(root, rest[0]) : listView(root);
}
