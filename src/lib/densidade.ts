// Densidade visual das tabelas: compacta (conferência rápida, cerca de 25 linhas por tela) ou confortável (leitura, tablet).
// A escolha fica guardada neste navegador e vale para todas as tabelas; sem armazenamento, segue a confortável.
import { useSyncExternalStore } from "react";

export type Densidade = "compacta" | "confortavel";
export const CHAVE_DENSIDADE = "gemape-densidade-tabelas";

export const lerDensidade = (): Densidade => {
  try {
    return localStorage.getItem(CHAVE_DENSIDADE) === "compacta" ? "compacta" : "confortavel";
  } catch {
    return "confortavel";
  }
};

const ouvintes = new Set<() => void>();
let memoria: Densidade | null = null; // vale quando o armazenamento não grava

export function definirDensidade(d: Densidade): void {
  memoria = d;
  try {
    localStorage.setItem(CHAVE_DENSIDADE, d);
  } catch {
    /* só na memória */
  }
  ouvintes.forEach((f) => f());
}

const atual = (): Densidade => memoria ?? lerDensidade();
// Outra aba mudou a escolha: um só ouvinte para todas as tabelas, ligado quando a primeira aparece e desligado quando a última sai.
const aoMudar = (e: StorageEvent) => { if (e.key === CHAVE_DENSIDADE) { memoria = null; ouvintes.forEach((f) => f()); } };
const assinar = (f: () => void) => {
  if (ouvintes.size === 0) window.addEventListener("storage", aoMudar);
  ouvintes.add(f);
  return () => { ouvintes.delete(f); if (ouvintes.size === 0) window.removeEventListener("storage", aoMudar); };
};

export const useDensidade = (): Densidade => useSyncExternalStore(assinar, atual, () => "confortavel");
