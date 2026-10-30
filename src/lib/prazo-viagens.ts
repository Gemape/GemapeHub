// Indicadores de prazo de Viagens (decs 190, 193 e 199), definidos em Parâmetros > Veículos > Parâmetros Específicos:
// `mecanico` é o nº de dias após a data da despesa para o técnico mecânico (Oficina) lançar, e é o que mede o índice de
// lançamento no prazo; `pcm` é o nº de dias para o PCM fechar o relatório de despesas, após o lançamento, e mede o índice de
// fechamento do relatório no prazo. Cada um tem a caixa "aplicável": desmarcada, o indicador não é medido.
// Fase 1: fica só no navegador, em modo demonstração; na Fase 2 vira configuração por empresa (`empresa_id`).
type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE = "gemape-demo-viagens-prazos";
// Chave da decisão 190 (um prazo só): continua sendo lida como valor inicial dos dois prazos.
const CHAVE_ANTIGA = "gemape-demo-viagens-prazo";
export const PRAZO_PADRAO_DIAS = 3;
export const PRAZO_MAXIMO_DIAS = 365;

export type PrazosViagens = { mecanico: number; pcm: number; mecanicoAplica?: boolean; pcmAplica?: boolean };
export const PRAZOS_PADRAO: Required<PrazosViagens> = { mecanico: PRAZO_PADRAO_DIAS, pcm: PRAZO_PADRAO_DIAS, mecanicoAplica: true, pcmAplica: true };

export const prazoValido = (n: number): boolean => Number.isInteger(n) && n >= 0 && n <= PRAZO_MAXIMO_DIAS;

// Só números inteiros em dígitos valem ("", "0x3" e "1e1" não valem).
const diasDe = (bruto: unknown): number | null => {
  const t = typeof bruto === "number" ? String(bruto) : bruto;
  return typeof t === "string" && /^\d{1,3}$/.test(t) && prazoValido(Number(t)) ? Number(t) : null;
};

// Valor inválido, ausente ou armazenamento bloqueado voltam ao padrão (ou ao prazo único antigo, quando houver).
export function lerPrazos(storage?: StorageLike): Required<PrazosViagens> {
  try {
    const s = storage ?? localStorage;
    const antigo = diasDe(s.getItem(CHAVE_ANTIGA)) ?? PRAZO_PADRAO_DIAS;
    const bruto = s.getItem(CHAVE);
    const obj: unknown = bruto === null ? null : JSON.parse(bruto);
    const o = obj && typeof obj === "object" ? (obj as Record<string, unknown>) : {};
    return { mecanico: diasDe(o["mecanico"]) ?? antigo, pcm: diasDe(o["pcm"]) ?? antigo, mecanicoAplica: o["mecanicoAplica"] !== false, pcmAplica: o["pcmAplica"] !== false };
  } catch {
    return { ...PRAZOS_PADRAO };
  }
}

export function salvarPrazos(prazos: PrazosViagens, storage?: StorageLike): void {
  if (!prazoValido(prazos.mecanico) || !prazoValido(prazos.pcm)) throw new Error(`Informe números inteiros de dias entre 0 e ${PRAZO_MAXIMO_DIAS}.`);
  try {
    (storage ?? localStorage).setItem(CHAVE, JSON.stringify({ mecanico: prazos.mecanico, pcm: prazos.pcm, mecanicoAplica: prazos.mecanicoAplica !== false, pcmAplica: prazos.pcmAplica !== false }));
  } catch {
    throw new Error("Não foi possível guardar os prazos neste navegador.");
  }
}
