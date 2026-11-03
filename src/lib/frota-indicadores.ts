// Indicadores do alto da Frota (decisão 317): cards do PCM (manutenções, check list do PCM e ocorrências), da frota (conformidade geral, SLA de tarefas, e custo por km) e cards dos técnicos (só check list). Cada um é
// um percentual, e a faixa (verde, amarelo ou vermelho) vem dos limites de Parâmetros > Veículos > Parâmetros Específicos, os mesmos dos índices de Viagens.
import { resumoDeLinhas, type LinhaPainel } from "./checklist-painel.ts";
import type { StatusSugestao } from "./extrato-veiculo.ts";
import { faixaDoIndice, type ConfigFaixas, type Faixa } from "./faixas-desempenho.ts";
import {
  ocorrenciaAberta,
  ocorrenciaVencida,
  type OcorrenciaDoPrazo,
} from "./frota-ocorrencias.ts";
import type { PrazosOcorrencias } from "./prazo-ocorrencias.ts";
import { grupoDaLinha, type GrupoDeArea } from "./area-responsaveis.ts";

export type IndicadorDaFrota = { pct: number | null; faixa: Faixa | null; detalhe: string };

const arredondar = (n: number) => Math.round(n * 10) / 10;
const pct = (parte: number, total: number): number | null =>
  total === 0 ? null : arredondar((parte / total) * 100);
const indicador = (
  valor: number | null,
  detalhe: string,
  config?: ConfigFaixas,
): IndicadorDaFrota => ({
  pct: valor,
  faixa: faixaDoIndice(valor, config)?.faixa ?? null,
  detalhe,
});

export type IndicadoresDaFrota = {
  manutencoes: IndicadorDaFrota;
  checklistPcm: IndicadorDaFrota;
  ocorrencias: IndicadorDaFrota;
  conformidadeGeral: IndicadorDaFrota;
  tecnicosNoPrazo: IndicadorDaFrota;
  tecnicosNaoRealizados: IndicadorDaFrota;
};

export function indicadoresDaFrota(entrada: {
  statusPreventivas: StatusSugestao[];
  ocorrencias: OcorrenciaDoPrazo[];
  linhasDoChecklist: LinhaPainel[];
  grupoDe: (responsavel: string) => GrupoDeArea;
  hoje: string;
  prazos: PrazosOcorrencias;
  faixas?: ConfigFaixas;
}): IndicadoresDaFrota {
  const { faixas } = entrada;

  // Manutenções: das preventivas do plano de todos os veículos (as sem registro ainda não contam), quantas não estão vencidas.
  const contadas = entrada.statusPreventivas.filter((s) => s !== "sem_registro");
  const emDia = contadas.filter((s) => s !== "vencida").length;
  const manutencoes = indicador(
    pct(emDia, contadas.length),
    contadas.length
      ? `${emDia} de ${contadas.length} preventivas em dia`
      : "Nenhuma preventiva com registro",
    faixas,
  );

  // Ocorrências: das que estão abertas, quantas ainda estão dentro do prazo da tratativa. Sem nenhuma aberta, 100%.
  const abertas = entrada.ocorrencias.filter(ocorrenciaAberta);
  const vencidas = abertas.filter((o) => ocorrenciaVencida(o, entrada.hoje, entrada.prazos)).length;
  const ocorrencias = indicador(
    abertas.length === 0 ? 100 : pct(abertas.length - vencidas, abertas.length),
    abertas.length
      ? `${abertas.length - vencidas} de ${abertas.length} abertas no prazo`
      : "Nenhuma ocorrência aberta",
    faixas,
  );

  // Check list: realizados no prazo entre os que já têm desfecho, separados por grupo do responsável (PCM e Técnicos).
  const doGrupo = (g: GrupoDeArea) =>
    resumoDeLinhas(entrada.linhasDoChecklist.filter((l) => grupoDaLinha(l, entrada.grupoDe) === g));
  const pcmResumo = doGrupo("PCM");
  const desfechosPcm = pcmResumo.realizados + pcmResumo.naoRealizados;
  const checklistPcm = indicador(
    pcmResumo.pctNoPrazo,
    desfechosPcm
      ? `${pcmResumo.realizados} de ${desfechosPcm} no prazo`
      : "Sem check list do PCM com prazo vencido",
    faixas,
  );

  const tec = doGrupo("Técnicos");
  const desfechosTec = tec.realizados + tec.naoRealizados;
  const tecnicosNoPrazo = indicador(
    tec.pctNoPrazo,
    desfechosTec
      ? `${tec.realizados} de ${desfechosTec} no prazo`
      : "Sem check list dos técnicos com prazo vencido",
    faixas,
  );
  // A cor dos não realizados é a dos realizados no prazo (o complemento): poucos não realizados é verde, muitos é vermelho.
  const tecnicosNaoRealizados: IndicadorDaFrota = {
    pct: tec.pctNaoNoPrazo,
    faixa: tecnicosNoPrazo.faixa,
    detalhe: desfechosTec
      ? `${tec.naoRealizados} de ${desfechosTec} sem fazer no prazo`
      : "Sem check list dos técnicos com prazo vencido",
  };

  // Conformidade geral (decisão 343): SLA de resolução de tarefas, tudo junto: concluídas no prazo ÷ tarefas atribuídas que já têm desfecho. As tarefas são as preventivas com
  // registro, os check lists obrigatórios (PCM, técnicos e sem área) realizados ou não e as ocorrências abertas (no prazo ou vencidas).
  const todos = resumoDeLinhas(entrada.linhasDoChecklist);
  const noPrazo = emDia + todos.realizados + (abertas.length - vencidas);
  const total = contadas.length + todos.realizados + todos.naoRealizados + abertas.length;
  const conformidadeGeral = indicador(
    pct(noPrazo, total),
    total ? `${noPrazo} de ${total} tarefas no prazo` : "Sem tarefas para calcular",
    faixas,
  );

  return {
    manutencoes,
    checklistPcm,
    ocorrencias,
    conformidadeGeral,
    tecnicosNoPrazo,
    tecnicosNaoRealizados,
  };
}

// Custo por quilômetro rodado da frota (CPK, decisão 343): (abastecimento + manutenção) ÷ km rodados. Sem filtro de período, vale todo o histórico registrado. Os km rodados de um veículo são a
// diferença entre o maior e o menor km dos registros dele (precisa de dois km diferentes); os gastos só entram dos veículos que têm km rodados, para o custo e o km serem da mesma base.
export type CustoPorKm = { valor: number | null; abastecimento: number; manutencao: number; km: number };

export function custoPorKm(
  veiculoIds: string[],
  abastecimentos: { veiculoId: string; km: number; valor?: number | null | undefined }[],
  manutencoes: { veiculoId: string; km: number; custo: number }[],
): CustoPorKm {
  let abastecimento = 0;
  let manutencao = 0;
  let km = 0;
  for (const id of veiculoIds) {
    const a = abastecimentos.filter((x) => x.veiculoId === id);
    const m = manutencoes.filter((x) => x.veiculoId === id);
    const kms = [...a.map((x) => x.km), ...m.map((x) => x.km)].filter((n) => Number.isFinite(n) && n > 0);
    const rodados = kms.length ? Math.max(...kms) - Math.min(...kms) : 0;
    if (rodados <= 0) continue;
    km += rodados;
    abastecimento += a.reduce((t, x) => t + (x.valor ?? 0), 0);
    manutencao += m.reduce((t, x) => t + x.custo, 0);
  }
  return { valor: km > 0 ? (abastecimento + manutencao) / km : null, abastecimento, manutencao, km };
}
