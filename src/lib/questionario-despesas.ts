// Questionário de Despesas (Parâmetros > Veículos): banco de perguntas + um questionário para cada tipo de despesa (dec 167/168).
// Todo questionário começa pela pergunta "Tipos de despesas"; a resposta define o tipo e, depois, o botão em Módulos > Veículos > Viagens.
// Fase 1: tudo fica só no navegador, em modo demonstração; as tabelas (esquema e respostas separados) entram na Fase 2.
export type TipoPergunta = "multipla" | "caixas" | "lista" | "curta" | "data" | "hora" | "paragrafo" | "upload";

export const TIPOS_PERGUNTA: readonly { valor: TipoPergunta; rotulo: string; ajuda: string }[] = [
  { valor: "multipla", rotulo: "Múltipla escolha", ajuda: "Uma única resposta, com todas as opções visíveis." },
  { valor: "caixas", rotulo: "Caixas de seleção", ajuda: "Título e opções; pode aceitar mais de uma resposta ou só uma." },
  { valor: "lista", rotulo: "Lista suspensa", ajuda: "Uma única resposta; as opções só aparecem ao clicar na lista." },
  { valor: "curta", rotulo: "Resposta curta", ajuda: "Texto livre ou formato específico (moeda, números)." },
  { valor: "data", rotulo: "Data", ajuda: "Calendário para escolher a data." },
  { valor: "hora", rotulo: "Hora", ajuda: "Aceita somente horário (hh:mm)." },
  { valor: "paragrafo", rotulo: "Parágrafo", ajuda: "Texto livre longo." },
  { valor: "upload", rotulo: "Upload de arquivo", ajuda: "Até 3 imagens, ao menos 1 obrigatória." },
];

export const TIPOS_COM_OPCOES: readonly TipoPergunta[] = ["multipla", "caixas", "lista"];

export type FormatoCurta = "livre" | "moeda" | "inteiro" | "decimal2";
export const FORMATOS_CURTA: readonly { valor: FormatoCurta; rotulo: string }[] = [
  { valor: "livre", rotulo: "Texto livre" },
  { valor: "moeda", rotulo: "Moeda (R$)" },
  { valor: "inteiro", rotulo: "Número sem casas decimais" },
  { valor: "decimal2", rotulo: "Número com duas casas decimais" },
];

// De onde vêm as opções: escritas na pergunta, ou lidas de outro cadastro na hora de responder.
export type FontePergunta = "propria" | "clientes" | "municipios";

export const AREAS_VIAGEM = ["Oficina", "PCM", "Administrativo"] as const;
export type AreaViagem = (typeof AREAS_VIAGEM)[number];
// Empregado habilitado ao questionário de viagem; sai da lista sozinho quando o cadastro dele fica inativo.
export type Habilitado = { empregadoId: string | null; nome: string; area: AreaViagem };

// Upload: até 3 arquivos (imagens); marcada como obrigatória, exige só 1. Imagens são reduzidas antes de guardar.
export const MAX_ARQUIVOS = 3;
export const IMAGEM_ECONOMICA = { formato: "image/webp", larguraMaxPx: 1280, qualidade: 0.7 } as const;

export type Pergunta = {
  id: string;
  // Número da pergunta no banco (01, 02...), gerado em sequência e nunca reaproveitado.
  codigo: string;
  tipo: TipoPergunta;
  titulo: string;
  obrigatoria: boolean;
  opcoes: string[];
  fonte: FontePergunta;
  // Caixas de seleção: permite marcar mais de uma opção.
  multiplas: boolean;
  formato: FormatoCurta;
  // Município: id da pergunta de UF que filtra a lista.
  dependeDe: string | null;
  // Só a pergunta de "Habilitados ao questionário de viagem" usa esta lista (empregados com área).
  habilitados: Habilitado[] | null;
  // Perguntas de sistema não se excluem (a de tipos de despesa move o resto do módulo).
  sistema: boolean;
};

// Se/então: a pergunta só aparece quando a resposta da pergunta de origem (anterior, com opções) for (ou não for) o valor.
export type Regra = { origem: string; operador: "igual" | "diferente"; valor: string };

