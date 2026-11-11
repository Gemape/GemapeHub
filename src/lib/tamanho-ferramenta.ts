// Tamanho da ferramenta (decisão 133) para as listas de escolha: " · Tam. 8 pol", ou vazio quando a ferramenta não tem tamanho.
export const sufixoTamanhoFerramenta = (item: { tamanho?: string | null } | null | undefined): string => {
  const t = (item?.tamanho ?? "").trim();
  return t ? ` · Tam. ${t}` : "";
};
