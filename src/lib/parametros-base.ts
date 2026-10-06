// Cadastros > Gerais (especificação rev1: categorias, subcategorias, tamanhos, unidades,
// associação tamanho/medida, código do produto e código de fábrica).
// Fase 1: tudo fica salvo no navegador, sem banco. Os módulos passam a ler daqui numa etapa seguinte.
import { posicaoEmSequencia, TAMANHOS_PADRAO } from "./tamanhos-padrao.ts";
import { validarHabilitacao } from "./caixas-habilitadas.ts";
import { CATEGORIAS_EPI, CATEGORIAS_UNIFORME, TIPOS_VEICULO } from "./gemape.ts";
import { capitalizarCadastro } from "./formatacao-cadastral.ts";
import { CHECKLIST_VEICULOS_PADRAO } from "./checklist-veiculos-padrao.ts";
import { ACOES_MANUTENCAO_PADRAO, TIPOS_OCORRENCIA_VEICULO_PADRAO } from "./veiculos-padrao.ts";

export type Categoria = { id: string; nome: string };
export type TipoEnderecamento = "nao_usa" | "opcional" | "obrigatorio";
export type Subcategoria = { id: string; categoriaId: string; nome: string };
export type Opcao = { id: string; nome: string };
export type ListaFerramenta =
  | "categoriasFerramenta"
  | "gruposFerramenta"
  | "marcasFerramenta"
  | "marcasUniforme"
  | "marcasVeiculo";
export type AcaoManutencaoVeiculo = { id: string; nome: string; subitens: Opcao[] };
// Grupo do check list de veículos (decisão 62): "tipo de veículo · seção" com os itens a conferir.
export type GrupoChecklistVeiculo = { id: string; nome: string; itens: Opcao[] };
export type TipoOcorrenciaVeiculo = { id: string; nome: string; descricao: string };
export type TipoOpcao = "tamanhos" | "unidades";
// Tamanhos e unidades autorizados para uma subcategoria (guarda os ids).
export type Associacao = { subcategoriaId: string } & Record<TipoOpcao, string[]>;
export type RegraCodigo = { categoriaId: string; sigla: string; inicial: string };
export type TabelaProduto = "epis" | "uniformes" | "ferramentas";
export type CodigoFabrica = {
  id: string;
  empresa_id: string;
  tabela: TabelaProduto;
  codigo_produto: string;
  nome_produto: string;
  fornecedor_id: string;
  fornecedor_nome: string;
  codigo_fornecedor: string;
  ca: string;
};
export type DadosCodigoFabrica = Omit<CodigoFabrica, "id">;

export type ParametrosBase = {
  categorias: Categoria[];
  enderecamentoCategorias: Record<string, TipoEnderecamento>;
  subcategorias: Subcategoria[];
  categoriasFerramenta: Opcao[];
  gruposFerramenta: Opcao[];
  marcasFerramenta: Opcao[];
  // Marcas escolhidas nos cadastros de uniforme e de veículo (decisão 22).
  marcasUniforme: Opcao[];
  marcasVeiculo: Opcao[];
  // Parâmetros > Veículos (decisão 46): ações de manutenção e tipos de ocorrência com descrição.
  acoesManutencaoVeiculo: AcaoManutencaoVeiculo[];
  tiposOcorrenciaVeiculo: TipoOcorrenciaVeiculo[];
  // Itens de check list de veículos (decisão 62).
  itensChecklistVeiculo: GrupoChecklistVeiculo[];
  tamanhos: Opcao[];
  unidades: Opcao[];
  associacoes: Associacao[];
  regrasCodigo: RegraCodigo[];
  codigosFabrica: CodigoFabrica[];
  // Números das caixas de ferramentas habilitadas (1 a 100).
  caixasHabilitadas: number[];
  // Ids dos parâmetros desativados: saem das listas de seleção, mas continuam em Gerais
  // e nos cadastros que já os usam (decisão 22).
  inativos: string[];
};

// Categorias-base: cada módulo acha a sua pelo id fixo, então elas e as regras de código
// delas não podem ser excluídas.
export const CATEGORIAS_BASE: Record<string, string> = {
  "cat-epi": "EPI",
  "cat-uniformes": "Uniforme",
  "cat-ferramentas": "Ferramenta",
  "cat-veiculos": "Veículo",
};

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

const CHAVE = "gemape-demo-parametros-base";
// Avisa as telas abertas quando algo muda.
export const EVENTO_PARAMETROS = "gemape-parametros-base";

export const ROTULO_OPCAO: Record<TipoOpcao, { plural: string; singular: string }> = {
  tamanhos: { plural: "Tamanhos e numerações", singular: "tamanho ou numeração" },
  unidades: { plural: "Unidades de medida", singular: "unidade de medida" },
};

