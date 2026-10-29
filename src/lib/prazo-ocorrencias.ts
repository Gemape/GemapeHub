// Prazos da tratativa das ocorrências de veículo (decisão 307), definidos em Parâmetros > Veículos > Parâmetros Específicos:
// `iniciar` é o nº de dias, depois do dia em que a ocorrência aconteceu, para começar a tratativa; `finalizar` é o nº de dias, depois do início da tratativa,
// para encerrá-la. A Frota usa os dois para marcar a ocorrência como vencida ou com vencimento próximo.
// Fase 1: fica só no navegador, em modo demonstração; na Fase 2 vira configuração por empresa (`empresa_id`).
type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE = "gemape-demo-ocorrencias-veiculo-prazos";
export const PRAZO_OCORRENCIA_MAXIMO_DIAS = 365;

export type PrazosOcorrencias = { iniciar: number; finalizar: number };
export const PRAZOS_OCORRENCIAS_PADRAO: PrazosOcorrencias = { iniciar: 2, finalizar: 5 };

export const prazoOcorrenciaValido = (n: number): boolean => Number.isInteger(n) && n >= 0 && n <= PRAZO_OCORRENCIA_MAXIMO_DIAS;

// Só números inteiros em dígitos valem ("", "0x3" e "1e1" não valem).
const diasDe = (bruto: unknown): number | null => {
  const t = typeof bruto === "number" ? String(bruto) : bruto;
  return typeof t === "string" && /^\d{1,3}$/.test(t) && prazoOcorrenciaValido(Number(t)) ? Number(t) : null;
};

// Valor inválido, ausente ou armazenamento bloqueado voltam ao padrão.
export function lerPrazosOcorrencias(storage?: StorageLike): PrazosOcorrencias {
  try {
    const bruto = (storage ?? localStorage).getItem(CHAVE);
    const obj: unknown = bruto === null ? null : JSON.parse(bruto);
    const o = obj && typeof obj === "object" ? (obj as Record<string, unknown>) : {};
    return { iniciar: diasDe(o["iniciar"]) ?? PRAZOS_OCORRENCIAS_PADRAO.iniciar, finalizar: diasDe(o["finalizar"]) ?? PRAZOS_OCORRENCIAS_PADRAO.finalizar };
  } catch {
    return { ...PRAZOS_OCORRENCIAS_PADRAO };
  }
}

// Data limite sugerida ao renovar: hoje mais os dias do prazo do passo (AAAA-MM-DD, em UTC para não depender do fuso do navegador).
export function dataLimiteSugerida(hoje: string, dias: number): string {
  const [a, m, d] = hoje.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

export function salvarPrazosOcorrencias(prazos: PrazosOcorrencias, storage?: StorageLike): void {
  if (!prazoOcorrenciaValido(prazos.iniciar) || !prazoOcorrenciaValido(prazos.finalizar)) {
    throw new Error(`Informe números inteiros de dias entre 0 e ${PRAZO_OCORRENCIA_MAXIMO_DIAS}.`);
  }
  try {
    (storage ?? localStorage).setItem(CHAVE, JSON.stringify({ iniciar: prazos.iniciar, finalizar: prazos.finalizar }));
  } catch {
    throw new Error("Não foi possível guardar os prazos neste navegador.");
  }
}
