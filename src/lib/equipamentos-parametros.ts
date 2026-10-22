// Parâmetros > Equipamentos > Parâmetros Específicos: cadastro em pai e filho. O pai é a subcategoria e o filho é o tipo
// (cada tipo pertence a uma subcategoria). Fase 1: fica só no navegador, em modo demonstração; as tabelas entram na Fase 2.
import { capitalizarTexto } from "./formatacao-cadastral.ts";

export type SubcategoriaEquipamento = { id: string; nome: string };
export type TipoEquipamento = { id: string; subcategoriaId: string; nome: string };
export type ParametrosEquipamento = { subcategorias: SubcategoriaEquipamento[]; tipos: TipoEquipamento[] };
type StorageLike = Pick<Storage, "getItem" | "setItem">;

const CHAVE = "gemape-demo-equipamentos-parametros";

// Subcategorias de fábrica: as quatro das Normas Regulamentadoras que o responsável definiu.
export const SUBCATEGORIAS_PADRAO: readonly SubcategoriaEquipamento[] = [
  { id: "sub-nr11", nome: "Movimentação e elevação de carga (NR-11)" },
  { id: "sub-nr12-nr10", nome: "Maquinário industrial ferramental (NR-12 e NR-10)" },
  { id: "sub-nr13", nome: "Sistemas pneumáticos e hidráulicos (NR-13)" },
  { id: "sub-nr23", nome: "Equipamentos de emergência e combate a incêndio (NR-23)" },
];

// Tipos de fábrica, cada um debaixo da subcategoria da norma a que pertence.
export const TIPOS_PADRAO: readonly TipoEquipamento[] = [
  { id: "tipo-empilhadeiras", subcategoriaId: "sub-nr11", nome: "Empilhadeiras" },
  { id: "tipo-munck", subcategoriaId: "sub-nr11", nome: "Munck" },
  { id: "tipo-ponte-rolante", subcategoriaId: "sub-nr11", nome: "Ponte rolante" },
  { id: "tipo-serra-de-corte", subcategoriaId: "sub-nr12-nr10", nome: "Serra de corte" },
  { id: "tipo-maquina-de-solda", subcategoriaId: "sub-nr12-nr10", nome: "Máquina de solda" },
  { id: "tipo-compressor-de-ar", subcategoriaId: "sub-nr13", nome: "Compressor de ar (vaso de pressão)" },
  { id: "tipo-jato-alta-pressao", subcategoriaId: "sub-nr13", nome: "Jato de alta pressão (lavador)" },
  { id: "tipo-extintores", subcategoriaId: "sub-nr23", nome: "Extintores de incêndio" },
];

const padrao = (): ParametrosEquipamento => ({
  subcategorias: SUBCATEGORIAS_PADRAO.map((s) => ({ ...s })),
  tipos: TIPOS_PADRAO.map((t) => ({ ...t })),
});

const ehObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

// Dado salvo ilegível nunca é sobrescrito: a lista aparece vazia, mas gravar por cima apagaria o que sobrou.
function ler(storage: StorageLike): { dados: ParametrosEquipamento; legivel: boolean } {
  const bruto = storage.getItem(CHAVE);
  if (bruto === null) return { dados: padrao(), legivel: true };
  try {
    const lido: unknown = JSON.parse(bruto);
    if (ehObjeto(lido) && Array.isArray(lido["subcategorias"]) && Array.isArray(lido["tipos"])) {
      const subcategorias = (lido["subcategorias"] as unknown[]).filter(ehObjeto) as unknown as SubcategoriaEquipamento[];
      const tipos = (lido["tipos"] as unknown[]).filter(ehObjeto) as unknown as TipoEquipamento[];
      return { dados: { subcategorias, tipos }, legivel: true };
    }
  } catch {
    /* cai no ilegível */
  }
  return { dados: { subcategorias: [], tipos: [] }, legivel: false };
}

export function lerParametrosEquipamento(storage: StorageLike = localStorage): ParametrosEquipamento {
  return ler(storage).dados;
}