const semAcento = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "");
const slug = (v: string) =>
  semAcento(v)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const semOutros = (lista: readonly string[]) => lista.filter((item) => item !== "Outros");

function padrao(): ParametrosBase {
  const categorias: Categoria[] = [
    { id: "cat-epi", nome: "EPI" },
    { id: "cat-uniformes", nome: "Uniformes" },
    { id: "cat-ferramentas", nome: "Ferramentas" },
    { id: "cat-veiculos", nome: "Veículos" },
  ];
  // Listas que já existiam fixas no sistema. Ferramentas segue a especificação.
  const iniciais: Record<string, readonly string[]> = {
    "cat-epi": semOutros(CATEGORIAS_EPI),
    "cat-uniformes": semOutros(CATEGORIAS_UNIFORME),
    "cat-ferramentas": ["Manual", "Elétrica", "Pneumático", "Hidráulica", "Medição", "Corte"],
    "cat-veiculos": semOutros(TIPOS_VEICULO),
  };
  const subcategorias = categorias.flatMap((c) =>
    (iniciais[c.id] ?? []).map((nome) => ({
      id: `sub-${c.id.slice(4)}-${slug(nome)}`,
      categoriaId: c.id,
      nome,
    })),
  );
  const tamanhos = TAMANHOS_PADRAO.map((nome) => ({ id: `tam-${slug(nome)}`, nome }));
  const unidades = ["Unidade", "Par", "Jogo", "Caixa"].map((nome) => ({
    id: `uni-${slug(nome)}`,
    nome,
  }));
  return {
    categorias,
    enderecamentoCategorias: {},
    subcategorias,
    categoriasFerramenta: ["Manual", "Elétrica", "Pneumático", "Hidráulica", "Medição", "Corte"]
      .map((nome) => ({ id: `cat-fer-${slug(nome)}`, nome })),
    gruposFerramenta: ["Chave de fenda", "Chave estria", "Chave boca", "Meia lua", "Combinada", "Canhão", "Alicates", "Lima", "Chave Philips", "Chave L", "Chave Allen", "Cachimbo", "Diversos"]
      .map((nome) => ({ id: `grupo-fer-${slug(nome)}`, nome })),
    marcasFerramenta: [],
    marcasUniforme: [],
    marcasVeiculo: [],
    acoesManutencaoVeiculo: [],
    tiposOcorrenciaVeiculo: [],
    itensChecklistVeiculo: [],
    inativos: [],
    tamanhos,
    unidades,
    associacoes: [
      {
        subcategoriaId: "sub-epi-botina",
        tamanhos: ["tam-37", "tam-38", "tam-39", "tam-40", "tam-41", "tam-42", "tam-43"],
        unidades: ["uni-par"],
      },
      {
        subcategoriaId: "sub-epi-luva",
        tamanhos: ["tam-p", "tam-m", "tam-g"],
        unidades: ["uni-par"],
      },
    ],
    // Especificação rev1: EPI-0001, UNI-0001, VEI-0001.
    regrasCodigo: [
      { categoriaId: "cat-epi", sigla: "EPI", inicial: "0001" },
      { categoriaId: "cat-uniformes", sigla: "UNI", inicial: "0001" },
      { categoriaId: "cat-ferramentas", sigla: "FER", inicial: "0001" },
      { categoriaId: "cat-veiculos", sigla: "VEI", inicial: "0001" },
    ],
    codigosFabrica: [],
    caixasHabilitadas: [],
  };
}

// Numeração do código do produto: 4 dígitos (especificação rev1).
export const DIGITOS_CODIGO = 4;
const completarDigitos = (n: string) => n.padStart(DIGITOS_CODIGO, "0");

const storagePadrao = (): StorageLike | null =>
  typeof localStorage === "undefined" ? null : localStorage;

export const mesmoNome = (a: string, b: string) =>
  a.trim().localeCompare(b.trim(), "pt-BR", { sensitivity: "base" }) === 0;
const limparNome = (nome: string) => nome.trim().replace(/\s+/g, " ");
const novoId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

