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

type ConsultaContagem = { eq: (coluna: string, valor: string) => ConsultaContagem } & PromiseLike<{ count: number | null; error?: unknown }>;

/** Lê todas as movimentações de EPI do empregado na empresa, da mais nova para a mais antiga. */
export async function lerHistoricoEpiEmpregado(
  cliente: { from: (tabela: "movimentacoes") => { select: (colunas: string, opcoes?: { count: "exact"; head: boolean }) => unknown } },
  filtro: { empregadoId: string; empresaId: string; comTamanho?: boolean },
  // Para a barra de progresso: linhas lidas e total (o total vem de uma contagem antes da leitura).
  aoProgredir?: (lidas: number, total: number) => void,
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
    let total = 0;
    if (aoProgredir) {
      // Contagem só do número de linhas (sem trazê-las): é o total da barra de progresso.
      const { count, error } = (await (cliente.from("movimentacoes").select("id", { count: "exact", head: true }) as unknown as ConsultaContagem)
        .eq("modulo", "epi").eq("empresa_id", filtro.empresaId).eq("empregado_id", filtro.empregadoId)) as { count: number | null; error?: unknown };
      // Contagem que falhou não impede a ficha: sem total, a barra usa a estimativa por blocos lidos.
      total = error ? 0 : count ?? 0;
      aoProgredir(0, total);
    }
    data = await lerTodas<MovimentacaoFicha>(montar, (q) => q.order("created_at").order("id"), aoProgredir ? (lidas) => aoProgredir(lidas, total) : undefined);
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
