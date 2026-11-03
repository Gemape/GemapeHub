// Indicadores do alto de Ocorrências (decisão 320): ocorrências tratadas no prazo e não tratadas. Tratada no prazo é a encerrada que cumpriu os dois prazos de
// Parâmetros > Veículos > Parâmetros Específicos: a tratativa começou até a data limite do início (dia da ocorrência mais os dias de iniciar) e terminou até a data limite da
// finalização (início da tratativa mais os dias de finalizar). Em cada passo, a data da última renovação, se houver, vale no lugar da padrão. Não tratada é a encerrada
// que perdeu algum dos dois prazos ou a ainda aberta que já venceu. A ocorrência que ainda está dentro do prazo não entra na conta. A faixa vem dos limites da Frota.
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
export function encerradaNoPrazo(
  o: OcorrenciaParaIndicador,
  prazos: PrazosOcorrencias,
): boolean | null {
  if (o.status !== "Encerrada" || !o.encerradaEm) return null;
  const dia = o.ocorridoEm.slice(0, 10);
  const inicio = o.tratativa?.registradaEm ? hojeBrasilia(new Date(o.tratativa.registradaEm)) : dia;
  // Como na ocorrência aberta (frota-ocorrencias.ts), a renovação com data limite é quem manda, mesmo que a data seja antes da padrão.
  const renovada = (passo: string) =>
    (o.renovacoes ?? [])
      .filter((r) => r.passo === passo && r.ate)
      .sort((a, b) => Date.parse(a.em) - Date.parse(b.em))
      .at(-1)?.ate;
  // Prazo de início: só confere quando a ocorrência tem tratativa registrada (sem ela não há dia de início).
  if (
    o.tratativa?.registradaEm &&
    inicio > (renovada("iniciar") ?? dataLimiteSugerida(dia, prazos.iniciar))
  )
    return false;
  return (
    hojeBrasilia(new Date(o.encerradaEm)) <=
    (renovada("finalizar") ?? dataLimiteSugerida(inicio, prazos.finalizar))
  );
}

export function indicadoresDeOcorrencias(entrada: {
  ocorrencias: OcorrenciaParaIndicador[];
  hoje: string;
  prazos: PrazosOcorrencias;
  faixas?: ConfigFaixas;
}): { noPrazo: IndicadorDaFrota; naoTratadas: IndicadorDaFrota } {
  const { ocorrencias, hoje, prazos } = entrada;
  const noPrazo = ocorrencias.filter((o) => encerradaNoPrazo(o, prazos) === true).length;
  const fora = ocorrencias.filter(
    (o) =>
      encerradaNoPrazo(o, prazos) === false ||
      (o.status !== "Encerrada" && ocorrenciaVencida(o, hoje, prazos)),
  ).length;
  const total = noPrazo + fora;
  const valor = total === 0 ? null : arredondar((noPrazo / total) * 100);
  const faixa = faixaDoIndice(valor, entrada.faixas)?.faixa ?? null;
  const vazio = "Nenhuma ocorrência encerrada ou vencida";
  return {
    noPrazo: { pct: valor, faixa, detalhe: total ? `${noPrazo} de ${total} tratadas no prazo` : vazio },
    // A cor das não tratadas é a das tratadas no prazo (o complemento): poucas não tratadas é verde.
    naoTratadas: {
      pct: valor === null ? null : arredondar(100 - valor),
      faixa,
      detalhe: total ? `${fora} de ${total} não tratadas` : vazio,
    },
  };
}