// Lê os dados salvos. `integro` é false quando havia dados que não puderam ser lidos:
// nesse caso a tela mostra o padrão, mas nenhuma alteração é gravada por cima deles.
function lerComEstado(storage: StorageLike | null): { dados: ParametrosBase; integro: boolean } {
  const base = padrao();
  if (!storage) return { dados: base, integro: true };
  const bruto = storage.getItem(CHAVE);
  if (bruto === null) return { dados: base, integro: true };
  try {
    const salvos = JSON.parse(bruto) as Partial<ParametrosBase> | null;
    if (!salvos || typeof salvos !== "object" || Array.isArray(salvos)) {
      return { dados: base, integro: false };
    }
    for (const chave of Object.keys(base) as (keyof ParametrosBase)[]) {
      if (Array.isArray(salvos[chave])) (base[chave] as unknown[]) = salvos[chave];
    }
    if (salvos.enderecamentoCategorias && typeof salvos.enderecamentoCategorias === "object" &&
      !Array.isArray(salvos.enderecamentoCategorias)) {
      for (const [id, tipo] of Object.entries(salvos.enderecamentoCategorias)) {
        if (base.categorias.some((c) => c.id === id) &&
          (tipo === "nao_usa" || tipo === "opcional" || tipo === "obrigatorio")) {
          base.enderecamentoCategorias[id] = tipo;
        }
      }
    }
    // Ações de manutenção salvas sem subitens (versão anterior) passam a ter a lista vazia.
    base.acoesManutencaoVeiculo = base.acoesManutencaoVeiculo.map((a) => ({ ...a, subitens: Array.isArray(a.subitens) ? a.subitens : [] }));
    base.itensChecklistVeiculo = base.itensChecklistVeiculo.map((g) => ({ ...g, itens: Array.isArray(g.itens) ? g.itens : [] }));
    // Regras salvas antes da definição de 4 dígitos (ex.: 001) passam para 0001.
    base.regrasCodigo = base.regrasCodigo.map((r) => ({
      ...r,
      inicial: completarDigitos(String(r.inicial ?? "")),
    }));
    return { dados: base, integro: true };
  } catch {
    return { dados: base, integro: false };
  }
}

export const lerParametros = (storage: StorageLike | null = storagePadrao()): ParametrosBase =>
  lerComEstado(storage).dados;

function alterar<T>(storage: StorageLike | null, mudanca: (dados: ParametrosBase) => T): T {
  if (!storage) throw new Error("Armazenamento do navegador indisponível.");
  const { dados, integro } = lerComEstado(storage);
  if (!integro) {
    throw new Error(
      "Os cadastros salvos neste navegador não puderam ser lidos. Nada foi alterado, para não apagá-los.",
    );
  }
  const resultado = mudanca(dados);
  storage.setItem(CHAVE, JSON.stringify(dados));
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_PARAMETROS));
  return resultado;
}

function nomeUnico(
  lista: { id: string; nome: string }[],
  nome: string,
  oQue: string,
  ignorarId?: string,
) {
  const limpo = capitalizarCadastro(limparNome(nome));
  if (!limpo) throw new Error(`Informe o nome da ${oQue}.`);
  const repetido = lista.find((item) => item.id !== ignorarId && mesmoNome(item.nome, limpo));
  if (repetido) throw new Error(`Já existe a ${oQue} "${repetido.nome}".`);
  return limpo;
}

function achar<T extends { id: string }>(lista: T[], id: string, oQue: string): T {
  const item = lista.find((i) => i.id === id);
  if (!item) throw new Error(`${oQue} não encontrada.`);
  return item;
}

// ---------- Categorias ----------

export function enderecamentoDaCategoria(dados: ParametrosBase, categoriaId: string): TipoEnderecamento {
  return dados.enderecamentoCategorias?.[categoriaId] ?? "nao_usa";
}

export function salvarEnderecamentoCategoria(
  categoriaId: string,
  tipo: TipoEnderecamento,
  storage = storagePadrao(),
): void {
  alterar(storage, (dados) => {
    achar(dados.categorias, categoriaId, "Categoria");
    if (tipo !== "nao_usa" && tipo !== "opcional" && tipo !== "obrigatorio") {
      throw new Error("Tipo de endereçamento inválido.");
    }
    dados.enderecamentoCategorias[categoriaId] = tipo;
  });
}

export function adicionarCategoria(nome: string, storage = storagePadrao()): Categoria {
  return alterar(storage, (d) => {
    const categoria = { id: novoId(), nome: nomeUnico(d.categorias, nome, "categoria") };
    d.categorias.push(categoria);
    return categoria;
  });
}

export function renomearCategoria(id: string, nome: string, storage = storagePadrao()): void {
  alterar(storage, (d) => {
    achar(d.categorias, id, "Categoria").nome = nomeUnico(d.categorias, nome, "categoria", id);
  });
}

// Só exclui categoria vazia, para não deixar subcategorias soltas.
export function removerCategoria(id: string, storage = storagePadrao()): void {
  alterar(storage, (d) => {
    const categoria = achar(d.categorias, id, "Categoria");
    const modulo = CATEGORIAS_BASE[id];
    if (modulo) {
      throw new Error(
        `A categoria "${categoria.nome}" é a base do cadastro de ${modulo} e não pode ser excluída. Ela pode ser renomeada.`,
      );
    }
    const qtd = d.subcategorias.filter((s) => s.categoriaId === id).length;
    if (qtd > 0) {
      throw new Error(`Exclua antes as ${qtd} subcategoria(s) de "${categoria.nome}".`);
    }
    d.categorias = d.categorias.filter((c) => c.id !== id);
    delete d.enderecamentoCategorias[id];
    d.regrasCodigo = d.regrasCodigo.filter((r) => r.categoriaId !== id);
  });
}

