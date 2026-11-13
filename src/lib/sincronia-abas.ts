// Várias abas do sistema abertas: quando uma grava algo (uma saída de estoque, por exemplo), as outras recarregam os dados sozinhas.
// Só avisa "algo mudou"; cada aba lê de novo o que está na tela, então o saldo mostrado nunca fica velho.

const CANAL = "gemape-sincronia-abas";
const ATRASO_MS = 300; // várias gravações seguidas viram um aviso só

let canal: BroadcastChannel | null = null;
let espera: ReturnType<typeof setTimeout> | null = null;

export const temSincronia = (): boolean => typeof BroadcastChannel !== "undefined";

function obterCanal(): BroadcastChannel | null {
  if (!temSincronia()) return null;
  canal ??= new BroadcastChannel(CANAL);
  return canal;
}

/** Avisa as OUTRAS abas (esta já está atualizada). */
export function avisarOutrasAbas(): void {
  if (espera) return;
  espera = setTimeout(() => {
    espera = null;
    try { obterCanal()?.postMessage({ em: Date.now() }); } catch { /* aba em fechamento: sem aviso, sem problema */ }
  }, ATRASO_MS);
}

/** Chama `aoMudar` quando OUTRA aba avisar; devolve a função que para de ouvir. */
export function ouvirOutrasAbas(aoMudar: () => void): () => void {
  const c = obterCanal();
  if (!c) return () => undefined;
  const ouvinte = () => aoMudar();
  c.addEventListener("message", ouvinte);
  return () => c.removeEventListener("message", ouvinte);
}
