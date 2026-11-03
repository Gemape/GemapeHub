// Interpretação dos indicadores da Frota para o gestor (decisão 345): para cada indicador, o valor, a faixa e uma leitura em linguagem simples do que o resultado quer dizer e do que fazer.
import type { Faixa } from "./faixas-desempenho.ts";
import { reais, type CustoPorKm, type IndicadorDaFrota, type IndicadoresDaFrota } from "./frota-indicadores.ts";

export type Interpretacao = { titulo: string; valor: string; faixa: Faixa | null; leitura: string };

const porcento = (n: number | null) => (n === null ? "sem dados" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);

// Três leituras por indicador, uma por faixa (verde, amarelo, vermelho); sem valor, a de "sem dados".
const TEXTOS: Record<string, { semDados: string; verde: string; amarelo: string; vermelho: string }> = {
  conformidade: {
    semDados: "Ainda não há tarefas com prazo vencido ou cumprido para calcular.",
    verde: "A frota cumpre quase todas as tarefas dentro do prazo. Mantenha a rotina.",
    amarelo: "Parte das tarefas está saindo do prazo. Veja qual dos indicadores abaixo puxa a média para baixo e cobre os responsáveis.",
    vermelho: "A maior parte das tarefas está atrasada. Priorize as vencidas, comece pelo indicador mais baixo e cobre os responsáveis.",
  },
  manutencoes: {
    semDados: "Nenhuma preventiva com registro para avaliar.",
    verde: "As revisões do plano estão em dia: menos risco de quebra e de corretiva cara.",
    amarelo: "Algumas revisões estão vencendo. Agende-as antes que virem corretivas.",
    vermelho: "Muitas revisões vencidas: o risco de quebra é alto. Programe as preventivas dos veículos vencidos.",
  },
  checklist: {
    semDados: "Nenhum check list com prazo vencido para avaliar.",
    verde: "Os check lists estão sendo feitos no prazo: os defeitos aparecem cedo.",
    amarelo: "Há check lists passando do prazo. Lembre os responsáveis, para não perder defeitos que ainda dá para pegar cedo.",
    vermelho: "A maioria dos check lists não foi feita no prazo: a frota roda sem inspeção. Cobre os responsáveis agora.",
  },
  ocorrencias: {
    semDados: "Nenhuma ocorrência tratada ou vencida para avaliar.",
    verde: "As ocorrências são tratadas dentro do prazo.",
    amarelo: "Algumas ocorrências foram tratadas ou estão paradas fora do prazo. Acompanhe as abertas.",
    vermelho: "A maior parte das ocorrências foi tratada fora do prazo ou está vencida. Trate as abertas e renove o prazo só com autorização.",
  },
  tecnicos: {
    semDados: "Nenhum check list dos técnicos com prazo vencido para avaliar.",
    verde: "Os técnicos fazem o check list no prazo.",
    amarelo: "Parte dos técnicos está atrasando o check list. Dê um retorno rápido a quem atrasa.",
    vermelho: "Os técnicos deixam de fazer a maior parte dos check lists no prazo. Requer ação corretiva com os responsáveis.",
  },
  preventivo: {
    semDados: "Nenhum custo de manutenção registrado para avaliar.",
    verde: "Meta de mercado atingida (80% ou mais do gasto em preventiva): a gestão é proativa.",
    amarelo: "Entre 70% e 80% em preventiva: perto da meta, mas as corretivas ainda pesam. Reforce o plano de revisões.",
    vermelho: "Abaixo de 70% em preventiva: a frota opera no modo reativo, que é mais caro. Reforce o plano de revisões.",
  },
};

function leitura(chave: keyof typeof TEXTOS, i: IndicadorDaFrota): string {
  const t = TEXTOS[chave]!;
  return i.faixa === null ? t.semDados : t[i.faixa];
}

export function interpretacoesDaFrota(
  ind: IndicadoresDaFrota,
  cpk: CustoPorKm,
  custoPreventivo: IndicadorDaFrota,
  cpkMensal: { rotulo: string; cpk: number | null }[],
): Interpretacao[] {
  const item = (titulo: string, i: IndicadorDaFrota, chave: keyof typeof TEXTOS): Interpretacao => ({ titulo, valor: porcento(i.pct), faixa: i.faixa, leitura: leitura(chave, i) });
  // Tendência do CPK: o último mês com valor contra o anterior com valor.
  const comValor = cpkMensal.filter((m): m is { rotulo: string; cpk: number } => m.cpk !== null);
  const [anterior, ultimo] = comValor.slice(-2);
  const tendencia = !anterior || !ultimo || anterior.cpk === 0
    ? "Ainda não há dois meses com km rodados para ver a tendência."
    : ultimo.cpk > anterior.cpk
      ? `Em ${ultimo.rotulo} o custo por km subiu ${Math.round(((ultimo.cpk - anterior.cpk) / anterior.cpk) * 100)}% sobre ${anterior.rotulo}: investigue combustível e corretivas.`
      : ultimo.cpk < anterior.cpk
        ? `Em ${ultimo.rotulo} o custo por km caiu ${Math.round(((anterior.cpk - ultimo.cpk) / anterior.cpk) * 100)}% sobre ${anterior.rotulo}: a frota está ficando mais barata de manter.`
        : `O custo por km se manteve em ${ultimo.rotulo}.`;
  return [
    item("Frota · Conformidade geral (SLA)", ind.conformidadeGeral, "conformidade"),
    { titulo: "Frota · Custo por km rodado (CPK)", valor: cpk.valor === null ? "sem dados" : `${reais(cpk.valor)}/km`, faixa: null, leitura: cpk.valor === null ? "Ainda não há km rodados para calcular." : `Cada km rodado custa ${reais(cpk.valor)} entre abastecimento e manutenção. ${tendencia}` },
    item("Frota · Custo preventivo", custoPreventivo, "preventivo"),
    item("PCM · Índice de manutenções preventivas em dia", ind.manutencoes, "manutencoes"),
    item("PCM · Índice de check lists realizados no prazo", ind.checklistPcm, "checklist"),
    item("PCM · Índice de ocorrências tratadas no prazo", ind.ocorrencias, "ocorrencias"),
    item("Técnicos · Índice de check lists realizados no prazo", ind.tecnicosNoPrazo, "tecnicos"),
    item("Técnicos · Índice de check lists atrasados", ind.tecnicosNaoRealizados, "tecnicos"),
  ];
}
