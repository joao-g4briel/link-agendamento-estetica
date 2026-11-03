// Cada navegação recebe seu próprio DOM. Respostas atrasadas só podem atualizar
// a tela anterior, já desconectada, nunca os elementos da aba atual.
export function createViewHost(host, createRoot = () => document.createElement('div')) {
  let version = 0;
  let current = null;
  let refreshing = null;

  function mount() {
    version++;
    current?.cleanup?.();
    current = null;
    refreshing = null;
    const root = createRoot();
    host.replaceChildren(root);
    return root;
  }

  return {
    mount,
    async show(view, onError) {
      const root = mount();
      const request = version;
      try {
        const result = await view(root);
        if (request !== version) {
          result?.cleanup?.();
          return false;
        }
        current = result || null;
      } catch (error) {
        if (request !== version) return false;
        onError(error, root);
      }
      return request === version;
    },
    async refresh() {
      const request = version;
      if (refreshing) return refreshing;
      const refresh = current?.refresh;
      const task = Promise.resolve().then(() => refresh?.());
      refreshing = task;
      try {
        await task;
      } catch (error) {
        // Uma falha de atualização de uma aba antiga não pertence à aba atual.
        if (request === version) throw error;
      } finally {
        if (refreshing === task) refreshing = null;
      }
    },
  };
}
