// Inventário (contagem física): compara o que foi contado na prateleira com o saldo do sistema. Só conferência: não grava nada.
// Contagem é texto (o que a pessoa digitou); vazio = ainda não contado. "0" é uma contagem válida (prateleira vazia).

export type LinhaInventario = { id: string; codigo: string; nome: string; saldo: number };
export type Contagens = Record<string, string>;
export type Divergencia = LinhaInventario & { contado: number; diferenca: number };

/** Quantidade contada, ou null se ainda não informada (ou inválida: negativa, com letra). */
export function quantidadeContada(texto: string | undefined): number | null {
  const t = (texto ?? "").trim().replace(",", ".");
  if (t === "" || !/^\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

/** Itens ainda sem contagem informada: são eles que impedem o avanço para a revisão. */
export const semContagem = (linhas: readonly LinhaInventario[], c: Contagens): LinhaInventario[] =>
  linhas.filter((l) => quantidadeContada(c[l.id]) === null);

/** Só o que não bate: sobra (contado > sistema) ou falta (contado < sistema), da maior diferença para a menor. */
export function divergencias(linhas: readonly LinhaInventario[], c: Contagens): Divergencia[] {
  return linhas
    .flatMap((l) => {
      const contado = quantidadeContada(c[l.id]);
      return contado === null || contado === l.saldo ? [] : [{ ...l, contado, diferenca: contado - l.saldo }];
    })
    .sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca) || a.nome.localeCompare(b.nome, "pt-BR"));
}

export function textoFaltam(n: number): string {
  return n === 1 ? "Falta 1 item sem contagem informada para avançar." : `Faltam ${n} itens sem contagem informada para avançar.`;
}
