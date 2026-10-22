// Atalhos de teclado do editor 3D (item 6.23) só valem quando a pessoa NÃO está escrevendo.
// Régua (range), checkbox e botão com foco não contam como "escrevendo": depois de ajustar a
// espessura o foco fica na régua, e os atalhos precisam continuar funcionando.
const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'number', 'password', 'url', 'tel', 'date', 'time']);

export const isTextEntryTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return target instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(target.type);
};
