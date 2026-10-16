// Ajustes: dados da estética, funcionamento, regras da agenda, folgas,
// mensagem de retorno, link público e dados de exemplo.

import * as api from '../data/api.js';
import { today } from '../core/dates.js';
import { formatDateShort, formatPhone } from '../core/format.js';
import { DEFAULT_RETURN_TEMPLATE, fillTemplate } from '../core/whatsapp.js';
import { $, $$, html, icon, showFieldErrors, toast } from './ui.js';

const DAYS = [
  [1, 'Segunda'], [2, 'Terça'], [3, 'Quarta'], [4, 'Quinta'], [5, 'Sexta'], [6, 'Sábado'], [0, 'Domingo'],
];
const NOTICE = [[0, 'Sem antecedência'], [60, '1 hora antes'], [120, '2 horas antes'], [240, '4 horas antes'], [1440, '1 dia antes']];
const HORIZON = [7, 14, 30, 60, 90];
const PLACEHOLDERS = [
  ['{nome}', 'primeiro nome'], ['{carro}', 'carro'], ['{servico}', 'serviço'], ['{acao}', 'o que fazer'],
  ['{tempo}', 'tempo desde a visita'], ['{estetica}', 'nome da estética'], ['{link}', 'link do retorno'],
];

const opt = (value, label, current) => html`<option value="${value}" ${String(value) === String(current) ? html`selected` : ''}>${label}</option>`;

function hoursRows(hours) {
  return DAYS.map(([wd, label]) => {
    const h = hours[wd] || null;
    const open = Boolean(h && h.open);
    return html`
      <div class="horas__dia" data-dia="${wd}">
        <label class="check"><input type="checkbox" name="aberto-${wd}" ${open ? html`checked` : ''}><span>${label}</span></label>
        <div class="horas__campos" ${open ? '' : html`hidden`}>
          <span class="horas__faixa">
            <span class="horas__rotulo">Aberto</span>
            <input type="time" name="abre-${wd}" value="${h?.open || '08:00'}" aria-label="${label}: abre" step="900">
            <span>às</span>
            <input type="time" name="fecha-${wd}" value="${h?.close || '18:00'}" aria-label="${label}: fecha" step="900">
          </span>
          <span class="horas__faixa">
            <span class="horas__rotulo">Pausa</span>
            <input type="time" name="pausa-${wd}" value="${h?.breakStart || ''}" aria-label="${label}: início da pausa (opcional)" step="900">
            <span>às</span>
            <input type="time" name="volta-${wd}" value="${h?.breakEnd || ''}" aria-label="${label}: fim da pausa" step="900">
          </span>
        </div>
        <span class="horas__fechado" ${open ? html`hidden` : ''}>Fechado</span>
      </div>`;
  });
}

function blocksList(blocks) {
  if (!blocks.length) return html`<p class="campo__dica">Nenhuma folga marcada.</p>`;
  return html`<ul class="historico" role="list">${blocks.map((b) => html`
    <li class="folga" data-folga="${b.id}">
      <span><strong>${formatDateShort(b.from)}${b.to && b.to !== b.from ? ` a ${formatDateShort(b.to)}` : ''}</strong> · ${b.reason}${b.to < today() ? ' (passou)' : ''}</span>
      <button type="button" class="btn btn--texto btn--perigo btn--pequeno" data-remover="${b.id}">${icon('trash')}Remover</button>
    </li>`)}</ul>`;
}

