// Fornecedor da compra vindo de Cadastros > Fornecedores (módulos não têm lista própria).
// A compra guarda o nome do fornecedor (busca, relatórios e CSV seguem iguais) e, no modo
// demonstração, também o id dele. Só entram os fornecedores da categoria do módulo.

export type FornecedorDaCompra = {
  id: string;
  codigo: string;
  razao_social: string;
  nome_fantasia: string;
  categorias: string[];
};

export const nomeDoFornecedor = (f: Pick<FornecedorDaCompra, "nome_fantasia" | "razao_social">): string =>
  (f.nome_fantasia?.trim() || f.razao_social?.trim() || "").trim();

export const rotuloDoFornecedor = (f: FornecedorDaCompra): string => `${f.codigo} · ${nomeDoFornecedor(f)}`;

export function fornecedoresDaCategoria(lista: FornecedorDaCompra[], categoriaId: string): FornecedorDaCompra[] {
  return lista
    .filter((f) => Array.isArray(f.categorias) && f.categorias.includes(categoriaId))
    .sort((a, b) => nomeDoFornecedor(a).localeCompare(nomeDoFornecedor(b), "pt-BR"));
}

/** Confere o fornecedor escolhido contra a lista atual, na hora de gravar. */
export function escolherFornecedorDaCompra(
  lista: FornecedorDaCompra[],
  categoriaId: string,
  id: string,
): { id: string; nome: string } | { erro: string } {
  if (!id) return { erro: "Selecione o fornecedor." };
  const f = lista.find((x) => x.id === id);
  if (!f) return { erro: "O fornecedor escolhido não está mais cadastrado. Selecione outro." };
  if (!f.categorias?.includes(categoriaId)) return { erro: "O fornecedor escolhido não atende esta categoria. Selecione outro." };
  const nome = nomeDoFornecedor(f);
  if (!nome) return { erro: "O fornecedor escolhido está sem nome no cadastro. Corrija em Cadastros > Fornecedores." };
  return { id: f.id, nome };
}
