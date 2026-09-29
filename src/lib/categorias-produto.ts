import {
  CATEGORIAS_EPI,
  CATEGORIAS_FERRAMENTA,
  CATEGORIAS_UNIFORME,
  TIPOS_VEICULO,
} from "./gemape.ts";

// As 4 categorias são fixas; as subcategorias de cada uma são cadastradas pelo usuário.
// Enquanto o sistema está em demonstração, a lista fica salva no navegador.
export const CATEGORIAS_PRODUTO = [
  { chave: "epi", nome: "EPI", tabela: "epis", coluna: "categoria" },
  { chave: "ferramenta", nome: "Ferramentas", tabela: "ferramentas", coluna: "categoria" },
  { chave: "uniforme", nome: "Uniformes", tabela: "uniformes", coluna: "categoria" },
  { chave: "veiculo", nome: "Veículos", tabela: "veiculos", coluna: "tipo" },
] as const;

export type CategoriaProduto = (typeof CATEGORIAS_PRODUTO)[number]["chave"];
export type Subcategorias = Record<CategoriaProduto, string[]>;
type StorageLike = Pick<Storage, "getItem" | "setItem">;

const CHAVE = "gemape-demo-subcategorias";
// Avisa as telas abertas quando a lista muda.
export const EVENTO_SUBCATEGORIAS = "gemape-subcategorias";

// Listas que já existiam fixas no sistema, usadas como ponto de partida.
const PADRAO: Subcategorias = {
  epi: [...CATEGORIAS_EPI],
  ferramenta: [...CATEGORIAS_FERRAMENTA],
  uniforme: [...CATEGORIAS_UNIFORME],
  veiculo: [...TIPOS_VEICULO],
};

const storagePadrao = (): StorageLike | null =>
  typeof localStorage === "undefined" ? null : localStorage;
const mesmoNome = (a: string, b: string) =>
  a.localeCompare(b, "pt-BR", { sensitivity: "base" }) === 0;

export function listarSubcategorias(storage: StorageLike | null = storagePadrao()): Subcategorias {
  const copia = (): Subcategorias => structuredClone(PADRAO);
  if (!storage) return copia();
  try {
    const salvas = JSON.parse(storage.getItem(CHAVE) ?? "null") as Partial<Subcategorias> | null;
    const resultado = copia();
    for (const { chave } of CATEGORIAS_PRODUTO) {
      const lista = salvas?.[chave];
      if (Array.isArray(lista)) resultado[chave] = lista.filter((item) => typeof item === "string");
    }
    return resultado;
  } catch {
    return copia();
  }
}

function gravar(dados: Subcategorias, storage: StorageLike) {
  storage.setItem(CHAVE, JSON.stringify(dados));
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_SUBCATEGORIAS));
}

function validarNome(lista: string[], nome: string, ignorar?: string): string {
  const limpo = nome.trim().replace(/\s+/g, " ");
  if (!limpo) throw new Error("Informe o nome da subcategoria.");
  if (lista.some((item) => item !== ignorar && mesmoNome(item, limpo))) {
    throw new Error(`A subcategoria "${limpo}" já existe nesta categoria.`);
  }
  return limpo;
}

export function adicionarSubcategoria(
  categoria: CategoriaProduto,
  nome: string,
  storage: StorageLike | null = storagePadrao(),
): string {
  if (!storage) throw new Error("Armazenamento do navegador indisponível.");
  const dados = listarSubcategorias(storage);
  const limpo = validarNome(dados[categoria], nome);
  dados[categoria] = [...dados[categoria], limpo];
  gravar(dados, storage);
  return limpo;
}

export function renomearSubcategoria(
  categoria: CategoriaProduto,
  atual: string,
  novo: string,
  storage: StorageLike | null = storagePadrao(),
): string {
  if (!storage) throw new Error("Armazenamento do navegador indisponível.");
  const dados = listarSubcategorias(storage);
  if (!dados[categoria].includes(atual)) throw new Error(`A subcategoria "${atual}" não existe.`);
  const limpo = validarNome(dados[categoria], novo, atual);
  dados[categoria] = dados[categoria].map((item) => (item === atual ? limpo : item));
  gravar(dados, storage);
  return limpo;
}

export function removerSubcategoria(
  categoria: CategoriaProduto,
  nome: string,
  storage: StorageLike | null = storagePadrao(),
): void {
  if (!storage) throw new Error("Armazenamento do navegador indisponível.");
  const dados = listarSubcategorias(storage);
  dados[categoria] = dados[categoria].filter((item) => item !== nome);
  gravar(dados, storage);
}

// Opções do formulário: as subcategorias cadastradas e, ao editar, o valor atual do produto,
// para ele não sumir do campo se a subcategoria tiver sido excluída depois.
export function opcoesSubcategoria(lista: string[], atual?: string | null): string[] {
  return atual && !lista.includes(atual) ? [...lista, atual] : lista;
}
