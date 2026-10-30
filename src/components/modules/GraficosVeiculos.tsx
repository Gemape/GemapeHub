import {
  COR_DA_FAIXA,
  COR_GRAFICO,
  GraficoBarras,
  GraficoRosca,
  PainelGraficos,
  QuadroGrafico,
} from "@/components/modules/GraficosPainel";
import type { RevisaoDoVeiculo } from "@/components/modules/ManutencaoRevisoes";
import type { GrupoDeArea } from "@/lib/area-responsaveis";
import { grupoDaLinha } from "@/lib/area-responsaveis";
import { resultadosPorResponsavel, resumoDeLinhas, type LinhaPainel } from "@/lib/checklist-painel";
import { faixaDoIndice } from "@/lib/faixas-desempenho";
import type { IndicadoresDaFrota } from "@/lib/frota-indicadores";
import { contagemPorMes, placaDoRotulo } from "@/lib/graficos-veiculos";
import type { StatusOcorrencia } from "@/lib/ocorrencias-veiculo";

// Relatórios gráficos de Veículos (decisão 325): ficam abaixo dos cards de cada tela e comparam o que os cards mostram, no estilo de painel de BI.

// Frota: os indicadores lado a lado, com a meta de 90%, e a média de consumo de cada veículo.
export function GraficosFrota({
  indicadores,
  medias,
}: {
  indicadores: IndicadoresDaFrota;
  medias: { veiculo: string; media: number | null }[];
}) {
  const barras = [
    { nome: "Manutenções", pct: indicadores.manutencoes.pct, faixa: indicadores.manutencoes.faixa },
    {
      nome: "Check list PCM",
      pct: indicadores.checklistPcm.pct,
      faixa: indicadores.checklistPcm.faixa,
    },
    { nome: "Ocorrências", pct: indicadores.ocorrencias.pct, faixa: indicadores.ocorrencias.faixa },
    {
      nome: "Conformidade",
      pct: indicadores.conformidadeGeral.pct,
      faixa: indicadores.conformidadeGeral.faixa,
    },
    {
      nome: "Técnicos",
      pct: indicadores.tecnicosNoPrazo.pct,
      faixa: indicadores.tecnicosNoPrazo.faixa,
    },
  ];
  const consumo = medias
    .filter((m): m is { veiculo: string; media: number } => m.media !== null)
    .map((m) => ({ veiculo: placaDoRotulo(m.veiculo), media: Math.round(m.media * 10) / 10 }))
    .sort((a, b) => b.media - a.media);
  return (
    <PainelGraficos>
      <QuadroGrafico
        titulo="PCM x técnicos (%)"
        descricao="Cada indicador contra a meta de 90% (faixa verde)."
      >
        <GraficoBarras
          dados={barras.map((b) => ({ nome: b.nome, valor: b.pct ?? 0 }))}
          categoria="nome"
          series={[{ chave: "valor", nome: "Indicador", cor: COR_GRAFICO.azul }]}
          cores={barras.map((b) => (b.faixa ? COR_DA_FAIXA[b.faixa] : COR_GRAFICO.cinza))}
          meta={{ valor: 90, rotulo: "Meta 90%" }}
          sufixo="%"
        />
      </QuadroGrafico>
      <QuadroGrafico
        titulo="Média de consumo por veículo (km/L)"
        descricao="Quanto cada veículo roda por litro, do maior para o menor."
        vazio={consumo.length === 0}
      >
        <GraficoBarras
          dados={consumo}
          categoria="veiculo"
          series={[{ chave: "media", nome: "km/L", cor: COR_GRAFICO.azul }]}
        />
      </QuadroGrafico>
    </PainelGraficos>
  );
}