// ---------- Subcategorias ----------

export const subcategoriasDa = (d: ParametrosBase, categoriaId: string) =>
  d.subcategorias.filter((s) => s.categoriaId === categoriaId);

// Só as ativas: são as que aparecem para escolha num cadastro novo.
export const subcategoriasAtivasDa = (d: ParametrosBase, categoriaId: string) =>
  subcategoriasDa(d, categoriaId).filter((s) => estaAtivo(d, s.id));

export function adicionarSubcategoria(
  categoriaId: string,
  nome: string,
  storage = storagePadrao(),
): Subcategoria {
  return alterar(storage, (d) => {
    achar(d.categorias, categoriaId, "Categoria");
    const sub = {
      id: novoId(),
      categoriaId,
      nome: nomeUnico(subcategoriasDa(d, categoriaId), nome, "subcategoria"),
    };
    d.subcategorias.push(sub);
    return sub;
  });
}

export function renomearSubcategoria(id: string, nome: string, storage = storagePadrao()): void {
  alterar(storage, (d) => {
    const sub = achar(d.subcategorias, id, "Subcategoria");
    sub.nome = nomeUnico(subcategoriasDa(d, sub.categoriaId), nome, "subcategoria", id);
  });
}

export function removerSubcategoria(id: string, storage = storagePadrao()): void {
  alterar(storage, (d) => {
    achar(d.subcategorias, id, "Subcategoria");
    d.subcategorias = d.subcategorias.filter((s) => s.id !== id);
    d.inativos = d.inativos.filter((item) => item !== id);
    d.associacoes = d.associacoes.filter((a) => a.subcategoriaId !== id);
  });
}

// ---------- Listas de opções: categorias, grupos e marcas ----------

export function adicionarListaFerramenta(tipo: ListaFerramenta, nome: string, storage = storagePadrao()): Opcao {
  return alterar(storage, (d) => {
    const item = { id: novoId(), nome: nomeUnico(d[tipo], nome, "opção") };
    d[tipo].push(item);
    return item;
  });
}

export function renomearListaFerramenta(tipo: ListaFerramenta, id: string, nome: string, storage = storagePadrao()): void {
  alterar(storage, (d) => {
    achar(d[tipo], id, "Opção").nome = nomeUnico(d[tipo], nome, "opção", id);
  });
}

export function removerListaFerramenta(tipo: ListaFerramenta, id: string, storage = storagePadrao()): void {
  alterar(storage, (d) => {
    achar(d[tipo], id, "Opção");
    d[tipo] = d[tipo].filter((item) => item.id !== id);
    d.inativos = d.inativos.filter((item) => item !== id);
  });
}

// ---------- Parâmetros > Veículos: tipos de ocorrência (decisão 46) ----------

const limparDescricao = (texto: string) => texto.trim().replace(/\s+/g, " ");

// Subitens de uma ação: sem repetir nome dentro do mesmo pai. Os que já existem (mesmo nome)
// mantêm o id, para uma futura ligação com a manutenção não se perder ao editar.
function montarSubitens(atuais: Opcao[], nomes: string[]): Opcao[] {
  const resultado: Opcao[] = [];
  for (const bruto of nomes) {
    if (!limparNome(bruto)) continue;
    const nome = capitalizarCadastro(limparNome(bruto));
    if (resultado.some((r) => mesmoNome(r.nome, nome))) throw new Error(`Subitem repetido: ${nome}.`);
    const existente = atuais.find((s) => mesmoNome(s.nome, nome));
    resultado.push({ id: existente?.id ?? novoId(), nome });
  }
  return resultado;
}

export function adicionarAcaoManutencaoVeiculo(
  nome: string,
  subitens: string[],
  storage = storagePadrao(),
): AcaoManutencaoVeiculo {
  return alterar(storage, (d) => {
    const acao = {
      id: novoId(),
      nome: nomeUnico(d.acoesManutencaoVeiculo, nome, "ação de manutenção"),
      subitens: montarSubitens([], subitens),
    };
    d.acoesManutencaoVeiculo.push(acao);
    return acao;
  });
}

export function editarAcaoManutencaoVeiculo(
  id: string,
  nome: string,
  subitens: string[],
  storage = storagePadrao(),
): void {
  alterar(storage, (d) => {
    const acao = achar(d.acoesManutencaoVeiculo, id, "Ação de manutenção");
    acao.nome = nomeUnico(d.acoesManutencaoVeiculo, nome, "ação de manutenção", id);
    acao.subitens = montarSubitens(acao.subitens, subitens);
  });
}

export function removerAcaoManutencaoVeiculo(id: string, storage = storagePadrao()): void {
  alterar(storage, (d) => {
    achar(d.acoesManutencaoVeiculo, id, "Ação de manutenção");
    d.acoesManutencaoVeiculo = d.acoesManutencaoVeiculo.filter((a) => a.id !== id);
  });
}

