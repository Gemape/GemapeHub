// Situação da vistoria periódica de uma caixa: junta o mês-base (Escalonamento), a periodicidade e o prazo (Parâmetros Específicos) e a última vistoria feita.
// A vistoria devida é a do ciclo mais recente que já começou (primeiro dia do mês previsto); ela vence `prazoDias` depois desse dia.
// Feita nesse ciclo (última vistoria no primeiro dia do mês previsto ou depois, ou adiantada em até metade do ciclo) = em dia; sem ela, pendente até o limite e vencida depois dele.
import { MESES_DA_PERIODICIDADE, type MesBase } from "./escalonamento-vistorias.ts";
import type { PeriodicidadeVistoria } from "./vistoria-ferramentas-parametros.ts";

export type SituacaoDaVistoria = "Em dia" | "Pendente" | "Vencida" | "Sem escalonamento";
export type ResultadoSituacao = { situacao: SituacaoDaVistoria; /** Primeiro dia do mês previsto (AAAA-MM-DD). */ previstaEm: string | null; /** Último dia para fazer a vistoria sem ficar vencida. */ limite: string | null };

const somarDias = (data: string, dias: number): string => new Date(Date.parse(`${data}T00:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);

export function situacaoDaVistoria(d: { mesBase: MesBase | undefined; periodicidade: PeriodicidadeVistoria; prazoDias: number; hoje: string; ultimaVistoria: string | null | undefined }): ResultadoSituacao {
  if (d.mesBase === undefined) return { situacao: "Sem escalonamento", previstaEm: null, limite: null };
  const passo = MESES_DA_PERIODICIDADE[d.periodicidade];
  const atual = Number(d.hoje.slice(0, 4)) * 12 + Number(d.hoje.slice(5, 7)) - 1;
  // Volta do mês de hoje até o mês previsto mais recente (no máximo um ciclo anual para trás).
  let n = atual;
  while ((((n - (d.mesBase - 1)) % passo) + passo) % passo !== 0) n -= 1;
  const previstaEm = `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, "0")}-01`;
  const limite = somarDias(previstaEm, d.prazoDias);
  // Vale também a vistoria adiantada em até metade do ciclo (15 dias na mensal, 45 na trimestral...).
  const desde = somarDias(previstaEm, -Math.floor((passo * 30) / 2));
  const feita = !!d.ultimaVistoria && d.ultimaVistoria.slice(0, 10) >= desde;
  return { situacao: feita ? "Em dia" : d.hoje <= limite ? "Pendente" : "Vencida", previstaEm, limite };
}
