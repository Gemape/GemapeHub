import { combinaBusca, enderecamentoDaCategoria, type ParametrosBase } from "./parametros-base.ts";

export type ProdutoEnderecavel = {
  tabela: "epis" | "uniformes" | "ferramentas" | "veiculos" | "equipamentos";
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
  equipamentos: "cat-equipamentos",
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
      (!busca.trim() || combinaBusca(busca, produto.codigo_sku, produto.nome, endereco?.rua, endereco?.prateleira, endereco?.apartamento)));
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

// Dados do endereço do item de origem copiados para o destino. Valida tudo antes de devolver,
// para a gravação ser uma única operação, sem cópia parcial.
export function montarClonagemEndereco(entrada: {
  destino: Pick<ProdutoEnderecavel, "tabela" | "codigo_sku" | "empresa_id">;
  codigoOrigem: string;
  produtos: ProdutoEnderecavel[];
  enderecos: EnderecoProduto[];
  dados: ParametrosBase;
}): Pick<EnderecoProduto, "empresa_id" | "codigo_produto" | "rua" | "prateleira" | "apartamento"> {
  const { destino, produtos, enderecos, dados } = entrada;
  const origem = chave(entrada.codigoOrigem);
  if (!origem) throw new Error("Informe o código do item de origem.");
  if (!destino.empresa_id) throw new Error("O item de destino não tem empresa.");
  if (enderecamentoDaCategoria(dados, CATEGORIA[destino.tabela]) === "nao_usa") {
    throw new Error("A categoria deste item não usa endereçamento.");
  }
  if (origem === chave(destino.codigo_sku)) throw new Error("A origem é o mesmo item do destino.");
  const produto = produtos.find((p) => p.empresa_id === destino.empresa_id && p.tabela === destino.tabela && chave(p.codigo_sku) === origem);
  const outraCategoria = !produto && produtos.some((p) => p.empresa_id === destino.empresa_id && chave(p.codigo_sku) === origem);
  if (outraCategoria) throw new Error("A origem precisa ser da mesma categoria do item de destino.");
  if (!produto) throw new Error(`Item ${entrada.codigoOrigem.trim()} não encontrado nesta empresa.`);
  if (produto.tabela !== destino.tabela) {
    throw new Error("A origem precisa ser da mesma categoria do item de destino.");
  }
  const endereco = enderecos.find((e) => e.empresa_id === destino.empresa_id && chave(e.codigo_produto) === origem);
  if (!endereco) throw new Error(`O item ${produto.codigo_sku} não tem endereço para copiar.`);
  const copia = {
    empresa_id: destino.empresa_id,
    codigo_produto: destino.codigo_sku,
    rua: endereco.rua,
    prateleira: endereco.prateleira,
    apartamento: endereco.apartamento,
  };
  const repetido = enderecos.some((e) =>
    e.empresa_id === copia.empresa_id && chave(e.codigo_produto) === chave(copia.codigo_produto) &&
    chave(e.rua) === chave(copia.rua) && chave(e.prateleira) === chave(copia.prateleira) &&
    chave(e.apartamento) === chave(copia.apartamento));
  if (repetido) throw new Error("O item de destino já está neste endereço.");
  return copia;
}
