// Subcategoria guardada por referência (decisão 22, regra 3): o cadastro grava o id da
// subcategoria de Cadastros > Gerais e mostra sempre o nome atual dela, então renomear em
// Gerais muda o nome em todos os cadastros na hora. O nome também fica gravado no campo
// antigo (categoria ou tipo), para o banco real, que ainda não tem a coluna (Fase 2).
import { estaAtivo, mesmoNome, subcategoriasDa, type ParametrosBase } from "./parametros-base.ts";

export const SUBCATEGORIA_LEGADA = "subcategoria-legada";

export type SubcategoriaDoCadastro = {
  id: string | null;
  nome: string;
  foraDeGerais: boolean;
  // Desativada em Gerais: o cadastro continua com ela, mas ela não é oferecida a outros.
  desativada?: true;
};
type Registro = { subcategoria_id?: unknown; categoria?: unknown; tipo?: unknown };

// Tabela do demo, categoria de Gerais (id fixo) e campo onde o nome era gravado.
export const SUBCATEGORIA_DAS_TABELAS = {
  epis: { categoriaId: "cat-epi", campo: "categoria" },
  uniformes: { categoriaId: "cat-uniformes", campo: "categoria" },
  ferramentas: { categoriaId: "cat-ferramentas", campo: "categoria" },
  veiculos: { categoriaId: "cat-veiculos", campo: "tipo" },
} as const;

const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function resolverSubcategoria(
  parametros: ParametrosBase,
  categoriaId: string,
  registro: Registro,
  campo: "categoria" | "tipo" = categoriaId === "cat-veiculos" ? "tipo" : "categoria",
): SubcategoriaDoCadastro | null {
  const subcategorias = subcategoriasDa(parametros, categoriaId);
  const gravado = texto(registro[campo]);
  const id = texto(registro.subcategoria_id);
  const ligada = id ? subcategorias.find((s) => s.id === id) : undefined;
  const achada = (sub: { id: string; nome: string }): SubcategoriaDoCadastro =>
    estaAtivo(parametros, sub.id)
      ? { id: sub.id, nome: sub.nome, foraDeGerais: false }
      : { id: sub.id, nome: sub.nome, foraDeGerais: false, desativada: true };
  if (ligada) return achada(ligada);
  if (!gravado) return null;
  // Sem referência (cadastro anterior a ela) ou com referência a subcategoria excluída:
  // liga pelo nome gravado, sem diferença de acento ou maiúscula.
  const sub = subcategorias.find((s) => mesmoNome(s.nome, gravado));
  if (sub) return achada(sub);
  return { id: null, nome: gravado, foraDeGerais: true };
}

// Opções da lista suspensa: as ativas, mais a desativada que o cadastro já usa.
export function subcategoriasParaSelecao(
  parametros: ParametrosBase,
  categoriaId: string,
  atual: SubcategoriaDoCadastro | null,
): { id: string; nome: string; desativada: boolean }[] {
  return subcategoriasDa(parametros, categoriaId)
    .filter((s) => estaAtivo(parametros, s.id) || s.id === atual?.id)
    .map((s) => ({ id: s.id, nome: s.nome, desativada: !estaAtivo(parametros, s.id) }));
}

export const nomeSubcategoria = (
  parametros: ParametrosBase,
  categoriaId: string,
  registro: Registro,
): string => resolverSubcategoria(parametros, categoriaId, registro)?.nome ?? "";

// Valor inicial da lista suspensa: o id, ou a opção da subcategoria antiga.
export const valorSelecaoSubcategoria = (atual: SubcategoriaDoCadastro | null): string =>
  !atual ? "" : atual.foraDeGerais ? SUBCATEGORIA_LEGADA : (atual.id ?? "");

export function subcategoriaDaSelecao(
  selecao: string,
  parametros: ParametrosBase,
  categoriaId: string,
  atual: SubcategoriaDoCadastro | null,
): { id: string | null; nome: string } {
  if (!selecao) throw new Error("Selecione a subcategoria.");
  const invalida = "Subcategoria inválida. Escolha uma subcategoria de Cadastros > Gerais.";
  if (selecao === SUBCATEGORIA_LEGADA) {
    if (!atual?.foraDeGerais) throw new Error(invalida);
    return { id: null, nome: atual.nome };
  }
  const sub = subcategoriasParaSelecao(parametros, categoriaId, atual).find(
    (s) => s.id === selecao,
  );
  if (!sub) throw new Error(invalida);
  return { id: sub.id, nome: sub.nome };
}

// Migração do demo: cadastro gravado só com o nome (ou ligado a subcategoria excluída)
// ganha a referência da subcategoria de mesmo nome, e o nome gravado acompanha o nome
// atual de Gerais. O que não casa fica como está. Devolve quantos cadastros mudaram.
export function vincularSubcategorias(
  dados: Record<string, Record<string, unknown>[] | undefined>,
  parametros: ParametrosBase,
): number {
  let ligados = 0;
  for (const [tabela, { categoriaId, campo }] of Object.entries(SUBCATEGORIA_DAS_TABELAS)) {
    for (const registro of dados[tabela] ?? []) {
      const sub = resolverSubcategoria(parametros, categoriaId, registro, campo);
      if (!sub?.id) continue;
      if (registro["subcategoria_id"] === sub.id && registro[campo] === sub.nome) continue;
      registro["subcategoria_id"] = sub.id;
      registro[campo] = sub.nome;
      ligados += 1;
    }
  }
  return ligados;
}
