// Saldo e estoque mínimo de cada EPI por tamanho, no mesmo critério para o Estoque e para a Sugestão de Compras (decisões 329 e 330), para as duas telas mostrarem os mesmos números.
// A chave é o id do tamanho ou "sem-tamanho".
import {
  controlaTamanho,
  saldosPorTamanho,
  SEM_TAMANHO,
  usaMinimoPorTamanho,
} from "./estoque-tamanho.ts";

type Parametros = Parameters<typeof controlaTamanho>[0];
type Produto = Parameters<typeof controlaTamanho>[2];
type ItemDeEstoque = Produto & {
  estoque_atual?: number | null;
  estoque_minimo?: number | null;
  minimos_tamanho?: Record<string, number> | null;
};

export function saldosDeEpi(p: Parametros, item: ItemDeEstoque): Record<string, number> {
  return controlaTamanho(p, "epi", item)
    ? { ...saldosPorTamanho(p, "epi", item) }
    : { [SEM_TAMANHO]: Number(item.estoque_atual) || 0 };
}

export function minimosDeEpi(p: Parametros, item: ItemDeEstoque): Record<string, number> {
  if (controlaTamanho(p, "epi", item) && usaMinimoPorTamanho(p, "epi", item))
    return { ...(item.minimos_tamanho ?? {}) };
  return { [SEM_TAMANHO]: Number(item.estoque_minimo) || 0 };
}

export const totalDeEpi = (p: Parametros, item: ItemDeEstoque): number =>
  Object.values(saldosDeEpi(p, item)).reduce((t, v) => t + Math.max(0, Number(v) || 0), 0);

// Estoque mínimo do EPI como um número só (soma dos mínimos por tamanho, quando há), o mesmo que a aba Estoque mostra por tamanho.
export const minimoTotalDeEpi = (p: Parametros, item: ItemDeEstoque): number =>
  Object.values(minimosDeEpi(p, item)).reduce((t, v) => t + Math.max(0, Number(v) || 0), 0);
