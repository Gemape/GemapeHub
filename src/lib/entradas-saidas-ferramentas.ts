// Ferramentas > Relatórios > Entradas e saídas: cada movimentação que põe ferramenta no estoque, na caixa ou de volta (entrada) ou a tira (saída),
// com a caixa, o empregado e o motivo da saída. O Estoque não mostra mais isso: ele só diz onde a ferramenta está hoje.
import { caixaDaUltimaEntrega } from "./controle-caixa.ts";
import { ehBaixa } from "./historico-movimentacoes.ts";

export type SentidoMovimento = "Entrada" | "Saída";

type Movimento = {
  id: string;
  modulo: string;
  item_id: string | null;
  empresa_id: string | null;
  empregado_id: string | null;
  tipo_movimentacao: string;
  motivo_baixa: string | null;
  quantidade: number;
  data_movimentacao: string;
  observacao: string | null;
  caixa_id?: string | null | undefined;
  created_at?: string | undefined;
  // Só no modo demonstração, gravado na devolução.
  motivo_devolucao?: string | null | undefined;
};

export type LinhaEntradaSaida = {
  chave: string;
  data: string;
  sentido: SentidoMovimento;
  /** O que aconteceu: Compra, Devolução do empregado, Entrega ao empregado ou Baixa. */
  natureza: string;
  /** Motivo da saída (baixa: o motivo escolhido; entrega: Fornecimento ao Empregado). Vazio nas entradas, salvo o motivo da devolução. */
  motivo: string;
  itemId: string;
  empresaId: string | null;
  caixaId: string | null;
  empregadoId: string | null;
  quantidade: number;
  observacao: string;
};

export const MOTIVO_ENTREGA = "Fornecimento ao Empregado";

/** Uma linha por compra, devolução, entrega ou baixa de ferramenta; transferência e vistoria não entram, porque não mudam o que entrou nem o que saiu. */
export function linhasEntradasSaidas(movimentos: Movimento[]): LinhaEntradaSaida[] {
  const linhas: LinhaEntradaSaida[] = [];
  for (const m of movimentos) {
    if (m.modulo !== "ferramenta" || !m.item_id) continue;
    let sentido: SentidoMovimento;
    let natureza: string;
    let motivo = "";
    if (m.tipo_movimentacao === "Entrada") {
      sentido = "Entrada";
      natureza = "Compra";
    } else if (m.tipo_movimentacao === "Devolucao") {
      sentido = "Entrada";
      natureza = "Devolução do empregado";
      motivo = m.motivo_devolucao ?? "";
    } else if (m.tipo_movimentacao === "Saida" && ehBaixa(m)) {
      sentido = "Saída";
      natureza = "Baixa";
      motivo = m.motivo_baixa ?? "";
    } else if (m.tipo_movimentacao === "Saida") {
      sentido = "Saída";
      natureza = "Entrega ao empregado";
      motivo = MOTIVO_ENTREGA;
    } else continue;
    // Sem a caixa gravada (baixa, por exemplo), vale a da última entrega ao mesmo empregado.
    const caixaId = m.caixa_id ?? (m.empregado_id && sentido === "Saída" ? caixaDaUltimaEntrega(movimentos, m.empregado_id, m.item_id) : null);
    linhas.push({
      chave: m.id, data: m.data_movimentacao, sentido, natureza, motivo, itemId: m.item_id, empresaId: m.empresa_id,
      caixaId, empregadoId: m.empregado_id, quantidade: Number(m.quantidade) || 0, observacao: m.observacao ?? "",
    });
  }
  // Mais recente primeiro; a data é AAAA-MM-DD, então a ordem do texto é a da data.
  return linhas.sort((a, b) => b.data.localeCompare(a.data));
}

export type FiltroEntradasSaidas = { sentido?: SentidoMovimento | undefined; caixaId?: string | undefined; empregadoId?: string | undefined; motivo?: string | undefined };

export function filtrarEntradasSaidas(linhas: LinhaEntradaSaida[], f: FiltroEntradasSaidas): LinhaEntradaSaida[] {
  return linhas.filter((l) =>
    (!f.sentido || l.sentido === f.sentido) &&
    (!f.caixaId || l.caixaId === f.caixaId) &&
    (!f.empregadoId || l.empregadoId === f.empregadoId) &&
    (!f.motivo || l.motivo === f.motivo));
}

/** Total de unidades que entraram e que saíram, e as saídas por motivo (maior primeiro). */
export function resumoEntradasSaidas(linhas: LinhaEntradaSaida[]) {
  let entradas = 0;
  let saidas = 0;
  const porMotivo = new Map<string, number>();
  for (const l of linhas) {
    if (l.sentido === "Entrada") entradas += l.quantidade;
    else {
      saidas += l.quantidade;
      const motivo = l.motivo || "Sem motivo informado";
      porMotivo.set(motivo, (porMotivo.get(motivo) ?? 0) + l.quantidade);
    }
  }
  return { entradas, saidas, saidasPorMotivo: [...porMotivo].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR")) };
}
