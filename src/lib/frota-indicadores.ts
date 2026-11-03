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
import { mesesRecentes, rotuloMesCurto } from "./graficos-veiculos.ts";

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
// diferença entre o maior e o menor km dos registros dele (precisa de dois km diferentes, e registro sem km válido fica de fora). O abastecimento feito no km de partida abasteceu o que rodou
// antes dele, então só entram os seguintes; os gastos só entram dos veículos que têm km rodados, para o custo e o km serem da mesma base.
export type CustoPorKm = { valor: number | null; abastecimento: number; manutencao: number; km: number };
export type AbastecimentoDeCusto = { veiculoId: string; data: string; km: number; valor?: number | null | undefined };
export type ManutencaoDeCusto = { veiculoId: string; data: string; km: number; tipo: string; custo: number };

const kmValido = (n: number) => Number.isFinite(n) && n > 0;
const porVeiculo = <T extends { veiculoId: string }>(lista: T[]): Map<string, T[]> => {
  const mapa = new Map<string, T[]>();
  for (const x of lista) {
    const l = mapa.get(x.veiculoId);
    if (l) l.push(x);
    else mapa.set(x.veiculoId, [x]);
  }
  return mapa;
};
const extremos = (kms: number[]) => kms.reduce((r, n) => ({ max: Math.max(r.max, n), min: Math.min(r.min, n) }), { max: -Infinity, min: Infinity });
const soma = (valores: (number | null | undefined)[]) => valores.reduce<number>((t, v) => t + (v ?? 0), 0);

export function custoPorKm(veiculoIds: string[], abastecimentos: AbastecimentoDeCusto[], manutencoes: ManutencaoDeCusto[]): CustoPorKm {
  const ab = porVeiculo(abastecimentos);
  const ma = porVeiculo(manutencoes);
  let abastecimento = 0;
  let manutencao = 0;
  let km = 0;
  for (const id of veiculoIds) {
    const a = (ab.get(id) ?? []).filter((x) => kmValido(x.km));
    const m = (ma.get(id) ?? []).filter((x) => kmValido(x.km));
    const { max, min } = extremos([...a, ...m].map((x) => x.km));
    if (!(max - min > 0)) continue;
    km += max - min;
    abastecimento += soma(a.filter((x) => x.km > min).map((x) => x.valor));
    manutencao += soma(m.map((x) => x.custo));
  }
  return { valor: km > 0 ? (abastecimento + manutencao) / km : null, abastecimento, manutencao, km };
}

// CPK de cada um dos `n` meses mais recentes (gráfico de linha). Os km do mês vão do maior km registrado até o mês anterior (ou, sem registro antes, do menor do mês) até o maior do mês; mês sem
// km rodados fica sem valor.
export function custoPorKmPorMes(
  veiculoIds: string[],
  abastecimentos: AbastecimentoDeCusto[],
  manutencoes: ManutencaoDeCusto[],
  hoje: string,
  n = 6,
): { mes: string; rotulo: string; cpk: number | null }[] {
  const ab = porVeiculo(abastecimentos);
  const ma = porVeiculo(manutencoes);
  return mesesRecentes(hoje, n).map((mes) => {
    let custo = 0;
    let km = 0;
    for (const id of veiculoIds) {
      const a = (ab.get(id) ?? []).filter((x) => kmValido(x.km));
      const m = (ma.get(id) ?? []).filter((x) => kmValido(x.km));
      const doMes = (x: { data: string }) => x.data.slice(0, 7) === mes;
      const kmsDoMes = [...a.filter(doMes), ...m.filter(doMes)].map((x) => x.km);
      if (!kmsDoMes.length) continue;
      const antes = [...a, ...m].filter((x) => x.data.slice(0, 7) < mes).map((x) => x.km);
      const { max, min } = extremos(kmsDoMes);
      const inicio = antes.length ? extremos(antes).max : min;
      if (!(max - inicio > 0)) continue;
      km += max - inicio;
      custo += soma(a.filter(doMes).filter((x) => antes.length > 0 || x.km > inicio).map((x) => x.valor)) + soma(m.filter(doMes).map((x) => x.custo));
    }
    return { mes, rotulo: rotuloMesCurto(mes), cpk: km > 0 ? Math.round((custo / km) * 100) / 100 : null };
  });
}

// Proporção do gasto de manutenção que é preventivo (decisão 344): preventivo ÷ total de manutenção. Referência de mercado 80/20: verde a partir de 80%, amarelo de 70% a 79,9% e vermelho abaixo de
// 70%, quando a frota está no modo reativo (o corretivo custa mais). Os limites são fixos, não os das faixas de Parâmetros, que valem para os índices de prazo.
export const META_PREVENTIVA = 80;
export const LIMITE_REATIVO = 70;
export function proporcaoPreventiva(veiculoIds: string[], manutencoes: ManutencaoDeCusto[]): IndicadorDaFrota {
  const ids = new Set(veiculoIds);
  const daFrota = manutencoes.filter((m) => ids.has(m.veiculoId));
  const total = soma(daFrota.map((m) => m.custo));
  const preventivo = soma(daFrota.filter((m) => m.tipo === "Preventiva").map((m) => m.custo));
  const valor = pct(preventivo, total);
  const reais = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return {
    pct: valor,
    faixa: valor === null ? null : valor >= META_PREVENTIVA ? "verde" : valor >= LIMITE_REATIVO ? "amarelo" : "vermelho",
    detalhe: total ? `${reais(preventivo)} preventiva de ${reais(total)} em manutenção` : "Sem custo de manutenção registrado",
  };
}
