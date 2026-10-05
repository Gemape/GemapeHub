// Catálogo de EPI por tamanho (decisão 35). Um registro por descrição e tamanho, sem empresa.
// O estoque de cada empresa continua em `epis`, criado a partir do catálogo.
import { combinaBusca } from "./parametros-base.ts";

export type EpiCatalogo = {
  id: string;
  codigo_sku: string;
  nome: string;
  categoria: string | null;
  subcategoria_id: string | null;
  unidade_id: string | null;
  unidade_medida: string | null;
  tamanho_id: string | null;
  estoque_minimo: number;
  status: string;
  created_at?: string;
};

export type GrupoEpi = {
  chave: string;
  nome: string;
  categoria: string | null;
  unidade_medida: string | null;
  itens: EpiCatalogo[];
};

type Linha = Record<string, unknown>;

export function normalizarDescricao(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function duplicadoNoCatalogo(
  catalogo: Pick<EpiCatalogo, "id" | "nome" | "tamanho_id">[],
  nome: string,
  tamanhoId: string | null,
  ignorarId?: string,
): boolean {
  const chave = normalizarDescricao(nome);
  return catalogo.some(
    (c) => c.id !== ignorarId && normalizarDescricao(c.nome) === chave && (c.tamanho_id ?? null) === (tamanhoId ?? null),
  );
}

export function agruparEpis(catalogo: EpiCatalogo[]): GrupoEpi[] {
  const grupos = new Map<string, GrupoEpi>();
  for (const item of catalogo) {
    const chave = normalizarDescricao(item.nome);
    const grupo = grupos.get(chave) ?? {
      chave,
      nome: item.nome.trim().replace(/\s+/g, " "),
      categoria: item.categoria,
      unidade_medida: item.unidade_medida,
      itens: [],
    };
    grupo.itens.push(item);
    grupos.set(chave, grupo);
  }
  const lista = [...grupos.values()];
  for (const g of lista) g.itens.sort((a, b) => a.codigo_sku.localeCompare(b.codigo_sku));
  return lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export function filtrarGrupos(
  grupos: GrupoEpi[],
  busca: string,
  rotuloTamanho: (id: string | null) => string,
): GrupoEpi[] {
  if (!busca.trim()) return grupos;
  return grupos.filter((g) =>
    combinaBusca(
      busca,
      g.nome,
      g.categoria,
      g.unidade_medida,
      ...g.itens.flatMap((i) => [i.codigo_sku, rotuloTamanho(i.tamanho_id)]),
    ),
  );
}

export function tamanhosLivres<T extends { id: string }>(
  catalogo: Pick<EpiCatalogo, "id" | "nome" | "tamanho_id">[],
  nome: string,
  associados: T[],
): T[] {
  return associados.filter((t) => !duplicadoNoCatalogo(catalogo, nome, t.id));
}

function validarMinimo(valor: string | number | null | undefined): number {
  const texto = String(valor ?? "").trim();
  if (!/^\d+$/.test(texto)) throw new Error("Informe o estoque mínimo (número inteiro, 0 ou mais).");
  return Number(texto);
}

type Escolha = { id: string; nome: string };

export function montarNovoEpi(entrada: {
  nome: string;
  subcategoria: Escolha;
  unidade: Escolha | null;
  tamanhoId: string | null;
  minimo: string | number;
  catalogo: EpiCatalogo[];
  codigo: string;
  pedeTamanho: boolean;
  // Tamanhos associados à subcategoria em Gerais; o escolhido precisa estar entre eles.
  tamanhosPermitidos?: string[];
}): Omit<EpiCatalogo, "id"> {
  const nome = entrada.nome.trim().replace(/\s+/g, " ");
  if (!nome) throw new Error("Informe a descrição do item.");
  if (entrada.pedeTamanho && !entrada.tamanhoId) throw new Error("Selecione o tamanho.");
  if (entrada.tamanhoId && entrada.tamanhosPermitidos && !entrada.tamanhosPermitidos.includes(entrada.tamanhoId)) {
    throw new Error("Tamanho não associado a esta subcategoria em Cadastros > Gerais.");
  }
  const minimo = validarMinimo(entrada.minimo);
  const jaExiste = entrada.catalogo.some((c) => normalizarDescricao(c.nome) === normalizarDescricao(nome));
  if (jaExiste) {
    throw new Error("Já existe um EPI com esta descrição. Use Clonar para cadastrar outro tamanho.");
  }
  return {
    codigo_sku: entrada.codigo,
    nome,
    categoria: entrada.subcategoria.nome,
    subcategoria_id: entrada.subcategoria.id,
    unidade_id: entrada.unidade?.id ?? null,
    unidade_medida: entrada.unidade?.nome ?? null,
    tamanho_id: entrada.tamanhoId || null,
    estoque_minimo: minimo,
    status: "Ativo",
  };
}

export function montarClonagemEpi(entrada: {
  origem: EpiCatalogo;
  tamanhoId: string;
  minimo: string | number;
  catalogo: EpiCatalogo[];
  codigo: string;
  tamanhosPermitidos?: string[];
}): Omit<EpiCatalogo, "id"> {
  const { origem } = entrada;
  if (!entrada.tamanhoId) throw new Error("Selecione o tamanho.");
  if (entrada.tamanhosPermitidos && !entrada.tamanhosPermitidos.includes(entrada.tamanhoId)) {
    throw new Error("Tamanho não associado a esta subcategoria em Cadastros > Gerais.");
  }
  const minimo = validarMinimo(entrada.minimo);
  if (duplicadoNoCatalogo(entrada.catalogo, origem.nome, entrada.tamanhoId)) {
    throw new Error("Este EPI já está cadastrado neste tamanho.");
  }
  return {
    codigo_sku: entrada.codigo,
    nome: origem.nome,
    categoria: origem.categoria,
    subcategoria_id: origem.subcategoria_id,
    unidade_id: origem.unidade_id,
    unidade_medida: origem.unidade_medida,
    tamanho_id: entrada.tamanhoId,
    estoque_minimo: minimo,
    status: "Ativo",
  };
}

/**
 * Cria, para cada empresa, o registro de estoque de cada EPI do catálogo que ainda não o tem, e
 * leva a descrição, a subcategoria e a unidade do catálogo para os registros existentes. Nunca
 * mexe em saldo nem em mínimo já gravado. Devolve se algo mudou.
 */
export function sincronizarEstoqueEpis(
  dados: { empresas?: Linha[]; epis_catalogo?: Linha[]; epis?: Linha[] },
  novoId: () => string,
  agora: string,
): boolean {
  const catalogo = dados.epis_catalogo ?? [];
  if (catalogo.length === 0) return false;
  const epis = dados.epis ?? (dados.epis = []);
  let mudou = false;
  const porChave = new Map<string, Linha>();
  for (const e of epis) if (e["catalogo_id"]) porChave.set(`${e["catalogo_id"]}|${e["empresa_id"]}`, e);
  for (const item of catalogo) {
    const tamanho = (item["tamanho_id"] as string | null) ?? null;
    const comuns = {
      codigo_sku: item["codigo_sku"],
      nome: item["nome"],
      categoria: item["categoria"],
      subcategoria_id: item["subcategoria_id"],
      unidade_id: item["unidade_id"],
      unidade_medida: item["unidade_medida"],
    };
    for (const empresa of dados.empresas ?? []) {
      const existente = porChave.get(`${item["id"]}|${empresa["id"]}`);
      if (!existente) {
        const nova: Linha = {
          id: novoId(), created_at: agora, empresa_id: empresa["id"], catalogo_id: item["id"], ...comuns,
          tamanhos_selecionados: tamanho ? [tamanho] : [], estoque_atual: 0,
          estoque_minimo: item["estoque_minimo"] ?? 0, status: item["status"] ?? "Ativo",
        };
        epis.push(nova);
        porChave.set(`${item["id"]}|${empresa["id"]}`, nova);
        mudou = true;
      } else if (Object.entries(comuns).some(([k, v]) => existente[k] !== v)) {
        Object.assign(existente, comuns);
        mudou = true;
      }
    }
  }
  return mudou;
}

type DadosCatalogo = { epis_catalogo?: Linha[]; epis?: Linha[]; enderecamentos?: Linha[]; [tabela: string]: Linha[] | undefined };

// Editar um EPI do catálogo (decisão 45): a descrição vale para todos os tamanhos do mesmo EPI e
// o estoque mínimo é do tamanho, levado ao estoque de todas as empresas. Código, tamanho,
// subcategoria e unidade não mudam. Tudo ou nada: se algo falha, nada é gravado.
export function editarEpiCatalogo(
  dados: DadosCatalogo,
  catalogoId: string,
  valores: { nome: string; estoque_minimo: string | number },
): { erro?: string } {
  const catalogo = dados.epis_catalogo ?? [];
  const alvo = catalogo.find((c) => c["id"] === catalogoId);
  if (!alvo) return { erro: "EPI não encontrado." };
  const nome = String(valores.nome ?? "").trim().replace(/\s+/g, " ");
  if (!nome) return { erro: "Informe a descrição do item." };
  let minimo: number;
  try {
    minimo = validarMinimo(valores.estoque_minimo);
  } catch (e) {
    return { erro: (e as Error).message };
  }
  const chaveAtual = normalizarDescricao(String(alvo["nome"]));
  const mesmoGrupo = catalogo.filter((c) => normalizarDescricao(String(c["nome"])) === chaveAtual);
  if (normalizarDescricao(nome) !== chaveAtual) {
    const outros = catalogo.filter((c) => !mesmoGrupo.includes(c));
    if (outros.some((c) => normalizarDescricao(String(c["nome"])) === normalizarDescricao(nome))) {
      return { erro: "Já existe um EPI com esta descrição." };
    }
  }
  for (const c of mesmoGrupo) c["nome"] = nome;
  alvo["estoque_minimo"] = minimo;
  for (const e of dados.epis ?? []) {
    if (e["catalogo_id"] === catalogoId) e["estoque_minimo"] = minimo;
    if (mesmoGrupo.some((c) => c["id"] === e["catalogo_id"])) e["nome"] = nome;
  }
  return {};
}

// Excluir um EPI do catálogo (decisão 45): só sem saldo em nenhuma empresa e sem histórico
// (movimentações, compras, ocorrências etc.). Leva junto o estoque zerado e os endereços dele.
export function excluirEpiCatalogo(dados: DadosCatalogo, catalogoId: string): { erro?: string } {
  const alvo = (dados.epis_catalogo ?? []).find((c) => c["id"] === catalogoId);
  if (!alvo) return { erro: "EPI não encontrado." };
  const estoques = (dados.epis ?? []).filter((e) => e["catalogo_id"] === catalogoId);
  if (estoques.some((e) => Number(e["estoque_atual"] ?? 0) !== 0)) {
    return { erro: "Este EPI tem saldo em estoque. Dê a baixa do saldo antes de excluir." };
  }
  const ids = new Set(estoques.map((e) => e["id"]));
  const temHistorico = Object.entries(dados).some(
    ([tabela, linhas]) =>
      tabela !== "epis" && tabela !== "epis_catalogo" && tabela !== "enderecamentos" &&
      (linhas ?? []).some((l) => ids.has(l["item_id"])),
  );
  if (temHistorico) return { erro: "Este EPI tem histórico (movimentações, compras ou ocorrências) e não pode ser excluído." };
  dados.epis_catalogo = (dados.epis_catalogo ?? []).filter((c) => c !== alvo);
  dados.epis = (dados.epis ?? []).filter((e) => e["catalogo_id"] !== catalogoId);
  dados.enderecamentos = (dados.enderecamentos ?? []).filter((e) => e["codigo_produto"] !== alvo["codigo_sku"]);
  return {};
}
