import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { useState } from "react";

import { Info } from "lucide-react";
import { Cartao as CartaoPadrao } from "@/components/modules/CartoesIndicadoresFrota";
import { ALTURA_GRAFICO_COMPACTA, COR_DA_FAIXA, COR_GRAFICO, GraficoBarras, PainelGraficos, QuadroGrafico } from "@/components/modules/GraficosPainel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Faixa } from "@/lib/faixas-desempenho";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { lerChecklistEquipamento } from "@/lib/equipamentos-checklist";
import { lerManutencaoEquipamento } from "@/lib/equipamentos-manutencao";
import { lerParametrosEquipamento } from "@/lib/equipamentos-parametros";
import { formatarData } from "@/lib/gemape";
import { calcularKpis, semaforoCusto, semaforoPct, type Semaforo } from "@/lib/kpis-equipamento";
import { lerConfigKpis } from "@/lib/kpis-equipamento-config";
import { hoje, numero, reais, useLeitura, rotuloDoEquipamento, useAbastecimentosEq, useChecklistsEq, useEquipamentosDaEmpresa, useManutencoesEq, useOcorrenciasEq } from "./comum";

const COR: Record<Semaforo, string> = {
  verde: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  amarelo: "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  vermelho: "border-red-300 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200",
  neutro: "border-border bg-muted/40 text-foreground",
};
const ROTULO: Record<Semaforo, string> = { verde: "Dentro da meta", amarelo: "Atenção", vermelho: "Fora da meta", neutro: "Sem dados" };
const pct = (v: number | null) => (v === null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);

const FAIXA: Record<Semaforo, Faixa | null> = { verde: "verde", amarelo: "amarelo", vermelho: "vermelho", neutro: null };

