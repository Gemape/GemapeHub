import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import { CalendarCheck, CalendarClock, CircleCheck, CircleX } from "lucide-react";
import { useState, type ReactNode } from "react";

import { rotuloDoMes } from "@/components/modules/ChecklistPainelMensal";
import { GraficosChecklist } from "@/components/modules/GraficosVeiculos";
import { StatCard } from "@/components/StatCard";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GRUPOS_DE_AREA, grupoDaLinha, grupoDeAreaPorNome, type GrupoDeArea } from "@/lib/area-responsaveis";
import { faixaDoIndice } from "@/lib/faixas-desempenho";
import { mesesDisponiveis, painelDoMes, resultadosPorResponsavel, resumoDeLinhas, type ChecklistDoPainel, type LinhaPainel, type Previsao, type ResumoPainel } from "@/lib/checklist-painel";

const TODOS_OS_PERIODOS = "todos";
const porcento = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);

// Os quatro indicadores do painel para um conjunto de linhas (todas, ou as de um grupo de responsáveis).
function Indicadores({ resumo, todos }: { resumo: ResumoPainel; todos: boolean }) {
  const desfechos = resumo.realizados + resumo.naoRealizados;
  return (
    <div className="grid grid-cols-2 gap-2">
      <StatCard titulo="Realizados no prazo" pct={resumo.pctNoPrazo} faixa={faixaDoIndice(resumo.pctNoPrazo)?.faixa ?? null} valor={porcento(resumo.pctNoPrazo)} detalhe={desfechos > 0 ? `${resumo.realizados} de ${desfechos} com prazo definido` : "Ainda sem prazo vencido"} icone={CircleCheck} compacto />
      <StatCard titulo="Não realizados no prazo" pct={resumo.pctNaoNoPrazo} faixa={faixaDoIndice(resumo.pctNoPrazo)?.faixa ?? null} valor={porcento(resumo.pctNaoNoPrazo)} detalhe={desfechos > 0 ? `${resumo.naoRealizados} de ${desfechos} com prazo definido` : "Ainda sem prazo vencido"} icone={CircleX} compacto />
      <StatCard titulo={todos ? "Previstos" : "Previstos no mês"} valor={resumo.previstos} detalhe={resumo.opcionais > 0 ? `+ ${resumo.opcionais} opcional(is), fora dos percentuais` : "Só os obrigatórios"} icone={CalendarCheck} compacto />
      <StatCard titulo="A vencer" valor={resumo.aVencer} detalhe="Ainda dentro do prazo" icone={CalendarClock} compacto />
    </div>
  );
}

const COR_PONTO = { verde: "bg-green-600", amarelo: "bg-amber-500", vermelho: "bg-red-600" } as const;
const COR_TEXTO = { verde: "text-green-700 dark:text-green-400", amarelo: "text-amber-700 dark:text-amber-400", vermelho: "text-red-700 dark:text-red-400" } as const;

