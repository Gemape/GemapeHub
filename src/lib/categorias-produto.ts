import {
  CATEGORIAS_EPI,
  CATEGORIAS_FERRAMENTA,
  CATEGORIAS_UNIFORME,
  TIPOS_VEICULO,
} from "./gemape.ts";

// As 4 categorias são fixas. Cada uma tem um catálogo de subcategorias (opções) e, dentre
// elas, as selecionadas, que são as que aparecem nos formulários (lista dupla).
// Enquanto o sistema está em demonstração, tudo fica salvo no navegador.
export const CATEGORIAS_PRODUTO = [
  { chave: "epi", nome: "EPI", tabela: "epis", coluna: "categoria" },
  { chave: "ferramenta", nome: "Ferramentas", tabela: "ferramentas", coluna: "categoria" },
  { chave: "uniforme", nome: "Uniformes", tabela: "uniformes", coluna: "categoria" },
  { chave: "veiculo", nome: "Veículos", tabela: "veiculos", coluna: "tipo" },
] as const;

export type CategoriaProduto = (typeof CATEGORIAS_PRODUTO)[number]["chave"];
export type ListaCategoria = { opcoes: string[]; selecionadas: string[] };
export type Categorias = Record<CategoriaProduto, ListaCategoria>;
type StorageLike = Pick<Storage, "getItem" | "setItem">;

const CHAVE = "gemape-demo-subcategorias";
// Avisa as telas abertas quando a lista muda.
export const EVENTO_SUBCATEGORIAS = "gemape-subcategorias";

// As listas que já existiam fixas no sistema começam selecionadas; as sugestões extras
// começam em "Disponíveis".
const SUGESTOES: Record<CategoriaProduto, string[]> = {
  epi: ["Avental", "Mangote", "Perneira", "Protetor Facial", "Respirador"],
  ferramenta: ["Jardinagem", "Soldagem"],
  uniforme: ["Bermuda", "Boné", "Colete Refletivo", "Macacão"],
  veiculo: ["Ônibus", "Trator", "Empilhadeira"],
};
const FIXAS: Record<CategoriaProduto, readonly string[]> = {
  epi: CATEGORIAS_EPI,
  ferramenta: CATEGORIAS_FERRAMENTA,
  uniforme: CATEGORIAS_UNIFORME,
  veiculo: TIPOS_VEICULO,
};

function padrao(chave: CategoriaProduto): ListaCategoria {
  return { opcoes: [...FIXAS[chave], ...SUGESTOES[chave]], selecionadas: [...FIXAS[chave]] };
}

const storagePadrao = (): StorageLike | null =>
  typeof localStorage === "undefined" ? null : localStorage;
const mesmoNome = (a: string, b: string) =>
  a.localeCompare(b, "pt-BR", { sensitivity: "base" }) === 0;
const textos = (valor: unknown): string[] | null =>
  Array.isArray(valor) ? valor.filter((item): item is string => typeof item === "string") : null;

function lerCategoria(chave: CategoriaProduto, salvo: unknown): ListaCategoria {
  // A versão anterior guardava só a lista usada nos formulários.
  const antiga = textos(salvo);
  if (antiga) return { opcoes: [...antiga], selecionadas: [...antiga] };
  if (salvo && typeof salvo === "object") {
    const opcoes = textos((salvo as ListaCategoria).opcoes);
    const selecionadas = textos((salvo as ListaCategoria).selecionadas);
    if (opcoes && selecionadas) {
      return { opcoes, selecionadas: selecionadas.filter((item) => opcoes.includes(item)) };
    }
  }
  return padrao(chave);
}

export function listarCategorias(storage: StorageLike | null = storagePadrao()): Categorias {
  let salvas: Record<string, unknown> | null = null;
  try {
    salvas = storage
      ? (JSON.parse(storage.getItem(CHAVE) ?? "null") as Record<string, unknown> | null)
      : null;
  } catch {
    salvas = null;
  }
  const resultado = {} as Categorias;
  for (const { chave } of CATEGORIAS_PRODUTO) {
    resultado[chave] = lerCategoria(chave, salvas?.[chave]);
  }
  return resultado;
}

