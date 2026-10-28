// Ocorrências de veículo na tela da Frota: quantas estão em aberto e quantas estão vencidas. Não há prazo cadastrado na ocorrência:
// vence a que continua Aberta ou Em tratativa depois de DIAS_PARA_VENCER dias do dia em que aconteceu (decisão 296).
import { diasEntre } from "./viagens.ts";

export const DIAS_PARA_VENCER = 7;

type Basica = { veiculoId: string; ocorridoEm: string; status: string };

export const ocorrenciaAberta = (o: { status: string }): boolean => o.status !== "Encerrada";

// `hoje` e a data da ocorrência são AAAA-MM-DD (a ocorrência vem com a hora: só o dia conta).
export function ocorrenciaVencida(o: { ocorridoEm: string; status: string }, hoje: string): boolean {
  return ocorrenciaAberta(o) && diasEntre(o.ocorridoEm.slice(0, 10), hoje) > DIAS_PARA_VENCER;
}

export function resumoOcorrenciasDoVeiculo(lista: Basica[], veiculoId: string, hoje: string): { abertas: number; vencidas: number } {
  const dele = lista.filter((o) => o.veiculoId === veiculoId && ocorrenciaAberta(o));
  return { abertas: dele.length, vencidas: dele.filter((o) => ocorrenciaVencida(o, hoje)).length };
}

export function textoOcorrenciasDaFrota(r: { abertas: number; vencidas: number }): string {
  if (r.vencidas > 0) return `${r.vencidas} vencida(s)`;
  if (r.abertas > 0) return `${r.abertas} em aberto`;
  return "Sem ocorrências abertas";
}
