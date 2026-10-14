// Prazo para lançar uma despesa de viagem (dec 190): quantos dias depois da data da despesa o lançamento ainda é "no prazo".
// Fase 1: fica só no navegador, em modo demonstração; na Fase 2 vira configuração por empresa (`empresa_id`).
type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE = "gemape-demo-viagens-prazo";
export const PRAZO_PADRAO_DIAS = 3;
export const PRAZO_MAXIMO_DIAS = 365;

export const prazoValido = (n: number): boolean => Number.isInteger(n) && n >= 0 && n <= PRAZO_MAXIMO_DIAS;

export function lerPrazoDias(storage: StorageLike = localStorage): number {
  try {
    const n = Number(storage.getItem(CHAVE));
    return storage.getItem(CHAVE) !== null && prazoValido(n) ? n : PRAZO_PADRAO_DIAS;
  } catch {
    return PRAZO_PADRAO_DIAS;
  }
}

export function salvarPrazoDias(dias: number, storage: StorageLike = localStorage): void {
  if (!prazoValido(dias)) throw new Error(`Informe um número inteiro de dias entre 0 e ${PRAZO_MAXIMO_DIAS}.`);
  storage.setItem(CHAVE, String(dias));
}
