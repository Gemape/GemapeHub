// Escalonamento das vistorias das caixas de ferramentas: cada caixa tem o seu mês-base e, a partir dele, as vistorias se repetem de acordo com a periodicidade
// definida em Parâmetros > Ferramentas > Parâmetros Específicos (a mesma para todas as caixas). Alterar o mês-base não mexe na periodicidade.
// Só o mês importa (1 = janeiro … 12 = dezembro), sem ano: o calendário continua pelos anos seguintes. Caixa sem mês-base fica fora do calendário.
// Quinzenal não cabe numa projeção por mês: a caixa cai em todos os meses.
// Fase 1: fica só no navegador, em modo demonstração; na Fase 2 vira coluna/tabela por caixa (`caixa_id` + mês-base).
import type { PeriodicidadeVistoria } from "./vistoria-ferramentas-parametros.ts";

type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE = "gemape-demo-ferramentas-vistoria-mes-base";

export const MESES_DO_ANO = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"] as const;
const ABREVIADOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"] as const;

/** De quantos em quantos meses a vistoria se repete. */
export const MESES_DA_PERIODICIDADE: Record<PeriodicidadeVistoria, number> = { Quinzenal: 1, Mensal: 1, Bimestral: 2, Trimestral: 3, Semestral: 6, Anual: 12 };

export type MesBase = number; // 1 a 12
export type MesPrevisto = { ano: number; mes: number };

export const mesBaseValido = (m: unknown): m is MesBase => typeof m === "number" && Number.isInteger(m) && m >= 1 && m <= 12;

/** caixa_id → mês-base. Valor ruim ou armazenamento bloqueado são ignorados. */
export function lerMesesBase(storage?: StorageLike): Record<string, MesBase> {
  try {
    const bruto = (storage ?? localStorage).getItem(CHAVE);
    const obj: unknown = bruto === null ? null : JSON.parse(bruto);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
    return Object.fromEntries(Object.entries(obj as Record<string, unknown>).filter((e): e is [string, MesBase] => mesBaseValido(e[1])));
  } catch {
    return {};
  }
}

/** Define (ou, com null, retira) o mês-base de uma caixa e devolve o mapa novo. */
export function salvarMesBase(caixaId: string, mes: MesBase | null, storage?: StorageLike): Record<string, MesBase> {
  if (mes !== null && !mesBaseValido(mes)) throw new Error("Escolha um mês de janeiro a dezembro.");
  const atual = lerMesesBase(storage);
  if (mes === null) delete atual[caixaId];
  else atual[caixaId] = mes;
  try {
    (storage ?? localStorage).setItem(CHAVE, JSON.stringify(atual));
  } catch {
    throw new Error("Não foi possível guardar o mês-base neste navegador.");
  }
  return atual;
}

const indice = (ano: number, mes: number) => ano * 12 + (mes - 1);
const dePorIndice = (n: number): MesPrevisto => ({ ano: Math.floor(n / 12), mes: (n % 12) + 1 });

/** Os meses previstos de vistoria, do mês de `hoje` (AAAA-MM-DD) em diante, `quantidade` meses de calendário à frente (hoje inclusive). */
export function mesesPrevistos(mesBase: MesBase, periodicidade: PeriodicidadeVistoria, hoje: string, quantidade = 12): MesPrevisto[] {
  const passo = MESES_DA_PERIODICIDADE[periodicidade];
  const inicio = indice(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)));
  const resultado: MesPrevisto[] = [];
  for (let n = inicio; n < inicio + quantidade; n++) {
    if ((((n - (mesBase - 1)) % passo) + passo) % passo === 0) resultado.push(dePorIndice(n));
  }
  return resultado;
}

export const rotuloMes = ({ ano, mes }: MesPrevisto): string => `${ABREVIADOS[mes - 1]}/${ano}`;

export type CargaDoMes = MesPrevisto & { caixas: number };

/** Quantas vistorias estão previstas em cada um dos `quantidade` meses seguintes (uma por caixa; duas na quinzenal). Caixa sem mês-base não entra. */
export function cargaPorMes(mesesBase: (MesBase | undefined)[], periodicidade: PeriodicidadeVistoria, hoje: string, quantidade = 12): CargaDoMes[] {
  const inicio = indice(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)));
  const carga: CargaDoMes[] = Array.from({ length: quantidade }, (_, i) => ({ ...dePorIndice(inicio + i), caixas: 0 }));
  const porMes = periodicidade === "Quinzenal" ? 2 : 1; // quinzenal: duas vistorias por mês
  for (const base of mesesBase) {
    if (base === undefined) continue;
    for (const m of mesesPrevistos(base, periodicidade, hoje, quantidade)) carga[indice(m.ano, m.mes) - inicio]!.caixas += porMes;
  }
  return carga;
}

/** Meses com concentração excessiva: pelo menos 2 caixas e mais de uma vez e meia a média dos meses que têm vistoria. */
export function mesesSobrecarregados(carga: CargaDoMes[]): CargaDoMes[] {
  const comVistoria = carga.filter((c) => c.caixas > 0);
  if (comVistoria.length === 0) return [];
  const media = comVistoria.reduce((s, c) => s + c.caixas, 0) / comVistoria.length;
  return carga.filter((c) => c.caixas >= 2 && c.caixas > media * 1.5);
}

const CHAVE_RESPONSAVEL = "gemape-demo-ferramentas-vistoria-responsavel";

/** caixa_id → empregado_id do responsável por fazer a vistoria dela. Valor ruim ou armazenamento bloqueado são ignorados. */
export function lerResponsaveisVistoria(storage?: StorageLike): Record<string, string> {
  try {
    const bruto = (storage ?? localStorage).getItem(CHAVE_RESPONSAVEL);
    const obj: unknown = bruto === null ? null : JSON.parse(bruto);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
    return Object.fromEntries(Object.entries(obj as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === "string" && e[1] !== ""));
  } catch {
    return {};
  }
}

/** Define (ou, com null, retira) o responsável pela vistoria de uma caixa e devolve o mapa novo. */
export function salvarResponsavelVistoria(caixaId: string, empregadoId: string | null, storage?: StorageLike): Record<string, string> {
  const atual = lerResponsaveisVistoria(storage);
  if (empregadoId === null) delete atual[caixaId];
  else atual[caixaId] = empregadoId;
  try {
    (storage ?? localStorage).setItem(CHAVE_RESPONSAVEL, JSON.stringify(atual));
  } catch {
    throw new Error("Não foi possível guardar o responsável neste navegador.");
  }
  return atual;
}
