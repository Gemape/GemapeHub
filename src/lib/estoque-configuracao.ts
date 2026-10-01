/** Mantém o formato de dados existente no produto, validando a grade do módulo. */
export function prepararMinimosEstoque(
  valores: Record<string, number>,
  tamanhosPermitidos: string[],
): { minimos_tamanho: Record<string, number>; estoque_minimo: number } {
  const permitidos = new Set(tamanhosPermitidos);
  const minimos_tamanho: Record<string, number> = {};
  for (const [id, minimo] of Object.entries(valores)) {
    if (!permitidos.has(id)) throw new Error('Tamanho não autorizado para este produto.');
    if (!Number.isSafeInteger(minimo) || minimo < 0) throw new Error('Estoque mínimo inválido.');
    if (minimo > 0) minimos_tamanho[id] = minimo;
  }
  const estoque_minimo = Object.values(minimos_tamanho).reduce((soma, minimo) => soma + minimo, 0);
  if (!Number.isSafeInteger(estoque_minimo)) throw new Error('Estoque mínimo inválido.');
  return { minimos_tamanho, estoque_minimo };
}

/** Ajuste direto do saldo inicial de Ferramentas, inclusive após movimentações. */
export function prepararEstoqueFerramenta(minimoTexto: string, saldoTexto: string) {
  const estoque_minimo = Number(minimoTexto);
  if (!minimoTexto.trim() || !Number.isSafeInteger(estoque_minimo) || estoque_minimo < 0) {
    throw new Error('Estoque mínimo inválido.');
  }
  const estoque_atual = Number(saldoTexto);
  if (!saldoTexto.trim() || !Number.isSafeInteger(estoque_atual) || estoque_atual < 0) {
    throw new Error('Estoque inicial inválido.');
  }
  return { estoque_minimo, estoque_atual };
}

export function prepararMinimoUnico(minimoTexto: string) {
  const estoque_minimo = Number(minimoTexto);
  if (!minimoTexto.trim() || !Number.isSafeInteger(estoque_minimo) || estoque_minimo < 0) {
    throw new Error('Estoque mínimo inválido.');
  }
  return { estoque_minimo, minimos_tamanho: {} as Record<string, number> };
}