// Seção sem título fica oculta, mas continua separando a página.
export type Secao = { id: string; titulo: string; subtitulo: string; inicio: string };

export type Estado = {
  versao: 1;
  perguntas: Pergunta[];
  // Tipo de despesa (texto da opção) -> ids das perguntas depois da de tipos de despesa, na ordem.
  questionarios: Record<string, string[]>;
  // Tipo de despesa -> id da pergunta -> condição para ela aparecer naquele questionário.
  regras: Record<string, Record<string, Regra>>;
  // Ramificação (dec 178): tipo de despesa -> id da pergunta -> opção respondida -> destino ("encerrar" ou "pergunta:<id>"). Sem entrada, segue para a próxima.
  destinos?: Record<string, Record<string, Record<string, string>>>;
  // Seções (dec 179): tipo de despesa -> seções, cada uma começando numa pergunta (`inicio`); cada seção é uma página no preenchimento.
  secoes?: Record<string, Secao[]>;
  // Marca que "Litros abastecidos" já foi tirado dos tipos que não são Abastecimento (ajuste único dos dados salvos antes).
  litrosAjustado?: true;
  // Marca que a pergunta "Técnico responsável pela despesa" já foi incluída nos dados salvos antes dela existir (ajuste único).
  tecnicoAjustado?: true;
  // Marca que a condição "Cartões de crédito só com Moedas = Cartão de crédito" já foi aplicada aos dados salvos antes (dec 182).
  cartaoAjustado?: true;
};

// Litros abastecidos só faz sentido no Abastecimento: os outros tipos de despesa não o trazem.
export const ID_LITROS = "q-10";
export const TIPO_ABASTECIMENTO = "Abastecimento";

export const ID_TIPO_DESPESA = "q-03";
// Módulo Viagens (dec 177): quem lança é a pergunta 04; a 14 só aparece quando quem lança é PCM ou Administrativo, para dizer de qual técnico é a despesa.
export const ID_HABILITADOS = "q-04";
export const ID_TECNICO_RESPONSAVEL = "q-14";
export const ID_UF = "q-05";

