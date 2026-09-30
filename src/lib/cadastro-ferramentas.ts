import { proximoCodigo, subcategoriasDa, type ParametrosBase } from "./parametros-base.ts";

export type EntradaCadastroFerramenta = {
  parametros: ParametrosBase;
  codigosExistentes: string[];
  subcategoria: string;
  descricao: string;
  estoqueMinimo: string;
  categoriaFerramenta: string;
  grupoFerramenta: string;
  numeroSerie: string;
  precoCusto: string;
  codigoAtual?: string;
};

export function protegerEstoqueNaEdicao<T extends Record<string, unknown>>(valores: T): Omit<T, "estoque_atual"> {
  const { estoque_atual: _estoqueAtual, ...editaveis } = valores;
  return editaveis;
}

export function prepararCadastroFerramenta(entrada: EntradaCadastroFerramenta) {
  const subcategoria = entrada.subcategoria.trim();
  if (!subcategoriasDa(entrada.parametros, "cat-ferramentas").some((s) => s.nome === subcategoria)) {
    throw new Error("Subcategoria de ferramentas inválida.");
  }
  const nome = entrada.descricao.trim();
  if (!nome) throw new Error("Informe a descrição da ferramenta.");
  const minimo = Number(entrada.estoqueMinimo);
  if (!Number.isSafeInteger(minimo) || minimo < 0 || !entrada.estoqueMinimo.trim()) {
    throw new Error("Estoque mínimo deve ser um número inteiro não negativo.");
  }
  const categoriaFerramenta = entrada.parametros.categoriasFerramenta.find((c) => c.nome === entrada.categoriaFerramenta.trim());
  if (!categoriaFerramenta) throw new Error("Categoria de ferramenta inválida.");
  const grupoFerramenta = entrada.parametros.gruposFerramenta.find((g) => g.nome === entrada.grupoFerramenta.trim());
  if (!grupoFerramenta) throw new Error("Grupo de ferramenta inválido.");
  const numeroSerie = entrada.numeroSerie.trim();
  if (!numeroSerie) throw new Error("Número de série obrigatório.");
  const precoTexto = entrada.precoCusto.trim();
  const preco = Number(precoTexto);
  if (!/^\d+(?:\.\d{1,2})?$/.test(precoTexto) || !Number.isSafeInteger(Math.round(preco * 100))) {
    throw new Error("Preço de custo deve ser não negativo e ter até duas casas decimais.");
  }
  const regra = entrada.parametros.regrasCodigo.find((r) => r.categoriaId === "cat-ferramentas");
  if (!entrada.codigoAtual && !regra) throw new Error("Cadastre a regra do código de ferramentas em Cadastros > Gerais.");
  return {
    codigo_sku: entrada.codigoAtual || proximoCodigo(regra!, entrada.codigosExistentes),
    categoria: subcategoria,
    nome,
    estoque_minimo: minimo,
    categoria_ferramenta: categoriaFerramenta.nome,
    grupo_ferramenta: grupoFerramenta.nome,
    numero_serie: numeroSerie,
    preco_unitario: preco,
  };
}
