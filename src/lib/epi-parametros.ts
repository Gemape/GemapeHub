// Parâmetros Específicos do EPI (decisão 328), em Parâmetros > EPI > Parâmetros Específicos: os motivos de baixa definitiva, os motivos de devolução ao estoque e os parâmetros da sugestão
// de compra (estoque mínimo ou tempo de cobertura em dias, prazo de reposição do fornecedor e os cortes da tabela de criticidade).
// Fase 1: fica só no navegador, em modo demonstração; na Fase 2 vira configuração por empresa.
import { MOTIVOS_BAIXA } from "./gemape.ts";

type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE_COMPRA = "gemape-demo-epi-parametros-compra";
const CHAVE_BAIXA = "gemape-demo-epi-motivos-baixa";
const CHAVE_DEVOLUCAO = "gemape-demo-epi-motivos-devolucao";

export const MOTIVOS_BAIXA_PADRAO: readonly string[] = MOTIVOS_BAIXA;
export const MOTIVOS_DEVOLUCAO_PADRAO: readonly string[] = [
  "Fim do uso",
  "Troca de tamanho",
  "Troca por desgaste",
  "Desligamento do empregado",
  "Mudança de função",
];
export const MAX_MOTIVOS = 30;

const limpar = (t: string) => t.trim().replace(/\s+/g, " ").slice(0, 60);

function lerLista(chave: string, padrao: readonly string[], storage?: StorageLike): string[] {
  try {
    const bruto = (storage ?? localStorage).getItem(chave);
    const lido: unknown = bruto === null ? null : JSON.parse(bruto);
    if (!Array.isArray(lido)) return [...padrao];
    const lista = [
      ...new Set(
        lido
          .filter((m): m is string => typeof m === "string")
          .map(limpar)
          .filter(Boolean),
      ),
    ];
    // Lista guardada vazia ou sem texto aproveitável volta à padrão: sem motivo a devolução não poderia ser registrada.
    return lista.length > 0 ? lista : [...padrao];
  } catch {
    return [...padrao];
  }
}

function salvarLista(chave: string, motivos: string[], storage?: StorageLike): string[] {
  const lista = [...new Set(motivos.map(limpar).filter(Boolean))];
  if (lista.length === 0) throw new Error("Cadastre pelo menos um motivo.");
  if (lista.length > MAX_MOTIVOS) throw new Error(`No máximo ${MAX_MOTIVOS} motivos.`);
  try {
    (storage ?? localStorage).setItem(chave, JSON.stringify(lista));
  } catch {
    throw new Error("Não foi possível guardar os motivos neste navegador.");
  }
  return lista;
}

export const lerMotivosBaixaEpi = (storage?: StorageLike) =>
  lerLista(CHAVE_BAIXA, MOTIVOS_BAIXA_PADRAO, storage);
export const salvarMotivosBaixaEpi = (motivos: string[], storage?: StorageLike) =>
  salvarLista(CHAVE_BAIXA, motivos, storage);
export const lerMotivosDevolucaoEpi = (storage?: StorageLike) =>
  lerLista(CHAVE_DEVOLUCAO, MOTIVOS_DEVOLUCAO_PADRAO, storage);
export const salvarMotivosDevolucaoEpi = (motivos: string[], storage?: StorageLike) =>
  salvarLista(CHAVE_DEVOLUCAO, motivos, storage);

// ---------- Sugestão de compra ----------

export type MetodoReposicao = "minimo" | "cobertura";
export type ParametrosCompraEpi = {
  metodo: MetodoReposicao; // trabalhar com o estoque mínimo ou com o tempo de cobertura em dias
  diasCobertura: number; // meta de cobertura, quando o método é o tempo de cobertura
  prazoReposicao: number; // TR: prazo de reposição do fornecedor, em dias
  diasSeguranca: number; // Comprar já vai de TR até TR + segurança
  diasPlanejamento: number; // Planejar vai até TR + planejamento
  limiteExcesso: number; // acima disso a cobertura é excesso
};
export const PARAMETROS_COMPRA_PADRAO: ParametrosCompraEpi = {
  metodo: "cobertura",
  diasCobertura: 120,
  prazoReposicao: 30,
  diasSeguranca: 15,
  diasPlanejamento: 30,
  limiteExcesso: 90,
};
export const MAX_DIAS = 730;

