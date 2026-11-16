// Vida útil / validade em proporção: quanto do prazo ainda resta (1 = cheio, 0 = acabou), para a barra colorida ao lado da data.
// Verde da metade para cima, amarela até 20% e vermelha no fim.

export type FaixaVida = "verde" | "amarela" | "vermelha";

const DIA = 24 * 3600 * 1000;

// shortcut: o cadastro só guarda o fim da validade do CA, não o início; a barra usa o prazo usual de um CA (5 anos).
// Se o cadastro passar a guardar a data de emissão do CA, troque por parteRestanteEntreDatas(emissao, validade).
export const DIAS_VALIDADE_CA = 5 * 365;
const ms = (data: string) => Date.parse(data.length === 10 ? `${data}T12:00:00Z` : data);

/** Parte que ainda resta do prazo, entre 0 e 1. `total` é a duração do prazo inteiro (mesma unidade de `fim` e `agora`). Sem prazo válido, null. */
export function parteRestante(fim: number, agora: number, total: number): number | null {
  if (!Number.isFinite(fim) || !Number.isFinite(agora) || !(total > 0)) return null;
  return Math.min(1, Math.max(0, (fim - agora) / total));
}

/** Parte restante de um prazo em datas (AAAA-MM-DD ou ISO), com a duração total em dias. */
export function parteRestanteDaData(fim: string | null | undefined, totalDias: number, agora: Date = new Date()): number | null {
  if (!fim) return null;
  return parteRestante(ms(fim), agora.getTime(), totalDias * DIA);
}

/** Parte restante entre o começo e o fim do prazo (ex.: da última revisão até a próxima). */
export function parteRestanteEntreDatas(inicio: string | null | undefined, fim: string | null | undefined, agora: Date = new Date()): number | null {
  if (!inicio || !fim) return null;
  return parteRestante(ms(fim), agora.getTime(), ms(fim) - ms(inicio));
}

/** O que vencer primeiro manda: a menor parte restante entre as informadas (data, km, horímetro...). */
export function menorParte(...partes: (number | null)[]): number | null {
  const validas = partes.filter((p): p is number => p !== null);
  return validas.length ? Math.min(...validas) : null;
}

export function faixaDaVida(parte: number): FaixaVida {
  if (parte >= 0.5) return "verde";
  if (parte >= 0.2) return "amarela";
  return "vermelha";
}
