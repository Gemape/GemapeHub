import { useSyncExternalStore } from "react";

// Título grande da página que uma tela interna troca (decisão 326): o Check list de veículos mostra "Check list periódico" ou "Check list avulso" no lugar de "Check list"
// quando abre uma das listas. Sem troca (null), a página usa o nome da aba.
let atual: string | null = null;
const ouvintes = new Set<() => void>();

export function definirTituloDaPagina(titulo: string | null): void {
  if (atual === titulo) return;
  atual = titulo;
  ouvintes.forEach((f) => f());
}

export function useTituloDaPagina(): string | null {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => {
        ouvintes.delete(f);
      };
    },
    () => atual,
    () => null,
  );
}
