// Parâmetros Específicos do EPI (decisão 328), em Parâmetros > EPI > Parâmetros Específicos: os motivos de baixa definitiva, os motivos de devolução ao estoque e os parâmetros da sugestão
// de compra (estoque mínimo ou tempo de cobertura em dias, prazo de reposição do fornecedor e os cortes da tabela de criticidade).
// Fase 1: fica só no navegador, em modo demonstração; na Fase 2 vira configuração por empresa.
import { MOTIVOS_BAIXA } from "./gemape.ts";

type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE_COMPRA = "gemape-demo-epi-parametros-compra";
const CHAVE_BAIXA = "gemape-demo-epi-motivos-baixa";
const CHAVE_DEVOLUCAO = "gemape-demo-epi-motivos-devolucao";

export const MOTIVOS_BAIXA_PADRAO: readonly string[] = MOTIVOS_BAIXA;
export const MOTIVOS_DEVOLUCAO_PADRAO: readonly string[] = [
  "Fim do uso",
  "Troca de tamanho",
  "Troca por desgaste",
  "Desligamento do empregado",
  "Mudança de função",
];
export const MAX_MOTIVOS = 30;

const limpar = (t: string) => t.trim().replace(/\s+/g, " ").slice(0, 60);

function lerLista(chave: string, padrao: readonly string[], storage?: StorageLike): string[] {
  try {
    const bruto = (storage ?? localStorage).getItem(chave);
    const lido: unknown = bruto === null ? null : JSON.parse(bruto);
    if (!Array.isArray(lido)) return [...padrao];
    const lista = [
      ...new Set(
        lido
          .filter((m): m is string => typeof m === "string")
          .map(limpar)
          .filter(Boolean),
      ),
    ];
    // Lista guardada vazia ou sem texto aproveitável volta à padrão: sem motivo a devolução não poderia ser registrada.
    return lista.length > 0 ? lista : [...padrao];
  } catch {
    return [...padrao];
  }
}

function salvarLista(chave: string, motivos: string[], storage?: StorageLike): string[] {
  const lista = [...new Set(motivos.map(limpar).filter(Boolean))];
  if (lista.length === 0) throw new Error("Cadastre pelo menos um motivo.");
  if (lista.length > MAX_MOTIVOS) throw new Error(`No máximo ${MAX_MOTIVOS} motivos.`);
  try {
    (storage ?? localStorage).setItem(chave, JSON.stringify(lista));
  } catch {
    throw new Error("Não foi possível guardar os motivos neste navegador.");
  }
  return lista;
}

export const lerMotivosBaixaEpi = (storage?: StorageLike) =>
  lerLista(CHAVE_BAIXA, MOTIVOS_BAIXA_PADRAO, storage);
export const salvarMotivosBaixaEpi = (motivos: string[], storage?: StorageLike) =>
  salvarLista(CHAVE_BAIXA, motivos, storage);
export const lerMotivosDevolucaoEpi = (storage?: StorageLike) =>
  lerLista(CHAVE_DEVOLUCAO, MOTIVOS_DEVOLUCAO_PADRAO, storage);
export const salvarMotivosDevolucaoEpi = (motivos: string[], storage?: StorageLike) =>
  salvarLista(CHAVE_DEVOLUCAO, motivos, storage);

// ---------- Sugestão de compra ----------

export type MetodoReposicao = "minimo" | "cobertura";
export type ParametrosCompraEpi = {
  metodo: MetodoReposicao; // trabalhar com o estoque mínimo ou com o tempo de cobertura em dias
  diasCobertura: number; // meta de cobertura, quando o método é o tempo de cobertura
  prazoReposicao: number; // TR: prazo de reposição do fornecedor, em dias
  diasSeguranca: number; // Comprar já vai de TR até TR + segurança
  diasPlanejamento: number; // Planejar vai até TR + planejamento
  limiteExcesso: number; // acima disso a cobertura é excesso
};
export const PARAMETROS_COMPRA_PADRAO: ParametrosCompraEpi = {
  metodo: "cobertura",
  diasCobertura: 120,
  prazoReposicao: 30,
  diasSeguranca: 15,
  diasPlanejamento: 30,
  limiteExcesso: 90,
};
export const MAX_DIAS = 730;

