// Prazo para lançar uma despesa de viagem (dec 190): quantos dias depois da data da despesa o lançamento ainda é "no prazo".
// Fase 1: fica só no navegador, em modo demonstração; na Fase 2 vira configuração por empresa (`empresa_id`).
type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE = "gemape-demo-viagens-prazo";
export const PRAZO_PADRAO_DIAS = 3;
export const PRAZO_MAXIMO_DIAS = 365;

export const prazoValido = (n: number): boolean => Number.isInteger(n) && n >= 0 && n <= PRAZO_MAXIMO_DIAS;

// Só números inteiros em dígitos valem ("", "0x3" e "1e1" voltam ao padrão); armazenamento bloqueado também cai no padrão.
export function lerPrazoDias(storage?: StorageLike): number {
  try {
    const bruto = (storage ?? localStorage).getItem(CHAVE);
    return bruto !== null && /^\d{1,3}$/.test(bruto) && prazoValido(Number(bruto)) ? Number(bruto) : PRAZO_PADRAO_DIAS;
  } catch {
    return PRAZO_PADRAO_DIAS;
  }
}

export function salvarPrazoDias(dias: number, storage?: StorageLike): void {
  if (!prazoValido(dias)) throw new Error(`Informe um número inteiro de dias entre 0 e ${PRAZO_MAXIMO_DIAS}.`);
  try {
    (storage ?? localStorage).setItem(CHAVE, String(dias));
  } catch {
    throw new Error("Não foi possível guardar o prazo neste navegador.");
  }
}
