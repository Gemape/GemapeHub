// Indicadores do alto de Ocorrências (decisão 320): ocorrências realizadas no prazo e não realizadas no prazo. Realizada no prazo é a encerrada até a data limite da
// finalização (início da tratativa mais os dias de Parâmetros > Veículos > Parâmetros Específicos, ou a data da última renovação, se houver). Não realizada no prazo é a encerrada
// depois dessa data ou a ainda aberta que já venceu. A ocorrência que ainda está dentro do prazo não entra na conta. A faixa vem dos limites da Frota.
import { hojeBrasilia } from "./checklist-veiculo.ts";
import { faixaDoIndice, type ConfigFaixas } from "./faixas-desempenho.ts";
import type { IndicadorDaFrota } from "./frota-indicadores.ts";
import { ocorrenciaVencida } from "./frota-ocorrencias.ts";
import { dataLimiteSugerida, type PrazosOcorrencias } from "./prazo-ocorrencias.ts";

export type OcorrenciaParaIndicador = {
  ocorridoEm: string;
  status: string;
  tratativa?: { registradaEm: string } | null;
  encerradaEm?: string | null;
  renovacoes?: { em: string; passo?: string; ate?: string }[];
};

const arredondar = (n: number) => Math.round(n * 10) / 10;

// null quando a ocorrência não está encerrada (ainda não há como dizer se foi no prazo).
export function encerradaNoPrazo(o: OcorrenciaParaIndicador, prazos: PrazosOcorrencias): boolean | null {
  if (o.status !== "Encerrada" || !o.encerradaEm) return null;
  const inicio = o.tratativa?.registradaEm ? hojeBrasilia(new Date(o.tratativa.registradaEm)) : o.ocorridoEm.slice(0, 10);
  const renovada = (o.renovacoes ?? []).filter((r) => r.passo === "finalizar" && r.ate).sort((a, b) => Date.parse(a.em) - Date.parse(b.em)).at(-1)?.ate;
  const padrao = dataLimiteSugerida(inicio, prazos.finalizar);
  // Como na ocorrência aberta (frota-ocorrencias.ts), a renovação com data limite é quem manda, mesmo que a data seja antes da padrão.
  const limite = renovada ?? padrao;
  return hojeBrasilia(new Date(o.encerradaEm)) <= limite;
}

export function indicadoresDeOcorrencias(entrada: { ocorrencias: OcorrenciaParaIndicador[]; hoje: string; prazos: PrazosOcorrencias; faixas?: ConfigFaixas }): { noPrazo: IndicadorDaFrota; naoRealizadas: IndicadorDaFrota } {
  const { ocorrencias, hoje, prazos } = entrada;
  const noPrazo = ocorrencias.filter((o) => encerradaNoPrazo(o, prazos) === true).length;
  const fora = ocorrencias.filter((o) => encerradaNoPrazo(o, prazos) === false || (o.status !== "Encerrada" && ocorrenciaVencida(o, hoje, prazos))).length;
  const total = noPrazo + fora;
  const valor = total === 0 ? null : arredondar((noPrazo / total) * 100);
  const faixa = faixaDoIndice(valor, entrada.faixas)?.faixa ?? null;
  const vazio = "Nenhuma ocorrência encerrada ou vencida";
  return {
    noPrazo: { pct: valor, faixa, detalhe: total ? `${noPrazo} de ${total} no prazo` : vazio },
    // A cor dos não realizados é a dos realizados no prazo (o complemento): poucos não realizados é verde.
    naoRealizadas: { pct: valor === null ? null : arredondar(100 - valor), faixa, detalhe: total ? `${fora} de ${total} fora do prazo` : vazio },
  };
}