// Valida tudo antes de gravar e grava numa única escrita: ou a mudança entra por inteiro, ou nada muda.
function alterar<T>(storage: StorageLike, acao: (d: ParametrosEquipamento) => T): T {
  const { dados, legivel } = ler(storage);
  if (!legivel) throw new Error("Os parâmetros de equipamentos salvos neste navegador estão ilegíveis; nada foi alterado.");
  const resultado = acao(dados);
  storage.setItem(CHAVE, JSON.stringify(dados));
  return resultado;
}

// Sem acento, sem maiúscula e sem espaço repetido: "Movimentacao" e "movimentação" são o mesmo nome.
const chaveDoNome = (nome: string) => nome.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
const novoId = (prefixo: string) => `${prefixo}-${crypto.randomUUID()}`;

export function salvarSubcategoria(entrada: { id?: string; nome: string }, storage: StorageLike = localStorage): SubcategoriaEquipamento {
  return alterar(storage, (d) => {
    const nome = capitalizarTexto(entrada.nome);
    if (!nome) throw new Error("Informe o nome da subcategoria.");
    const indice = entrada.id ? d.subcategorias.findIndex((s) => s.id === entrada.id) : -1;
    if (entrada.id && indice < 0) throw new Error("Esta subcategoria foi excluída; feche a janela e cadastre de novo, se for o caso.");
    if (d.subcategorias.some((s) => s.id !== entrada.id && chaveDoNome(s.nome) === chaveDoNome(nome))) {
      throw new Error(`Já existe a subcategoria ${nome}.`);
    }
    const subcategoria = { id: entrada.id ?? novoId("sub"), nome };
    if (indice >= 0) d.subcategorias[indice] = subcategoria;
    else d.subcategorias.push(subcategoria);
    return subcategoria;
  });
}

// O pai só sai depois dos filhos: excluir uma subcategoria com tipos deixaria tipos sem pai.
export function removerSubcategoria(id: string, storage: StorageLike = localStorage): void {
  alterar(storage, (d) => {
    if (!d.subcategorias.some((s) => s.id === id)) throw new Error("Esta subcategoria já foi excluída.");
    const filhos = d.tipos.filter((t) => t.subcategoriaId === id).length;
    if (filhos > 0) {
      throw new Error(`Esta subcategoria tem ${filhos} ${filhos === 1 ? "tipo" : "tipos"}; exclua ou mude os tipos para outra subcategoria antes.`);
    }
    d.subcategorias = d.subcategorias.filter((s) => s.id !== id);
  });
}

export function salvarTipo(entrada: { id?: string; subcategoriaId: string; nome: string }, storage: StorageLike = localStorage): TipoEquipamento {
  return alterar(storage, (d) => {
    if (!d.subcategorias.some((s) => s.id === entrada.subcategoriaId)) throw new Error("Escolha a subcategoria do tipo.");
    const nome = capitalizarTexto(entrada.nome);
    if (!nome) throw new Error("Informe o nome do tipo.");
    const indice = entrada.id ? d.tipos.findIndex((t) => t.id === entrada.id) : -1;
    if (entrada.id && indice < 0) throw new Error("Este tipo foi excluído; feche a janela e cadastre de novo, se for o caso.");
    // O nome do tipo é único no cadastro todo, para a escolha no cadastro do equipamento não ficar ambígua.
    if (d.tipos.some((t) => t.id !== entrada.id && chaveDoNome(t.nome) === chaveDoNome(nome))) throw new Error(`Já existe o tipo ${nome}.`);
    const tipo = { id: entrada.id ?? novoId("tipo"), subcategoriaId: entrada.subcategoriaId, nome };
    if (indice >= 0) d.tipos[indice] = tipo;
    else d.tipos.push(tipo);
    return tipo;
  });
}

export function removerTipo(id: string, storage: StorageLike = localStorage): void {
  alterar(storage, (d) => {
    if (!d.tipos.some((t) => t.id === id)) throw new Error("Este tipo já foi excluído.");
    d.tipos = d.tipos.filter((t) => t.id !== id);
  });
}