export const diasValidos = (n: number): boolean => Number.isInteger(n) && n >= 0 && n <= MAX_DIAS;

const dias = (v: unknown, padrao: number): number =>
  typeof v === "number" && diasValidos(v) ? v : padrao;

export function lerParametrosCompraEpi(storage?: StorageLike): ParametrosCompraEpi {
  try {
    const bruto = (storage ?? localStorage).getItem(CHAVE_COMPRA);
    const obj: unknown = bruto === null ? null : JSON.parse(bruto);
    const o = obj && typeof obj === "object" ? (obj as Record<string, unknown>) : {};
    const p = PARAMETROS_COMPRA_PADRAO;
    return {
      metodo: o["metodo"] === "minimo" || o["metodo"] === "cobertura" ? o["metodo"] : p.metodo,
      diasCobertura: dias(o["diasCobertura"], p.diasCobertura),
      prazoReposicao: dias(o["prazoReposicao"], p.prazoReposicao),
      diasSeguranca: dias(o["diasSeguranca"], p.diasSeguranca),
      diasPlanejamento: dias(o["diasPlanejamento"], p.diasPlanejamento),
      limiteExcesso: dias(o["limiteExcesso"], p.limiteExcesso),
    };
  } catch {
    return { ...PARAMETROS_COMPRA_PADRAO };
  }
}

export function salvarParametrosCompraEpi(p: ParametrosCompraEpi, storage?: StorageLike): void {
  if (p.metodo !== "minimo" && p.metodo !== "cobertura")
    throw new Error("Escolha o método: estoque mínimo ou tempo de cobertura.");
  if (
    ![
      p.diasCobertura,
      p.prazoReposicao,
      p.diasSeguranca,
      p.diasPlanejamento,
      p.limiteExcesso,
    ].every(diasValidos)
  )
    throw new Error(`Informe números inteiros de dias entre 0 e ${MAX_DIAS}.`);
  if (p.metodo === "cobertura" && p.diasCobertura < 1)
    throw new Error("A meta de cobertura precisa de pelo menos 1 dia.");
  if (p.diasPlanejamento < p.diasSeguranca)
    throw new Error("O planejamento não pode ser menor que a segurança.");
  try {
    (storage ?? localStorage).setItem(CHAVE_COMPRA, JSON.stringify(p));
  } catch {
    throw new Error("Não foi possível guardar os parâmetros neste navegador.");
  }
}

// ---------- Tabela de criticidade (tudo em dias) ----------
// TC é o tempo de cobertura do estoque e TR o prazo de reposição do fornecedor. O ponto de pedido é TR + segurança.
export type StatusCriticidade = "ruptura" | "comprar_ja" | "planejar" | "estavel" | "excesso";
export const STATUS_CRITICIDADE: Record<
  StatusCriticidade,
  { rotulo: string; criticidade: string; significado: string }
> = {
  ruptura: {
    rotulo: "Ruptura",
    criticidade: "Crítica",
    significado: "O estoque vai zerar antes do produto chegar.",
  },
  comprar_ja: {
    rotulo: "Comprar já",
    criticidade: "Alta",
    significado: "Estoque de segurança acionado: o pedido precisa ser feito hoje.",
  },
  planejar: {
    rotulo: "Planejar",
    criticidade: "Média",
    significado: "Janela de compra: o item entra na próxima rodada de cotações.",
  },
  estavel: {
    rotulo: "Estável",
    criticidade: "Baixa",
    significado: "Cobertura confortável: nenhuma ação necessária.",
  },
  excesso: {
    rotulo: "Excesso",
    criticidade: "Nenhuma",
    significado: "Estoque acima do necessário: risco de capital parado.",
  },
};

