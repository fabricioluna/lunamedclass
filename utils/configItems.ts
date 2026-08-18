// Toda escrita em `config/periods` e `config/disciplines` é "regrava o array inteiro" — os dois
// vivem num doc único (item 3.1), não em documentos separados. Cada campo editável no admin
// repetia esse `map` na mão, e errar nele apaga silenciosamente o resto da configuração: foi
// exatamente o risco que tirou `seedBaseStructure()` de cena no item 6.2 (ele sobrescreve
// `config/periods` E `config/disciplines` inteiros, levando junto temas, referências, status e
// travas de feature editados pelo admin).

export function setItemField<T extends { id: string }, K extends keyof T>(
  items: T[],
  itemId: string,
  field: K,
  value: T[K],
): T[] {
  return items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item));
}

// Necessária porque o Firestore rejeita `undefined` numa escrita: para tirar o brasão de um
// período não basta gravar `crest: undefined`, a chave precisa sumir do objeto.
export function removeItemField<T extends { id: string }>(
  items: T[],
  itemId: string,
  field: keyof T & string,
): T[] {
  return items.map((item) => {
    if (item.id !== itemId) return item;
    const copy: Record<string, unknown> = { ...item };
    delete copy[field];
    return copy as T;
  });
}