// Subcategorias que aparecem nos formulários de cada categoria.
export function listarSubcategorias(
  storage: StorageLike | null = storagePadrao(),
): Record<CategoriaProduto, string[]> {
  const categorias = listarCategorias(storage);
  const resultado = {} as Record<CategoriaProduto, string[]>;
  for (const { chave } of CATEGORIAS_PRODUTO) resultado[chave] = categorias[chave].selecionadas;
  return resultado;
}

// Opções que não estão selecionadas, na ordem do catálogo.
export const disponiveis = (lista: ListaCategoria) =>
  lista.opcoes.filter((item) => !lista.selecionadas.includes(item));

function alterar(
  categoria: CategoriaProduto,
  storage: StorageLike | null,
  mudar: (lista: ListaCategoria) => ListaCategoria,
): ListaCategoria {
  if (!storage) throw new Error("Armazenamento do navegador indisponível.");
  const dados = listarCategorias(storage);
  dados[categoria] = mudar(dados[categoria]);
  storage.setItem(CHAVE, JSON.stringify(dados));
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_SUBCATEGORIAS));
  return dados[categoria];
}

function validarNome(lista: string[], nome: string, ignorar?: string): string {
  const limpo = nome.trim().replace(/\s+/g, " ");
  if (!limpo) throw new Error("Informe o nome da subcategoria.");
  if (lista.some((item) => item !== ignorar && mesmoNome(item, limpo))) {
    throw new Error(`A subcategoria "${limpo}" já existe nesta categoria.`);
  }
  return limpo;
}

// Cria uma opção nova em "Disponíveis".
export function criarSubcategoria(
  categoria: CategoriaProduto,
  nome: string,
  storage: StorageLike | null = storagePadrao(),
): string {
  let criada = "";
  alterar(categoria, storage, (lista) => {
    criada = validarNome(lista.opcoes, nome);
    return { ...lista, opcoes: [...lista.opcoes, criada] };
  });
  return criada;
}

// Move para "Selecionadas", no fim da lista, na ordem do catálogo.
export function selecionarSubcategorias(
  categoria: CategoriaProduto,
  nomes: string[],
  storage: StorageLike | null = storagePadrao(),
): ListaCategoria {
  return alterar(categoria, storage, (lista) => ({
    ...lista,
    selecionadas: [
      ...lista.selecionadas,
      ...lista.opcoes.filter((item) => nomes.includes(item) && !lista.selecionadas.includes(item)),
    ],
  }));
}

// Volta para "Disponíveis". Quem chama decide antes quais podem sair (as em uso não podem).
export function removerDaSelecao(
  categoria: CategoriaProduto,
  nomes: string[],
  storage: StorageLike | null = storagePadrao(),
): ListaCategoria {
  return alterar(categoria, storage, (lista) => ({
    ...lista,
    selecionadas: lista.selecionadas.filter((item) => !nomes.includes(item)),
  }));
}

export function renomearSubcategoria(
  categoria: CategoriaProduto,
  atual: string,
  novo: string,
  storage: StorageLike | null = storagePadrao(),
): string {
  let renomeada = "";
  alterar(categoria, storage, (lista) => {
    if (!lista.opcoes.includes(atual)) throw new Error(`A subcategoria "${atual}" não existe.`);
    renomeada = validarNome(lista.opcoes, novo, atual);
    const trocar = (item: string) => (item === atual ? renomeada : item);
    return { opcoes: lista.opcoes.map(trocar), selecionadas: lista.selecionadas.map(trocar) };
  });
  return renomeada;
}

// Exclui do catálogo apenas opções que estão em "Disponíveis".
export function excluirSubcategorias(
  categoria: CategoriaProduto,
  nomes: string[],
  storage: StorageLike | null = storagePadrao(),
): ListaCategoria {
  return alterar(categoria, storage, (lista) => ({
    ...lista,
    opcoes: lista.opcoes.filter(
      (item) => !nomes.includes(item) || lista.selecionadas.includes(item),
    ),
  }));
}

// Opções do formulário: as selecionadas e, ao editar, o valor atual do produto,
// para ele não sumir do campo se a subcategoria tiver saído da seleção depois.
export function opcoesSubcategoria(lista: string[], atual?: string | null): string[] {
  return atual && !lista.includes(atual) ? [...lista, atual] : lista;
}