export function adicionarTipoOcorrenciaVeiculo(
  nome: string,
  descricao: string,
  storage = storagePadrao(),
): TipoOcorrenciaVeiculo {
  return alterar(storage, (d) => {
    const tipo = {
      id: novoId(),
      nome: nomeUnico(d.tiposOcorrenciaVeiculo, nome, "tipo de ocorrência"),
      descricao: limparDescricao(descricao),
    };
    d.tiposOcorrenciaVeiculo.push(tipo);
    return tipo;
  });
}

export function editarTipoOcorrenciaVeiculo(
  id: string,
  nome: string,
  descricao: string,
  storage = storagePadrao(),
): void {
  alterar(storage, (d) => {
    const tipo = achar(d.tiposOcorrenciaVeiculo, id, "Tipo de ocorrência");
    tipo.nome = nomeUnico(d.tiposOcorrenciaVeiculo, nome, "tipo de ocorrência", id);
    tipo.descricao = limparDescricao(descricao);
  });
}

export function removerTipoOcorrenciaVeiculo(id: string, storage = storagePadrao()): void {
  alterar(storage, (d) => {
    achar(d.tiposOcorrenciaVeiculo, id, "Tipo de ocorrência");
    d.tiposOcorrenciaVeiculo = d.tiposOcorrenciaVeiculo.filter((t) => t.id !== id);
  });
}

// ---------- Parâmetros > Veículos: itens do check list (decisão 62) ----------

// Itens do grupo: texto como digitado (siglas como CRLV não são alteradas), sem repetir nome no mesmo
// grupo. Os que já existem (mesmo nome) mantêm o id.
function montarItensChecklist(atuais: Opcao[], nomes: string[]): Opcao[] {
  const resultado: Opcao[] = [];
  for (const bruto of nomes) {
    const nome = limparNome(bruto);
    if (!nome) continue;
    if (resultado.some((r) => mesmoNome(r.nome, nome))) throw new Error(`Item repetido: ${nome}.`);
    resultado.push({ id: atuais.find((s) => mesmoNome(s.nome, nome))?.id ?? novoId(), nome });
  }
  return resultado;
}

function nomeGrupoChecklist(lista: GrupoChecklistVeiculo[], nome: string, ignorarId?: string): string {
  const limpo = limparNome(nome);
  if (!limpo) throw new Error("Informe o nome do grupo do check list.");
  const repetido = lista.find((g) => g.id !== ignorarId && mesmoNome(g.nome, limpo));
  if (repetido) throw new Error(`Já existe o grupo do check list "${repetido.nome}".`);
  return limpo;
}

export function adicionarGrupoChecklistVeiculo(nome: string, itens: string[], storage = storagePadrao()): GrupoChecklistVeiculo {
  return alterar(storage, (d) => {
    const grupo = { id: novoId(), nome: nomeGrupoChecklist(d.itensChecklistVeiculo, nome), itens: montarItensChecklist([], itens) };
    d.itensChecklistVeiculo.push(grupo);
    return grupo;
  });
}

export function editarGrupoChecklistVeiculo(id: string, nome: string, itens: string[], storage = storagePadrao()): void {
  alterar(storage, (d) => {
    const grupo = achar(d.itensChecklistVeiculo, id, "Grupo do check list");
    grupo.nome = nomeGrupoChecklist(d.itensChecklistVeiculo, nome, id);
    grupo.itens = montarItensChecklist(grupo.itens, itens);
  });
}

export function removerGrupoChecklistVeiculo(id: string, storage = storagePadrao()): void {
  alterar(storage, (d) => {
    achar(d.itensChecklistVeiculo, id, "Grupo do check list");
    d.itensChecklistVeiculo = d.itensChecklistVeiculo.filter((g) => g.id !== id);
  });
}

// Cadastra os grupos padrão que ainda não existem (mesmo nome); o que já está cadastrado não é alterado.
export function cadastrarPadraoChecklistVeiculos(storage = storagePadrao()): { grupos: number; itens: number } {
  return alterar(storage, (d) => {
    let grupos = 0;
    let itens = 0;
    for (const padrao of CHECKLIST_VEICULOS_PADRAO) {
      if (d.itensChecklistVeiculo.some((g) => mesmoNome(g.nome, padrao.nome))) continue;
      d.itensChecklistVeiculo.push({ id: novoId(), nome: padrao.nome, itens: montarItensChecklist([], [...padrao.itens]) });
      grupos += 1;
      itens += padrao.itens.length;
    }
    return { grupos, itens };
  });
}

