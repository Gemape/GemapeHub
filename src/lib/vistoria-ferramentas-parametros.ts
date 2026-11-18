// Parâmetros da vistoria periódica das ferramentas, definidos em Parâmetros > Ferramentas > Parâmetros Específicos:
// `periodicidade` diz de quanto em quanto tempo cada caixa é vistoriada e `prazoDias` quantos dias, depois da data prevista, a vistoria ainda pode ser feita.
// Só parametriza: as telas leem estes valores para marcar a vistoria como vencida ou com vencimento próximo.
// Fase 1: fica só no navegador, em modo demonstração; na Fase 2 vira configuração por empresa (`empresa_id`).
type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE = "gemape-demo-ferramentas-vistoria-parametros";

export const PERIODICIDADES_VISTORIA = ["Quinzenal", "Mensal", "Bimestral", "Trimestral", "Semestral", "Anual"] as const;
export type PeriodicidadeVistoria = (typeof PERIODICIDADES_VISTORIA)[number];
export const PRAZO_VISTORIA_MAXIMO_DIAS = 365;

/** Dias entre uma vistoria e a data prevista da seguinte. */
export const DIAS_DA_PERIODICIDADE: Record<PeriodicidadeVistoria, number> = { Quinzenal: 15, Mensal: 30, Bimestral: 60, Trimestral: 90, Semestral: 180, Anual: 365 };

export type ParametrosVistoria = { periodicidade: PeriodicidadeVistoria; prazoDias: number };
export const PARAMETROS_VISTORIA_PADRAO: ParametrosVistoria = { periodicidade: "Mensal", prazoDias: 5 };

export const prazoVistoriaValido = (n: number): boolean => Number.isInteger(n) && n >= 0 && n <= PRAZO_VISTORIA_MAXIMO_DIAS;
export const periodicidadeValida = (p: unknown): p is PeriodicidadeVistoria => PERIODICIDADES_VISTORIA.includes(p as PeriodicidadeVistoria);

// Só números inteiros em dígitos valem ("", "0x3" e "1e1" não valem); valor inválido, ausente ou armazenamento bloqueado voltam ao padrão.
export function lerParametrosVistoria(storage?: StorageLike): ParametrosVistoria {
  try {
    const bruto = (storage ?? localStorage).getItem(CHAVE);
    const obj: unknown = bruto === null ? null : JSON.parse(bruto);
    const o = obj && typeof obj === "object" ? (obj as Record<string, unknown>) : {};
    const t = typeof o["prazoDias"] === "number" ? String(o["prazoDias"]) : o["prazoDias"];
    const prazo = typeof t === "string" && /^\d{1,3}$/.test(t) && prazoVistoriaValido(Number(t)) ? Number(t) : PARAMETROS_VISTORIA_PADRAO.prazoDias;
    return { periodicidade: periodicidadeValida(o["periodicidade"]) ? o["periodicidade"] : PARAMETROS_VISTORIA_PADRAO.periodicidade, prazoDias: prazo };
  } catch {
    return { ...PARAMETROS_VISTORIA_PADRAO };
  }
}

export function salvarParametrosVistoria(p: ParametrosVistoria, storage?: StorageLike): void {
  if (!periodicidadeValida(p.periodicidade)) throw new Error("Escolha a periodicidade da vistoria.");
  if (!prazoVistoriaValido(p.prazoDias)) throw new Error(`Informe um número inteiro de dias entre 0 e ${PRAZO_VISTORIA_MAXIMO_DIAS}.`);
  try {
    (storage ?? localStorage).setItem(CHAVE, JSON.stringify({ periodicidade: p.periodicidade, prazoDias: p.prazoDias }));
  } catch {
    throw new Error("Não foi possível guardar os parâmetros da vistoria neste navegador.");
  }
}
