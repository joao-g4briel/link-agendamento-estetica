import * as api from '../data/api.js';
import { $, html, toast, bindSubmit } from './ui.js';
import { formatPrice } from '../core/format.js';
import { waLink } from '../core/whatsapp.js';

export default async function operacao(root, { params = new URLSearchParams() } = {}) {
  root._operationController?.abort();
  root._operationController = new AbortController();
  const [data, services] = await Promise.all([api.getOperations(params.get('de'), params.get('ate')), api.listServices()]);
  root.innerHTML = String(html`<div class="faixa"><h1 class="faixa__titulo">Operação</h1><p class="faixa__sub">Histórico, lista de espera e exportação.</p></div>
    <section class="secao"><h2 class="secao__titulo">Resumo do período</h2>
      <form id="periodo-operacao" class="form__linha"><div class="campo"><label for="op-de">De</label><input id="op-de" type="date" name="de" value="${data.from}"></div><div class="campo"><label for="op-ate">Até</label><input id="op-ate" type="date" name="ate" value="${data.to}"></div><button type="submit" class="btn btn--linha">Aplicar período</button></form>
      <p>${data.completed} concluídos · ${data.canceled} cancelados · ${data.noShow} faltas · ${data.returning} retornos reagendados</p>
      <p>Valor dos serviços concluídos: ${formatPrice(data.revenueCents)}. Não representa pagamentos recebidos.</p>
      <button type="button" class="btn btn--linha" id="exportar">Exportar dados em JSON</button><p class="campo__dica">O arquivo contém dados de clientes. Guarde em local privado. Tokens de acesso e sessões ficam de fora.</p></section>
    <section class="secao"><h2 class="secao__titulo">Lista de espera</h2>
      <ul class="lista" role="list">${data.waitlist.map(w => html`<li class="item"><div class="item__corpo"><strong>${w.name}</strong><p>${w.vehicle} · ${services.find(s => s.id === w.serviceId)?.name || 'Serviço'}</p></div><div class="item__acoes"><a class="btn btn--whats" href="${waLink(w.phone, 'Oi! Surgiu uma vaga na agenda. Podemos combinar sua chegada?')}" target="_blank" rel="noopener">WhatsApp</a><button type="button" class="btn btn--texto" data-resolver="${w.id}">Resolver</button></div></li>`)}</ul>
      ${!data.waitlist.length ? html`<p>Ninguém aguardando vaga.</p>` : ''}
      <form id="form-espera" class="form"><div class="campo"><label for="esp-nome">Nome</label><input id="esp-nome" name="name" required maxlength="80"></div>
        <div class="campo"><label for="esp-phone">WhatsApp</label><input id="esp-phone" name="phone" type="tel" required></div>
        <div class="campo"><label for="esp-carro">Carro</label><input id="esp-carro" name="vehicle" maxlength="60"></div>
        <div class="campo"><label for="esp-servico">Serviço</label><select id="esp-servico" name="serviceId">${services.filter(s => s.active).map(s => html`<option value="${s.id}">${s.name}</option>`)}</select></div>
        <button class="btn btn--primario" type="submit">Adicionar à espera</button></form></section>
    <section class="secao"><h2 class="secao__titulo">Últimas alterações</h2><ul class="historico" role="list">${data.events.map(e => html`<li><time>${new Date(e.at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</time> · ${e.action} · ${e.targetId}</li>`)}</ul></section>`);
  $('#exportar', root).addEventListener('click', async event => {
    const button = event.currentTarget; button.disabled = true;
    try {
      const payload = await api.exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = `hc-exportacao-${payload.exportedAt.slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { toast(error.message); } finally { button.disabled = false; }
  });
  $('#periodo-operacao', root).addEventListener('submit', event => { event.preventDefault(); window.location.hash = `#/operacao?${new URLSearchParams(new FormData(event.currentTarget))}`; });
  bindSubmit($('#form-espera', root), async () => { await api.saveWaitlist(Object.fromEntries(new FormData($('#form-espera', root)))); await operacao(root, { params }); toast('Adicionado à lista de espera.'); });
  root.addEventListener('click', async event => {
    const button = event.target.closest('[data-resolver]');
    if (!button || button.disabled) return;
    button.disabled = true;
    try { await api.closeWaitlist(button.dataset.resolver); button.closest('li').remove(); toast('Registro resolvido.'); }
    catch (error) { toast(error.message); button.disabled = false; }
  }, { signal: (root._operationController ||= new AbortController()).signal });
  // O host de navegação chama cleanup ao sair desta tela.
  return { cleanup: () => root._operationController.abort() };
}
