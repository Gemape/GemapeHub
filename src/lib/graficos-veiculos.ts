// Contas dos gráficos comparativos de Veículos (decisão 325): só agrupamento de dados; o desenho fica nos componentes.

// Os `n` meses mais recentes, do mais antigo ao do mês de `hoje` (AAAA-MM, em UTC para não depender do fuso).
export function mesesRecentes(hoje: string, n = 6): string[] {
  const [a, m] = hoje.split("-").map(Number) as [number, number];
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(a, m - 1 - (n - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

const ABREVIACOES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
] as const;
// "2026-10" -> "out/26"
export const rotuloMesCurto = (mes: string): string =>
  `${ABREVIACOES[Number(mes.slice(5, 7)) - 1] ?? mes}/${mes.slice(2, 4)}`;

// Uma linha por mês recente com a quantidade de datas (AAAA-MM-DD, com ou sem hora) de cada série, para gráficos de colunas lado a lado.
export function contagemPorMes(
  series: Record<string, string[]>,
  hoje: string,
  n = 6,
): ({ mes: string; rotulo: string } & Record<string, number | string>)[] {
  return mesesRecentes(hoje, n).map((mes) => {
    const linha: Record<string, number | string> = { mes, rotulo: rotuloMesCurto(mes) };
    for (const [nome, datas] of Object.entries(series))
      linha[nome] = datas.filter((d) => d.slice(0, 7) === mes).length;
    return linha as { mes: string; rotulo: string } & Record<string, number | string>;
  });
}

// Placa (ou o primeiro trecho) de um rótulo de veículo "TST1A23 · Utilitário · Fiat…", para caber no eixo do gráfico.
export const placaDoRotulo = (rotulo: string): string => rotulo.split(" · ")[0]?.trim() || rotulo;