export function statusDeCriticidade(tc: number, p: ParametrosCompraEpi): StatusCriticidade {
  const tr = p.prazoReposicao;
  if (tc < tr) return "ruptura";
  if (tc <= tr + p.diasSeguranca) return "comprar_ja";
  if (tc <= tr + p.diasPlanejamento) return "planejar";
  if (tc <= Math.max(p.limiteExcesso, tr + p.diasPlanejamento)) return "estavel";
  return "excesso";
}

// Condição lógica (gatilho) e significado de cada status conforme o método da sugestão de compra (decisão 355). Com o tempo de cobertura (TC, em dias) a condição compara TC com o prazo de reposição
// (TR) e a segurança, o planejamento e o excesso; com o estoque mínimo, compara o estoque total com o mínimo do EPI. `formula` usa as letras da tabela e `calculo`, os dias configurados.
export type CondicaoDoStatus = { formula: string; calculo: string; significado: string };

export function condicaoDoStatus(status: StatusCriticidade, p: ParametrosCompraEpi): CondicaoDoStatus {
  if (p.metodo === "minimo") {
    const minimo = {
      ruptura: { formula: "Estoque total = 0", calculo: "Sem nenhuma unidade (novos + usados).", significado: "Sem estoque: o item acabou." },
      comprar_ja: { formula: "0 < Estoque total < Mínimo", calculo: "Abaixo do estoque mínimo cadastrado no EPI.", significado: "Abaixo do estoque mínimo: o pedido precisa ser feito hoje." },
      planejar: { formula: "Estoque total = Mínimo (Mínimo > 0)", calculo: "Exatamente no estoque mínimo do EPI.", significado: "No limite do mínimo: o item entra na próxima rodada de cotações." },
      estavel: { formula: `Estoque total > Mínimo e TC ≤ ${p.limiteExcesso}`, calculo: `Acima do mínimo e com cobertura de até ${p.limiteExcesso} dias (ou sem consumo).`, significado: "Acima do mínimo: nenhuma ação necessária." },
      excesso: { formula: `Estoque total > Mínimo e TC > ${p.limiteExcesso}`, calculo: `Acima do mínimo e com cobertura de mais de ${p.limiteExcesso} dias.`, significado: "Estoque acima do necessário: risco de capital parado." },
    } satisfies Record<StatusCriticidade, CondicaoDoStatus>;
    return minimo[status];
  }
  const tr = p.prazoReposicao;
  const seguranca = tr + p.diasSeguranca;
  const planejamento = tr + p.diasPlanejamento;
  const excesso = Math.max(p.limiteExcesso, planejamento);
  const cobertura = {
    ruptura: { formula: "TC < TR", calculo: `TC < ${tr} dias`, significado: STATUS_CRITICIDADE.ruptura.significado },
    comprar_ja: { formula: "TC ≥ TR e TC ≤ TR + segurança", calculo: `TC ≥ ${tr} e TC ≤ ${seguranca} dias`, significado: STATUS_CRITICIDADE.comprar_ja.significado },
    planejar: { formula: "TC > TR + segurança e TC ≤ TR + planejamento", calculo: `TC > ${seguranca} e TC ≤ ${planejamento} dias`, significado: STATUS_CRITICIDADE.planejar.significado },
    estavel: { formula: "TC > TR + planejamento e TC ≤ limite de excesso", calculo: `TC > ${planejamento} e TC ≤ ${excesso} dias`, significado: STATUS_CRITICIDADE.estavel.significado },
    excesso: { formula: "TC > limite de excesso", calculo: `TC > ${excesso} dias`, significado: STATUS_CRITICIDADE.excesso.significado },
  } satisfies Record<StatusCriticidade, CondicaoDoStatus>;
  return cobertura[status];
}