// Cadastra as ações e os tipos padrão que ainda não existem (mesmo nome, sem diferenciar
// maiúsculas ou acentos). O que já está cadastrado não é repetido nem alterado. Tudo ou nada.
export function cadastrarPadraoVeiculos(storage = storagePadrao()): { acoes: number; tipos: number } {
  return alterar(storage, (d) => {
    let acoes = 0;
    for (const padrao of ACOES_MANUTENCAO_PADRAO) {
      if (d.acoesManutencaoVeiculo.some((a) => mesmoNome(a.nome, padrao.nome))) continue;
      d.acoesManutencaoVeiculo.push({
        id: novoId(),
        nome: capitalizarCadastro(padrao.nome),
        subitens: padrao.subitens.map((nome) => ({ id: novoId(), nome: capitalizarCadastro(nome) })),
      });
      acoes += 1;
    }
    let tipos = 0;
    for (const t of TIPOS_OCORRENCIA_VEICULO_PADRAO) {
      if (d.tiposOcorrenciaVeiculo.some((x) => mesmoNome(x.nome, t.nome))) continue;
      d.tiposOcorrenciaVeiculo.push({ id: novoId(), nome: capitalizarCadastro(t.nome), descricao: t.descricao });
      tipos += 1;
    }
    return { acoes, tipos };
  });
}

// ---------- Desativar e reativar ----------

export const estaAtivo = (d: ParametrosBase, id: string) => !d.inativos.includes(id);

// Lista para escolha: só os ativos, mais o que o cadastro já usa (manter).
export function paraSelecao<T extends { id: string }>(
  d: ParametrosBase,
  lista: T[],
  manter: (item: T) => boolean = () => false,
): T[] {
  return lista.filter((item) => estaAtivo(d, item.id) || manter(item));
}

// Vale para subcategorias, listas de opções (categorias, grupos e marcas), tamanhos e
// unidades (decisão 23).
export function alterarAtivo(id: string, ativo: boolean, storage = storagePadrao()): void {
  alterar(storage, (d) => {
    if (CATEGORIAS_BASE[id]) throw new Error("Categoria-base de módulo não pode ser desativada.");
    const listas: { id: string }[][] = [
      d.subcategorias,
      d.categoriasFerramenta,
      d.gruposFerramenta,
      d.marcasFerramenta,
      d.marcasUniforme,
      d.marcasVeiculo,
      d.tamanhos,
      d.unidades,
    ];
    if (!listas.some((lista) => lista.some((item) => item.id === id))) {
      throw new Error("Parâmetro não encontrado.");
    }
    d.inativos = d.inativos.filter((item) => item !== id);
    if (!ativo) d.inativos.push(id);
  });
}

// ---------- Tamanhos e unidades ----------

export function adicionarOpcao(tipo: TipoOpcao, nome: string, storage = storagePadrao()): Opcao {
  return alterar(storage, (d) => {
    const limpo = limparNome(nome);
    if (!limpo) throw new Error(`Informe o ${ROTULO_OPCAO[tipo].singular}.`);
    const repetido = d[tipo].find((o) => mesmoNome(o.nome, limpo));
    if (repetido) throw new Error(`"${repetido.nome}" já está cadastrado.`);
    const opcao = { id: novoId(), nome: limpo };
    // Tamanhos entram na posição da sequência; as unidades vão para o fim.
    if (tipo === "tamanhos") d.tamanhos.splice(posicaoEmSequencia(d.tamanhos, limpo), 0, opcao);
    else d[tipo].push(opcao);
    return opcao;
  });
}

// Cadastra todos os tamanhos e numerações padrão que ainda não existem, cada um na posição da
// sequência. O que já está cadastrado (mesmo nome, sem diferenciar maiúsculas) não é repetido
// nem alterado. Devolve quantos foram incluídos.
export function cadastrarTamanhosPadrao(storage = storagePadrao()): number {
  return alterar(storage, (d) => {
    let incluidos = 0;
    for (const nome of TAMANHOS_PADRAO) {
      if (d.tamanhos.some((t) => mesmoNome(t.nome, nome))) continue;
      // Id novo: um tamanho padrão excluído antes pode ainda estar citado em produtos antigos,
      // e reaproveitar o id antigo faria essa referência órfã voltar a valer.
      d.tamanhos.splice(posicaoEmSequencia(d.tamanhos, nome), 0, { id: novoId(), nome });
      incluidos += 1;
    }
    return incluidos;
  });
}

export function renomearOpcao(
  tipo: TipoOpcao,
  id: string,
  nome: string,
  storage = storagePadrao(),
): void {
  alterar(storage, (d) => {
    const opcao = achar(d[tipo], id, "Opção");
    const limpo = limparNome(nome);
    if (!limpo) throw new Error(`Informe o ${ROTULO_OPCAO[tipo].singular}.`);
    const repetido = d[tipo].find((o) => o.id !== id && mesmoNome(o.nome, limpo));
    if (repetido) throw new Error(`"${repetido.nome}" já está cadastrado.`);
    opcao.nome = limpo;
  });
}

