// Devolução como entrada de EPI usado no estoque (decisão 327). A devolução soma no estoque como produto "usado" e mantém os dados da compra original (data da compra, nota
// fiscal, fornecedor, tamanho e CA). A entrega não guarda de qual compra saiu cada unidade; vale a compra mais antiga do EPI no tamanho (as unidades mais velhas saem primeiro).
import type { MovimentacaoEpi } from "./entrega-epi.ts";
import { emPosseEpi } from "./entrega-epi.ts";

export type CompraDeOrigem = {
  id: string;
  item_id: string | null;
  tamanho_id?: string | null;
  data_compra: string;
  nota_fiscal?: string | null;
  fornecedor?: string | null;
  fornecedor_id?: string | null;
  ca?: string | null;
  created_at?: string | null;
};

export type OrigemDaDevolucao = {
  compra_origem_id: string;
  data_compra_origem: string;
  nota_fiscal_origem: string | null;
  fornecedor_origem: string | null;
  fornecedor_id_origem: string | null;
  ca_origem: string | null;
};

// A compra mais antiga do EPI no tamanho (sem tamanho, qualquer compra do EPI); null se nunca houve compra registrada.
export function compraDeOrigem(
  compras: readonly CompraDeOrigem[],
  itemId: string,
  tamanhoId: string | null,
): CompraDeOrigem | null {
  const doItem = compras.filter(
    (c) => c.item_id === itemId && (!tamanhoId || (c.tamanho_id ?? null) === tamanhoId),
  );
  return (
    [...doItem].sort(
      (a, b) =>
        a.data_compra.localeCompare(b.data_compra) ||
        String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")),
    )[0] ?? null
  );
}

// `caDoEpi`: o CA do cadastro do EPI, para compras antigas ou importadas de NF-e que não guardaram o CA.
export const origemDaDevolucao = (
  c: CompraDeOrigem,
  caDoEpi?: string | null,
): OrigemDaDevolucao => ({
  compra_origem_id: c.id,
  data_compra_origem: c.data_compra,
  nota_fiscal_origem: c.nota_fiscal ?? null,
  fornecedor_origem: c.fornecedor ?? null,
  fornecedor_id_origem: c.fornecedor_id ?? null,
  ca_origem: c.ca || caDoEpi || null,
});

export type PosseDoEmpregado = { itemId: string; tamanhoId: string | null; quantidade: number };

// O que o empregado tem em posse, por EPI e por tamanho (os tamanhos vêm das próprias entregas), só o que é maior que zero.
export function posseDoEmpregado(
  movs: readonly MovimentacaoEpi[],
  empregadoId: string,
): PosseDoEmpregado[] {
  const chaves = new Map<string, { itemId: string; tamanhoId: string | null }>();
  for (const m of movs) {
    if (
      m.tipo_movimentacao !== "Saida" ||
      !m.item_id ||
      (m.empregado_id ?? empregadoId) !== empregadoId
    )
      continue;
    const tamanhoId = m.tamanho_id ?? null;
    chaves.set(`${m.item_id}|${tamanhoId ?? ""}`, { itemId: m.item_id, tamanhoId });
  }
  return [...chaves.values()]
    .map((c) => ({ ...c, quantidade: emPosseEpi(movs, empregadoId, c.itemId, c.tamanhoId) }))
    .filter((p) => p.quantidade > 0);
}
