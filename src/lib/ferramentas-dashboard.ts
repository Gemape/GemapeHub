// Indicadores do Dashboard de Ferramentas, no padrão da Frota: vistorias periódicas em dia, ocorrências tratadas no prazo e a conformidade geral (as duas juntas).
// Prazos e faixas são os de Parâmetros Específicos (os mesmos de Veículos). Funções puras, sem tela.
import { faixaDoIndiceDeVeiculos } from "./faixas-desempenho.ts";
import { ocorrenciaAberta, ocorrenciaProxima, ocorrenciaVencida, type OcorrenciaDoPrazo } from "./frota-ocorrencias.ts";
import type { Interpretacao } from "./frota-interpretacao.ts";
import type { IndicadorDaFrota } from "./frota-indicadores.ts";
import type { SituacaoColuna } from "./frota-situacao.ts";
import { encerradaNoPrazo, type OcorrenciaParaIndicador } from "./ocorrencias-indicadores.ts";
import type { PrazosOcorrencias } from "./prazo-ocorrencias.ts";
import type { SituacaoDaVistoria } from "./situacao-vistoria.ts";
import type { TratativaFerramenta } from "./tratativa-ocorrencia-ferramenta.ts";

export type OcorrenciaDaFerramenta = OcorrenciaDoPrazo & OcorrenciaParaIndicador & { encerradaEm?: string | null };

/**
 * Ocorrência de ferramenta no formato dos prazos. A tratativa só guarda a data da última gravação, então ela marca o início da tratativa:
 * o prazo de iniciar é conferido pela primeira gravação conhecida e o de finalizar, pelo encerramento.
 */
export function ocorrenciaDaFerramentaParaPrazo(o: { data: string }, tratativa: Pick<TratativaFerramenta, "situacao" | "atualizadaEm" | "encerradaEm"> | undefined): OcorrenciaDaFerramenta {
  return {
    ocorridoEm: o.data,
    status: tratativa?.situacao ?? "Aberta",
    tratativa: tratativa ? { registradaEm: tratativa.atualizadaEm } : null,
    encerradaEm: tratativa?.encerradaEm ?? null,
  };
}

const arredondar = (n: number) => Math.round(n * 10) / 10;
const indice = (parte: number, total: number, detalhe: (p: number, t: number) => string, vazio: string): IndicadorDaFrota => {
  if (total === 0) return { pct: null, faixa: null, detalhe: vazio };
  const pct = arredondar((parte / total) * 100);
  return { pct, faixa: faixaDoIndiceDeVeiculos(pct)?.faixa ?? null, detalhe: detalhe(parte, total) };
};

export type IndicadoresDeFerramentas = { vistorias: IndicadorDaFrota; ocorrencias: IndicadorDaFrota; conformidadeGeral: IndicadorDaFrota };

/**
 * Vistorias: em dia ÷ (em dia + vencidas); a pendente ainda está no prazo e a sem plano não conta. Ocorrências: tratadas no prazo ÷ (no prazo + fora do prazo ou vencidas).
 * Conformidade geral: as tarefas das duas juntas, como a da Frota.
 */
export function indicadoresDeFerramentas(e: { vistorias: readonly SituacaoDaVistoria[]; ocorrencias: readonly OcorrenciaDaFerramenta[]; hoje: string; prazos: PrazosOcorrencias }): IndicadoresDeFerramentas {
  const vEmDia = e.vistorias.filter((s) => s === "Em dia").length;
  const vTotal = vEmDia + e.vistorias.filter((s) => s === "Vencida").length;
  const oNoPrazo = e.ocorrencias.filter((o) => encerradaNoPrazo(o, e.prazos) === true).length;
  const oTotal = oNoPrazo + e.ocorrencias.filter((o) => encerradaNoPrazo(o, e.prazos) === false || (ocorrenciaAberta(o) && ocorrenciaVencida(o, e.hoje, e.prazos))).length;
  return {
    vistorias: indice(vEmDia, vTotal, (p, t) => `${p} de ${t} vistorias feitas no prazo`, "Nenhuma vistoria vencida ou feita no ciclo"),
    ocorrencias: indice(oNoPrazo, oTotal, (p, t) => `${p} de ${t} ocorrências tratadas no prazo`, "Nenhuma ocorrência encerrada ou vencida"),
    conformidadeGeral: indice(vEmDia + oNoPrazo, vTotal + oTotal, (p, t) => `${p} de ${t} tarefas no prazo`, "Sem tarefas com prazo vencido ou cumprido"),
  };
}

