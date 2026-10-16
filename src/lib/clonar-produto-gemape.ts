import { proximoCodigo, regraDoCadastro, siglaDoCodigo, type RegraCodigo, type TabelaProduto } from "./parametros-base.ts";

// Clonar uma associação de Código de fábrica clona o produto GEMAPE (decisão 231): copia todas as
// informações e gera o código seguinte da sequência, para o código da GEMAPE nunca se repetir.

export const CATEGORIA_DA_TABELA: Record<TabelaProduto, string> = {
  epis: "cat-epi",
  uniformes: "cat-uniformes",
  ferramentas: "cat-ferramentas",
};

// Não vão para a cópia: identidade, datas, vínculo com o catálogo e o saldo (a cópia não herda estoque).
const NAO_COPIADOS = ["id", "codigo_sku", "created_at", "updated_at", "catalogo_id", "separado_em"];

// Próximo código livre, com a mesma sigla do original (ou a padrão da categoria).
export function codigoDaCopia(
  regras: RegraCodigo[],
  tabela: TabelaProduto,
  codigoOrigem: string,
  codigosUsados: (string | null | undefined)[],
): string {
  const categoriaId = CATEGORIA_DA_TABELA[tabela];
  const regra = regraDoCadastro(regras, categoriaId, siglaDoCodigo(regras, categoriaId, codigoOrigem));
  if (!regra) throw new Error("Cadastre antes a regra do código em Cadastros > Gerais > Código do Produto.");
  return proximoCodigo(regra, codigosUsados);
}

export function montarCopiaDoProduto(origem: Record<string, unknown>, codigo: string): Record<string, unknown> {
  const copia: Record<string, unknown> = {};
  for (const [campo, valor] of Object.entries(origem)) if (!NAO_COPIADOS.includes(campo)) copia[campo] = valor;
  if ("estoque_atual" in copia) copia["estoque_atual"] = 0;
  copia["codigo_sku"] = codigo;
  return copia;
}
