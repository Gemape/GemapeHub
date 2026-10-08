// Controle das ferramentas por caixa (decisão 101): a caixa lista as ferramentas
// cadastradas nela, quanto está com empregados e o histórico de movimentações dessas ferramentas.
// A caixa é gravada em entregas, vistorias e devoluções; compras e baixas ficam sem caixa.
import { ehBaixa, naturezaMovimentacao } from "./historico-movimentacoes.ts";
import { formatarData } from "./gemape.ts";

type MovimentoCaixa = {
  modulo: string;
  tipo_movimentacao: string;
  item_id: string | null;
  empregado_id: string | null;
  motivo_baixa: string | null;
  quantidade: number;
  data_movimentacao: string;
  observacao: string | null;
  // Caixa gravada na movimentação (só no modo demonstração); vazia em compras, baixas e registros antigos.
  caixa_id?: string | null | undefined;
};

/**
 * Movimentações de ferramenta da caixa, na ordem recebida: as gravadas com a caixa e, entre as sem
 * caixa (compras, baixas, registros antigos), as de ferramentas que estão cadastradas nela.
 */
export function movimentacoesDaCaixa<T extends { modulo: string; item_id: string | null; caixa_id?: string | null | undefined }>(
  movimentacoes: T[],
  caixaId: string,
  ferramentaIds: Iterable<string>,
): T[] {
  const ids = new Set(ferramentaIds);
  return movimentacoes.filter((m) => {
    if (m.modulo !== "ferramenta" || !m.item_id) return false;
    if (m.caixa_id) return m.caixa_id === caixaId;
    return ids.has(m.item_id);
  });
}

/** Caixa da entrega mais recente da ferramenta ao empregado, para a devolução voltar à mesma caixa. */
export function caixaDaUltimaEntrega(
  movimentacoes: (Pick<MovimentoCaixa, "modulo" | "tipo_movimentacao" | "item_id" | "empregado_id" | "motivo_baixa" | "data_movimentacao"> & {
    caixa_id?: string | null | undefined;
    created_at?: string | undefined;
  })[],
  empregadoId: string,
  itemId: string,
): string | null {
  let melhor: (typeof movimentacoes)[number] | null = null;
  for (const m of movimentacoes) {
    if (m.modulo !== "ferramenta" || m.item_id !== itemId || m.empregado_id !== empregadoId) continue;
    if (m.tipo_movimentacao !== "Saida" || ehBaixa(m) || !m.caixa_id) continue;
    const chave = `${m.data_movimentacao}|${m.created_at ?? ""}`;
    if (!melhor || chave > `${melhor.data_movimentacao}|${melhor.created_at ?? ""}`) melhor = m;
  }
  return melhor?.caixa_id ?? null;
}

/** Entregue, devolvido e baixado de uma ferramenta, e quanto segue com empregados (nunca negativo). */
export function controleDaFerramenta(
  movimentacoes: Pick<MovimentoCaixa, "modulo" | "tipo_movimentacao" | "item_id" | "motivo_baixa" | "quantidade">[],
  ferramentaId: string,
) {
  let entregue = 0;
  let devolvido = 0;
  let baixado = 0;
  for (const m of movimentacoes) {
    if (m.modulo !== "ferramenta" || m.item_id !== ferramentaId) continue;
    const quantidade = Number(m.quantidade) || 0;
    if (m.tipo_movimentacao === "Saida") {
      if (ehBaixa(m)) baixado += quantidade;
      else entregue += quantidade;
    } else if (m.tipo_movimentacao === "Devolucao") devolvido += quantidade;
  }
  return { entregue, devolvido, baixado, comEmpregado: Math.max(entregue - devolvido - baixado, 0) };
}

/** Quanto da quantidade cadastrada na caixa continua guardado nela. */
export const disponivelNaCaixa = (quantidadeNaCaixa: number, comEmpregado: number) =>
  Math.max((Number(quantidadeNaCaixa) || 0) - comEmpregado, 0);

export function linhaCsvCaixa(
  m: MovimentoCaixa,
  contexto: {
    caixa: string;
    ferramentas: { id: string; codigo_sku: string | null; nome: string }[];
    nomeEmpregado: (id: string | null) => string;
  },
): Record<string, unknown> {
  const ferramenta = contexto.ferramentas.find((f) => f.id === m.item_id);
  return {
    Caixa: contexto.caixa,
    Data: formatarData(m.data_movimentacao),
    Tipo: naturezaMovimentacao({ ...m, veiculo_id: null, onus_baixa: null, tipo_vistoria: null, sinalizar_ocorrencia: false, tipo_ocorrencia: null, conducao_ocorrencia: null }),
    Codigo: ferramenta?.codigo_sku || "—",
    Ferramenta: ferramenta?.nome ?? "—",
    Quantidade: m.quantidade,
    Empregado: contexto.nomeEmpregado(m.empregado_id),
    MotivoBaixa: m.motivo_baixa,
    Observacao: m.observacao,
  };
}
