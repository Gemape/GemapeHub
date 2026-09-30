// Ficha de EPI Avulsa (pendência 8): o histórico vem inteiro do banco, filtrado pelo
// empregado e pela empresa, e não das últimas movimentações carregadas na tela.

export type MovimentacaoFicha = {
  item_id: string | null;
  tipo_movimentacao: string;
  quantidade: number;
  data_movimentacao: string;
  created_at?: string | null;
};

type ConsultaMovimentacoes = PromiseLike<{
  data: MovimentacaoFicha[] | null;
  error: { message: string } | null;
}> & { eq: (coluna: string, valor: string) => ConsultaMovimentacoes };

/** Lê todas as movimentações de EPI do empregado na empresa, da mais nova para a mais antiga. */
export async function lerHistoricoEpiEmpregado(
  cliente: { from: (tabela: "movimentacoes") => { select: (colunas: string) => unknown } },
  filtro: { empregadoId: string; empresaId: string },
): Promise<MovimentacaoFicha[]> {
  const consulta = cliente
    .from("movimentacoes")
    .select(
      "item_id,tipo_movimentacao,quantidade,data_movimentacao,created_at",
    ) as ConsultaMovimentacoes;
  const { data, error } = await consulta
    .eq("modulo", "epi")
    .eq("empresa_id", filtro.empresaId)
    .eq("empregado_id", filtro.empregadoId);
  if (error) throw new Error(error.message);
  // Mesma ordem da lista de antes: data mais recente primeiro e, no mesmo dia, o último registro.
  return [...(data ?? [])].sort(
    (a, b) =>
      b.data_movimentacao.localeCompare(a.data_movimentacao) ||
      (b.created_at ?? "").localeCompare(a.created_at ?? ""),
  );
}
