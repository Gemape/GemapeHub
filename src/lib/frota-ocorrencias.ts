// Ocorrências de veículo na tela da Frota: quantas estão em aberto e quantas estão vencidas (decisões 296 e 307). O prazo vem de Parâmetros > Veículos >
// Parâmetros Específicos: a ocorrência Aberta (tratativa ainda não iniciada) vence passados `iniciar` dias do dia em que aconteceu; a Em tratativa vence passados
// `finalizar` dias do início da tratativa; a Encerrada nunca vence.
import { hojeBrasilia } from "./checklist-veiculo.ts";
import { lerPrazosOcorrencias, type PrazosOcorrencias } from "./prazo-ocorrencias.ts";
import { diasEntre } from "./viagens.ts";

export type OcorrenciaDoPrazo = { ocorridoEm: string; status: string; tratativa?: { registradaEm: string } | null; renovacoes?: { em: string }[] };
type Basica = OcorrenciaDoPrazo & { veiculoId: string };

export const ocorrenciaAberta = (o: { status: string }): boolean => o.status !== "Encerrada";

// Dias que já passaram e o limite do passo em que a ocorrência está. `hoje` é AAAA-MM-DD; a ocorrência vem com a hora (só o dia conta). A contagem parte do início
// do passo ou da última renovação do prazo (decisão 309), o que for mais recente.
export function prazoDaOcorrencia(o: OcorrenciaDoPrazo, hoje: string, prazos: PrazosOcorrencias = lerPrazosOcorrencias()): { decorridos: number; limite: number } | null {
  if (!ocorrenciaAberta(o)) return null;
  const emTratativa = o.status === "Em tratativa" && !!o.tratativa?.registradaEm;
  const inicioDoPasso = emTratativa ? hojeBrasilia(new Date(o.tratativa!.registradaEm)) : o.ocorridoEm.slice(0, 10);
  const ultimaRenovacao = (o.renovacoes ?? []).map((r) => hojeBrasilia(new Date(r.em))).sort().pop() ?? "";
  const partida = ultimaRenovacao > inicioDoPasso ? ultimaRenovacao : inicioDoPasso;
  return { decorridos: diasEntre(partida, hoje), limite: emTratativa ? prazos.finalizar : prazos.iniciar };
}

export function ocorrenciaVencida(o: OcorrenciaDoPrazo, hoje: string, prazos?: PrazosOcorrencias): boolean {
  const p = prazoDaOcorrencia(o, hoje, prazos);
  return p !== null && p.decorridos > p.limite;
}

// Vencimento próximo: ainda no prazo, mas o prazo acaba em até dois dias.
export function ocorrenciaProxima(o: OcorrenciaDoPrazo, hoje: string, prazos?: PrazosOcorrencias): boolean {
  const p = prazoDaOcorrencia(o, hoje, prazos);
  return p !== null && p.decorridos <= p.limite && p.limite - p.decorridos <= 2;
}

export function resumoOcorrenciasDoVeiculo(lista: Basica[], veiculoId: string, hoje: string, prazos: PrazosOcorrencias = lerPrazosOcorrencias()): { abertas: number; vencidas: number } {
  const dele = lista.filter((o) => o.veiculoId === veiculoId && ocorrenciaAberta(o));
  return { abertas: dele.length, vencidas: dele.filter((o) => ocorrenciaVencida(o, hoje, prazos)).length };
}

export function textoOcorrenciasDaFrota(r: { abertas: number; vencidas: number }): string {
  if (r.vencidas > 0) return `${r.vencidas} vencida(s)`;
  if (r.abertas > 0) return `${r.abertas} em aberto`;
  return "Sem ocorrências abertas";
}
