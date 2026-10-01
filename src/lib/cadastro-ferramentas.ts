import { mesmoNome, proximoCodigo, subcategoriasDa, type ListaFerramenta, type Opcao, type ParametrosBase } from "./parametros-base.ts";

export const SELECAO_SEM_MARCA = "sem-marca";
export const SELECAO_MARCA_LEGADA = "marca-legada";
export const selecaoMarcaCadastrada = (id: string) => `marca:${id}`;

/** O formulário usa ids, para que um nome de marca nunca se confunda com "Sem marca". */
export function marcaDaSelecao(selecao: string, marcas: Opcao[], marcaAtual: string | null): string {
  if (selecao === SELECAO_SEM_MARCA) return "";
  if (selecao === SELECAO_MARCA_LEGADA && marcaAtual) return marcaAtual;
  const marca = marcas.find((item) => selecaoMarcaCadastrada(item.id) === selecao);
  if (!marca) throw new Error("Marca de ferramenta inválida. Escolha uma marca de Cadastros > Gerais.");
  return marca.nome;
}

export type EntradaCadastroFerramenta = {
  parametros: ParametrosBase;
  codigosExistentes: string[];
  subcategoria: string;
  // Subcategoria antiga, fora de Gerais, que a ferramenta já tinha: continua aceita na edição.
  subcategoriaAtual?: string;
  descricao: string;
  estoqueMinimo: string;
  categoriaFerramenta: string;
  grupoFerramenta: string;
  numeroSerie: string;
  precoCusto: string;
  marca?: string;
  marcaAtual?: string;
  codigoAtual?: string;
};

export function protegerEstoqueNaEdicao<T extends Record<string, unknown>>(valores: T): Omit<T, "estoque_atual"> {
  const { estoque_atual: _estoqueAtual, ...editaveis } = valores;
  return editaveis;
}

export function valoresItemNaEdicao<T extends Record<string, unknown>>(valores: T, editando: boolean): T | Omit<T, "estoque_atual"> {
  return editando ? protegerEstoqueNaEdicao(valores) : valores;
}

export function opcaoFerramentaEmUso(
  modelos: { categoria_ferramenta?: string | null; grupo_ferramenta?: string | null; marca?: string | null }[],
  tipo: ListaFerramenta,
  nome: string,
): boolean {
  const campo = tipo === "categoriasFerramenta" ? "categoria_ferramenta" : tipo === "gruposFerramenta" ? "grupo_ferramenta" : "marca";
  return modelos.some((modelo) => !!modelo[campo] && mesmoNome(modelo[campo], nome));
}

type ArmazenamentoCodigos = Pick<Storage, "getItem" | "setItem">;
const CHAVE_CODIGOS_RESERVADOS = "gemape-demo-codigos-ferramentas-reservados";

export function codigosReservadosFerramenta(
  storage: ArmazenamentoCodigos = localStorage,
): string[] {
  const salvo = storage.getItem(CHAVE_CODIGOS_RESERVADOS);
  if (!salvo) return [];
  const codigos: unknown = JSON.parse(salvo);
  if (!Array.isArray(codigos) || !codigos.every((codigo) => typeof codigo === "string")) {
    throw new Error("Histórico de códigos de ferramentas inválido.");
  }
  return codigos;
}

export function reservarCodigoFerramenta(
  codigo: string,
  storage: ArmazenamentoCodigos = localStorage,
): void {
  const codigos = codigosReservadosFerramenta(storage);
  if (!codigos.includes(codigo)) {
    storage.setItem(CHAVE_CODIGOS_RESERVADOS, JSON.stringify([...codigos, codigo]));
  }
}

export function prepararCadastroFerramenta(entrada: EntradaCadastroFerramenta) {
  const subcategoria = entrada.subcategoria.trim();
  const mantida = !!entrada.subcategoriaAtual && subcategoria === entrada.subcategoriaAtual.trim();
  if (!mantida && !subcategoriasDa(entrada.parametros, "cat-ferramentas").some((s) => s.nome === subcategoria)) {
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
  const marcaInformada = entrada.marca?.trim() ?? "";
  const marcaCadastrada = entrada.parametros.marcasFerramenta.find((m) => mesmoNome(m.nome, marcaInformada));
  if (marcaInformada && !marcaCadastrada && (!entrada.marcaAtual || !mesmoNome(marcaInformada, entrada.marcaAtual))) {
    throw new Error("Marca de ferramenta inválida. Cadastre a marca em Cadastros > Gerais.");
  }
  const marca = marcaInformada
    ? (entrada.marcaAtual && marcaInformada === entrada.marcaAtual.trim()
      ? entrada.marcaAtual : marcaCadastrada?.nome ?? entrada.marcaAtual!.trim())
    : null;
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
    marca,
    numero_serie: numeroSerie,
    preco_unitario: preco,
  };
}
