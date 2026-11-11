// Indicador percentual dos cartões de estoque (mesmo padrão dos da Frota): "parte de total" com uma casa decimal, e a faixa (verde, amarelo, vermelho) pelos limites de Veículos.
// Sem total, sem percentual e sem faixa (o cartão fica neutro).
import { faixaDoIndiceDeVeiculos, type Faixa } from "./faixas-desempenho.ts";

export type IndicadorDeEstoque = { pct: number | null; faixa: Faixa | null };

export const percentualDe = (parte: number, total: number): number | null =>
  total > 0 ? Math.round((Math.max(0, Math.min(parte, total)) / total) * 1000) / 10 : null;

export const textoPercentual = (pct: number | null): string => (pct === null ? "—" : `${pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);

// `comFaixa: false` dá só o percentual (barra neutra), para números que informam mas não são bons nem ruins.
export function indicadorDeEstoque(parte: number, total: number, comFaixa = true): IndicadorDeEstoque {
  const pct = percentualDe(parte, total);
  return { pct, faixa: comFaixa && pct !== null ? (faixaDoIndiceDeVeiculos(pct)?.faixa ?? null) : null };
}
