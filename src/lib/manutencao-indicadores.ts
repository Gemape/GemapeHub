// Indicadores do alto de Manutenção (decisão 319): quantas manutenções preventivas e corretivas foram registradas e, das revisões do plano de cada veículo, quantas estão no
// prazo e quantas não foram feitas no prazo (vencidas). A faixa (verde, amarelo, vermelho) vem dos mesmos limites da Frota (Parâmetros > Veículos > Parâmetros Específicos).
import type { StatusSugestao } from "./extrato-veiculo.ts";
import { faixaDoIndice, type ConfigFaixas } from "./faixas-desempenho.ts";
import type { IndicadorDaFrota } from "./frota-indicadores.ts";

const arredondar = (n: number) => Math.round(n * 10) / 10;
const pct = (parte: number, total: number): number | null =>
  total === 0 ? null : arredondar((parte / total) * 100);

export type IndicadoresDaManutencao = {
  previstas: { qtd: number; indicador: IndicadorDaFrota };
  preventivas: { qtd: number; indicador: IndicadorDaFrota };
  corretivas: { qtd: number; indicador: IndicadorDaFrota };
  noPrazo: IndicadorDaFrota;
  naoRealizadas: IndicadorDaFrota;
};

export function indicadoresDaManutencao(entrada: {
  tipos: string[];
  statusRevisoes: StatusSugestao[];
  faixas?: ConfigFaixas;
}): IndicadoresDaManutencao {
  const total = entrada.tipos.length;
  const prev = entrada.tipos.filter((t) => t === "Preventiva").length;
  const corr = entrada.tipos.filter((t) => t === "Corretiva").length;
  const parte = (qtd: number): IndicadorDaFrota => ({
    pct: pct(qtd, total),
    faixa: null,
    detalhe: total
      ? `${pct(qtd, total)!.toLocaleString("pt-BR")}% das ${total} manutenções registradas`
      : "Nenhuma manutenção registrada",
  });

  // Revisões do plano: as sem registro ainda não contam; vencida é a que não foi feita no prazo.
  const contadas = entrada.statusRevisoes.filter((s) => s !== "sem_registro");
  const vencidas = contadas.filter((s) => s === "vencida").length;
  const valor = pct(contadas.length - vencidas, contadas.length);
  const faixa = faixaDoIndice(valor, entrada.faixas)?.faixa ?? null;
  const vazio = "Nenhuma revisão com registro";
  // Previstas: todas as revisões do plano dos veículos; a barra mostra quantas já têm alguma realização registrada.
  const totalPrevistas = entrada.statusRevisoes.length;
  const semRegistro = totalPrevistas - contadas.length;
  const previstas: IndicadorDaFrota = {
    pct: pct(contadas.length, totalPrevistas),
    faixa: null,
    detalhe: totalPrevistas
      ? `${contadas.length} com realização registrada, ${semRegistro} sem registro`
      : "Nenhuma revisão no plano dos veículos",
  };
  return {
    previstas: { qtd: totalPrevistas, indicador: previstas },
    preventivas: { qtd: prev, indicador: parte(prev) },
    corretivas: { qtd: corr, indicador: parte(corr) },
    noPrazo: {
      pct: valor,
      faixa,
      detalhe: contadas.length
        ? `${contadas.length - vencidas} de ${contadas.length} revisões no prazo`
        : vazio,
    },
    // A cor dos não realizados é a dos realizados no prazo (o complemento): poucos não realizados é verde.
    naoRealizadas: {
      pct: valor === null ? null : arredondar(100 - valor),
      faixa,
      detalhe: contadas.length ? `${vencidas} de ${contadas.length} revisões vencidas` : vazio,
    },
  };
}
