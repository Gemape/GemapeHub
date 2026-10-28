// Situação de vencimento de cada coluna da Frota (decisão 304): Preventivas, Ocorrências e Check list mostram uma bolinha e uma etiqueta, no mesmo padrão:
// amarela "Vencimento próximo", vermelha "Vencida" ou verde "Em dia". Só conta, aqui, o que ainda precisa de atenção hoje.
import { painelDoMes, type ChecklistDoPainel, type Previsao } from "./checklist-painel.ts";
import type { StatusSugestao } from "./extrato-veiculo.ts";
import { ocorrenciaAberta, ocorrenciaProxima, ocorrenciaVencida, type OcorrenciaDoPrazo } from "./frota-ocorrencias.ts";
import { lerPrazosOcorrencias, type PrazosOcorrencias } from "./prazo-ocorrencias.ts";
import { diasEntre } from "./viagens.ts";

export type Vencimento = "vencida" | "proximo" | "em_dia";
// `quantidade`: quantos itens estão naquela situação (vencidos ou perto de vencer); null no total = a coluna não se aplica ao veículo (sem plano, sem check list).
export type SituacaoColuna = { situacao: Vencimento; quantidade: number } | null;

export const ROTULO_VENCIMENTO: Record<Vencimento, string> = { vencida: "Vencida", proximo: "Vencimento próximo", em_dia: "Em dia" };

export const rotuloDaSituacao = (s: SituacaoColuna): string =>
  !s ? "—" : s.situacao !== "em_dia" && s.quantidade > 0 ? `${ROTULO_VENCIMENTO[s.situacao]} (${s.quantidade})` : ROTULO_VENCIMENTO[s.situacao];

const resumir = (vencidas: number, proximas: number, temAlgo: boolean): SituacaoColuna =>
  vencidas > 0 ? { situacao: "vencida", quantidade: vencidas } : proximas > 0 ? { situacao: "proximo", quantidade: proximas } : temAlgo ? { situacao: "em_dia", quantidade: 0 } : null;

// Preventivas: as sugestões do plano do veículo (vencida, atenção = perto de vencer, em dia). Sem plano ou sem nenhuma feita ainda, a coluna não se aplica.
export function situacaoPreventivas(status: StatusSugestao[]): SituacaoColuna {
  return resumir(status.filter((s) => s === "vencida").length, status.filter((s) => s === "atencao").length, status.some((s) => s === "em_dia"));
}

// Ocorrências (prazos de Parâmetros > Veículos > Parâmetros Específicos, decisão 307): vencida passou do prazo de iniciar ou de finalizar a tratativa; vence em até dois
// dias é vencimento próximo; sem ocorrência aberta, em dia.
export function situacaoOcorrenciasDoVeiculo(lista: (OcorrenciaDoPrazo & { veiculoId: string })[], veiculoId: string, hoje: string, prazos: PrazosOcorrencias = lerPrazosOcorrencias()): SituacaoColuna {
  const abertas = lista.filter((o) => o.veiculoId === veiculoId && ocorrenciaAberta(o));
  const vencidas = abertas.filter((o) => ocorrenciaVencida(o, hoje, prazos)).length;
  const proximas = abertas.filter((o) => ocorrenciaProxima(o, hoje, prazos)).length;
  return resumir(vencidas, proximas, true);
}

// Check list: só os periódicos obrigatórios do veículo. Vencida: prazo dos últimos 30 dias que passou sem o check list; vencimento próximo: prazo que acaba em até
// dois dias e ainda não foi feito. Veículo sem check list periódico associado: a coluna não se aplica.
export function situacaoChecklistDoVeiculo(previsoes: Previsao[], checklists: ChecklistDoPainel[], veiculoId: string, hoje: string): SituacaoColuna {
  const { linhas } = painelDoMes(null, previsoes.filter((p) => p.veiculoId === veiculoId), checklists.filter((c) => c.veiculoId === veiculoId), hoje);
  const obrigatorias = linhas.filter((l) => l.obrigatorio !== false);
  const vencidas = obrigatorias.filter((l) => l.situacao === "nao_realizado" && diasEntre(l.fim, hoje) <= 30).length;
  const proximas = obrigatorias.filter((l) => l.situacao === "a_vencer" && diasEntre(hoje, l.fim) <= 2).length;
  return resumir(vencidas, proximas, obrigatorias.length > 0);
}
