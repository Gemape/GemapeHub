// Ficha de EPI Avulsa (pendência 8): o histórico vem inteiro do banco, filtrado pelo
// empregado e pela empresa, e não das últimas movimentações carregadas na tela.

import { lerTodas } from "./ler-todas.ts";

export type MovimentacaoFicha = {
  item_id: string | null;
  tipo_movimentacao: string;
  quantidade: number;
  motivo_baixa?: string | null;
  data_movimentacao: string;
  created_at?: string | null;
  // Só no modo demonstração; no banco real a coluna entra na Fase 2 (decisão 23).
  tamanho_id?: string | null;
  codigo_movimentacao?: string | null;
  responsavel_nome?: string | null;
};

type ConsultaMovimentacoes = PromiseLike<{
  data: MovimentacaoFicha[] | null;
  error: { message: string } | null;
}> & { eq: (coluna: string, valor: string) => ConsultaMovimentacoes };

/** Lê todas as movimentações de EPI do empregado na empresa, da mais nova para a mais antiga. */
export async function lerHistoricoEpiEmpregado(
  cliente: { from: (tabela: "movimentacoes") => { select: (colunas: string) => unknown } },
  filtro: { empregadoId: string; empresaId: string; comTamanho?: boolean },
): Promise<MovimentacaoFicha[]> {
  const montar = () =>
    (cliente
      .from("movimentacoes")
      .select(
        `item_id,tipo_movimentacao,quantidade,motivo_baixa,data_movimentacao,created_at${filtro.comTamanho ? ",tamanho_id,codigo_movimentacao,responsavel_nome" : ""}`,
      ) as ConsultaMovimentacoes)
      .eq("modulo", "epi")
      .eq("empresa_id", filtro.empresaId)
      .eq("empregado_id", filtro.empregadoId);
  let data: MovimentacaoFicha[];
  try {
    data = await lerTodas<MovimentacaoFicha>(montar, (q) => q.order("created_at").order("id"));
  } catch (erro) {
    throw new Error(erro instanceof Error ? erro.message : (erro as { message?: string })?.message ?? "Erro ao ler o histórico.");
  }
  // Mesma ordem da lista de antes: data mais recente primeiro e, no mesmo dia, o último registro.
  return [...data].sort(
    (a, b) =>
      b.data_movimentacao.localeCompare(a.data_movimentacao) ||
      (b.created_at ?? "").localeCompare(a.created_at ?? ""),
  );
}
