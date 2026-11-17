// Cadastros > Gerais (especificação rev1: categorias, subcategorias, tamanhos, unidades,
// associação tamanho/medida, código do produto e código de fábrica).
// Fase 1: tudo fica salvo no navegador, sem banco. Os módulos passam a ler daqui numa etapa seguinte.
import { posicaoEmSequencia, TAMANHOS_PADRAO } from "./tamanhos-padrao.ts";
import { validarHabilitacao } from "./caixas-habilitadas.ts";
import { CATEGORIAS_EPI, CATEGORIAS_UNIFORME, TIPOS_VEICULO } from "./gemape.ts";
import { capitalizarCadastro } from "./formatacao-cadastral.ts";
import { CHECKLIST_VEICULOS_PADRAO, NOMES_PADRAO_ANTIGO, chaveDoTipoVeiculo, ehGrupoAvulso, tiposDoGrupoPadrao } from "./checklist-veiculos-padrao.ts";
import { TAMANHOS_FERRAMENTAS_PADRAO } from "./tamanhos-ferramentas-padrao.ts";
import { ACOES_MANUTENCAO_PADRAO, ehOutros, MARCAS_VEICULO_PADRAO, NOME_OUTROS, TIPOS_OCORRENCIA_VEICULO_PADRAO } from "./veiculos-padrao.ts";

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
// `tiposVeiculo`: ids de subcategorias de Veículos a que o grupo se aplica, ou TODOS_OS_TIPOS (decisão 63).
export const TODOS_OS_TIPOS = "*";
export type GrupoChecklistVeiculo = { id: string; nome: string; itens: Opcao[]; tiposVeiculo: string[] };
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
  // Tamanhos de cada grupo de ferramenta (decisão 117), por id do grupo.
  tamanhosGrupoFerramenta: Record<string, string[]>;
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
  "cat-equipamentos": "Equipamento",
  "cat-checklist": "Check list",
};

// Categorias que existem só para ter linha em Código do produto (EQP e CHK): não têm subcategorias nem tamanhos, então ficam fora das telas de Categorias e de tamanhos.
export const CATEGORIAS_SO_DE_CODIGO: readonly string[] = ["cat-equipamentos", "cat-checklist"];
export const categoriasDeCadastro = <T extends { id: string }>(lista: T[]): T[] => lista.filter((c) => !CATEGORIAS_SO_DE_CODIGO.includes(c.id));

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

