// Histórico de movimentações (decisão 16, etapa 4): compra é entrada,
// entrega e baixa são saídas, e cada linha mostra o código do item.
import { formatarData, TIPO_MOVIMENTACAO_LABEL } from "./gemape.ts";

type MovimentacaoHistorico = {
  item_id: string | null;
  veiculo_id: string | null;
  empregado_id: string | null;
  tipo_movimentacao: string;
  motivo_baixa: string | null;
  quantidade: number;
  onus_baixa: string | null;
  tipo_vistoria: string | null;
  sinalizar_ocorrencia: boolean;
  tipo_ocorrencia: string | null;
  conducao_ocorrencia: string | null;
  data_movimentacao: string;
  observacao: string | null;
  tamanho_id?: string | null;
};

type ItemHistorico = { id: string; codigo_sku: string | null; nome: string };
type VeiculoHistorico = { id: string; placa: string };

// "Fornecimento ao Empregado" é a entrega registrada com motivo; os demais motivos são baixa.
const MOTIVO_ENTREGA = "Fornecimento ao Empregado";

export const ehBaixa = (m: { tipo_movimentacao: string; motivo_baixa: string | null }) =>
  m.tipo_movimentacao === "Saida" && !!m.motivo_baixa && m.motivo_baixa !== MOTIVO_ENTREGA;

export function naturezaMovimentacao(m: MovimentacaoHistorico): string {
  if (m.tipo_movimentacao === "Entrada") return "Entrada (compra)";
  if (m.tipo_movimentacao === "Saida") return ehBaixa(m) ? "Saída (baixa)" : "Saída (entrega)";
  return TIPO_MOVIMENTACAO_LABEL[m.tipo_movimentacao] ?? m.tipo_movimentacao;
}

export function alvoHistorico(
  m: MovimentacaoHistorico,
  itens: ItemHistorico[],
  veiculos: VeiculoHistorico[],
): { codigo: string; descricao: string } {
  if (m.item_id) {
    const item = itens.find((i) => i.id === m.item_id);
    return { codigo: item?.codigo_sku || "—", descricao: item?.nome ?? "—" };
  }
  return { codigo: "—", descricao: veiculos.find((v) => v.id === m.veiculo_id)?.placa || "—" };
}

export function linhaCsvHistorico(
  m: MovimentacaoHistorico,
  contexto: {
    itens: ItemHistorico[];
    veiculos: VeiculoHistorico[];
    nomeEmpregado: (id: string | null) => string;
    // Nome atual do tamanho em Gerais (decisão 23); sem tamanho, a coluna fica vazia.
    nomeTamanho?: (id: string | null | undefined) => string;
  },
): Record<string, unknown> {
  const alvo = alvoHistorico(m, contexto.itens, contexto.veiculos);
  return {
    Data: formatarData(m.data_movimentacao),
    Tipo: naturezaMovimentacao(m),
    Codigo: alvo.codigo,
    Item: alvo.descricao,
    Tamanho: m.tamanho_id ? (contexto.nomeTamanho?.(m.tamanho_id) ?? "") : "",
    Empregado: contexto.nomeEmpregado(m.empregado_id),
    Quantidade: m.quantidade,
    MotivoBaixa: m.motivo_baixa,
    Onus: m.onus_baixa,
    Vistoria: m.tipo_vistoria,
    Ocorrencia: m.sinalizar_ocorrencia ? "Sim" : "Não",
    TipoOcorrencia: m.tipo_ocorrencia,
    Conducao: m.conducao_ocorrencia,
    Observacao: m.observacao,
  };
}
