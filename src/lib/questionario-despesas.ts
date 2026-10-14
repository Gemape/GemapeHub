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

export type Estado = {
  versao: 1;
  perguntas: Pergunta[];
  // Tipo de despesa (texto da opção) -> ids das perguntas depois da de tipos de despesa, na ordem.
  questionarios: Record<string, string[]>;
};

export const ID_TIPO_DESPESA = "q-03";
export const ID_UF = "q-05";

type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE = "gemape-demo-questionario-despesas";
const CHAVE_SEQUENCIA = "gemape-demo-questionario-despesas-sequencia";
const formatarCodigo = (n: number) => String(n).padStart(2, "0");

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

export function estadoPadrao(): Estado {
  const perguntas = perguntasPadrao();
  const resto = perguntas.filter((p) => p.id !== ID_TIPO_DESPESA).map((p) => p.id);
  const tipo = perguntas.find((p) => p.id === ID_TIPO_DESPESA);
  return { versao: 1, perguntas, questionarios: Object.fromEntries((tipo?.opcoes ?? []).map((o) => [o, [...resto]])) };
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
    id: `q-${codigo}-${Date.now().toString(36)}`, codigo, tipo, titulo: "", obrigatoria: true,
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
  if (TIPOS_COM_OPCOES.includes(p.tipo) && p.fonte === "propria" && !p.habilitados && p.dependeDe === null) {
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
  try { const lido = JSON.parse(bruto); ok = !!lido && Array.isArray(lido.perguntas) && typeof lido.questionarios === "object"; } catch { ok = false; }
  if (!ok) throw new Error("As perguntas salvas neste navegador estão ilegíveis; nada foi alterado.");
}

export function lerEstado(storage: StorageLike = localStorage): Estado {
  try {
    const bruto = storage.getItem(CHAVE);
    if (bruto === null) return estadoPadrao();
    const lido = JSON.parse(bruto);
    if (!lido || !Array.isArray(lido.perguntas) || typeof lido.questionarios !== "object" || lido.questionarios === null) return estadoPadrao();
    return { versao: 1, perguntas: lido.perguntas, questionarios: lido.questionarios };
  } catch {
    return estadoPadrao();
  }
}

export function gravarEstado(e: Estado, storage: StorageLike = localStorage): Estado {
  conferirIntegridade(storage);
  storage.setItem(CHAVE_SEQUENCIA, String(ultimoNumero(e, storage)));
  storage.setItem(CHAVE, JSON.stringify(e));
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
  const existe = e.perguntas.some((p) => p.id === limpa.id);
  const perguntas = existe ? e.perguntas.map((p) => (p.id === limpa.id ? limpa : p)) : [...e.perguntas, limpa];
  let questionarios = e.questionarios;
  if (limpa.id === ID_TIPO_DESPESA) {
    const padrao = perguntas.filter((p) => p.id !== ID_TIPO_DESPESA).map((p) => p.id);
    questionarios = Object.fromEntries(limpa.opcoes.map((o) => [o, e.questionarios[o] ?? padrao]));
  }
  return gravarEstado({ ...e, perguntas, questionarios }, storage);
}

// Clonar copia todos os campos (dec 138) com código e título novos.
export function clonarPergunta(e: Estado, id: string, storage: StorageLike = localStorage): Pergunta {
  const origem = e.perguntas.find((p) => p.id === id);
  if (!origem) throw new Error("Pergunta não encontrada.");
  const codigo = proximoCodigoPergunta(e, storage);
  return {
    ...origem, id: `q-${codigo}-${Date.now().toString(36)}`, codigo, sistema: false, titulo: `${origem.titulo} (cópia)`,
    opcoes: [...origem.opcoes], habilitados: origem.habilitados ? origem.habilitados.map((h) => ({ ...h })) : null,
  };
}

export function excluirPergunta(e: Estado, id: string, storage: StorageLike = localStorage): Estado {
  const alvo = e.perguntas.find((p) => p.id === id);
  if (!alvo) return e;
  if (alvo.sistema) throw new Error("Esta pergunta abre todos os questionários e não pode ser excluída.");
  const questionarios = Object.fromEntries(Object.entries(e.questionarios).map(([t, ids]) => [t, ids.filter((x) => x !== id)]));
  return gravarEstado({ ...e, perguntas: e.perguntas.filter((p) => p.id !== id), questionarios }, storage);
}

export function gravarQuestionario(e: Estado, tipo: string, ids: string[], storage: StorageLike = localStorage): Estado {
  if (!tiposDeDespesa(e).includes(tipo)) throw new Error("Tipo de despesa desconhecido.");
  const unicos = [...new Set(ids.filter((id) => id !== ID_TIPO_DESPESA && e.perguntas.some((p) => p.id === id)))];
  return gravarEstado({ ...e, questionarios: { ...e.questionarios, [tipo]: unicos } }, storage);
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

// Habilitados que continuam valendo: quem tem vínculo com um empregado que está inativo (ou não existe mais) sai da lista.
export function habilitadosAtivos(lista: Habilitado[], idsAtivos: ReadonlySet<string>): Habilitado[] {
  return lista.filter((h) => h.empregadoId === null || idsAtivos.has(h.empregadoId));
}