const CHAVE = "gemape-demo-parametros-base";
// Decisão 69 (substituída): a subcategoria Empilhadeira de Veículos sai uma vez; depois de qualquer gravação o marcador
// impede nova limpeza, e quem a criar de novo em Gerais a mantém.
// (Chave nova: a antiga já estava gravada em quem salvou algum parâmetro antes da saída da Empilhadeira de Veículos.)
const CHAVE_EMPILHADEIRA = "gemape-demo-sem-empilhadeira-veiculos";
// Marca que os grupos "Avulso · ..." já foram ajustados aos 16 itens da decisão 131 (só roda uma vez por navegador).
// Marca que os tamanhos da Chave de fenda (decisão 135) já foram incluídos neste navegador.
const CHAVE_FENDA_135 = "gemape-demo-tamanhos-chave-de-fenda-135";
const CHAVE_AVULSO_131 = "gemape-demo-checklist-avulso-itens-131";
const ITENS_AVULSO_RETIRADOS_131 = [
  "Kit de primeiros socorros", "Nível do óleo da transmissão (se aplicável)", "Bateria (estado e fixação)", "Luz de freio", "Luz de ré", "Pisca-alerta",
  "Setas (dianteira e traseira)", "Iluminação do painel", "Extintor de incêndio (validade e pressão)", "Triângulo de sinalização",
  "Limpador e lavador do para-brisa", "Palhetas em bom estado", "Bancos e cintos limpos",
];
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
    { id: "cat-equipamentos", nome: "Equipamentos" },
    { id: "cat-checklist", nome: "Check list" },
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
    tamanhosGrupoFerramenta: {},
    marcasUniforme: [],
    marcasVeiculo: MARCAS_VEICULO_PADRAO.map((nome) => ({ id: `marca-vei-${slug(nome)}`, nome })),
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
      { categoriaId: "cat-equipamentos", sigla: "EQP", inicial: "0001" },
      { categoriaId: "cat-checklist", sigla: "CHK", inicial: "0001" },
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
        if ((id === CATEGORIA_EQUIPAMENTOS || base.categorias.some((c) => c.id === id)) &&
          (tipo === "nao_usa" || tipo === "opcional" || tipo === "obrigatorio")) {
          base.enderecamentoCategorias[id] = tipo;
        }
      }
    }
    base.tamanhosGrupoFerramenta = {};
    if (salvos.tamanhosGrupoFerramenta && typeof salvos.tamanhosGrupoFerramenta === "object" && !Array.isArray(salvos.tamanhosGrupoFerramenta)) {
      for (const [id, lista] of Object.entries(salvos.tamanhosGrupoFerramenta)) {
        if (Array.isArray(lista)) base.tamanhosGrupoFerramenta[id] = lista.filter((t): t is string => typeof t === "string");
      }
    }
    // Ações de manutenção salvas sem subitens (versão anterior) passam a ter a lista vazia.
    // Decisão 163: todo grupo tem o item Outros (descrição aberta); quem não tem ganha no fim, com id fixo para não mudar a cada leitura.
    base.acoesManutencaoVeiculo = base.acoesManutencaoVeiculo.map((a) => {
      const subitens = Array.isArray(a.subitens) ? a.subitens : [];
      return { ...a, subitens: subitens.some((s) => ehOutros(s.nome)) ? subitens : [...subitens, { id: `outros-${a.id}`, nome: NOME_OUTROS }] };
    });
    // Grupos salvos antes do vínculo com o tipo de veículo (decisão 62) continuam valendo para todos.
    base.itensChecklistVeiculo = base.itensChecklistVeiculo.map((g) => ({
      ...g,
      itens: Array.isArray(g.itens) ? g.itens : [],
      tiposVeiculo: Array.isArray(g.tiposVeiculo) ? g.tiposVeiculo : [TODOS_OS_TIPOS],
    }));
    // Decisão 131: quem cadastrou os grupos "Avulso · ..." antes do ajuste tem os 13 itens retirados tirados de lá e o grupo Outros incluído.
    if (storage.getItem(CHAVE_AVULSO_131) === null) {
      let ajustou = false;
      for (const g of base.itensChecklistVeiculo) {
        if (!ehGrupoAvulso(g.nome) || !CHECKLIST_VEICULOS_PADRAO.some((p) => mesmoNome(p.nome, g.nome))) continue;
        const antes = g.itens.length;
        g.itens = g.itens.filter((i) => !ITENS_AVULSO_RETIRADOS_131.some((n) => mesmoNome(n, i.nome)));
        if (g.itens.length !== antes) ajustou = true;
      }
      const outros = CHECKLIST_VEICULOS_PADRAO.find((p) => p.nome === "Avulso · Outros");
      if (ajustou && outros && !base.itensChecklistVeiculo.some((g) => mesmoNome(g.nome, outros.nome))) {
        base.itensChecklistVeiculo.push({ id: "grupo-avulso-outros-131", nome: outros.nome, itens: montarItensChecklist([], [...outros.itens]), tiposVeiculo: [TODOS_OS_TIPOS] });
      }
    }
    // Decisão 135: quem já tem o grupo Chave de fenda recebe, uma vez, os tamanhos que faltam do padrão (sem apagar nem repetir).
    if (storage.getItem(CHAVE_FENDA_135) === null) {
      const fenda = base.gruposFerramenta.find((g) => mesmoNome(g.nome, "Chave de fenda"));
      const padraoFenda = TAMANHOS_FERRAMENTAS_PADRAO.find((p) => mesmoNome(p.grupo, "Chave de fenda"));
      if (fenda && padraoFenda) {
        const lista = base.tamanhosGrupoFerramenta[fenda.id] ?? [];
        for (const t of padraoFenda.tamanhos) if (!lista.some((x) => mesmoNome(x, t))) lista.push(t);
        base.tamanhosGrupoFerramenta[fenda.id] = lista;
      }
    }
    // Empilhadeira passou a ser só do módulo Equipamentos: quem tinha a subcategoria em Veículos e os grupos de check list dela perde os dois, uma vez só.
    if (storage.getItem(CHAVE_EMPILHADEIRA) === null) {
      base.subcategorias = base.subcategorias.filter((s) => !(s.categoriaId === "cat-veiculos" && /empilh/i.test(s.nome)));
      base.itensChecklistVeiculo = base.itensChecklistVeiculo.filter((g) => !g.nome.startsWith("Empilhadeiras ·"));
    }
    // Regras salvas antes da definição de 4 dígitos (ex.: 001) passam para 0001.
    base.regrasCodigo = base.regrasCodigo.map((r) => ({
      ...r,
      inicial: completarDigitos(String(r.inicial ?? "")),
    }));
    // Equipamentos (EQP-0001) e Check list (CHK-0001) passaram a ter código do produto: quem já tinha o cadastro ganha as duas categorias e as siglas, sem mexer no que existe.
    for (const [id, nome, sigla] of [["cat-equipamentos", "Equipamentos", "EQP"], ["cat-checklist", "Check list", "CHK"]] as const) {
      if (!base.categorias.some((c) => c.id === id)) base.categorias.push({ id, nome });
      if (!base.regrasCodigo.some((r) => r.categoriaId === id) && !base.regrasCodigo.some((r) => r.sigla === sigla)) base.regrasCodigo.push({ categoriaId: id, sigla, inicial: "0001" });
    }
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
  storage.setItem(CHAVE_EMPILHADEIRA, "1");
  storage.setItem(CHAVE_AVULSO_131, "1");
  storage.setItem(CHAVE_FENDA_135, "1");
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

// Equipamentos não são uma categoria de Gerais: o endereçamento deles tem esta chave própria, definida em Parâmetros > Equipamentos > Parâmetros Específicos.
export const CATEGORIA_EQUIPAMENTOS = "cat-equipamentos";

export function enderecamentoDaCategoria(dados: ParametrosBase, categoriaId: string): TipoEnderecamento {
  return dados.enderecamentoCategorias?.[categoriaId] ?? "nao_usa";
}