/** Coluna Vistoria da lista: em dia (verde), pendente dentro do prazo (amarelo), vencida (vermelho); sem plano, não se aplica. */
export function situacaoDaVistoriaNaColuna(s: SituacaoDaVistoria): SituacaoColuna {
  if (s === "Em dia") return { situacao: "em_dia", quantidade: 0 };
  if (s === "Pendente") return { situacao: "proximo", quantidade: 1 };
  if (s === "Vencida") return { situacao: "vencida", quantidade: 1 };
  return null;
}

/** Coluna Ocorrências da lista: as abertas da caixa, vencidas (vermelho), perto de vencer (amarelo) ou em dia (verde). */
export function situacaoDasOcorrenciasNaColuna(lista: readonly OcorrenciaDaFerramenta[], hoje: string, prazos: PrazosOcorrencias): SituacaoColuna {
  const abertas = lista.filter(ocorrenciaAberta);
  const vencidas = abertas.filter((o) => ocorrenciaVencida(o, hoje, prazos)).length;
  if (vencidas > 0) return { situacao: "vencida", quantidade: vencidas };
  const proximas = abertas.filter((o) => ocorrenciaProxima(o, hoje, prazos)).length;
  return proximas > 0 ? { situacao: "proximo", quantidade: proximas } : { situacao: "em_dia", quantidade: 0 };
}

const porcento = (n: number | null) => (n === null ? "sem dados" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
const LEITURAS: Record<string, { semDados: string; verde: string; amarelo: string; vermelho: string }> = {
  conformidade: {
    semDados: "Ainda não há vistoria vencida ou ocorrência encerrada para calcular.",
    verde: "As vistorias e as tratativas estão no prazo. Mantenha a rotina.",
    amarelo: "Parte das tarefas está saindo do prazo. Veja qual indicador abaixo puxa a média para baixo e cobre os responsáveis.",
    vermelho: "A maior parte das tarefas está atrasada. Comece pelas vistorias vencidas e pelas ocorrências sem tratativa.",
  },
  vistorias: {
    semDados: "Nenhuma vistoria venceu ainda, ou as caixas estão sem mês-base no Plano de vistorias.",
    verde: "As caixas estão sendo vistoriadas no prazo: ferramenta ausente ou danificada aparece cedo.",
    amarelo: "Algumas vistorias passaram do prazo. Cobre os responsáveis pela vistoria de cada caixa.",
    vermelho: "Muitas vistorias vencidas: a situação real das caixas é desconhecida. Faça as vencidas primeiro.",
  },
  ocorrencias: {
    semDados: "Nenhuma ocorrência de ferramenta encerrada ou vencida para avaliar.",
    verde: "As ocorrências estão sendo tratadas dentro dos prazos.",
    amarelo: "Algumas ocorrências estouraram o prazo. Priorize as abertas mais antigas.",
    vermelho: "Muitas ocorrências sem tratativa no prazo: perdas e baixas estão sem responsabilidade apurada.",
  },
  estoque: {
    semDados: "Nenhuma ferramenta ativa cadastrada.",
    verde: "O estoque está acima do mínimo na maior parte das ferramentas.",
    amarelo: "Parte das ferramentas está no mínimo ou abaixo. Veja a Sugestão de compras.",
    vermelho: "Muitas ferramentas no mínimo ou zeradas: reponha antes de faltar para as caixas.",
  },
};
const leitura = (chave: keyof typeof LEITURAS, i: { pct: number | null; faixa: IndicadorDaFrota["faixa"] }) => {
  const t = LEITURAS[chave]!;
  return i.pct === null || !i.faixa ? t.semDados : t[i.faixa];
};

/** O que cada resultado do Dashboard quer dizer e o que fazer, pela faixa em que o indicador está agora. */
export function interpretacoesDeFerramentas(ind: IndicadoresDeFerramentas, estoqueAcimaDoMinimo: { pct: number | null; faixa: IndicadorDaFrota["faixa"] }): Interpretacao[] {
  const item = (titulo: string, i: { pct: number | null; faixa: IndicadorDaFrota["faixa"] }, chave: keyof typeof LEITURAS): Interpretacao => ({ titulo, valor: porcento(i.pct), faixa: i.faixa, leitura: leitura(chave, i) });
  return [
    item("Conformidade geral (SLA)", ind.conformidadeGeral, "conformidade"),
    item("Vistorias periódicas em dia", ind.vistorias, "vistorias"),
    item("Ocorrências tratadas no prazo", ind.ocorrencias, "ocorrencias"),
    item("Estoque acima do mínimo", estoqueAcimaDoMinimo, "estoque"),
  ];
}
