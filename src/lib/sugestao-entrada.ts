// Valores padrão da entrada no estoque: com o fornecedor escolhido, sugere a empresa, o produto e o valor da última compra dele.
export type CompraParaSugestao = { fornecedor: string; data_compra: string; created_at?: string; empresa_id: string | null; item_id: string | null; valor_unitario: number };

const norm = (t: string) => t.trim().toLowerCase();

export function ultimaCompraDoFornecedor<T extends CompraParaSugestao>(compras: readonly T[], nomeFornecedor: string): T | undefined {
  const alvo = norm(nomeFornecedor);
  if (!alvo) return undefined;
  return compras
    .filter((c) => norm(c.fornecedor) === alvo && c.item_id && c.empresa_id)
    .sort((a, b) => b.data_compra.localeCompare(a.data_compra) || (b.created_at ?? "").localeCompare(a.created_at ?? ""))[0];
}