export function salvarEnderecamentoCategoria(
  categoriaId: string,
  tipo: TipoEnderecamento,
  storage = storagePadrao(),
): void {
  alterar(storage, (dados) => {
    if (categoriaId !== CATEGORIA_EQUIPAMENTOS) achar(dados.categorias, categoriaId, "Categoria");
    if (tipo !== "nao_usa" && tipo !== "opcional" && tipo !== "obrigatorio") {
      throw new Error("Tipo de endereçamento inválido. Escolha Não usa, Opcional ou Obrigatório.");
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
    // O tipo apagado deixa de valer nos grupos do check list de veículos.
    d.itensChecklistVeiculo.forEach((g) => { g.tiposVeiculo = g.tiposVeiculo.filter((t) => t !== id); });
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
    if (tipo === "gruposFerramenta") delete d.tamanhosGrupoFerramenta[id];
  });
}

// ---------- Tamanhos por grupo de ferramenta (decisão 117) ----------

const limparTamanhoFerramenta = (texto: string) => texto.trim().replace(/\s+/g, " ").slice(0, 40);

export function adicionarTamanhoGrupoFerramenta(grupoId: string, texto: string, storage = storagePadrao()): string {
  return alterar(storage, (d) => {
    achar(d.gruposFerramenta, grupoId, "Grupo de ferramenta");
    const tamanho = limparTamanhoFerramenta(texto);
    if (!tamanho) throw new Error("Informe o tamanho.");
    const lista = d.tamanhosGrupoFerramenta[grupoId] ?? [];
    if (lista.some((t) => mesmoNome(t, tamanho))) throw new Error(`O tamanho "${tamanho}" já existe neste grupo.`);
    d.tamanhosGrupoFerramenta[grupoId] = [...lista, tamanho];
    return tamanho;
  });
}

export function removerTamanhoGrupoFerramenta(grupoId: string, tamanho: string, storage = storagePadrao()): void {
  alterar(storage, (d) => {
    achar(d.gruposFerramenta, grupoId, "Grupo de ferramenta");
    d.tamanhosGrupoFerramenta[grupoId] = (d.tamanhosGrupoFerramenta[grupoId] ?? []).filter((t) => t !== tamanho);
  });
}

// Cadastra os grupos e tamanhos da planilha que ainda não existem; nada que já foi cadastrado é mudado nem apagado.
// `nomes` limita aos grupos escolhidos um a um na tela; sem ele, todos.
export function cadastrarTamanhosPadraoFerramentas(storage = storagePadrao(), nomes?: string[]): { grupos: number; tamanhos: number } {
  return alterar(storage, (d) => {
    let grupos = 0;
    let tamanhos = 0;
    for (const padrao of TAMANHOS_FERRAMENTAS_PADRAO) {
      if (nomes && !nomes.some((n) => mesmoNome(n, padrao.grupo))) continue;
      let grupo = d.gruposFerramenta.find((g) => mesmoNome(g.nome, padrao.grupo));
      if (!grupo) {
        grupo = { id: novoId(), nome: capitalizarCadastro(limparNome(padrao.grupo)) };
        d.gruposFerramenta.push(grupo);
        grupos += 1;
      }
      const lista = d.tamanhosGrupoFerramenta[grupo.id] ?? [];
      for (const t of padrao.tamanhos) {
        if (lista.some((x) => mesmoNome(x, t))) continue;
        lista.push(t);
        tamanhos += 1;
      }
      if (lista.length > 0) d.tamanhosGrupoFerramenta[grupo.id] = lista;
    }
    return { grupos, tamanhos };
  });
}

// Grupos do padrão que ainda faltam (o grupo ou algum subgrupo), com só os subgrupos que faltam: é o que a tela oferece para escolher um a um.
export function pendentesPadraoFerramentas(storage = storagePadrao()): { nome: string; itens: readonly string[] }[] {
  const d = lerParametros(storage);
  return TAMANHOS_FERRAMENTAS_PADRAO.flatMap((p) => {
    const grupo = d.gruposFerramenta.find((g) => mesmoNome(g.nome, p.grupo));
    const atuais = grupo ? (d.tamanhosGrupoFerramenta[grupo.id] ?? []) : [];
    const faltam = p.tamanhos.filter((t) => !atuais.some((x) => mesmoNome(x, t)));
    return !grupo || faltam.length > 0 ? [{ nome: p.grupo, itens: faltam }] : [];
  });
}

// Subgrupos (filhos) de um grupo de ferramenta (decisão 159): são os mesmos tamanhos, numerações e especificações
// do grupo. "substituir" troca a lista inteira (editar); "somar" acrescenta (cadastrar e clonar). Tudo ou nada.
export function definirSubgruposGrupoFerramenta(
  grupoId: string,
  nomes: string[],
  modo: "substituir" | "somar",
  storage = storagePadrao(),
): { total: number } {
  return alterar(storage, (d) => {
    achar(d.gruposFerramenta, grupoId, "Grupo de ferramenta");
    const novos: string[] = [];
    for (const bruto of nomes) {
      const nome = limparTamanhoFerramenta(bruto);
      if (!nome) continue;
      if (novos.some((n) => mesmoNome(n, nome))) throw new Error(`Subgrupo repetido: ${nome}.`);
      novos.push(nome);
    }
    if (modo === "somar" && novos.length === 0) throw new Error("Informe ao menos um subgrupo.");
    const atuais = d.tamanhosGrupoFerramenta[grupoId] ?? [];
    if (modo === "somar") {
      const repetido = novos.find((n) => atuais.some((a) => mesmoNome(a, n)));
      if (repetido) throw new Error(`O subgrupo "${repetido}" já existe neste grupo.`);
    }
    const lista = modo === "somar" ? [...atuais, ...novos] : novos;
    if (lista.length > 0) d.tamanhosGrupoFerramenta[grupoId] = lista;
    else delete d.tamanhosGrupoFerramenta[grupoId];
    return { total: lista.length };
  });
}

export type SituacaoPadraoFerramenta = "igual" | "alterado" | "ausente";

// Grupos do padrão inicial de tamanhos (decisão 117) com a situação de cada um no cadastro atual.
export function situacoesPadraoFerramentas(
  storage = storagePadrao(),
): { nome: string; itens: readonly string[]; situacao: SituacaoPadraoFerramenta }[] {
  const d = lerParametros(storage);
  return TAMANHOS_FERRAMENTAS_PADRAO.filter((p) => p.tamanhos.length > 0).map((p) => {
    const grupo = d.gruposFerramenta.find((g) => mesmoNome(g.nome, p.grupo));
    if (!grupo) return { nome: p.grupo, itens: p.tamanhos, situacao: "ausente" as const };
    const atuais = d.tamanhosGrupoFerramenta[grupo.id] ?? [];
    const igual = atuais.length === p.tamanhos.length && p.tamanhos.every((t, i) => atuais[i] === t);
    return { nome: p.grupo, itens: p.tamanhos, situacao: igual ? ("igual" as const) : ("alterado" as const) };
  });
}

// Volta os grupos marcados ao padrão inicial: subgrupos do padrão, na ordem dele (o grupo excluído é cadastrado de novo).
export function restaurarPadroesFerramentas(nomes: string[], storage = storagePadrao()): { restaurados: number; criados: number } {
  if (nomes.length === 0) throw new Error("Marque ao menos um grupo para restaurar.");
  return alterar(storage, (d) => {
    let restaurados = 0;
    let criados = 0;
    for (const nome of nomes) {
      const padrao = TAMANHOS_FERRAMENTAS_PADRAO.find((p) => mesmoNome(p.grupo, nome));
      if (!padrao) throw new Error(`"${nome}" não faz parte do padrão inicial.`);
      let grupo = d.gruposFerramenta.find((g) => mesmoNome(g.nome, padrao.grupo));
      if (!grupo) {
        grupo = { id: novoId(), nome: capitalizarCadastro(limparNome(padrao.grupo)) };
        d.gruposFerramenta.push(grupo);
        criados += 1;
      } else {
        restaurados += 1;
      }
      if (padrao.tamanhos.length > 0) d.tamanhosGrupoFerramenta[grupo.id] = [...padrao.tamanhos];
    }
    return { restaurados, criados };
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

// Todo grupo de ações tem o item Outros (decisão 163): vai ao fim se a lista não o trouxe, mantendo o id do que já existia.
function comOutros(subitens: Opcao[], atuais: Opcao[] = []): Opcao[] {
  if (subitens.some((s) => ehOutros(s.nome))) return subitens;
  return [...subitens, atuais.find((s) => ehOutros(s.nome)) ?? { id: novoId(), nome: NOME_OUTROS }];
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
      subitens: comOutros(montarSubitens([], subitens)),
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
    acao.subitens = comOutros(montarSubitens(acao.subitens, subitens), acao.subitens);
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

// Tipos de veículo do grupo: "todos" ou subcategorias de Veículos que existem em Gerais.
function tiposDoGrupo(d: ParametrosBase, tipos: string[]): string[] {
  if (tipos.includes(TODOS_OS_TIPOS)) return [TODOS_OS_TIPOS];
  if (tipos.length === 0) throw new Error("Escolha o tipo de veículo do grupo, ou todos os tipos.");
  const validos = subcategoriasDa(d, "cat-veiculos").map((s) => s.id);
  const ruim = tipos.find((t) => !validos.includes(t));
  if (ruim) throw new Error("Tipo de veículo não encontrado em Cadastros > Gerais.");
  return [...new Set(tipos)];
}

export function adicionarGrupoChecklistVeiculo(
  nome: string,
  itens: string[],
  tiposVeiculo: string[],
  storage = storagePadrao(),
): GrupoChecklistVeiculo {
  return alterar(storage, (d) => {
    const grupo = {
      id: novoId(),
      nome: nomeGrupoChecklist(d.itensChecklistVeiculo, nome),
      itens: montarItensChecklist([], itens),
      tiposVeiculo: tiposDoGrupo(d, tiposVeiculo),
    };
    d.itensChecklistVeiculo.push(grupo);
    return grupo;
  });
}

export function editarGrupoChecklistVeiculo(
  id: string,
  nome: string,
  itens: string[],
  tiposVeiculo: string[],
  storage = storagePadrao(),
): void {
  alterar(storage, (d) => {
    const grupo = achar(d.itensChecklistVeiculo, id, "Grupo do check list");
    grupo.nome = nomeGrupoChecklist(d.itensChecklistVeiculo, nome, id);
    grupo.itens = montarItensChecklist(grupo.itens, itens);
    grupo.tiposVeiculo = tiposDoGrupo(d, tiposVeiculo);
  });
}

export function removerGrupoChecklistVeiculo(id: string, storage = storagePadrao()): void {
  alterar(storage, (d) => {
    achar(d.itensChecklistVeiculo, id, "Grupo do check list");
    d.itensChecklistVeiculo = d.itensChecklistVeiculo.filter((g) => g.id !== id);
  });
}

// Tipos de veículo (ids das subcategorias de Veículos de Gerais) a que o grupo padrão se destina.
function tiposVeiculoDoPadrao(d: ParametrosBase, nomeGrupo: string): string[] {
  const alvo = tiposDoGrupoPadrao(nomeGrupo);
  if (alvo === "todos") return [TODOS_OS_TIPOS];
  return subcategoriasDa(d, "cat-veiculos")
    .filter((s) => {
      const chave = chaveDoTipoVeiculo(s.nome);
      return chave !== null && alvo.includes(chave);
    })
    .map((s) => s.id);
}

export type SituacaoPadraoChecklist = "igual" | "alterado" | "ausente";

const mesmoConjunto = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x) => b.includes(x));

/**
 * Todos os grupos do padrão inicial do check list de veículos e a situação de cada um no cadastro atual
 * (decisão 110): "igual" (nome, itens na ordem e tipos de veículo como no padrão), "alterado" ou "ausente"
 * (não existe mais no cadastro).
 */
export function situacaoPadraoChecklistVeiculos(storage = storagePadrao()): { nome: string; itens: readonly string[]; situacao: SituacaoPadraoChecklist }[] {
  const d = lerParametros(storage);
  return CHECKLIST_VEICULOS_PADRAO.map((padrao) => {
    const grupo = d.itensChecklistVeiculo.find((g) => mesmoNome(g.nome, padrao.nome));
    if (!grupo) return { nome: padrao.nome, itens: padrao.itens, situacao: "ausente" as const };
    const tipos = tiposVeiculoDoPadrao(d, padrao.nome);
    const igual =
      grupo.nome === padrao.nome &&
      grupo.itens.length === padrao.itens.length &&
      grupo.itens.every((i, n) => i.nome === padrao.itens[n]) &&
      (tipos.length === 0 || mesmoConjunto(grupo.tiposVeiculo, tipos));
    return { nome: padrao.nome, itens: padrao.itens, situacao: igual ? ("igual" as const) : ("alterado" as const) };
  });
}

/**
 * Restaura de uma vez os grupos do padrão inicial escolhidos (decisão 110), tudo ou nada. Grupo que existe
 * volta ao nome, itens e tipos de veículo iniciais (o id fica, e os itens que já existiam mantêm o id);
 * grupo que foi excluído é cadastrado de novo. Se o tipo de veículo ainda não existe em Gerais, os tipos
 * atuais ficam como estão (grupo novo fica sem tipo) e o retorno conta.
 */
export function restaurarPadroesChecklistVeiculos(nomes: string[], storage = storagePadrao()): { restaurados: number; criados: number; semTipo: number } {
  if (nomes.length === 0) throw new Error("Marque ao menos um padrão para restaurar.");
  if (nomes.some((n) => !ehGrupoChecklistPadrao(n))) throw new Error("Há um grupo que não faz parte do padrão inicial.");
  const escolhidos = CHECKLIST_VEICULOS_PADRAO.filter((p) => nomes.some((n) => mesmoNome(p.nome, n)));
  return alterar(storage, (d) => {
    let restaurados = 0;
    let criados = 0;
    let semTipo = 0;
    for (const padrao of escolhidos) {
      const tipos = tiposVeiculoDoPadrao(d, padrao.nome);
      const grupo = d.itensChecklistVeiculo.find((g) => mesmoNome(g.nome, padrao.nome));
      if (grupo) {
        grupo.nome = padrao.nome;
        grupo.itens = montarItensChecklist(grupo.itens, [...padrao.itens]);
        if (tipos.length > 0) grupo.tiposVeiculo = tipos;
        else semTipo += 1;
        restaurados += 1;
      } else {
        d.itensChecklistVeiculo.push({ id: novoId(), nome: padrao.nome, itens: montarItensChecklist([], [...padrao.itens]), tiposVeiculo: tipos });
        if (tipos.length === 0) semTipo += 1;
        criados += 1;
      }
    }
    return { restaurados, criados, semTipo };
  });
}

/** O nome é de um grupo do padrão de fábrica. */
export const ehGrupoChecklistPadrao = (nome: string): boolean => CHECKLIST_VEICULOS_PADRAO.some((p) => mesmoNome(p.nome, nome));

// Cadastra os grupos padrão que ainda não existem (mesmo nome); o que já está cadastrado não é alterado.
// O tipo de veículo é ligado pelo nome das subcategorias de Veículos que existem em Gerais; grupo sem
// subcategoria correspondente fica sem tipo (não aparece em nenhum check list) até ser ligado ao editar.
export function cadastrarPadraoChecklistVeiculos(storage = storagePadrao()): { grupos: number; itens: number; semTipo: number; substituidos: number; ligados: number } {
  return alterar(storage, (d) => {
    // Decisão 64: o padrão antigo (decisão 62) é substituído; os grupos do responsável não são tocados.
    const antes = d.itensChecklistVeiculo.length;
    d.itensChecklistVeiculo = d.itensChecklistVeiculo.filter((g) => !NOMES_PADRAO_ANTIGO.some((n) => mesmoNome(g.nome, n)));
    const substituidos = antes - d.itensChecklistVeiculo.length;
    let grupos = 0;
    let itens = 0;
    let semTipo = 0;
    let ligados = 0;
    for (const padrao of CHECKLIST_VEICULOS_PADRAO) {
      const existente = d.itensChecklistVeiculo.find((g) => mesmoNome(g.nome, padrao.nome));
      const tiposVeiculo = tiposVeiculoDoPadrao(d, padrao.nome);
      if (existente) {
        // Grupo do padrão que ficou sem tipo (o tipo ainda não existia em Gerais): liga agora, sem mexer nos itens.
        if (existente.tiposVeiculo.length === 0 && tiposVeiculo.length > 0) {
          existente.tiposVeiculo = tiposVeiculo;
          ligados += 1;
        } else if (existente.tiposVeiculo.length === 0) {
          semTipo += 1;
        }
        continue;
      }
      if (tiposVeiculo.length === 0) semTipo += 1;
      d.itensChecklistVeiculo.push({ id: novoId(), nome: padrao.nome, itens: montarItensChecklist([], [...padrao.itens]), tiposVeiculo });
      grupos += 1;
      itens += padrao.itens.length;
    }
    return { grupos, itens, semTipo, substituidos, ligados };
  });
}

// Inclui as marcas de veículos padrão que ainda não existem (mesmo nome, sem diferenciar
// maiúsculas ou acentos). O que já está cadastrado não é repetido nem alterado.
// `nomes` limita às marcas escolhidas uma a uma na tela; sem ele, todas.
export function cadastrarMarcasPadraoVeiculos(storage = storagePadrao(), nomes?: string[]): { marcas: number } {
  return alterar(storage, (d) => {
    let marcas = 0;
    for (const nome of MARCAS_VEICULO_PADRAO) {
      if (nomes && !nomes.some((n) => mesmoNome(n, nome))) continue;
      if (d.marcasVeiculo.some((m) => mesmoNome(m.nome, nome))) continue;
      d.marcasVeiculo.push({ id: novoId(), nome });
      marcas += 1;
    }
    return { marcas };
  });
}

export function pendentesMarcasPadraoVeiculos(storage = storagePadrao()): { nome: string }[] {
  const d = lerParametros(storage);
  return MARCAS_VEICULO_PADRAO.filter((nome) => !d.marcasVeiculo.some((m) => mesmoNome(m.nome, nome))).map((nome) => ({ nome }));
}

// Tipos de ocorrência de veículo do padrão que ainda não existem, com a descrição de cada um, e o cadastro só dos escolhidos um a um na tela.
export function pendentesTiposOcorrenciaPadrao(storage = storagePadrao()): { nome: string; itens: readonly string[] }[] {
  const d = lerParametros(storage);
  return TIPOS_OCORRENCIA_VEICULO_PADRAO.filter((t) => !d.tiposOcorrenciaVeiculo.some((x) => mesmoNome(x.nome, t.nome))).map((t) => ({ nome: t.nome, itens: [t.descricao] }));
}
export function cadastrarTiposOcorrenciaPadrao(nomes: string[], storage = storagePadrao()): number {
  return alterar(storage, (d) => {
    let tipos = 0;
    for (const t of TIPOS_OCORRENCIA_VEICULO_PADRAO) {
      if (!nomes.some((n) => mesmoNome(n, t.nome)) || d.tiposOcorrenciaVeiculo.some((x) => mesmoNome(x.nome, t.nome))) continue;
      d.tiposOcorrenciaVeiculo.push({ id: novoId(), nome: capitalizarCadastro(t.nome), descricao: t.descricao });
      tipos += 1;
    }
    return tipos;
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

const ehAcaoManutencaoPadrao = (nome: string): boolean => ACOES_MANUTENCAO_PADRAO.some((p) => mesmoNome(p.nome, nome));

/**
 * Todas as ações de manutenção do padrão inicial e a situação de cada uma no cadastro atual (decisão 111):
 * "igual" (nome e subitens, na ordem, como no padrão), "alterado" ou "ausente" (não existe mais).
 */
export function situacaoPadraoAcoesManutencaoVeiculo(storage = storagePadrao()): { nome: string; itens: readonly string[]; situacao: SituacaoPadraoChecklist }[] {
  const d = lerParametros(storage);
  return ACOES_MANUTENCAO_PADRAO.map((padrao) => {
    const nome = capitalizarCadastro(padrao.nome);
    const subitens = padrao.subitens.map((i) => capitalizarCadastro(i));
    const acao = d.acoesManutencaoVeiculo.find((a) => mesmoNome(a.nome, padrao.nome));
    if (!acao) return { nome, itens: subitens, situacao: "ausente" as const };
    const igual = acao.nome === nome && acao.subitens.length === subitens.length && acao.subitens.every((i, n) => i.nome === subitens[n]);
    return { nome, itens: subitens, situacao: igual ? ("igual" as const) : ("alterado" as const) };
  });
}

/**
 * Restaura de uma vez as ações de manutenção do padrão inicial escolhidas (decisão 111), tudo ou nada.
 * Ação que existe volta ao nome e aos subitens iniciais (o id fica, e os subitens que já existiam mantêm
 * o id); ação que foi excluída é cadastrada de novo. O que não foi marcado não muda.
 */
export function restaurarPadroesAcoesManutencaoVeiculo(nomes: string[], storage = storagePadrao()): { restaurados: number; criados: number } {
  if (nomes.length === 0) throw new Error("Marque ao menos um padrão para restaurar.");
  if (nomes.some((n) => !ehAcaoManutencaoPadrao(n))) throw new Error("Há uma ação que não faz parte do padrão inicial.");
  const escolhidas = ACOES_MANUTENCAO_PADRAO.filter((p) => nomes.some((n) => mesmoNome(p.nome, n)));
  return alterar(storage, (d) => {
    let restaurados = 0;
    let criados = 0;
    for (const padrao of escolhidas) {
      const nome = capitalizarCadastro(padrao.nome);
      const acao = d.acoesManutencaoVeiculo.find((a) => mesmoNome(a.nome, padrao.nome));
      if (acao) {
        acao.nome = nome;
        acao.subitens = montarSubitens(acao.subitens, [...padrao.subitens]);
        restaurados += 1;
      } else {
        d.acoesManutencaoVeiculo.push({ id: novoId(), nome, subitens: montarSubitens([], [...padrao.subitens]) });
        criados += 1;
      }
    }
    return { restaurados, criados };
  });
}

export type SituacaoFilhoPadraoAcao = { nome: string; existe: boolean };

/** Padrão inicial das ações de manutenção com os filhos (decisão 142): cada pai com a situação dele e a de cada subitem. */
export function situacaoPadraoAcoesComFilhos(storage = storagePadrao()): { nome: string; situacao: SituacaoPadraoChecklist; filhos: SituacaoFilhoPadraoAcao[] }[] {
  const d = lerParametros(storage);
  const pais = situacaoPadraoAcoesManutencaoVeiculo(storage);
  return ACOES_MANUTENCAO_PADRAO.map((padrao, n) => {
    const acao = d.acoesManutencaoVeiculo.find((a) => mesmoNome(a.nome, padrao.nome));
    return {
      nome: pais[n]!.nome,
      situacao: pais[n]!.situacao,
      filhos: padrao.subitens.map((i) => ({ nome: capitalizarCadastro(i), existe: !!acao?.subitens.some((s) => mesmoNome(s.nome, i)) })),
    };
  });
}

/**
 * Restaura as ações de manutenção do padrão inicial escolhendo pais e filhos (decisão 142), tudo ou nada.
 * Pai marcado volta ao nome inicial (ou é cadastrado de novo se foi excluído); só os filhos marcados são
 * restaurados ou incluídos. Os filhos não marcados e os que o responsável criou ficam como estão.
 */
export function restaurarAcoesManutencaoEscolhidas(
  escolhas: { nome: string; filhos: string[] }[],
  storage = storagePadrao(),
): { restaurados: number; criados: number; filhos: number } {
  if (escolhas.length === 0) throw new Error("Marque ao menos uma ação para restaurar.");
  const planos = escolhas.map((e) => {
    const padrao = ACOES_MANUTENCAO_PADRAO.find((p) => mesmoNome(p.nome, e.nome));
    if (!padrao) throw new Error("Há uma ação que não faz parte do padrão inicial.");
    for (const f of e.filhos) {
      if (!padrao.subitens.some((i) => mesmoNome(i, f))) throw new Error(`O subitem ${f} não faz parte do padrão inicial de ${padrao.nome}.`);
    }
    return { padrao, filhos: padrao.subitens.filter((i) => e.filhos.some((f) => mesmoNome(i, f))) };
  });
  return alterar(storage, (d) => {
    let restaurados = 0;
    let criados = 0;
    let filhos = 0;
    for (const { padrao, filhos: marcados } of planos) {
      const nome = capitalizarCadastro(padrao.nome);
      const acao = d.acoesManutencaoVeiculo.find((a) => mesmoNome(a.nome, padrao.nome));
      if (!acao) {
        d.acoesManutencaoVeiculo.push({ id: novoId(), nome, subitens: montarSubitens([], [...marcados]) });
        criados += 1;
        filhos += marcados.length;
        continue;
      }
      // Na ordem do padrão: o que já existe fica (o marcado volta ao nome inicial), o marcado que falta entra; os criados pelo responsável vão ao fim.
      const resultado: Opcao[] = [];
      for (const i of padrao.subitens) {
        const atual = acao.subitens.find((s) => mesmoNome(s.nome, i));
        const marcado = marcados.some((m) => mesmoNome(m, i));
        if (atual) {
          resultado.push(marcado ? { ...atual, nome: capitalizarCadastro(i) } : atual);
          if (marcado) filhos += 1;
        } else if (marcado) {
          resultado.push(...montarSubitens([], [i]));
          filhos += 1;
        }
      }
      for (const s of acao.subitens) if (!padrao.subitens.some((i) => mesmoNome(i, s.nome))) resultado.push(s);
      acao.nome = nome;
      acao.subitens = resultado;
      restaurados += 1;
    }
    return { restaurados, criados, filhos };
  });
}

export type ItemCriadoAcao = { id: string; nome: string; doPadrao: boolean; filhos: Opcao[] };

/**
 * Pais e filhos que o responsável criou nas ações de manutenção (decisão 143): as ações fora do padrão inicial,
 * com todos os subitens, e, nas ações do padrão, só os subitens extras. Ação do padrão sem extras não aparece.
 */
export function itensCriadosAcoesManutencao(storage = storagePadrao()): ItemCriadoAcao[] {
  const d = lerParametros(storage);
  const lista: ItemCriadoAcao[] = [];
  for (const a of d.acoesManutencaoVeiculo) {
    const padrao = ACOES_MANUTENCAO_PADRAO.find((p) => mesmoNome(p.nome, a.nome));
    if (!padrao) {
      lista.push({ id: a.id, nome: a.nome, doPadrao: false, filhos: a.subitens.filter((s) => !ehOutros(s.nome)) });
      continue;
    }
    const extras = a.subitens.filter((s) => !padrao.subitens.some((i) => mesmoNome(i, s.nome)) && !ehOutros(s.nome));
    if (extras.length > 0) lista.push({ id: a.id, nome: a.nome, doPadrao: true, filhos: extras });
  }
  return lista;
}

/**
 * Exclui os itens criados pelo responsável que foram marcados (decisão 151). Pai marcado: some a ação criada por
 * você ou, numa ação do padrão, os subitens extras dela. Filho marcado: some só esse subitem. Tudo de uma vez,
 * e só vale para o que aparece em itensCriadosAcoesManutencao: o padrão inicial nunca é apagado por aqui.
 */
export function excluirItensCriadosAcoesManutencao(ids: string[], storage = storagePadrao()): { acoes: number; subitens: number } {
  return alterar(storage, (d) => {
    const criados = itensCriadosAcoesManutencao(storage);
    const escolhidos = new Set(ids);
    if (!criados.some((c) => escolhidos.has(c.id) || c.filhos.some((f) => escolhidos.has(f.id)))) throw new Error("Marque ao menos um item criado por você.");
    let acoes = 0;
    let subitens = 0;
    for (const c of criados) {
      const paiMarcado = escolhidos.has(c.id);
      const sairam = new Set(c.filhos.filter((f) => paiMarcado || escolhidos.has(f.id)).map((f) => f.id));
      const removeAcaoInteira = paiMarcado && !c.doPadrao;
      if (sairam.size === 0 && !removeAcaoInteira) continue;
      if (removeAcaoInteira) {
        d.acoesManutencaoVeiculo = d.acoesManutencaoVeiculo.filter((a) => a.id !== c.id);
        acoes += 1;
      } else {
        const acao = achar(d.acoesManutencaoVeiculo, c.id, "Ação de manutenção");
        acao.subitens = acao.subitens.filter((i) => !sairam.has(i.id));
      }
      subitens += sairam.size;
    }
    return { acoes, subitens };
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
// `nomes` limita aos tamanhos escolhidos um a um na tela; sem ele, todos.
export function cadastrarTamanhosPadrao(storage = storagePadrao(), nomes?: string[]): number {
  return alterar(storage, (d) => {
    let incluidos = 0;
    for (const nome of TAMANHOS_PADRAO) {
      if (nomes && !nomes.some((n) => mesmoNome(n, nome))) continue;
      if (d.tamanhos.some((t) => mesmoNome(t.nome, nome))) continue;
      // Id novo: um tamanho padrão excluído antes pode ainda estar citado em produtos antigos,
      // e reaproveitar o id antigo faria essa referência órfã voltar a valer.
      d.tamanhos.splice(posicaoEmSequencia(d.tamanhos, nome), 0, { id: novoId(), nome });
      incluidos += 1;
    }
    return incluidos;
  });
}

// Tamanhos e numerações do padrão que ainda não estão cadastrados.
export function pendentesTamanhosPadrao(storage = storagePadrao()): { nome: string }[] {
  const d = lerParametros(storage);
  return TAMANHOS_PADRAO.filter((nome) => !d.tamanhos.some((t) => mesmoNome(t.nome, nome))).map((nome) => ({ nome }));
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

// Uma categoria pode ter várias regras de código (siglas). A primeira é a padrão: é a usada quando o
// cadastro não escolhe outra. A sigla é única no sistema inteiro.
export function regrasDaCategoria(regras: RegraCodigo[], categoriaId: string): RegraCodigo[] {
  return regras.filter((r) => r.categoriaId === categoriaId);
}

// Regra do cadastro: a da sigla escolhida; sem escolha (ou sigla que não existe mais), a padrão da categoria.
export function regraDoCadastro(regras: RegraCodigo[], categoriaId: string, sigla?: string | null): RegraCodigo | null {
  const doGrupo = regrasDaCategoria(regras, categoriaId);
  return doGrupo.find((r) => r.sigla === sigla) ?? doGrupo[0] ?? null;
}

// Sigla do código já gravado (EPI-0007 -> EPI), para o Clonar começar com a mesma sigla da origem.
export function siglaDoCodigo(regras: RegraCodigo[], categoriaId: string, codigo: string | null | undefined): string {
  const texto = String(codigo ?? "").trim().toUpperCase();
  return regrasDaCategoria(regras, categoriaId).find((r) => texto.startsWith(`${r.sigla}-`))?.sigla ?? "";
}

function validarRegraCodigo(d: ParametrosBase, categoriaId: string, sigla: string, inicial: string, ignorar?: RegraCodigo) {
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
  const outra = d.regrasCodigo.find((r) => r !== ignorar && r.sigla === s);
  if (outra) {
    const nome = d.categorias.find((c) => c.id === outra.categoriaId)?.nome ?? "outra categoria";
    throw new Error(`A sigla ${s} já é usada em ${nome}.`);
  }
  return { categoriaId, sigla: s, inicial: n };
}

// Salva (cria ou edita) a regra de uma categoria. `siglaAnterior` diz qual regra está sendo editada;
// sem ela, vale a regra padrão da categoria (ou cria a primeira).
export function salvarRegraCodigo(
  categoriaId: string,
  sigla: string,
  inicial: string,
  storage = storagePadrao(),
  siglaAnterior?: string,
): RegraCodigo {
  return alterar(storage, (d) => {
    const doGrupo = regrasDaCategoria(d.regrasCodigo, categoriaId);
    const alvo = siglaAnterior === undefined ? doGrupo[0] : doGrupo.find((r) => r.sigla === siglaAnterior);
    if (siglaAnterior !== undefined && !alvo) throw new Error(`A regra ${siglaAnterior} não existe mais.`);
    const regra = validarRegraCodigo(d, categoriaId, sigla, inicial, alvo);
    d.regrasCodigo = alvo
      ? d.regrasCodigo.map((r) => (r === alvo ? regra : r))
      : [...d.regrasCodigo, regra];
    return regra;
  });
}

// Novo código na categoria: mais uma sigla, sem mexer nas que já existem.
export function adicionarRegraCodigo(
  categoriaId: string,
  sigla: string,
  inicial: string,
  storage = storagePadrao(),
): RegraCodigo {
  return alterar(storage, (d) => {
    const regra = validarRegraCodigo(d, categoriaId, sigla, inicial);
    d.regrasCodigo = [...d.regrasCodigo, regra];
    return regra;
  });
}

// Novo código com a categoria digitada: se o nome já é de uma categoria, entra mais uma sigla nela; se não,
// a categoria é criada junto com a sigla e a numeração, tudo numa gravação só (erro em qualquer parte não grava nada).
export function adicionarCodigoComCategoria(
  nome: string,
  sigla: string,
  inicial: string,
  storage = storagePadrao(),
): { categoria: Categoria; regra: RegraCodigo; categoriaNova: boolean } {
  return alterar(storage, (d) => {
    const limpo = limparNome(nome);
    if (!limpo) throw new Error("Informe a categoria.");
    const existente = d.categorias.find((c) => mesmoNome(c.nome, limpo));
    const categoria = existente ?? { id: novoId(), nome: nomeUnico(d.categorias, limpo, "categoria") };
    if (!existente) d.categorias.push(categoria);
    const regra = validarRegraCodigo(d, categoria.id, sigla, inicial);
    d.regrasCodigo = [...d.regrasCodigo, regra];
    return { categoria, regra, categoriaNova: !existente };
  });
}

// Sem `sigla`, tira a regra padrão da categoria (como antes). A última regra de uma categoria de módulo não sai.
export function removerRegraCodigo(categoriaId: string, storage = storagePadrao(), sigla?: string): void {
  alterar(storage, (d) => {
    const doGrupo = regrasDaCategoria(d.regrasCodigo, categoriaId);
    const alvo = sigla === undefined ? doGrupo[0] : doGrupo.find((r) => r.sigla === sigla);
    if (!alvo) return;
    const modulo = CATEGORIAS_BASE[categoriaId];
    if (modulo && doGrupo.length <= 1) {
      throw new Error(
        `Sem esta regra, novos cadastros de ${modulo} ficariam bloqueados. Edite a sigla ou a numeração em vez de excluir.`,
      );
    }
    d.regrasCodigo = d.regrasCodigo.filter((r) => r !== alvo);
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