// Excluir também tira a opção das subcategorias que a autorizavam. A tela confere antes
// se ela está em uso (uso-parametros.ts) e recusa.
export function removerOpcao(tipo: TipoOpcao, id: string, storage = storagePadrao()): void {
  alterar(storage, (d) => {
    d[tipo] = d[tipo].filter((o) => o.id !== id);
    d.inativos = d.inativos.filter((item) => item !== id);
    for (const a of d.associacoes) a[tipo] = a[tipo].filter((item) => item !== id);
  });
}

// Muda a posição na lista sequencial (-1 sobe, +1 desce).
export function moverOpcao(
  tipo: TipoOpcao,
  id: string,
  passo: -1 | 1,
  storage = storagePadrao(),
): void {
  alterar(storage, (d) => {
    const i = d[tipo].findIndex((o) => o.id === id);
    const j = i + passo;
    if (i < 0 || j < 0 || j >= d[tipo].length) return;
    const lista = [...d[tipo]];
    [lista[i], lista[j]] = [lista[j]!, lista[i]!];
    d[tipo] = lista;
  });
}

// Quantas subcategorias autorizam a opção.
export const usoDaOpcao = (d: ParametrosBase, tipo: TipoOpcao, id: string) =>
  d.associacoes.filter((a) => a[tipo].includes(id)).length;

// ---------- Associar tamanho e medida ----------

// Autorizados na ordem da lista sequencial.
export function autorizados(d: ParametrosBase, subcategoriaId: string, tipo: TipoOpcao): Opcao[] {
  const ids = d.associacoes.find((a) => a.subcategoriaId === subcategoriaId)?.[tipo] ?? [];
  return d[tipo].filter((o) => ids.includes(o.id));
}

function mudarAutorizacao(
  subcategoriaId: string,
  tipo: TipoOpcao,
  ids: string[],
  autorizar: boolean,
  storage: StorageLike | null,
) {
  alterar(storage, (d) => {
    achar(d.subcategorias, subcategoriaId, "Subcategoria");
    let assoc = d.associacoes.find((a) => a.subcategoriaId === subcategoriaId);
    if (!assoc) {
      assoc = { subcategoriaId, tamanhos: [], unidades: [] };
      d.associacoes.push(assoc);
    }
    const existentes = new Set(d[tipo].map((o) => o.id));
    const atuais = new Set(assoc[tipo]);
    for (const id of ids) {
      if (autorizar && existentes.has(id)) atuais.add(id);
      else atuais.delete(id);
    }
    assoc[tipo] = [...atuais];
  });
}

export const autorizar = (
  subcategoriaId: string,
  tipo: TipoOpcao,
  ids: string[],
  storage = storagePadrao(),
) => mudarAutorizacao(subcategoriaId, tipo, ids, true, storage);
export const desautorizar = (
  subcategoriaId: string,
  tipo: TipoOpcao,
  ids: string[],
  storage = storagePadrao(),
) => mudarAutorizacao(subcategoriaId, tipo, ids, false, storage);

// ---------- Código do produto ----------

// Sigla + numeração de 4 dígitos: EPI + 0001 -> EPI-0001, EPI-0002...
export function gerarCodigo(regra: Pick<RegraCodigo, "sigla" | "inicial">, posicao = 0): string {
  const numero = Number(regra.inicial) + posicao;
  return `${regra.sigla}-${String(numero).padStart(regra.inicial.length, "0")}`;
}

// Próximo código da sequência: um depois do maior já usado com a mesma sigla,
// nunca abaixo da numeração inicial da regra.
export function proximoCodigo(
  regra: Pick<RegraCodigo, "sigla" | "inicial">,
  existentes: (string | null | undefined)[],
): string {
  const prefixo = `${regra.sigla}-`.toUpperCase();
  const inicial = Number(regra.inicial);
  let maior = inicial - 1;
  for (const codigo of existentes) {
    const texto = String(codigo ?? "").trim().toUpperCase();
    if (!texto.startsWith(prefixo)) continue;
    const numero = texto.slice(prefixo.length);
    if (/^\d+$/.test(numero)) maior = Math.max(maior, Number(numero));
  }
  return gerarCodigo(regra, maior + 1 - inicial);
}

