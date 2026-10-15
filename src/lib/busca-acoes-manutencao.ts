import { combinaBusca } from "./parametros-base.ts";

// Busca de ações (pai) e subitens (filhos) na janela Restaurar configurações iniciais (decisão 197): sem diferenciar
// maiúsculas e acento, aceita parte da palavra e palavras em qualquer ordem. O pai que combina mostra todos os filhos;
// senão, só os filhos que combinam. Sem termo, mostra tudo.
export function filtrarPaisEFilhos<P extends { nome: string; filhos: { nome: string }[] }>(
  pais: P[],
  termo: string,
): { pai: P; filhos: P["filhos"] }[] {
  if (!termo.trim()) return pais.map((pai) => ({ pai, filhos: pai.filhos }));
  const achados: { pai: P; filhos: P["filhos"] }[] = [];
  for (const pai of pais) {
    if (combinaBusca(termo, pai.nome)) {
      achados.push({ pai, filhos: pai.filhos });
      continue;
    }
    const filhos = pai.filhos.filter((f) => combinaBusca(termo, pai.nome, f.nome));
    if (filhos.length > 0) achados.push({ pai, filhos });
  }
  return achados;
}