// O ponto de pedido (gatilho de compra) do método escolhido, em uma frase.
export const textoDoPontoDePedido = (p: ParametrosCompraEpi): string =>
  p.metodo === "minimo"
    ? "Ponto de pedido: o estoque mínimo do EPI. Abaixo dele a compra é sugerida."
    : `Ponto de pedido: TR (prazo de reposição, ${p.prazoReposicao} dias) + ${p.diasSeguranca} dias de segurança = ${p.prazoReposicao + p.diasSeguranca} dias de cobertura. TC é o tempo de cobertura: estoque total ÷ consumo médio por dia.`;

// ---------- Textos dos documentos (decisão 356) ----------
// Os textos do Termo de Entrega de EPI (a declaração antes da tabela e a ciência depois dela) e da Ficha de Controle de Entrega de EPI se digitam em Parâmetros > EPI > Parâmetros Específicos.
// `{empresa}` é trocado pela razão social da empresa na hora de montar o documento. Sem texto guardado (ou com armazenamento bloqueado) valem os textos padrão.
export type TextosDocumentosEpi = { termoDeclaracao: string; termoCiencia: string; fichaDeclaracao: string };
const CHAVE_TEXTOS = "gemape-demo-epi-textos-documentos";
export const MAX_TEXTO_DOCUMENTO = 1500;
export const MARCADOR_EMPRESA = "{empresa}";
export const TEXTOS_DOCUMENTOS_PADRAO: TextosDocumentosEpi = {
  termoDeclaracao:
    "Declaro ter recebido da empresa {empresa}, os Equipamentos de Proteção Individual (EPI) abaixo relacionados, novos e/ou em perfeitas condições de uso, obrigando-me a utilizá-los corretamente, zelar pela sua guarda e conservação, bem como devolvê-los quando solicitado ou no ato de minha rescisão contratual.",
  termoCiencia:
    "Estou ciente de que o uso do EPI é obrigatório e que a sua não utilização poderá acarretar sanções disciplinares conforme a legislação vigente.",
  fichaDeclaracao:
    "Declaro que recebi da empresa os Equipamentos de Proteção Individual (EPI) adequados ao risco de minha atividade, em perfeitas condições de uso, e que fui treinado quanto ao seu uso correto. Comprometo-me a utilizá-los apenas para a finalidade a que se destinam e a devolvê-los quando solicitado ou no desligamento da empresa.",
};

const CAMPOS_TEXTOS = ["termoDeclaracao", "termoCiencia", "fichaDeclaracao"] as const;
const textoValido = (t: unknown): t is string => typeof t === "string" && t.trim().length > 0 && t.length <= MAX_TEXTO_DOCUMENTO;

export function lerTextosDocumentosEpi(storage?: StorageLike): TextosDocumentosEpi {
  try {
    const bruto = (storage ?? localStorage).getItem(CHAVE_TEXTOS);
    const o: Record<string, unknown> = bruto ? (JSON.parse(bruto) as Record<string, unknown>) : {};
    const lido = { ...TEXTOS_DOCUMENTOS_PADRAO };
    for (const c of CAMPOS_TEXTOS) if (textoValido(o[c])) lido[c] = (o[c] as string).trim();
    return lido;
  } catch {
    return { ...TEXTOS_DOCUMENTOS_PADRAO };
  }
}

export function salvarTextosDocumentosEpi(t: TextosDocumentosEpi, storage?: StorageLike): TextosDocumentosEpi {
  for (const c of CAMPOS_TEXTOS) {
    if (!t[c].trim()) throw new Error("Preencha os três textos.");
    if (t[c].length > MAX_TEXTO_DOCUMENTO) throw new Error(`Cada texto aceita até ${MAX_TEXTO_DOCUMENTO} caracteres.`);
  }
  const limpo: TextosDocumentosEpi = { termoDeclaracao: t.termoDeclaracao.trim(), termoCiencia: t.termoCiencia.trim(), fichaDeclaracao: t.fichaDeclaracao.trim() };
  try {
    (storage ?? localStorage).setItem(CHAVE_TEXTOS, JSON.stringify(limpo));
  } catch {
    throw new Error("Não foi possível guardar os textos neste navegador.");
  }
  return limpo;
}