export const diasValidos = (n: number): boolean => Number.isInteger(n) && n >= 0 && n <= MAX_DIAS;

const dias = (v: unknown, padrao: number): number =>
  typeof v === "number" && diasValidos(v) ? v : padrao;

export function lerParametrosCompraEpi(storage?: StorageLike): ParametrosCompraEpi {
  try {
    const bruto = (storage ?? localStorage).getItem(CHAVE_COMPRA);
    const obj: unknown = bruto === null ? null : JSON.parse(bruto);
    const o = obj && typeof obj === "object" ? (obj as Record<string, unknown>) : {};
    const p = PARAMETROS_COMPRA_PADRAO;
    return {
      metodo: o["metodo"] === "minimo" || o["metodo"] === "cobertura" ? o["metodo"] : p.metodo,
      diasCobertura: dias(o["diasCobertura"], p.diasCobertura),
      prazoReposicao: dias(o["prazoReposicao"], p.prazoReposicao),
      diasSeguranca: dias(o["diasSeguranca"], p.diasSeguranca),
      diasPlanejamento: dias(o["diasPlanejamento"], p.diasPlanejamento),
      limiteExcesso: dias(o["limiteExcesso"], p.limiteExcesso),
    };
  } catch {
    return { ...PARAMETROS_COMPRA_PADRAO };
  }
}

export function salvarParametrosCompraEpi(p: ParametrosCompraEpi, storage?: StorageLike): void {
  if (p.metodo !== "minimo" && p.metodo !== "cobertura")
    throw new Error("Escolha o método: estoque mínimo ou tempo de cobertura.");
  if (
    ![
      p.diasCobertura,
      p.prazoReposicao,
      p.diasSeguranca,
      p.diasPlanejamento,
      p.limiteExcesso,
    ].every(diasValidos)
  )
    throw new Error(`Informe números inteiros de dias entre 0 e ${MAX_DIAS}.`);
  if (p.metodo === "cobertura" && p.diasCobertura < 1)
    throw new Error("A meta de cobertura precisa de pelo menos 1 dia.");
  if (p.diasPlanejamento < p.diasSeguranca)
    throw new Error("O planejamento não pode ser menor que a segurança.");
  try {
    (storage ?? localStorage).setItem(CHAVE_COMPRA, JSON.stringify(p));
  } catch {
    throw new Error("Não foi possível guardar os parâmetros neste navegador.");
  }
}

// ---------- Tabela de criticidade (tudo em dias) ----------
// TC é o tempo de cobertura do estoque e TR o prazo de reposição do fornecedor. O ponto de pedido é TR + segurança.
export type StatusCriticidade = "ruptura" | "comprar_ja" | "planejar" | "estavel" | "excesso";
export const STATUS_CRITICIDADE: Record<
  StatusCriticidade,
  { rotulo: string; criticidade: string; significado: string }
> = {
  ruptura: {
    rotulo: "Ruptura",
    criticidade: "Crítica",
    significado: "O estoque vai zerar antes do produto chegar.",
  },
  comprar_ja: {
    rotulo: "Comprar já",
    criticidade: "Alta",
    significado: "Estoque de segurança acionado: o pedido precisa ser feito hoje.",
  },
  planejar: {
    rotulo: "Planejar",
    criticidade: "Média",
    significado: "Janela de compra: o item entra na próxima rodada de cotações.",
  },
  estavel: {
    rotulo: "Estável",
    criticidade: "Baixa",
    significado: "Cobertura confortável: nenhuma ação necessária.",
  },
  excesso: {
    rotulo: "Excesso",
    criticidade: "Nenhuma",
    significado: "Estoque acima do necessário: risco de capital parado.",
  },
};

export function statusDeCriticidade(tc: number, p: ParametrosCompraEpi): StatusCriticidade {
  const tr = p.prazoReposicao;
  if (tc < tr) return "ruptura";
  if (tc <= tr + p.diasSeguranca) return "comprar_ja";
  if (tc <= tr + p.diasPlanejamento) return "planejar";
  if (tc <= Math.max(p.limiteExcesso, tr + p.diasPlanejamento)) return "estavel";
  return "excesso";
}
