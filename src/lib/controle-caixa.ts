// Controle das ferramentas por caixa (decisão 101): a caixa lista as ferramentas
// cadastradas nela, quanto está com empregados e o histórico de movimentações dessas ferramentas.
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
};

/** Só as movimentações de ferramenta cujo item está na caixa; a ordem recebida é mantida. */
export function movimentacoesDaCaixa<T extends { modulo: string; item_id: string | null }>(
  movimentacoes: T[],
  ferramentaIds: Iterable<string>,
): T[] {
  const ids = new Set(ferramentaIds);
  return movimentacoes.filter((m) => m.modulo === "ferramenta" && !!m.item_id && ids.has(m.item_id));
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