export type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE = "gemape-demo-questionario-despesas";
const CHAVE_SEQUENCIA = "gemape-demo-questionario-despesas-sequencia";
const formatarCodigo = (n: number) => String(n).padStart(2, "0");
// Id único mesmo com duas perguntas criadas no mesmo instante.
const novoId = (codigo: string) => `q-${codigo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const UFS: readonly string[] = [
  "Acre - AC", "Alagoas - AL", "Amapá - AP", "Amazonas - AM", "Bahia - BA", "Ceará - CE", "Distrito Federal - DF", "Espírito Santo - ES",
  "Goiás - GO", "Maranhão - MA", "Mato Grosso - MT", "Mato Grosso do Sul - MS", "Minas Gerais - MG", "Pará - PA", "Paraíba - PB",
  "Paraná - PR", "Pernambuco - PE", "Piauí - PI", "Rio de Janeiro - RJ", "Rio Grande do Norte - RN", "Rio Grande do Sul - RS",
  "Rondônia - RO", "Roraima - RR", "Santa Catarina - SC", "São Paulo - SP", "Sergipe - SE", "Tocantins - TO",
];
export const siglaDaUf = (opcao: string): string => opcao.split(" - ").pop()?.trim() ?? "";

const base = (n: number, tipo: TipoPergunta, titulo: string, extra: Partial<Pergunta> = {}): Pergunta => ({
  id: `q-${formatarCodigo(n)}`, codigo: formatarCodigo(n), tipo, titulo, obrigatoria: true, opcoes: [], fonte: "propria",
  multiplas: false, formato: "livre", dependeDe: null, habilitados: null, sistema: false, ...extra,
});

// As 13 perguntas passadas pelo responsável em 14/10 (dec 168).
export function perguntasPadrao(): Pergunta[] {
  const hab = (nome: string, area: AreaViagem): Habilitado => ({ empregadoId: null, nome, area });
  return [
    base(1, "caixas", "Moedas", { opcoes: ["Dinheiro", "Cartão de crédito", "Ticket de abastecimento"] }),
    base(2, "caixas", "Cartões de crédito", { opcoes: ["Cartão final 0129 – Roberto", "Cartão final 0127 – Wellington", "Cartão final 0121 – GMP", "Cartão final 0268 – Gemape", "Cartão final 5970 – GMP"] }),
    base(3, "caixas", "Tipos de despesas", {
      sistema: true,
      opcoes: ["Alimentação", "Hospedagem", "Abastecimento", "Pedágio", "Estacionamento", "Manutenção do veículo de trabalho", "Compra de peças para cliente", "Outro"],
    }),
    base(4, "caixas", "Habilitados ao questionário de viagem", {
      habilitados: [hab("Roberto", "Oficina"), hab("Wellington", "Oficina"), hab("Bionor", "Oficina"), hab("Levindo", "Oficina"), hab("Wagner", "Oficina"), hab("Eduardo", "PCM"), hab("Bruno", "PCM")],
    }),
    base(14, "caixas", "Técnico responsável pela despesa", { sistema: true, habilitados: [] }),
    base(5, "lista", "Unidade da Federação", { opcoes: [...UFS] }),
    base(6, "lista", "Município", { fonte: "municipios", dependeDe: ID_UF }),
    base(7, "lista", "Clientes", { fonte: "clientes" }),
    base(8, "data", "Data da despesa"),
    base(9, "paragrafo", "Detalhamento da despesa"),
    base(10, "curta", "Litros abastecidos", { formato: "decimal2" }),
    base(11, "curta", "Valor da despesa", { formato: "decimal2" }),
    base(12, "upload", "Foto do comprovante"),
    base(13, "lista", "PCM responde", { opcoes: ["Avulso – técnico não monitorado", "Não conformidade – técnico monitorado não preencheu"] }),
  ];
}

// Dec 182: Cartões de crédito só aparece quando Moedas for Cartão de crédito. Vale em todo questionário que tem as duas perguntas
// (Moedas antes de Cartões) e não sobrescreve condição que o responsável já tenha definido para Cartões.
const ID_MOEDAS = "q-01";
const ID_CARTOES = "q-02";
const MOEDA_CARTAO = "Cartão de crédito";
function comRegraDoCartao(questionarios: Record<string, string[]>, regras: Estado["regras"]): Estado["regras"] {
  const novas: Estado["regras"] = { ...regras };
  for (const [tipo, ids] of Object.entries(questionarios)) {
    if (!Array.isArray(ids)) continue;
    const iMoedas = ids.indexOf(ID_MOEDAS);
    const iCartoes = ids.indexOf(ID_CARTOES);
    if (iMoedas < 0 || iCartoes < 0 || iMoedas > iCartoes || novas[tipo]?.[ID_CARTOES]) continue;
    novas[tipo] = { ...(novas[tipo] ?? {}), [ID_CARTOES]: { origem: ID_MOEDAS, operador: "igual", valor: MOEDA_CARTAO } };
  }
  return novas;
}

export function estadoPadrao(): Estado {
  const perguntas = perguntasPadrao();
  const resto = perguntas.filter((p) => p.id !== ID_TIPO_DESPESA).map((p) => p.id);
  const tipo = perguntas.find((p) => p.id === ID_TIPO_DESPESA);
  const questionarios = Object.fromEntries((tipo?.opcoes ?? []).map((o) => [o, resto.filter((id) => id !== ID_LITROS || o === TIPO_ABASTECIMENTO)]));
  return { versao: 1, perguntas, questionarios, regras: comRegraDoCartao(questionarios, {}), litrosAjustado: true, tecnicoAjustado: true, cartaoAjustado: true };
}

export const tiposDeDespesa = (e: Estado): string[] => e.perguntas.find((p) => p.id === ID_TIPO_DESPESA)?.opcoes ?? [];

// Ids do questionário do tipo, com a pergunta de tipos de despesa sempre em primeiro.
export function questionarioDoTipo(e: Estado, tipo: string): string[] {
  const existentes = new Set(e.perguntas.map((p) => p.id));
  const salvos = (e.questionarios[tipo] ?? e.perguntas.filter((p) => p.id !== ID_TIPO_DESPESA).map((p) => p.id)).filter((id) => id !== ID_TIPO_DESPESA && existentes.has(id));
  return [ID_TIPO_DESPESA, ...salvos];
}

export const regraArquivos = (p: Pergunta): { minimo: number; maximo: number } => ({ minimo: p.obrigatoria ? 1 : 0, maximo: MAX_ARQUIVOS });

export function novaPergunta(tipo: TipoPergunta, codigo: string): Pergunta {
  return {
    id: novoId(codigo), codigo, tipo, titulo: "", obrigatoria: true,
    opcoes: tipo === "multipla" || tipo === "lista" || tipo === "caixas" ? [""] : [], fonte: "propria", multiplas: false, formato: "livre",
    dependeDe: null, habilitados: null, sistema: false,
  };
}

function ultimoNumero(e: Estado, storage: StorageLike): number {
  return Math.max(Number(storage.getItem(CHAVE_SEQUENCIA)) || 0, ...e.perguntas.map((p) => Number(p.codigo) || 0));
}

// Código que a próxima pergunta vai receber, para mostrar no formulário.
export const proximoCodigoPergunta = (e: Estado, storage: StorageLike = localStorage): string => formatarCodigo(ultimoNumero(e, storage) + 1);

// Problemas que impedem salvar a pergunta; vazio quando está tudo certo.
export function validarPergunta(p: Pergunta, outras: Pergunta[]): string[] {
  const erros: string[] = [];
  if (!p.titulo.trim()) erros.push("Informe o título da pergunta.");
  const repetida = outras.some((o) => o.id !== p.id && o.titulo.trim().toLocaleLowerCase("pt-BR") === p.titulo.trim().toLocaleLowerCase("pt-BR"));
  if (p.titulo.trim() && repetida) erros.push("Já existe uma pergunta com esse título.");
  if (TIPOS_COM_OPCOES.includes(p.tipo) && p.fonte === "propria" && !p.habilitados) {
    const opcoes = p.opcoes.map((o) => o.trim());
    if (opcoes.length === 0 || opcoes.some((o) => !o)) erros.push("Preencha todas as opções de resposta.");
    else if (new Set(opcoes.map((o) => o.toLocaleLowerCase("pt-BR"))).size !== opcoes.length) erros.push("Há opções de resposta repetidas.");
  }
  return erros;
}

// Dado salvo ilegível nunca é sobrescrito: a tela abre com o padrão, mas gravar por cima apagaria o que sobrou.
function conferirIntegridade(storage: StorageLike): void {
  const bruto = storage.getItem(CHAVE);
  if (bruto === null) return;
  let ok = false;
  try { const lido = JSON.parse(bruto); ok = !!lido && Array.isArray(lido.perguntas) && !!lido.questionarios && typeof lido.questionarios === "object" && (lido.regras === undefined || (!!lido.regras && typeof lido.regras === "object")); } catch { ok = false; }
  if (!ok) throw new Error("As perguntas salvas neste navegador estão ilegíveis; nada foi alterado.");
}

// Verdadeiro quando há dado salvo que não dá para ler (a tela mostra o padrão, mas nada é sobrescrito).
export function dadosIlegiveis(storage: StorageLike = localStorage): boolean {
  try { conferirIntegridade(storage); return false; } catch { return true; }
}

// Só entra o que tem o formato tipo -> pergunta -> opção -> texto; dado fora disso é descartado em vez de quebrar a tela.
function destinosLidos(bruto: unknown): Estado["destinos"] | undefined {
  const objeto = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
  if (!objeto(bruto)) return undefined;
  return Object.fromEntries(Object.entries(bruto).filter(([, porPergunta]) => objeto(porPergunta)).map(([tipo, porPergunta]) => [
    tipo,
    Object.fromEntries(Object.entries(porPergunta as Record<string, unknown>).filter(([, porOpcao]) => objeto(porOpcao)).map(([id, porOpcao]) => [
      id,
      Object.fromEntries(Object.entries(porOpcao as Record<string, unknown>).filter((par): par is [string, string] => typeof par[1] === "string")),
    ])),
  ]));
}

// Seções salvas: só entram as que têm o formato certo (id, título, subtítulo e pergunta inicial em texto).
function secoesLidas(bruto: unknown): Estado["secoes"] | undefined {
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return undefined;
  return Object.fromEntries(Object.entries(bruto).filter(([, lista]) => Array.isArray(lista)).map(([tipo, lista]) => [
    tipo,
    // Uma seção por pergunta inicial e por id: repetida (dado editado à mão) é descartada.
    (lista as unknown[]).filter((x): x is Secao => !!x && typeof x === "object" && ["id", "titulo", "subtitulo", "inicio"].every((k) => typeof (x as Record<string, unknown>)[k] === "string"))
      .filter((x, i, todas) => todas.findIndex((y) => y.inicio === x.inicio || y.id === x.id) === i),
  ]));
}

export function lerEstado(storage: StorageLike = localStorage): Estado {
  try {
    const bruto = storage.getItem(CHAVE);
    if (bruto === null) return estadoPadrao();
    const lido = JSON.parse(bruto);
    if (!lido || !Array.isArray(lido.perguntas) || typeof lido.questionarios !== "object" || lido.questionarios === null) return estadoPadrao();
    let regras = (lido.regras && typeof lido.regras === "object" ? lido.regras : {}) as Estado["regras"];
    let perguntas = lido.perguntas as Pergunta[];
    let questionarios = lido.questionarios as Record<string, string[]>;
    // Dado salvo antes do ajuste: Litros abastecidos sai dos tipos que não são Abastecimento (uma vez só).
    if (lido.litrosAjustado !== true) {
      questionarios = Object.fromEntries(Object.entries(questionarios as Record<string, unknown>).map(([tipo, ids]) => [tipo, Array.isArray(ids) && tipo !== TIPO_ABASTECIMENTO ? ids.filter((id) => id !== ID_LITROS) : ids])) as Record<string, string[]>;
    }
    // Dado salvo antes da pergunta do técnico responsável: ela entra no banco e em todos os questionários, logo depois de "quem lança" (uma vez só).
    if (lido.tecnicoAjustado !== true && !perguntas.some((p) => p.id === ID_TECNICO_RESPONSAVEL)) {
      const nova = perguntasPadrao().find((p) => p.id === ID_TECNICO_RESPONSAVEL);
      if (nova) {
        // O número 14 fica com ela se estiver livre; senão, o próximo da sequência.
        const codigo = perguntas.some((p) => p.codigo === nova.codigo) ? formatarCodigo(Math.max(...perguntas.map((p) => Number(p.codigo) || 0)) + 1) : nova.codigo;
        perguntas = [...perguntas, { ...nova, codigo }];
        questionarios = Object.fromEntries(Object.entries(questionarios as Record<string, unknown>).map(([tipo, ids]) => {
          if (!Array.isArray(ids)) return [tipo, ids];
          const aposQuemLanca = ids.indexOf(ID_HABILITADOS);
          return [tipo, aposQuemLanca >= 0 ? [...ids.slice(0, aposQuemLanca + 1), ID_TECNICO_RESPONSAVEL, ...ids.slice(aposQuemLanca + 1)] : [...ids, ID_TECNICO_RESPONSAVEL]];
        })) as Record<string, string[]>;
      }
    }
    // Dado salvo antes da dec 182: Cartões de crédito passa a depender de Moedas (uma vez só; depois o responsável pode tirar).
    if (lido.cartaoAjustado !== true) regras = comRegraDoCartao(questionarios, regras);
    const destinos = destinosLidos(lido.destinos);
    const secoes = secoesLidas(lido.secoes);
    return { versao: 1, perguntas, questionarios, regras, ...(destinos ? { destinos } : {}), ...(secoes ? { secoes } : {}), litrosAjustado: true, tecnicoAjustado: true, cartaoAjustado: true };
  } catch {
    return estadoPadrao();
  }
}

// Só valem as regras cuja pergunta de origem vem antes e ainda tem a opção do valor (mexer na ordem, nas opções ou excluir limpa o resto).
export function limparRegras(e: Estado): Estado {
  const regras: Estado["regras"] = {};
  const tipos = tiposDeDespesa(e);
  for (const [tipo, porPergunta] of Object.entries(e.regras)) {
    if (!tipos.includes(tipo)) continue;
    const ids = questionarioDoTipo(e, tipo);
    const validas = Object.entries(porPergunta).filter(([id, r]) => {
      const origem = e.perguntas.find((p) => p.id === r.origem);
      return ids.includes(id) && ids.indexOf(r.origem) >= 0 && ids.indexOf(r.origem) < ids.indexOf(id) && !!origem && aceitaCondicao(origem) && origem.opcoes.includes(r.valor);
    });
    if (validas.length) regras[tipo] = Object.fromEntries(validas);
  }
  // Seção cuja pergunta inicial saiu do questionário deixa de existir (as perguntas continuam, na seção anterior).
  const secoes = e.secoes
    ? Object.fromEntries(Object.entries(e.secoes).filter(([tipo]) => tipos.includes(tipo)).map(([tipo, lista]) => {
      const ids = questionarioDoTipo(e, tipo);
      return [tipo, lista.filter((x) => ids.includes(x.inicio))];
    }))
    : undefined;
  return { ...e, regras, ...(secoes ? { secoes } : {}) };
}

// Só pergunta com opções escritas na própria pergunta (não clientes, municípios nem habilitados) serve de origem.
export const aceitaCondicao = (p: Pergunta): boolean => p.id !== ID_TIPO_DESPESA && TIPOS_COM_OPCOES.includes(p.tipo) && p.fonte === "propria" && !p.habilitados;

// Rascunho da montagem: as alterações ficam numa cópia na memória e só vão para o armazenamento de verdade em publicarRascunho (Salvar Formulário).
export function criarRascunho(origem: StorageLike = localStorage): StorageLike {
  const dados = new Map<string, string>();
  for (const chave of [CHAVE, CHAVE_SEQUENCIA]) {
    const valor = origem.getItem(chave);
    if (valor !== null) dados.set(chave, valor);
  }
  return { getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => { dados.set(k, v); } };
}

// Grava o rascunho no armazenamento: primeiro o dado principal e depois a sequência, como em gravarEstado. Dado ilegível nunca é sobrescrito.
export function publicarRascunho(rascunho: StorageLike, destino: StorageLike = localStorage): void {
  conferirIntegridade(destino);
  conferirIntegridade(rascunho);
  for (const chave of [CHAVE, CHAVE_SEQUENCIA]) {
    const valor = rascunho.getItem(chave);
    if (valor !== null) destino.setItem(chave, valor);
  }
}

export function gravarEstado(inicial: Estado, storage: StorageLike = localStorage): Estado {
  conferirIntegridade(storage);
  const e = limparRegras(inicial);
  const sequencia = String(ultimoNumero(e, storage));
  // Primeiro o dado principal: se a gravação falhar (cota cheia), a sequência não anda sozinha.
  storage.setItem(CHAVE, JSON.stringify(e));
  storage.setItem(CHAVE_SEQUENCIA, sequencia);
  return e;
}

// Cadastra ou edita uma pergunta. A edição das opções do tipo de despesa leva junto os questionários: tipo novo recebe o
// questionário padrão e tipo removido perde o seu.
export function salvarPergunta(e: Estado, pergunta: Pergunta, storage: StorageLike = localStorage): Estado {
  const limpa: Pergunta = {
    ...pergunta, titulo: pergunta.titulo.trim(), opcoes: pergunta.opcoes.map((o) => o.trim()),
  };
  const erros = validarPergunta(limpa, e.perguntas);
  if (erros.length) throw new Error(erros[0]);
  const atual = e.perguntas.find((p) => p.id === limpa.id);
  // A marca de sistema não vem do formulário; e um número já usado (formulário aberto há tempo) passa para o próximo livre.
  const gravar: Pergunta = atual
    ? { ...limpa, sistema: atual.sistema, codigo: atual.codigo }
    : { ...limpa, sistema: false, codigo: e.perguntas.some((p) => p.codigo === limpa.codigo) ? proximoCodigoPergunta(e, storage) : limpa.codigo };
  // Tipo de despesa é uma escolha só: a pergunta 3 nunca aceita mais de uma opção.
  if (gravar.id === ID_TIPO_DESPESA) gravar.multiplas = false;
  const perguntas = atual ? e.perguntas.map((p) => (p.id === gravar.id ? gravar : p)) : [...e.perguntas, gravar];
  let regras = e.regras;
  let destinos = e.destinos;
  let secoes = e.secoes;
  let questionarios = e.questionarios;
  if (gravar.id === ID_TIPO_DESPESA) {
    const padrao = perguntas.filter((p) => p.id !== ID_TIPO_DESPESA).map((p) => p.id);
    const antigas = tiposDeDespesa(e);
    // Mesma quantidade de opções: o que mudou de nome é o mesmo tipo (ele leva o questionário junto).
    const renomeado = antigas.length === gravar.opcoes.length;
    questionarios = Object.fromEntries(gravar.opcoes.map((o, i) => [o, e.questionarios[o] ?? (renomeado ? e.questionarios[antigas[i] ?? ""] : undefined) ?? padrao]));
    // As condições acompanham o tipo renomeado e somem com o tipo removido.
    regras = Object.fromEntries(gravar.opcoes.flatMap((o, i) => {
      const r = e.regras[o] ?? (renomeado ? e.regras[antigas[i] ?? ""] : undefined);
      return r ? [[o, r] as const] : [];
    }));
    // A ramificação também acompanha o tipo renomeado.
    if (e.destinos) {
      destinos = Object.fromEntries(gravar.opcoes.flatMap((o, i) => {
        const d = e.destinos?.[o] ?? (renomeado ? e.destinos?.[antigas[i] ?? ""] : undefined);
        return d ? [[o, d] as const] : [];
      }));
    }
    // As seções também acompanham o tipo renomeado.
    if (e.secoes) {
      secoes = Object.fromEntries(gravar.opcoes.flatMap((o, i) => {
        const l = e.secoes?.[o] ?? (renomeado ? e.secoes?.[antigas[i] ?? ""] : undefined);
        return l ? [[o, l] as const] : [];
      }));
    }
  }
  return gravarEstado({ ...e, perguntas, questionarios, regras, ...(destinos ? { destinos } : {}), ...(secoes ? { secoes } : {}) }, storage);
}

// Tipos de despesa que perdem o questionário se a pergunta 3 for salva com estas opções (removidos, não renomeados).
export function tiposRemovidos(e: Estado, opcoes: string[]): string[] {
  const antigas = tiposDeDespesa(e);
  if (antigas.length === opcoes.length) return [];
  const novas = new Set(opcoes.map((o) => o.trim()));
  return antigas.filter((t) => !novas.has(t));
}

// Clonar copia todos os campos (dec 138) com código e título novos.
export function clonarPergunta(e: Estado, id: string, storage: StorageLike = localStorage): Pergunta {
  const origem = e.perguntas.find((p) => p.id === id);
  if (!origem) throw new Error("Pergunta não encontrada.");
  const codigo = proximoCodigoPergunta(e, storage);
  return {
    ...origem, id: novoId(codigo), codigo, sistema: false, titulo: `${origem.titulo} (cópia)`,
    opcoes: [...origem.opcoes], habilitados: origem.habilitados ? origem.habilitados.map((h) => ({ ...h })) : null,
  };
}

export function excluirPergunta(e: Estado, id: string, storage: StorageLike = localStorage): Estado {
  const alvo = e.perguntas.find((p) => p.id === id);
  if (!alvo) return e;
  if (alvo.sistema || id === ID_TIPO_DESPESA) throw new Error("Esta pergunta abre todos os questionários e não pode ser excluída.");
  const dependente = e.perguntas.find((p) => p.dependeDe === id);
  if (dependente) throw new Error(`A pergunta ${dependente.codigo} (${dependente.titulo}) depende desta; exclua-a primeiro.`);
  const questionarios = Object.fromEntries(Object.entries(e.questionarios).map(([t, ids]) => [t, ids.filter((x) => x !== id)]));
  return gravarEstado({ ...e, perguntas: e.perguntas.filter((p) => p.id !== id), questionarios }, storage);
}

export function gravarQuestionario(e: Estado, tipo: string, ids: string[], storage: StorageLike = localStorage): Estado {
  if (!tiposDeDespesa(e).includes(tipo)) throw new Error("Tipo de despesa desconhecido.");
  const unicos = [...new Set(ids.filter((id) => id !== ID_TIPO_DESPESA && e.perguntas.some((p) => p.id === id)))];
  return gravarEstado({ ...e, questionarios: { ...e.questionarios, [tipo]: unicos } }, storage);
}

// Define (ou tira, com null) a condição de uma pergunta no questionário de um tipo de despesa.
export function gravarRegra(e: Estado, tipo: string, id: string, regra: Regra | null, storage: StorageLike = localStorage): Estado {
  if (!tiposDeDespesa(e).includes(tipo)) throw new Error("Tipo de despesa desconhecido.");
  const ids = questionarioDoTipo(e, tipo);
  const { [id]: _antiga, ...resto } = e.regras[tipo] ?? {};
  if (regra === null) return gravarEstado({ ...e, regras: { ...e.regras, [tipo]: resto } }, storage);
  const origem = e.perguntas.find((p) => p.id === regra.origem);
  if (id === ID_TIPO_DESPESA) throw new Error("A pergunta inicial aparece sempre.");
  if (!origem || !aceitaCondicao(origem)) throw new Error("Escolha uma pergunta com opções escritas.");
  if (!(ids.indexOf(regra.origem) >= 0 && ids.indexOf(regra.origem) < ids.indexOf(id))) throw new Error("A pergunta de origem precisa vir antes.");
  if (!origem.opcoes.includes(regra.valor)) throw new Error("Escolha uma opção da pergunta de origem.");
  return gravarEstado({ ...e, regras: { ...e.regras, [tipo]: { ...resto, [id]: regra } } }, storage);
}

// Arrastar: a pergunta `origem` passa para a posição da `destino` (a primeira, de tipos de despesa, não se move).
export function moverId(ids: string[], origem: string, destino: string): string[] {
  const de = ids.indexOf(origem);
  const para = ids.indexOf(destino);
  if (de < 0 || para < 0 || de === para || origem === ID_TIPO_DESPESA || destino === ID_TIPO_DESPESA) return ids;
  const lista = [...ids];
  const [item] = lista.splice(de, 1);
  if (item) lista.splice(para, 0, item);
  return lista;
}

// Lista de empregados de uma pergunta de habilitados. A do técnico responsável não tem lista própria: são os habilitados da pergunta 04 com área Oficina.
export function habilitadosDaPergunta(e: Estado, p: Pergunta): Habilitado[] | null {
  if (p.id !== ID_TECNICO_RESPONSAVEL) return p.habilitados;
  return (e.perguntas.find((x) => x.id === ID_HABILITADOS)?.habilitados ?? []).filter((h) => h.area === "Oficina");
}

// Habilitados que continuam valendo: quem tem vínculo com um empregado que está inativo (ou não existe mais) sai da lista.
export function habilitadosAtivos(lista: Habilitado[], idsAtivos: ReadonlySet<string>): Habilitado[] {
  return lista.filter((h) => h.empregadoId === null || idsAtivos.has(h.empregadoId));
}

// Cada questionário tem o nome do seu card em Viagens (dec 181): "Despesas Alimentação", "Despesas Hospedagem"...
export const tituloDoQuestionario = (tipo: string): string => (tipo.trim() ? `Despesas ${tipo.trim()}` : "Questionário de Despesas");