export default async function ajustes(root, { params }) {
  const { settings, blocks } = await api.getSettings();
  const publicUrl = api.publicBaseUrl();

  root.innerHTML = String(html`
    <div class="faixa">
      <div class="faixa__topo"><h1 class="faixa__titulo">Ajustes</h1></div>
      <p class="faixa__sub">Tudo aqui muda o link na hora.</p>
    </div>

    <div class="form">
      <form class="form__grupo" id="f-estetica" novalidate aria-labelledby="t-estetica">
        <h2 class="secao__titulo" id="t-estetica">A estética</h2>
        <div class="form__linha form__linha--2">
          <div class="campo"><label for="a-nome">Nome</label><input id="a-nome" name="name" value="${settings.name}" maxlength="40" required></div>
          <div class="campo"><label for="a-frase">Descrição da logo</label><input id="a-frase" name="tagline" value="${settings.tagline}" maxlength="40" placeholder="Estética Automotiva"><p class="campo__dica">Lida por leitores de tela junto com o nome. A frase da logo já está na imagem.</p></div>
        </div>
        <div class="campo"><label for="a-end">Endereço</label><input id="a-end" name="address" value="${settings.address}" maxlength="120" placeholder="Rua, número · bairro"></div>
        <div class="form__linha form__linha--2">
          <div class="campo"><label for="a-whats">WhatsApp da estética</label><input id="a-whats" name="whatsapp" type="tel" inputmode="numeric" value="${formatPhone(settings.whatsapp)}" placeholder="(81) 91234-5678"></div>
          <div class="campo"><label for="a-insta">Instagram</label><div class="prefixo"><span>@</span><input id="a-insta" name="instagram" value="${settings.instagram}" maxlength="30" autocapitalize="off" spellcheck="false"></div></div>
        </div>
        <div class="form__acoes" style="padding:0"><button class="btn btn--primario" type="submit">${icon('check')}Salvar</button></div>
      </form>

      <form class="form__grupo" id="f-horas" novalidate aria-labelledby="t-horas">
        <h2 class="secao__titulo" id="t-horas">Funcionamento</h2>
        <p class="campo__dica">Os horários de chegada do carro. A pausa só bloqueia chegadas: um serviço longo pode atravessar o almoço.</p>
        <div class="horas">${hoursRows(settings.hours)}</div>
        <div class="form__acoes" style="padding:0"><button class="btn btn--primario" type="submit">${icon('check')}Salvar horários</button></div>
      </form>

      <form class="form__grupo" id="f-agenda" novalidate aria-labelledby="t-agenda">
        <h2 class="secao__titulo" id="t-agenda">Regras da agenda</h2>
        <div class="form__linha form__linha--2">
          <div class="campo">
            <label for="a-vagas">Carros ao mesmo tempo</label>
            <input id="a-vagas" name="capacity" type="number" inputmode="numeric" min="1" max="12" value="${settings.capacity}">
            <p class="campo__dica">Quantas vagas ou boxes você atende juntos.</p>
          </div>
          <div class="campo">
            <label for="a-passo">Horários a cada</label>
            <select id="a-passo" name="slotStep">${[15, 30, 60].map((m) => opt(m, `${m} minutos`, settings.slotStep))}</select>
          </div>
          <div class="campo">
            <label for="a-antes">Agendar com pelo menos</label>
            <select id="a-antes" name="minNoticeMinutes">${NOTICE.map(([v, l]) => opt(v, l, settings.minNoticeMinutes))}</select>
          </div>
          <div class="campo">
            <label for="a-frente">Mostrar no link</label>
            <select id="a-frente" name="horizonDays">${HORIZON.map((d) => opt(d, `os próximos ${d} dias`, settings.horizonDays))}</select>
          </div>
        </div>
        <label class="check"><input type="checkbox" name="autoComplete" ${settings.autoComplete ? html`checked` : ''}>
          <span>Concluir sozinho os carros de dias que já passaram<small>Assim o retorno é marcado mesmo se você esquecer de tocar em Concluir. Dá para corrigir depois para “não veio”.</small></span></label>
        <div class="form__acoes" style="padding:0"><button class="btn btn--primario" type="submit">${icon('check')}Salvar regras</button></div>
      </form>

      <section class="form__grupo" id="folgas" aria-labelledby="t-folgas">
        <h2 class="secao__titulo" id="t-folgas">Folgas e feriados</h2>
        <div id="lista-folgas">${blocksList(blocks)}</div>
        <form id="f-folga" class="form__linha form__linha--3" novalidate>
          <div class="campo"><label for="a-folga-de">De</label><input id="a-folga-de" name="from" type="date" min="${today()}" value="${today()}"></div>
          <div class="campo"><label for="a-folga-ate">Até <span class="campo__dica">(opcional)</span></label><input id="a-folga-ate" name="to" type="date" min="${today()}"></div>
          <div class="campo"><label for="a-folga-motivo">Motivo</label><input id="a-folga-motivo" name="reason" placeholder="Feriado, curso…" maxlength="40"></div>
          <div class="form__acoes" style="padding:0"><button class="btn btn--linha" type="submit">${icon('calendar-off')}Marcar folga</button></div>
        </form>
      </section>

      <form class="form__grupo" id="f-mensagem" novalidate aria-labelledby="t-mensagem">
        <h2 class="secao__titulo" id="t-mensagem">Mensagem de retorno</h2>
        <div class="campo">
          <label for="a-msg">Texto</label>
          <textarea id="a-msg" name="returnTemplate" rows="4">${settings.returnTemplate}</textarea>
          <p class="campo__dica">Toque para inserir: ${PLACEHOLDERS.map(([code, label]) => html`<button type="button" class="btn btn--texto btn--pequeno" data-inserir="${code}" title="${label}">${code}</button>`)}</p>
        </div>
        <div class="campo">
          <span class="campo__rotulo">Exemplo</span>
          <p class="mensagem-previa" id="msg-previa"></p>
        </div>
        <div class="form__acoes" style="padding:0">
          <button class="btn btn--primario" type="submit">${icon('check')}Salvar mensagem</button>
          <button class="btn btn--texto" type="button" id="msg-padrao">Voltar ao texto padrão</button>
        </div>
      </form>

      <form class="form__grupo" id="f-link" novalidate aria-labelledby="t-link">
        <h2 class="secao__titulo" id="t-link">Link para a bio</h2>
        <div class="campo">
          <label for="a-link">Endereço do link</label>
          <div class="codigo-link">
            <input id="a-link" name="publicUrl" value="${settings.publicUrl || ''}" placeholder="${publicUrl}" inputmode="url" autocapitalize="off" spellcheck="false">
            <button type="button" class="btn btn--linha" id="copiar">${icon('copy')}Copiar</button>
          </div>
          <p class="campo__dica">Deixe em branco para usar ${publicUrl}. Quando publicar o site, coloque aqui o endereço final: ele vai nas mensagens de retorno.</p>
        </div>
        <div class="form__acoes" style="padding:0">
          <button class="btn btn--primario" type="submit">${icon('check')}Salvar link</button>
          <a class="btn btn--texto" href="../" target="_blank" rel="noopener">${icon('external-link')}Abrir o link</a>
        </div>
      </form>

      <section class="form__grupo" id="dados" aria-labelledby="t-demo">
        <h2 class="secao__titulo" id="t-demo">Dados desta versão</h2>
        <p class="campo__dica">Os dados ficam guardados só neste navegador até o sistema ganhar um servidor. O painel ainda não tem senha.</p>
        <div class="form__acoes" style="padding:0">
          <button class="btn btn--primario" type="button" id="do-zero" data-rotulo="Começar do zero">${icon('trash')}<span>Começar do zero</span></button>
          <button class="btn btn--linha btn--perigo" type="button" id="recomecar" data-rotulo="Voltar aos dados de exemplo">${icon('rotate-ccw')}<span>Voltar aos dados de exemplo</span></button>
        </div>
        <p class="campo__dica">“Começar do zero” apaga clientes, agenda, retornos e folgas de exemplo e mantém seus serviços e ajustes.</p>
      </section>
    </div>
  `);

  // A estética
  $('#f-estetica', root).addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      await api.saveSettings({ ...data, instagram: data.instagram.replace(/^@/, '').trim() });
      showFieldErrors(form, {});
      toast('Dados da estética salvos.');
    } catch (error) {
      if (error.fields) showFieldErrors(form, error.fields);
      else toast(error.message);
    }
  });

  // Funcionamento
  const hoursForm = $('#f-horas', root);
  hoursForm.addEventListener('change', (event) => {
    if (!event.target.name?.startsWith('aberto-')) return;
    const row = event.target.closest('.horas__dia');
    $('.horas__campos', row).hidden = !event.target.checked;
    $('.horas__fechado', row).hidden = event.target.checked;
  });
  hoursForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(hoursForm);
    const hours = {};
    for (const [wd, label] of DAYS) {
      if (data.get(`aberto-${wd}`) !== 'on') { hours[wd] = null; continue; }
      const open = data.get(`abre-${wd}`);
      const close = data.get(`fecha-${wd}`);
      const breakStart = data.get(`pausa-${wd}`) || '';
      const breakEnd = data.get(`volta-${wd}`) || '';
      if (!open || !close || close <= open) {
        toast(`${label}: o fechamento precisa ser depois da abertura.`);
        hoursForm.querySelector(`[name="fecha-${wd}"]`).focus();
        return;
      }
      if ((breakStart && !breakEnd) || (breakEnd && !breakStart) || (breakStart && (breakEnd <= breakStart || breakStart < open || breakEnd > close))) {
        toast(`${label}: a pausa precisa de início e fim, dentro do horário.`);
        hoursForm.querySelector(`[name="pausa-${wd}"]`).focus();
        return;
      }
      hours[wd] = { open, close, breakStart, breakEnd };
    }
    await api.saveSettings({ hours });
    toast('Horários salvos. O link já mostra os novos horários.');
  });

  // Regras da agenda
  $('#f-agenda', root).addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const capacity = Math.min(12, Math.max(1, Number(data.get('capacity')) || 1));
    await api.saveSettings({
      capacity,
      slotStep: Number(data.get('slotStep')),
      minNoticeMinutes: Number(data.get('minNoticeMinutes')),
      horizonDays: Number(data.get('horizonDays')),
      autoComplete: data.get('autoComplete') === 'on',
    });
    event.currentTarget.querySelector('[name="capacity"]').value = capacity;
    toast('Regras da agenda salvas.');
  });

  // Folgas
  const blocksBox = $('#lista-folgas', root);
  $('#f-folga', root).addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const { affected } = await api.addBlock(data);
      const fresh = await api.getSettings();
      blocksBox.innerHTML = String(blocksList(fresh.blocks));
      event.currentTarget.reset();
      toast(affected
        ? `Folga marcada. Atenção: ${affected} ${affected === 1 ? 'carro já estava agendado' : 'carros já estavam agendados'} nesse período.`
        : 'Folga marcada. Esses dias somem do link.');
    } catch (error) {
      toast(error.message);
    }
  });
  blocksBox.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-remover]');
    if (!button) return;
    await api.removeBlock(button.dataset.remover);
    blocksBox.innerHTML = String(blocksList((await api.getSettings()).blocks));
    toast('Folga removida.');
  });

  // Mensagem
  const msgForm = $('#f-mensagem', root);
  const msgField = $('#a-msg', root);
  const renderPreview = () => {
    $('#msg-previa', root).textContent = fillTemplate(msgField.value || DEFAULT_RETURN_TEMPLATE, {
      nome: 'Mariana', carro: 'Onix branco', servico: 'higienização interna', acao: 'fazer uma nova higienização',
      tempo: '6 meses', estetica: $('#a-nome', root).value || settings.name, link: `${publicUrl}/?retorno=exemplo`,
    });
  };
  msgField.addEventListener('input', renderPreview);
  renderPreview();
  msgForm.addEventListener('click', (event) => {
    const button = event.target.closest('[data-inserir]');
    if (!button) return;
    const code = button.dataset.inserir;
    const { selectionStart: s, selectionEnd: e, value } = msgField;
    msgField.value = value.slice(0, s) + code + value.slice(e);
    msgField.focus();
    msgField.setSelectionRange(s + code.length, s + code.length);
    renderPreview();
  });
  $('#msg-padrao', root).addEventListener('click', () => {
    msgField.value = DEFAULT_RETURN_TEMPLATE;
    renderPreview();
  });
  msgForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!msgField.value.includes('{link}')) {
      toast('Inclua {link} na mensagem: é por ele que o cliente agenda o retorno.');
      msgField.focus();
      return;
    }
    await api.saveSettings({ returnTemplate: msgField.value });
    toast('Mensagem salva.');
  });

  // Link público
  $('#copiar', root).addEventListener('click', async () => {
    const value = $('#a-link', root).value.trim() || publicUrl;
    try {
      await navigator.clipboard.writeText(value);
      toast('Link copiado. Cole na bio do Instagram.');
    } catch {
      $('#a-link', root).select();
      toast('Selecionei o link; copie com o menu do celular.');
    }
  });
  $('#f-link', root).addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = $('#a-link', root).value.trim().replace(/\/$/, '');
    if (value && !/^https?:\/\//.test(value)) {
      showFieldErrors(event.currentTarget, { publicUrl: 'Comece com https:// (ex.: https://suaestetica.com.br).' });
      return;
    }
    showFieldErrors(event.currentTarget, {});
    await api.saveSettings({ publicUrl: value });
    toast('Link salvo.');
  });

  // Começar do zero / voltar aos exemplos: pedem um segundo toque.
  const confirmTwice = (button, action) => {
    const label = button.querySelector('span');
    button.addEventListener('click', async () => {
      if (button.dataset.confirmar !== 'sim') {
        button.dataset.confirmar = 'sim';
        label.textContent = 'Toque de novo para confirmar';
        setTimeout(() => {
          button.dataset.confirmar = '';
          label.textContent = button.dataset.rotulo;
        }, 4000);
        return;
      }
      await action();
    });
  };
  confirmTwice($('#do-zero', root), async () => {
    await api.clearExampleData();
    toast('Pronto: agenda zerada. Seus serviços e ajustes continuam.');
    window.location.hash = '#/';
  });
  confirmTwice($('#recomecar', root), async () => {
    await api.resetPlaceholder();
    toast('Pronto: dados de exemplo de volta.');
    window.location.hash = '#/';
  });

  if (params.get('secao')) {
    const target = $(`#${params.get('secao')}`, root);
    if (target) requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'start' });
      target.querySelector('input')?.focus({ preventScroll: true });
    });
  }

  $$('input[type="tel"]', root).forEach((input) => {
    input.addEventListener('blur', () => { input.value = formatPhone(input.value); });
  });

  return null;
}
