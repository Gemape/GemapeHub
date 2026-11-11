// Sugestão de Compras de Ferramentas: mesma lógica e mesmos status da de EPI e Uniformes (statusDoItemEpi e quantidadeParaComprar), com o estoque mínimo como método.
// Ferramenta não é consumida: o que sai do estoque de verdade é a baixa definitiva (perda, quebra, desgaste...), então a média mensal vem só das baixas dos últimos 12 meses.
// Entrega ao empregado e devolução só mudam onde a ferramenta está (o saldo não se mexe) e ficam de fora.
import { ehBaixa } from "./historico-movimentacoes.ts";
import { PARAMETROS_COMPRA_PADRAO, type ParametrosCompraEpi } from "./epi-parametros.ts";
import { quantidadeParaComprar, statusDoItemEpi, type LinhaSugestaoEpi } from "./sugestao-epi.ts";

// ponytail: parâmetros fixos (método estoque mínimo, reposição de 30 dias); Parâmetros > Ferramentas ainda não tem a tela de compra, como EPI e Uniformes têm.
export const PARAMETROS_COMPRA_FERRAMENTA: ParametrosCompraEpi = { ...PARAMETROS_COMPRA_PADRAO, metodo: "minimo" };

type FerramentaDaSugestao = { id: string; codigo_sku: string; nome: string; empresa_id: string | null; estoque_minimo?: number | null; status?: string | null; subcategoria_id?: string | null };
type MovimentoDaSugestao = { item_id: string | null; tipo_movimentacao: string; motivo_baixa: string | null; quantidade: number; data_movimentacao: string };

export function linhasDaSugestaoFerramentas(e: {
  ferramentas: FerramentaDaSugestao[];
  saldoDe: (ferramentaId: string) => number;
  movimentos: MovimentoDaSugestao[];
  hoje: string; // AAAA-MM-DD
  parametros?: ParametrosCompraEpi;
}): LinhaSugestaoEpi[] {
  const parametros = e.parametros ?? PARAMETROS_COMPRA_FERRAMENTA;
  const corte = `${Number(e.hoje.slice(0, 4)) - 1}${e.hoje.slice(4)}`;
  const baixadas = new Map<string, number>();
  for (const m of e.movimentos) {
    if (!m.item_id || !ehBaixa(m) || m.data_movimentacao < corte || m.data_movimentacao > e.hoje) continue;
    baixadas.set(m.item_id, (baixadas.get(m.item_id) ?? 0) + (Number(m.quantidade) || 0));
  }
  return e.ferramentas
    .filter((f) => f.status !== "Inativo")
    .map((f) => {
      const total = Math.max(0, e.saldoDe(f.id));
      const minimo = Math.max(0, Number(f.estoque_minimo) || 0);
      const mediaMensal = (baixadas.get(f.id) ?? 0) / 12;
      const cobertura = mediaMensal > 0 ? Math.round(total / (mediaMensal / 30)) : null;
      const status = statusDoItemEpi({ total, minimo, cobertura }, parametros);
      return {
        itemId: f.id,
        codigo: f.codigo_sku,
        descricao: f.nome,
        empresaId: f.empresa_id,
        subcategoriaId: f.subcategoria_id ?? null,
        ca: null,
        novos: total,
        usados: 0,
        total,
        minimo,
        mediaMensal,
        cobertura,
        status,
        quantidadeSugerida: quantidadeParaComprar({ total, minimo, mediaMensal, status }, parametros),
      };
    });
}
