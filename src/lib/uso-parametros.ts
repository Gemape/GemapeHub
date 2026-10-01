// Onde um parâmetro de Cadastros > Gerais é usado (decisão 22, regra 5): antes de excluir,
// a tela confere os cadastros e, se houver uso, recusa e mostra quais cadastros dependem dele.
import { mesmoNome, type ParametrosBase, type Subcategoria } from "./parametros-base.ts";
import { resolverSubcategoria, SUBCATEGORIA_DAS_TABELAS } from "./subcategoria-referencia.ts";

export type UsoParametro = { modulo: string; codigos: string[] };
type Registro = Record<string, unknown>;

const MODULO_DA_TABELA: Record<keyof typeof SUBCATEGORIA_DAS_TABELAS, string> = {
  epis: "EPI",
  uniformes: "Uniforme",
  veiculos: "Veículo",
};
const MAXIMO_NO_AVISO = 5;

// Identificação do cadastro no aviso: o código, ou a placa do veículo.
const identificar = (r: Registro) =>
  String(r["codigo_sku"] || r["placa"] || r["nome"] || r["id"] || "sem código");

export function usoDaSubcategoria(
  sub: Subcategoria,
  parametros: ParametrosBase,
  cadastros: Partial<Record<keyof typeof SUBCATEGORIA_DAS_TABELAS, Registro[]>>,
): UsoParametro[] {
  const usos: UsoParametro[] = [];
  for (const [tabela, { categoriaId, campo }] of Object.entries(SUBCATEGORIA_DAS_TABELAS)) {
    if (categoriaId !== sub.categoriaId) continue;
    const codigos = (cadastros[tabela as keyof typeof SUBCATEGORIA_DAS_TABELAS] ?? [])
      .filter((r) => resolverSubcategoria(parametros, categoriaId, r, campo)?.id === sub.id)
      .map(identificar);
    if (codigos.length > 0) {
      usos.push({ modulo: MODULO_DA_TABELA[tabela as keyof typeof MODULO_DA_TABELA], codigos });
    }
  }
  return usos;
}

// Parâmetros gravados pelo nome (marcas, categoria e grupo de ferramenta).
export function usoPorNome(
  registros: Registro[],
  campo: string,
  nome: string,
  modulo: string,
): UsoParametro[] {
  const codigos = registros
    .filter((r) => typeof r[campo] === "string" && mesmoNome(r[campo] as string, nome))
    .map(identificar);
  return codigos.length > 0 ? [{ modulo, codigos }] : [];
}

export function usoDaCategoria(
  categoriaId: string,
  fornecedores: { nome_fantasia: string; categorias: string[] }[],
): UsoParametro[] {
  const nomes = fornecedores
    .filter((f) => f.categorias.includes(categoriaId))
    .map((f) => f.nome_fantasia);
  return nomes.length > 0 ? [{ modulo: "Fornecedor", codigos: nomes }] : [];
}

export const descreverUso = (usos: UsoParametro[]) =>
  usos
    .map(({ modulo, codigos }) => {
      const mostrados = codigos.slice(0, MAXIMO_NO_AVISO).join(", ");
      const resto = codigos.length - MAXIMO_NO_AVISO;
      return `${modulo}: ${mostrados}${resto > 0 ? ` e mais ${resto}` : ""}`;
    })
    .join("; ");