// Manutenção: as revisões do plano de cada veículo por situação e as manutenções preventivas e corretivas dos últimos meses.
export function GraficosManutencao({
  revisoes,
  manutencoes,
  hoje,
}: {
  revisoes: RevisaoDoVeiculo[];
  manutencoes: { tipo: string; data: string }[];
  hoje: string;
}) {
  const porVeiculo = new Map<
    string,
    { veiculo: string; emDia: number; atencao: number; vencida: number; semRegistro: number }
  >();
  for (const r of revisoes) {
    const linha = porVeiculo.get(r.veiculoId) ?? {
      veiculo: placaDoRotulo(r.veiculo),
      emDia: 0,
      atencao: 0,
      vencida: 0,
      semRegistro: 0,
    };
    const s = r.sugestao.status;
    if (s === "em_dia") linha.emDia++;
    else if (s === "atencao") linha.atencao++;
    else if (s === "vencida") linha.vencida++;
    else linha.semRegistro++;
    porVeiculo.set(r.veiculoId, linha);
  }
  const meses = contagemPorMes(
    {
      preventivas: manutencoes.filter((m) => m.tipo === "Preventiva").map((m) => m.data),
      corretivas: manutencoes.filter((m) => m.tipo === "Corretiva").map((m) => m.data),
    },
    hoje,
  );
  return (
    <PainelGraficos>
      <QuadroGrafico
        titulo="Revisões por veículo"
        descricao="Situação das revisões do plano de cada veículo."
        vazio={porVeiculo.size === 0}
      >
        <GraficoBarras
          dados={[...porVeiculo.values()]}
          categoria="veiculo"
          empilhado
          series={[
            { chave: "emDia", nome: "Em dia", cor: COR_GRAFICO.verde },
            { chave: "atencao", nome: "Vencimento próximo", cor: COR_GRAFICO.amarelo },
            { chave: "vencida", nome: "Vencida", cor: COR_GRAFICO.vermelho },
            { chave: "semRegistro", nome: "Sem registro", cor: COR_GRAFICO.cinza },
          ]}
        />
      </QuadroGrafico>
      <QuadroGrafico
        titulo="Preventivas x corretivas por mês"
        descricao="Manutenções registradas nos últimos seis meses."
      >
        <GraficoBarras
          dados={meses}
          categoria="rotulo"
          series={[
            { chave: "preventivas", nome: "Preventivas", cor: COR_GRAFICO.azul },
            { chave: "corretivas", nome: "Corretivas", cor: COR_GRAFICO.amarelo },
          ]}
        />
      </QuadroGrafico>
    </PainelGraficos>
  );
}

// Ocorrências: a parte de cada situação, as situações por tipo de ocorrência e as ocorrências dos últimos meses.
export function GraficosOcorrencias({
  ocorrencias,
  hoje,
}: {
  ocorrencias: { tipoNome: string; status: StatusOcorrencia; ocorridoEm: string }[];
  hoje: string;
}) {
  const contar = (s: StatusOcorrencia) => ocorrencias.filter((o) => o.status === s).length;
  const rosca = [
    { nome: "Abertas", valor: contar("Aberta"), cor: COR_GRAFICO.vermelho },
    { nome: "Em tratativa", valor: contar("Em tratativa"), cor: COR_GRAFICO.amarelo },
    { nome: "Encerradas", valor: contar("Encerrada"), cor: COR_GRAFICO.verde },
  ].filter((d) => d.valor > 0);
  const tipos = [...new Set(ocorrencias.map((o) => o.tipoNome))].map((tipo) => ({
    tipo,
    abertas: ocorrencias.filter((o) => o.tipoNome === tipo && o.status === "Aberta").length,
    emTratativa: ocorrencias.filter((o) => o.tipoNome === tipo && o.status === "Em tratativa")
      .length,
    encerradas: ocorrencias.filter((o) => o.tipoNome === tipo && o.status === "Encerrada").length,
  }));
  const meses = contagemPorMes({ ocorrencias: ocorrencias.map((o) => o.ocorridoEm) }, hoje);
  return (
    <PainelGraficos colunas={3}>
      <QuadroGrafico
        titulo="Ocorrências por situação"
        descricao="Parte de cada situação no total."
        vazio={rosca.length === 0}
      >
        <GraficoRosca dados={rosca} />
      </QuadroGrafico>
      <QuadroGrafico titulo="Ocorrências por mês" descricao="Registradas nos últimos seis meses.">
        <GraficoBarras
          dados={meses}
          categoria="rotulo"
          series={[{ chave: "ocorrencias", nome: "Ocorrências", cor: COR_GRAFICO.azul }]}
        />
      </QuadroGrafico>
      <QuadroGrafico
        titulo="Situação por tipo de ocorrência"
        descricao="Quantas de cada tipo estão abertas, em tratativa ou encerradas."
        vazio={tipos.length === 0}
      >
        <GraficoBarras
          dados={tipos}
          categoria="tipo"
          empilhado
          series={[
            { chave: "abertas", nome: "Abertas", cor: COR_GRAFICO.vermelho },
            { chave: "emTratativa", nome: "Em tratativa", cor: COR_GRAFICO.amarelo },
            { chave: "encerradas", nome: "Encerradas", cor: COR_GRAFICO.verde },
          ]}
        />
      </QuadroGrafico>
    </PainelGraficos>
  );
}

