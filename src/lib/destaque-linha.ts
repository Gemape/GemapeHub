// Destaque temporário da linha que a pessoa acabou de criar ou editar: ao voltar para a lista, ela pisca por 2 segundos e rola até a tela.
import { useEffect, useSyncExternalStore } from "react";

const DURACAO_MS = 2200;
let chaveAtual: string | null = null;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

export function marcarDestaque(chave: string): void {
  if (!chave) return; // registro sem chave (placa em branco) não tem como ser achado: não destaca linha nenhuma
  chaveAtual = chave;
  avisar();
  setTimeout(() => { if (chaveAtual === chave) { chaveAtual = null; avisar(); } }, DURACAO_MS);
}

/** Chave da linha em destaque (ou null). A linha usa `data-destaque={chave}` e a classe `linha-destacada` quando coincide. */
export function useDestaque(): string | null {
  const chave = useSyncExternalStore((f) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; }, () => chaveAtual, () => null);
  useEffect(() => {
    if (!chave) return;
    // A lista é lida de novo depois de salvar: procura a linha algumas vezes até ela aparecer.
    const procurar = () => Array.from(document.querySelectorAll("[data-destaque]")).find((el) => el.getAttribute("data-destaque") === chave);
    const ts = [60, 300, 700].map((ms) => window.setTimeout(() => procurar()?.scrollIntoView({ block: "center", behavior: "smooth" }), ms));
    return () => ts.forEach(window.clearTimeout);
  }, [chave]);
  return chave;
}
