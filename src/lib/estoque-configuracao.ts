/** Tamanhos antigos sem seleção explícita continuam editáveis; os demais seguem o produto. */
export function tamanhosConfiguraveisNoModulo(
  autorizadosAtivos: string[],
  minimosAnteriores: Record<string, number>,
  selecionados: string[] | null | undefined,
): string[] {
  const visivel = (id: string) => !Array.isArray(selecionados) || selecionados.includes(id);
  return [...new Set([
    ...autorizadosAtivos.filter(visivel),
    ...Object.keys(minimosAnteriores).filter((id) => visivel(id) && Number(minimosAnteriores[id]) > 0),
  ])];
}

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

/** Estoque mínimo editado na linha do Estoque de EPI/Uniformes (decisão 416). Linha de um tamanho, em produto que controla tamanho: grava só aquele tamanho e o total passa a ser a soma; os demais tamanhos ficam como estavam. Sem tamanho: o mínimo único do item. */
export function prepararMinimoDaLinha(
  minimosAtuais: Record<string, number>,
  tamanhoId: string | null,
  minimoTexto: string,
): { estoque_minimo: number; minimos_tamanho: Record<string, number> } {
  // Linha sem tamanho em item que já tem mínimo por tamanho: grava na chave "sem-tamanho", sem apagar os mínimos dos tamanhos.
  const temPorTamanho = Object.values(minimosAtuais).some((m) => Number(m) > 0);
  if (!tamanhoId && !temPorTamanho) return prepararMinimoUnico(minimoTexto);
  tamanhoId = tamanhoId ?? 'sem-tamanho';
  const valor = Number(minimoTexto);
  if (!minimoTexto.trim() || !Number.isSafeInteger(valor) || valor < 0) throw new Error('Estoque mínimo inválido.');
  const minimos_tamanho = { ...minimosAtuais };
  if (valor > 0) minimos_tamanho[tamanhoId] = valor;
  else delete minimos_tamanho[tamanhoId];
  const estoque_minimo = Object.values(minimos_tamanho).reduce((soma, m) => soma + (Number(m) || 0), 0);
  return { estoque_minimo, minimos_tamanho };
}