// Check list: técnicos contra PCM (realizados, não realizados e a vencer) e o percentual no prazo de cada responsável.
const ALTURA_COMPACTA = "h-[clamp(6rem,17vh,9.5rem)]";

export function GraficosChecklist({
  linhas,
  grupoDe,
  compacto = false,
}: {
  linhas: LinhaPainel[];
  grupoDe: (nome: string) => GrupoDeArea;
  // Na coluna do painel do Check list: os dois gráficos lado a lado, mais baixos e sem o texto de apoio, para tudo caber na tela.
  compacto?: boolean;
}) {
  const grupos = (["Técnicos", "PCM"] as const).map((g) => {
    const r = resumoDeLinhas(linhas.filter((l) => grupoDaLinha(l, grupoDe) === g));
    return {
      grupo: g,
      realizados: r.realizados,
      naoRealizados: r.naoRealizados,
      aVencer: r.aVencer,
    };
  });
  const responsaveis = resultadosPorResponsavel(linhas).filter((r) => r.pctNoPrazo !== null);
  return (
    <PainelGraficos compacto={compacto}>
      <QuadroGrafico
        titulo="Técnicos x PCM"
        {...(compacto ? { altura: ALTURA_COMPACTA } : { descricao: "Check lists realizados no prazo, não realizados e a vencer de cada grupo." })}
        vazio={grupos.every((g) => g.realizados + g.naoRealizados + g.aVencer === 0)}
      >
        <GraficoBarras
          dados={grupos}
          categoria="grupo"
          series={[
            { chave: "realizados", nome: "Realizados no prazo", cor: COR_GRAFICO.verde },
            { chave: "naoRealizados", nome: "Não realizados", cor: COR_GRAFICO.vermelho },
            { chave: "aVencer", nome: "A vencer", cor: COR_GRAFICO.amarelo },
          ]}
        />
      </QuadroGrafico>
      <QuadroGrafico
        titulo="No prazo por responsável (%)"
        {...(compacto ? { altura: ALTURA_COMPACTA } : { descricao: "Cada responsável contra a meta de 90%." })}
        vazio={responsaveis.length === 0}
      >
        <GraficoBarras
          dados={responsaveis.map((r) => ({
            nome: r.nome.split(" ")[0] ?? r.nome,
            valor: r.pctNoPrazo ?? 0,
          }))}
          categoria="nome"
          series={[{ chave: "valor", nome: "No prazo", cor: COR_GRAFICO.azul }]}
          cores={responsaveis.map((r) => {
            const f = faixaDoIndice(r.pctNoPrazo)?.faixa;
            return f ? COR_DA_FAIXA[f] : COR_GRAFICO.cinza;
          })}
          meta={{ valor: 90, rotulo: "Meta 90%" }}
          sufixo="%"
        />
      </QuadroGrafico>
    </PainelGraficos>
  );
}
