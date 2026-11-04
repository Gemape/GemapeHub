// Valor de uma baixa definitiva: a quantidade vezes o preço unitário. A baixa só traz o preço quando o banco o guardou na hora (preco_unitario_registrado); quando não traz, vale o
// preço da compra do mesmo produto (e tamanho) mais recente até a data da baixa; sem compra anterior, a primeira compra depois dela; sem nenhuma compra, zero.
export type CompraDePreco = {
  item_id: string | null;
  tamanho_id?: string | null;
  data_compra: string;
  valor_unitario?: number | string | null;
  created_at?: string | null;
};
export type BaixaParaPreco = {
  item_id: string | null;
  tamanho_id?: string | null;
  data_movimentacao: string;
  preco_unitario_registrado?: number | string | null;
};

const numero = (v: unknown) => Number(v) || 0;
const dia = (d: string) => d.slice(0, 10);

export function precoUnitarioDaBaixa(compras: readonly CompraDePreco[], baixa: BaixaParaPreco): number {
  const registrado = numero(baixa.preco_unitario_registrado);
  if (registrado > 0) return registrado;
  if (!baixa.item_id) return 0;
  const doItem = compras.filter((c) => c.item_id === baixa.item_id && numero(c.valor_unitario) > 0);
  if (doItem.length === 0) return 0;
  // A compra do mesmo tamanho tem preferência; "sem-tamanho" (como a devolução grava) vale como sem tamanho.
  const tamanho = baixa.tamanho_id && baixa.tamanho_id !== "sem-tamanho" ? baixa.tamanho_id : null;
  const doTamanho = tamanho ? doItem.filter((c) => c.tamanho_id === tamanho) : [];
  const candidatas = doTamanho.length > 0 ? doTamanho : doItem;
  const data = dia(baixa.data_movimentacao);
  const ordem = (a: CompraDePreco, b: CompraDePreco) => dia(b.data_compra).localeCompare(dia(a.data_compra)) || String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
  const antes = candidatas.filter((c) => dia(c.data_compra) <= data).sort(ordem);
  if (antes.length > 0) return numero(antes[0]!.valor_unitario);
  const depois = candidatas.sort((a, b) => ordem(b, a));
  return numero(depois[0]!.valor_unitario);
}

export const valorDaBaixa = (compras: readonly CompraDePreco[], baixa: BaixaParaPreco & { quantidade: number }): number =>
  Math.round(numero(baixa.quantidade) * precoUnitarioDaBaixa(compras, baixa) * 100) / 100;
