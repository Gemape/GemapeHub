import { grupoTemTamanhos } from "./tamanhos-ferramentas-padrao.ts";
import { mesmoNome, proximoCodigo, regraDoCadastro, subcategoriasDa, type ListaFerramenta, type Opcao, type ParametrosBase } from "./parametros-base.ts";

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
  categoriaFerramenta: string;
  // Categoria já gravada na ferramenta em edição: continua aceita mesmo fora das subcategorias de Gerais.
  categoriaAtual?: string;
  grupoFerramenta: string;
  // Qual ferramenta é, quando o grupo escolhido é "Outros" ou "Diversos" (decisão 83).
  qualFerramenta?: string;
  modelo: string;
  estoqueMinimo: string | number;
  marca?: string;
  marcaAtual?: string;
  // Tamanho da ferramenta (decisão 133): um dos tamanhos do grupo em Parâmetros Específicos; vazio = sem tamanho.
  tamanho?: string;
  // Tamanho já gravado na ferramenta em edição: continua aceito mesmo que tenha saído da lista do grupo.
  tamanhoAtual?: string;
  codigoAtual?: string;
  // Sigla escolhida para o código novo, quando Gerais tem mais de uma para Ferramentas; sem ela vale a padrão.
  sigla?: string;
};

/** Tamanhos cadastrados para o grupo de ferramenta em Parâmetros Específicos (decisão 117), na ordem do cadastro. */
export function tamanhosDoGrupoFerramenta(parametros: ParametrosBase, nomeGrupo: string): string[] {
  const grupo = grupoTemTamanhos(nomeGrupo) ? parametros.gruposFerramenta.find((g) => mesmoNome(g.nome, nomeGrupo)) : undefined;
  return grupo ? [...(parametros.tamanhosGrupoFerramenta[grupo.id] ?? [])] : [];
}

/** Descrição da ferramenta (decisão 54): grupo, modelo e marca, nesta ordem, separados por " · ". */
export function descricaoFerramenta(d: { grupo?: string | null; modelo?: string | null; marca?: string | null }): string {
  return [d.grupo, d.modelo, d.marca]
    .map((parte) => String(parte ?? "").trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .join(" · ");
}

/** Decisão 83: nos grupos "Outros" (e "Outro", "Outras", "Outra") e "Diversos" o cadastro pede que se digite qual ferramenta é. */
export const grupoPedeQualFerramenta = (grupo: string | null | undefined): boolean =>
  !!grupo && ["outro", "outra", "outros", "outras", "diversos"].includes(grupo.trim().toLowerCase());

const limparQual = (texto: string) => texto.trim().replace(/\s+/g, " ").replace(/ · /g, " ").slice(0, 60);

/** Texto digitado de uma ferramenta já cadastrada: é a parte do grupo na descrição, quando ela difere do nome do grupo. */
export function qualFerramentaDe(item: { grupo_ferramenta?: string | null; nome?: string | null } | null | undefined): string {
  if (!item || !grupoPedeQualFerramenta(item.grupo_ferramenta)) return "";
  const primeira = String(item.nome ?? "").split(" · ")[0]?.trim() ?? "";
  return primeira && primeira.toLowerCase() !== item.grupo_ferramenta!.trim().toLowerCase() ? primeira : "";
}

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
  let codigos: unknown;
  try { codigos = JSON.parse(salvo); } catch { throw new Error("Histórico de códigos de ferramentas inválido."); }
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
  const categoriaInformada = entrada.categoriaFerramenta.trim();
  const categoriaFerramenta =
    subcategoriasDa(entrada.parametros, "cat-ferramentas").find((c) => c.nome === categoriaInformada) ??
    (entrada.categoriaAtual && categoriaInformada === entrada.categoriaAtual.trim() ? { nome: categoriaInformada } : undefined);
  if (!categoriaFerramenta) throw new Error("Categoria de ferramenta inválida.");
  const grupoFerramenta = entrada.parametros.gruposFerramenta.find((g) => g.nome === entrada.grupoFerramenta.trim());
  if (!grupoFerramenta) throw new Error("Grupo de ferramenta inválido.");
  const qual = grupoPedeQualFerramenta(grupoFerramenta.nome) ? limparQual(entrada.qualFerramenta ?? "") : "";
  if (grupoPedeQualFerramenta(grupoFerramenta.nome) && !qual) throw new Error("Informe qual é a ferramenta.");
  const marcaInformada = entrada.marca?.trim() ?? "";
  const marcaCadastrada = entrada.parametros.marcasFerramenta.find((m) => mesmoNome(m.nome, marcaInformada));
  if (marcaInformada && !marcaCadastrada && (!entrada.marcaAtual || !mesmoNome(marcaInformada, entrada.marcaAtual))) {
    throw new Error("Marca de ferramenta inválida. Cadastre a marca em Cadastros > Gerais.");
  }
  const marca = marcaInformada
    ? (entrada.marcaAtual && marcaInformada === entrada.marcaAtual.trim()
      ? entrada.marcaAtual : marcaCadastrada?.nome ?? entrada.marcaAtual!.trim())
    : null;
  const modelo = entrada.modelo.trim().replace(/\s+/g, " ");
  if (!modelo) throw new Error("Informe o modelo da ferramenta.");
  const tamanho = (entrada.tamanho ?? "").trim();
  if (tamanho && !tamanhosDoGrupoFerramenta(entrada.parametros, grupoFerramenta.nome).includes(tamanho) && tamanho !== (entrada.tamanhoAtual ?? "").trim()) {
    throw new Error("Tamanho inválido para este grupo. Escolha um tamanho cadastrado em Parâmetros Específicos.");
  }
  const minimoTexto = String(entrada.estoqueMinimo ?? "").trim();
  if (!/^\d{1,9}$/.test(minimoTexto)) throw new Error("Informe o estoque mínimo (número inteiro, 0 ou mais).");
  const regra = regraDoCadastro(entrada.parametros.regrasCodigo, "cat-ferramentas", entrada.sigla);
  if (!entrada.codigoAtual && !regra) throw new Error("Cadastre a regra do código de ferramentas em Cadastros > Gerais.");
  return {
    codigo_sku: entrada.codigoAtual || proximoCodigo(regra!, entrada.codigosExistentes),
    // Ferramenta não tem subcategoria (decisão 25). A coluna categoria, obrigatória no
    // banco, recebe a categoria de ferramenta no cadastro novo; a edição não a reescreve,
    // para a ferramenta antiga manter a subcategoria gravada.
    ...(entrada.codigoAtual ? {} : { categoria: categoriaFerramenta.nome }),
    nome: descricaoFerramenta({ grupo: qual || grupoFerramenta.nome, modelo, marca }),
    modelo,
    estoque_minimo: Number(minimoTexto),
    categoria_ferramenta: categoriaFerramenta.nome,
    grupo_ferramenta: grupoFerramenta.nome,
    marca,
    ...(entrada.tamanho !== undefined ? { tamanho: tamanho || null } : {}),
  };
}