// O card é o padrão do sistema (decisão 375): a pergunta e a meta vão no subtítulo e o cálculo abre no ícone de informação, ao lado do título.
function Cartao({ pergunta, titulo, valor, detalhe, meta, semaforo, pctBarra, calculo }: { pergunta: string; titulo: string; valor: string; detalhe: string; meta: string; semaforo: Semaforo; pctBarra: number | null; calculo: string[] }) {
  const explicacao = (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Como é calculado: ${titulo}`} className="shrink-0 text-muted-foreground hover:text-primary"><Info className="h-4 w-4" /></button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 space-y-1 text-sm">
        <p className="font-semibold">Como é calculado</p>
        <ul className="list-disc space-y-1 pl-4 text-xs leading-snug">{calculo.map((c) => <li key={c}>{c}</li>)}</ul>
      </PopoverContent>
    </Popover>
  );
  return <CartaoPadrao titulo={titulo} subtitulo={`${pergunta} ${ROTULO[semaforo]} · ${meta}`} valor={valor} indicador={{ pct: pctBarra, faixa: FAIXA[semaforo], detalhe }} extra={explicacao} compacto enxuto />;
}
const Celula = ({ semaforo, children }: { semaforo: Semaforo; children: React.ReactNode }) => <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium ${COR[semaforo]}`}>{children}</span>;

// Módulos > Equipamentos > Dashboard (no desenho da Frota de Veículos: filtros em cima, cartões com os gráficos ao lado e a lista embaixo): os cinco KPIs que bastam para gerir os equipamentos (mais o cartão de equipamentos prontos agora), da frota e de cada equipamento (disponibilidade, custo de
// manutenção por hora, razão preventiva/corretiva, aderência ao plano de manutenção e conformidade legal), a partir do horímetro, das manutenções,
// das ocorrências e dos check lists. Só modo demonstração.
export function IndicadoresEquipamentoModulo() {
  const equipamentos = useEquipamentosDaEmpresa();
  const abastecimentos = useAbastecimentosEq();
  const manutencoes = useManutencoesEq();
  const ocorrencias = useOcorrenciasEq();
  const checklists = useChecklistsEq();
  // Metas, jornada e prazos vêm de Parâmetros > Equipamentos > Parâmetros Específicos > Indicadores.
  const cfg = useLeitura(() => lerConfigKpis());
  const META = cfg;
  const [periodoEscolhido, setPeriodo] = useState<string | null>(null);
  const periodo = periodoEscolhido ?? String(cfg.periodoPadraoDias);
  const parametros = lerParametrosEquipamento();
  const manutencao = lerManutencaoEquipamento();
  const { frota, porEquipamento, inicio } = calcularKpis({
    equipamentos: equipamentos.map((e) => ({ id: e.id, patrimonio: e.patrimonio, nome: e.nome, tipoId: e.tipoId, status: e.status, dataAquisicao: e.dataAquisicao, tecnico: e.tecnico })),
    subcategoriaDoTipo: (id) => parametros.tipos.find((t) => t.id === id)?.subcategoriaId ?? "",
    abastecimentos, manutencoes, ocorrencias, checklists, planos: manutencao.planos, acoes: manutencao.acoes.map((a) => ({ id: a.id, nome: a.nome })),
    associacoesVistoria: lerChecklistEquipamento().vistoria.associacoes, hoje: hoje(), periodoDias: Number(periodo), config: cfg,
  });
  const custoMedio = frota.custoPorHora;
  const barras = [
    { nome: "Disponib.", pct: frota.disponibilidade, semaforo: semaforoPct(frota.disponibilidade, META.disponibilidade) },
    { nome: "Preventiva", pct: frota.razaoPreventiva, semaforo: semaforoPct(frota.razaoPreventiva, META.preventiva) },
    { nome: "Aderência", pct: frota.aderencia, semaforo: semaforoPct(frota.aderencia, META.aderencia) },
    { nome: "Conform.", pct: frota.conformidade, semaforo: semaforoPct(frota.conformidade, META.conformidade) },
  ];
  const porTipo = [
    { nome: "Preventivas", valor: frota.preventivas },
    { nome: "Corretivas", valor: frota.corretivas },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <p className="pb-2 text-xs text-muted-foreground">De {formatarData(inicio)} a {formatarData(hoje())} · {frota.total} equipamento{frota.total === 1 ? "" : "s"} · {frota.prontos} pronto{frota.prontos === 1 ? "" : "s"} para trabalhar agora</p>
        <BarraDeFiltros>
          <div className="space-y-1.5">
            <Label htmlFor="periodo_kpi">Período</Label>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger id="periodo_kpi" className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[["30", "Últimos 30 dias"], ["90", "Últimos 90 dias"], ["180", "Últimos 180 dias"], ["365", "Últimos 12 meses"]].map(([v, r]) => <SelectItem key={v} value={v!}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </BarraDeFiltros>
      </div>

      <div className="grid items-stretch gap-3 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="grid auto-rows-fr gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Cartao titulo="Disponibilidade" pergunta="Meu equipamento está pronto para trabalhar?" valor={pct(frota.disponibilidade)} pctBarra={frota.disponibilidade} detalhe={`${frota.prontos} de ${frota.total} prontos agora`}
          meta={`meta ≥ ${META.disponibilidade.verde}%`} semaforo={semaforoPct(frota.disponibilidade, META.disponibilidade)}
          calculo={[
            `Horas programadas = dias úteis do período × ${cfg.jornadaHoras} h, por equipamento.`,
            "Horas paradas = soma do \"tempo parado\" informado nas manutenções do período.",
            "Disponibilidade = (programadas − paradas) ÷ programadas.",
            `Verde a partir de ${META.disponibilidade.verde}%, amarelo a partir de ${META.disponibilidade.amarelo}%, vermelho abaixo.`,
            `"Pronto agora" exige status Ativo ou Reserva${cfg.prontoOcorrenciaAberta ? ", nenhuma ocorrência aberta" : ""}${cfg.prontoVistoriaNok ? " e a última vistoria sem item não conforme pendente" : ""}.`,
          ]} />
        <Cartao titulo="Custo de manutenção por hora" pergunta="Esse equipamento está me custando caro demais?" valor={frota.custoPorHora === null ? "—" : reais(frota.custoPorHora)} pctBarra={null}
          detalhe={`${reais(frota.custo)} em ${numero(frota.horasTrabalhadas)} h trabalhadas`} meta="cada equipamento é comparado à média da frota" semaforo="neutro"
          calculo={[
            "Custo = peças + mão de obra das manutenções do período.",
            "Horas trabalhadas = horímetro mais recente do período − horímetro de antes do período (abastecimentos e manutenções).",
            "Custo por hora = custo ÷ horas trabalhadas; sem leitura de horímetro no período não há valor.",
            `Cada equipamento é comparado à média da frota: verde até a média, amarelo até ${String(cfg.custoFatorAmarelo).replace(".", ",")}×, vermelho acima.`,
          ]} />
        <Cartao titulo="Razão preventiva/corretiva" pergunta="Estou apagando incêndio ou prevenindo?" valor={pct(frota.razaoPreventiva)} pctBarra={frota.razaoPreventiva}
          detalhe={`${frota.preventivas} preventiva${frota.preventivas === 1 ? "" : "s"} e ${frota.corretivas} corretiva${frota.corretivas === 1 ? "" : "s"}`} meta={`meta ≥ ${META.preventiva.verde}% preventiva`} semaforo={semaforoPct(frota.razaoPreventiva, META.preventiva)}
          calculo={[
            "Conta as manutenções do período por tipo.",
            "Razão = preventivas ÷ (preventivas + corretivas).",
            `Verde a partir de ${META.preventiva.verde}%, amarelo a partir de ${META.preventiva.amarelo}%, vermelho abaixo: se a maioria é corretiva, o problema é de gestão, não da máquina.`,
          ]} />
        <Cartao titulo="Aderência ao plano" pergunta="A preventiva está sendo feita mesmo?" valor={pct(frota.aderencia)} pctBarra={frota.aderencia} detalhe={`${frota.itensEmDia} de ${frota.itensTotal} itens do plano em dia`}
          meta={`meta ≥ ${META.aderencia.verde}%`} semaforo={semaforoPct(frota.aderencia, META.aderencia)}
          calculo={[
            "Cada ação do plano do equipamento (limite de horas e de meses) é um item.",
            "O item vence quando as horas de uso OU os meses desde a última execução chegam ao limite; sem execução registrada, conta da aquisição e do horímetro inicial.",
            "Aderência = itens em dia ÷ itens dos planos. Equipamento sem plano não entra.",
            `Verde a partir de ${META.aderencia.verde}%, amarelo a partir de ${META.aderencia.amarelo}%.`,
          ]} />
        <Cartao titulo="Conformidade legal" pergunta="Estou exposto a risco de multa ou acidente?" valor={pct(frota.conformidade)} pctBarra={frota.conformidade} detalhe={`${frota.comPendencia} equipamento${frota.comPendencia === 1 ? "" : "s"} com pendência`}
          meta={`meta ${META.conformidade.verde}%`} semaforo={semaforoPct(frota.conformidade, META.conformidade)}
          calculo={[
            `Todos: vistoria periódica em dia, conforme a periodicidade do check list de vistoria associado (diária ${cfg.prazoVistoriaDias["Diária"]} d, semanal ${cfg.prazoVistoriaDias["Semanal"]} d, quinzenal ${cfg.prazoVistoriaDias["Quinzenal"]} d, mensal ${cfg.prazoVistoriaDias["Mensal"]} d).`,
            `Extintor: teste hidrostático válido e recarga em até ${cfg.recargaExtintorMeses} meses.`,
            `Vaso de pressão: manutenção preventiva (inspeção de segurança) nos últimos ${cfg.inspecaoVasoMeses} meses.`,
            ...(cfg.exigirSemOcorrenciaAberta ? ["Empilhadeiras e máquinas: nenhuma ocorrência de segurança aberta."] : []),
            `Conformidade = requisitos atendidos ÷ requisitos de todos os equipamentos; meta ${META.conformidade.verde}%, amarelo a partir de ${META.conformidade.amarelo}%.`,
          ]} />
          <CartaoPadrao titulo="Prontos agora" subtitulo="Equipamentos prontos para trabalhar ÷ todos." indicador={{ pct: frota.total > 0 ? Math.round((frota.prontos / frota.total) * 1000) / 10 : null, faixa: null, detalhe: `${frota.prontos} de ${frota.total} equipamentos` }} valor={frota.total > 0 ? `${frota.prontos}/${frota.total}` : "—"} compacto enxuto />
        </div>
        <PainelGraficos compacto>
          <QuadroGrafico titulo="Indicadores (%)" formula="cada indicador do período." altura={ALTURA_GRAFICO_COMPACTA} enxuto>
            <GraficoBarras
              dados={barras.map((b) => ({ nome: b.nome, valor: b.pct ?? 0 }))}
              categoria="nome"
              series={[{ chave: "valor", nome: "Indicador", cor: COR_GRAFICO.azul }]}
              cores={barras.map((b) => (b.semaforo === "neutro" ? COR_GRAFICO.cinza : COR_DA_FAIXA[b.semaforo]))}
              sufixo="%"
            />
          </QuadroGrafico>
          <QuadroGrafico titulo="Preventivas x corretivas" formula="manutenções do período por tipo." altura={ALTURA_GRAFICO_COMPACTA} enxuto vazio={frota.preventivas + frota.corretivas === 0}>
            <GraficoBarras dados={porTipo} categoria="nome" series={[{ chave: "valor", nome: "Manutenções", cor: COR_GRAFICO.azul }]} cores={[COR_GRAFICO.verde, COR_GRAFICO.vermelho]} />
          </QuadroGrafico>
        </PainelGraficos>
      </div>

      {/* A lista usa o que sobra da janela e rola por dentro, para a página não rolar, como na Frota. */}
      <div className="max-h-[max(8rem,calc(100dvh-36rem))] flex flex-col overflow-hidden rounded-xl border [&>div]:min-h-0 [&>div]:flex-1 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipamento</TableHead><TableHead>Pronto agora?</TableHead><TableHead>Disponibilidade</TableHead><TableHead>Custo por hora</TableHead>
              <TableHead>Preventiva / corretiva</TableHead><TableHead>Aderência ao plano</TableHead><TableHead>Conformidade legal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {porEquipamento.length === 0 && <TableRow><TableCell colSpan={7} className="py-6 text-center text-muted-foreground">Nenhum equipamento cadastrado. Cadastre em Parâmetros &gt; Equipamentos.</TableCell></TableRow>}
            {porEquipamento.map((k) => {
              const ader = k.aderencia ? (k.aderencia.total > 0 ? (k.aderencia.emDia / k.aderencia.total) * 100 : null) : null;
              const conf = k.conformidade.total > 0 ? (k.conformidade.atendidos / k.conformidade.total) * 100 : null;
              return (
                <TableRow key={k.equipamento.id} className="align-top">
                  <TableCell className="font-medium">{rotuloDoEquipamento(k.equipamento)}</TableCell>
                  <TableCell>
                    {k.prontoAgora.ok ? <Badge variant="secondary">Pronto</Badge> : <Badge variant="destructive">Não</Badge>}
                    {k.prontoAgora.motivos.map((m) => <span key={m} className="block text-xs text-muted-foreground">{m}</span>)}
                  </TableCell>
                  <TableCell>
                    <Celula semaforo={semaforoPct(k.disponibilidade, META.disponibilidade)}>{pct(k.disponibilidade)}</Celula>
                    <span className="block text-xs text-muted-foreground">{numero(k.horasParada)} h paradas de {numero(k.horasProgramadas)} h</span>
                  </TableCell>
                  <TableCell>
                    <Celula semaforo={semaforoCusto(k.custoPorHora, custoMedio, cfg.custoFatorAmarelo)}>{k.custoPorHora === null ? "—" : reais(k.custoPorHora)}</Celula>
                    <span className="block text-xs text-muted-foreground">{reais(k.custo)} · {k.horasTrabalhadas === null ? "sem horas medidas" : `${numero(k.horasTrabalhadas)} h`}</span>
                  </TableCell>
                  <TableCell>
                    <Celula semaforo={semaforoPct(k.razaoPreventiva, META.preventiva)}>{pct(k.razaoPreventiva)}</Celula>
                    <span className="block text-xs text-muted-foreground">{k.preventivas} prev. / {k.corretivas} corr.</span>
                  </TableCell>
                  <TableCell>
                    {k.aderencia ? <Celula semaforo={semaforoPct(ader, META.aderencia)}>{k.aderencia.emDia}/{k.aderencia.total} em dia</Celula> : <span className="text-xs text-muted-foreground">Sem plano de manutenção</span>}
                    {k.aderencia?.vencidos.map((v) => <span key={v.acao} className="block text-xs text-muted-foreground">Vencida: {v.acao} ({v.motivo})</span>)}
                  </TableCell>
                  <TableCell>
                    <Celula semaforo={semaforoPct(conf, META.conformidade)}>{k.conformidade.atendidos}/{k.conformidade.total} requisitos</Celula>
                    {k.conformidade.pendencias.map((p) => <span key={p} className="block text-xs text-muted-foreground">Pendente: {p}</span>)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