export function salvarRegraCodigo(
  categoriaId: string,
  sigla: string,
  inicial: string,
  storage = storagePadrao(),
): RegraCodigo {
  return alterar(storage, (d) => {
    achar(d.categorias, categoriaId, "Categoria");
    const s = semAcento(sigla).trim().toUpperCase();
    const n = completarDigitos(inicial.trim());
    if (!/^[A-Z0-9]{1,6}$/.test(s))
      throw new Error("A sigla deve ter de 1 a 6 letras ou números, sem espaços.");
    if (!/^\d{4}$/.test(n) || Number(n) < 1) {
      throw new Error(
        "A numeração inicial deve ter até 4 dígitos, só números, maior que zero (ex.: 0001).",
      );
    }
    const outra = d.regrasCodigo.find((r) => r.categoriaId !== categoriaId && r.sigla === s);
    if (outra) {
      const nome = d.categorias.find((c) => c.id === outra.categoriaId)?.nome ?? "outra categoria";
      throw new Error(`A sigla ${s} já é usada em ${nome}.`);
    }
    const regra = { categoriaId, sigla: s, inicial: n };
    d.regrasCodigo = [...d.regrasCodigo.filter((r) => r.categoriaId !== categoriaId), regra];
    return regra;
  });
}

export function removerRegraCodigo(categoriaId: string, storage = storagePadrao()): void {
  alterar(storage, (d) => {
    const modulo = CATEGORIAS_BASE[categoriaId];
    if (modulo) {
      throw new Error(
        `Sem esta regra, novos cadastros de ${modulo} ficariam bloqueados. Edite a sigla ou a numeração em vez de excluir.`,
      );
    }
    d.regrasCodigo = d.regrasCodigo.filter((r) => r.categoriaId !== categoriaId);
  });
}

// ---------- Código de fábrica ----------

export function salvarCodigoFabrica(
  valores: DadosCodigoFabrica,
  id?: string,
  storage = storagePadrao(),
): CodigoFabrica {
  return alterar(storage, (d) => {
    const v = Object.fromEntries(
      Object.entries(valores).map(([k, valor]) => [k, String(valor ?? "").trim()]),
    ) as DadosCodigoFabrica;
    if (!v.codigo_produto || !v.empresa_id) throw new Error("Selecione o produto GEMAPE.");
    if (!v.fornecedor_id) throw new Error("Selecione o fornecedor.");
    if (!v.codigo_fornecedor)
      throw new Error("Informe o código do produto na nota fiscal do fornecedor.");
    if (v.tabela === "epis" && !v.ca)
      throw new Error("Para EPI, informe o CA que está na nota fiscal.");
    if (v.tabela === "epis" && !/^\d+$/.test(v.ca))
      throw new Error("O CA deve ter somente números.");
    if (v.tabela !== "epis") v.ca = "";
    const repetido = d.codigosFabrica.find(
      (c) =>
        c.id !== id &&
        // Cada empresa tem seus produtos: o mesmo código do fornecedor pode existir em outra empresa.
        c.empresa_id === v.empresa_id &&
        c.fornecedor_id === v.fornecedor_id &&
        mesmoNome(c.codigo_fornecedor, v.codigo_fornecedor),
    );
    if (repetido) {
      throw new Error(
        `O código ${repetido.codigo_fornecedor} deste fornecedor já está associado a ${repetido.codigo_produto}.`,
      );
    }
    if (id) {
      const atual = achar(d.codigosFabrica, id, "Código de fábrica");
      Object.assign(atual, v);
      return atual;
    }
    const novo = { id: novoId(), ...v };
    d.codigosFabrica.push(novo);
    return novo;
  });
}

export function removerCodigoFabrica(id: string, storage = storagePadrao()): void {
  alterar(storage, (d) => {
    d.codigosFabrica = d.codigosFabrica.filter((c) => c.id !== id);
  });
}

/** Remove vários códigos de fábrica de uma vez (usado quando o fornecedor ou o produto é excluído). */
export function removerCodigosFabricaPorIds(ids: string[], storage = storagePadrao()): void {
  if (ids.length === 0) return;
  const sair = new Set(ids);
  alterar(storage, (d) => {
    d.codigosFabrica = d.codigosFabrica.filter((c) => !sair.has(c.id));
  });
}

// Busca por palavras em qualquer ordem, sem diferenciar acento e maiúsculas.
export function combinaBusca(termo: string, ...campos: (string | null | undefined)[]): boolean {
  const texto = semAcento(campos.filter(Boolean).join(" ")).toLowerCase();
  return semAcento(termo)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((p) => texto.includes(p));
}

// ---------- Caixas de ferramentas habilitadas ----------

/**
 * Grava de uma vez a lista de caixas habilitadas; recusa desabilitar caixa já cadastrada.
 * `cadastradas` null (lista não carregada ou com erro) recusa, para não liberar caixa em uso.
 */
export function salvarCaixasHabilitadas(
  numeros: number[],
  cadastradas: Parameters<typeof validarHabilitacao>[1] | null,
  storage = storagePadrao(),
): void {
  if (!cadastradas) {
    throw new Error("Não foi possível ler as caixas cadastradas. Nada foi alterado; tente de novo.");
  }
  const erro = validarHabilitacao(numeros, cadastradas);
  if (erro) throw new Error(erro);
  alterar(storage, (d) => {
    d.caixasHabilitadas = [...new Set(numeros)].sort((a, b) => a - b);
  });
}