// O percentual de cada responsável com a bolinha da faixa (mesmas faixas e cores de Viagens); a cor nunca vai sozinha: o nome da faixa fica no title e para leitor de tela.
function PercentualComFaixa({ valor }: { valor: number | null }) {
  const f = faixaDoIndice(valor);
  if (!f) return <>{porcento(valor)}</>;
  return (
    <span className={`inline-flex items-center justify-end gap-1.5 ${COR_TEXTO[f.faixa]}`} title={`${f.cor}: ${f.classificacao}`}>
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${COR_PONTO[f.faixa]}`} aria-hidden="true" />
      <span>{porcento(valor)}</span>
      <span className="sr-only">{f.cor}, {f.classificacao}</span>
    </span>
  );
}

function TabelaDeResponsaveis({ linhas }: { linhas: LinhaPainel[] }) {
  const resultados = resultadosPorResponsavel(linhas);
  return (
    <div className="panel max-h-[32vh] overflow-auto">
      <Table className="whitespace-nowrap text-sm">
        <TableHeader>
          <TableRow>
            <TableHead className="h-8 px-2">Responsável</TableHead>
            <TableHead className="h-8 px-2 text-right">Previstos</TableHead>
            <TableHead className="h-8 px-2 text-right" title="Realizados no prazo">Feitos</TableHead>
            <TableHead className="h-8 px-2 text-right" title="Não realizados">Não feitos</TableHead>
            <TableHead className="h-8 px-2 text-right">A vencer</TableHead>
            <TableHead className="h-8 px-2 text-right">No prazo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {resultados.length === 0 && (
            <TableRow><TableCell colSpan={6} className="py-3 text-center text-muted-foreground">Nenhum responsável com check list previsto neste período.</TableCell></TableRow>
          )}
          {resultados.map((r) => (
            <TableRow key={r.nome}>
              <TableCell className="max-w-[10rem] truncate px-2 py-1 font-medium" title={r.nome}>{r.nome}</TableCell>
              <TableCell className="px-2 py-1 text-right">{r.previstos}</TableCell>
              <TableCell className="px-2 py-1 text-right">{r.realizados}</TableCell>
              <TableCell className="px-2 py-1 text-right">{r.naoRealizados}</TableCell>
              <TableCell className="px-2 py-1 text-right">{r.aVencer}</TableCell>
              <TableCell className="px-2 py-1 text-right font-medium"><PercentualComFaixa valor={r.pctNoPrazo} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Tela principal do Check list de veículos (decisões 298 e 310), no modelo do painel de Viagens: no topo os indicadores gerais do período e, abaixo, os mesmos
// indicadores e os resultados de cada responsável separados por grupo, Técnicos (área Oficina) e PCM. Administrativo e Sem área só aparecem se houver check list
// previsto para quem é dessa área. A área vem das caixas duplas de Parâmetros Específicos. Só conta o check list obrigatório (periódico).
export function ChecklistResultadosPainel({
  previsoes, checklists, idsDosVeiculos, hoje, acoes,
}: {
  previsoes: Previsao[];
  checklists: ChecklistDoPainel[];
  idsDosVeiculos: Set<string>;
  hoje: string;
  // Os botões dos tipos de check list: ficam na mesma linha do período, à direita.
  acoes?: ReactNode;
}) {
  const [mes, setMes] = useState(TODOS_OS_PERIODOS);
  const { linhas, resumo } = painelDoMes(
    mes === TODOS_OS_PERIODOS ? null : mes,
    previsoes.filter((p) => idsDosVeiculos.has(p.veiculoId)),
    checklists.filter((c) => idsDosVeiculos.has(c.veiculoId)),
    hoje,
  );
  const grupoDe = grupoDeAreaPorNome();
  const doGrupo = (g: GrupoDeArea) => linhas.filter((l) => grupoDaLinha(l, grupoDe) === g);
  // Técnicos e PCM sempre aparecem (mesmo vazios, para ficar claro que não há nada previsto); os outros grupos só quando têm linhas.
  const grupos = GRUPOS_DE_AREA.filter((g) => g === "Técnicos" || g === "PCM" || doGrupo(g).length > 0);
  const todos = mes === TODOS_OS_PERIODOS;
  const periodo = todos ? "Todos os períodos" : rotuloDoMes(mes);

  return (
    <div className="space-y-3">
      {/* O período vale para tudo o que está abaixo: fica no alto, à direita (decisão 339), na linha dos botões dos tipos de check list. */}
      <div className="flex flex-wrap items-end gap-2">
        {acoes}
        <BarraDeFiltros>
          <div className="flex items-center gap-2">
            <Label htmlFor="resultados_mes" className="text-xs">Período</Label>
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger id="resultados_mes" className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS_OS_PERIODOS}>Todos os períodos</SelectItem>
                {mesesDisponiveis(hoje).map((m) => <SelectItem key={m} value={m}>{rotuloDoMes(m)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </BarraDeFiltros>
      </div>
      {/* Tudo numa tela, sem rolar (decisão 332): uma coluna para o geral, com os gráficos, e uma para cada grupo, com os indicadores e a tabela dos responsáveis. */}
      <div className={`grid items-start gap-3 ${grupos.length === 2 ? "lg:grid-cols-3" : "lg:grid-cols-2 xl:grid-cols-4"}`}>
        <div className="space-y-3">
          <section className="space-y-1.5" aria-labelledby="checklist-indicadores">
            <div>
              <h2 id="checklist-indicadores" className="text-base font-semibold leading-tight">Indicadores gerais de check list</h2>
              <p className="text-xs text-muted-foreground">{periodo}.</p>
            </div>
            <Indicadores resumo={resumo} todos={todos} />
          </section>
          <GraficosChecklist linhas={linhas} grupoDe={grupoDe} compacto />
        </div>
        {grupos.map((g) => {
          const dele = doGrupo(g);
          const id = `checklist-grupo-${g.toLowerCase().replace(/[^a-z]/g, "")}`;
          return (
            <div key={g} className="space-y-3">
              <section className="space-y-1.5" aria-labelledby={id}>
                <div>
                  <h2 id={id} className="text-base font-semibold leading-tight">Indicadores · {g}</h2>
                  <p className="text-xs text-muted-foreground">{periodo}{dele.length === 0 ? `: nenhum check list previsto para ${g === "Técnicos" ? "os técnicos" : g === "PCM" ? "o PCM" : g.toLowerCase()} neste período.` : "."}</p>
                </div>
                <Indicadores resumo={resumoDeLinhas(dele)} todos={todos} />
              </section>
              <section className="space-y-1.5" aria-label={`Responsáveis · ${g}`}>
                <h3 className="text-sm font-semibold">Responsáveis · {g}</h3>
                <TabelaDeResponsaveis linhas={dele} />
              </section>
            </div>
          );
        })}
      </div>
    </div>
  );
}
