import { enderecamentoDaCategoria, type ParametrosBase } from "./parametros-base.ts";

export type ProdutoEnderecavel = {
  tabela: "epis" | "uniformes" | "ferramentas" | "veiculos";
  codigo_sku: string;
  nome: string;
  empresa_id: string | null;
};

export type EnderecoProduto = {
  id: string;
  empresa_id: string;
  codigo_produto: string;
  rua: string;
  prateleira: string;
  apartamento: string;
};

const CATEGORIA: Record<ProdutoEnderecavel["tabela"], string> = {
  epis: "cat-epi",
  uniformes: "cat-uniformes",
  ferramentas: "cat-ferramentas",
  veiculos: "cat-veiculos",
};
const chave = (valor: string) => valor.trim().toUpperCase();

export function montarLinhasEnderecamento(
  produtos: ProdutoEnderecavel[],
  enderecos: EnderecoProduto[],
  dados: ParametrosBase,
  empresaId: string,
  busca: string,
  somenteSem: boolean,
): { produto: ProdutoEnderecavel; endereco: EnderecoProduto | undefined }[] {
  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  return produtos.flatMap((produto) => {
    if (!produto.empresa_id || !produto.codigo_sku ||
      (empresaId !== "todas" && produto.empresa_id !== empresaId) ||
      enderecamentoDaCategoria(dados, CATEGORIA[produto.tabela]) === "nao_usa") return [];
    const encontrados = enderecos.filter((endereco) =>
      endereco.empresa_id === produto.empresa_id &&
      chave(endereco.codigo_produto) === chave(produto.codigo_sku));
    const linhas = (encontrados.length ? encontrados : [undefined]).map((endereco) => ({ produto, endereco }));
    return linhas.filter(({ endereco }) =>
      (!somenteSem || !endereco) &&
      (!termo || [produto.codigo_sku, produto.nome, endereco?.rua, endereco?.prateleira, endereco?.apartamento]
        .some((valor) => (valor ?? "").toLocaleLowerCase("pt-BR").includes(termo))));
  });
}

export function precisaAvisarEnderecamento(
  dados: ParametrosBase,
  categoriaId: string,
  empresaId: string,
  codigoProduto: string,
  enderecos: Pick<EnderecoProduto, "empresa_id" | "codigo_produto">[],
): boolean {
  return enderecamentoDaCategoria(dados, categoriaId) === "obrigatorio" &&
    !!empresaId && !!codigoProduto &&
    !enderecos.some((endereco) => endereco.empresa_id === empresaId &&
      chave(endereco.codigo_produto) === chave(codigoProduto));
}
