// Aviso ao excluir um fornecedor ou um produto que tem código de fábrica associado (decisão 42).
// A associação não vale sem um dos dois lados, então sai junto, mas só depois do aviso.
import type { CodigoFabrica, TabelaProduto } from "./parametros-base.ts";

const chave = (texto: string) => texto.trim().toUpperCase();

export const vinculosDoFornecedor = (codigos: CodigoFabrica[], fornecedorId: string): CodigoFabrica[] =>
  codigos.filter((c) => c.fornecedor_id === fornecedorId);

export const vinculosDoProduto = (
  codigos: CodigoFabrica[],
  produto: { tabela: TabelaProduto; codigo_sku: string; empresa_id: string | null },
): CodigoFabrica[] =>
  codigos.filter(
    (c) =>
      c.tabela === produto.tabela &&
      chave(c.codigo_produto) === chave(produto.codigo_sku) &&
      c.empresa_id === produto.empresa_id,
  );

const quantos = (n: number) => `${n} código${n === 1 ? "" : "s"} de fábrica`;
const MAX_LISTADOS = 5;

function listar(vinculos: CodigoFabrica[], descrever: (c: CodigoFabrica) => string): string {
  const itens = vinculos.slice(0, MAX_LISTADOS).map(descrever).join(", ");
  const resto = vinculos.length - MAX_LISTADOS;
  return resto > 0 ? `${itens} e mais ${resto}` : itens;
}

export function avisoExclusaoDoFornecedor(nome: string, vinculos: CodigoFabrica[]): string | null {
  if (vinculos.length === 0) return null;
  return (
    `${nome} tem ${quantos(vinculos.length)} associado${vinculos.length === 1 ? "" : "s"} (${listar(vinculos, (c) => `${c.codigo_produto} = ${c.codigo_fornecedor}`)}). ` +
    "Se excluir, essas associações também serão removidas e as próximas notas desse fornecedor ficarão sem associação."
  );
}

export function avisoExclusaoDoProduto(rotulo: string, vinculos: CodigoFabrica[]): string | null {
  if (vinculos.length === 0) return null;
  return (
    `${rotulo} tem ${quantos(vinculos.length)} associado${vinculos.length === 1 ? "" : "s"} (${listar(vinculos, (c) => `${c.fornecedor_nome} = ${c.codigo_fornecedor}`)}). ` +
    "Se excluir, essas associações também serão removidas e as próximas notas com esse código ficarão sem associação."
  );
}
