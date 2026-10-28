import { CalendarCheck, CalendarClock, CircleCheck, CircleX } from "lucide-react";
import { useState } from "react";

import { rotuloDoMes } from "@/components/modules/ChecklistPainelMensal";
import { StatCard } from "@/components/StatCard";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GRUPOS_DE_AREA, grupoDeAreaPorNome, type GrupoDeArea } from "@/lib/area-responsaveis";
import { mesesDisponiveis, painelDoMes, resultadosPorResponsavel, resumoDeLinhas, type ChecklistDoPainel, type LinhaPainel, type Previsao, type ResumoPainel } from "@/lib/checklist-painel";

const TODOS_OS_PERIODOS = "todos";
const porcento = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);

// Os quatro indicadores do painel para um conjunto de linhas (todas, ou as de um grupo de responsáveis).
function Indicadores({ resumo, todos }: { resumo: ResumoPainel; todos: boolean }) {
  const desfechos = resumo.realizados + resumo.naoRealizados;
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard titulo="Realizados no prazo" valor={porcento(resumo.pctNoPrazo)} detalhe={desfechos > 0 ? `${resumo.realizados} de ${desfechos} com prazo definido` : "Ainda sem prazo vencido"} icone={CircleCheck} />
      <StatCard titulo="Não realizados no prazo" valor={porcento(resumo.pctNaoNoPrazo)} detalhe={desfechos > 0 ? `${resumo.naoRealizados} de ${desfechos} com prazo definido` : "Ainda sem prazo vencido"} icone={CircleX} />
      <StatCard titulo={todos ? "Previstos" : "Previstos no mês"} valor={resumo.previstos} detalhe={resumo.opcionais > 0 ? `+ ${resumo.opcionais} opcional(is), fora dos percentuais` : "Só os obrigatórios"} icone={CalendarCheck} />
      <StatCard titulo="A vencer" valor={resumo.aVencer} icone={CalendarClock} />
    </div>
  );
}

function TabelaDeResponsaveis({ linhas }: { linhas: LinhaPainel[] }) {
  const resultados = resultadosPorResponsavel(linhas);
  return (
    <div className="panel overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-2 sm:px-4">Responsável</TableHead>
            <TableHead className="px-2 text-right sm:px-4">Previstos</TableHead>
            <TableHead className="px-2 text-right sm:px-4"><span className="sm:hidden">Feitos</span><span className="hidden sm:inline">Realizados no prazo</span></TableHead>
            <TableHead className="px-2 text-right sm:px-4"><span className="sm:hidden">Não feitos</span><span className="hidden sm:inline">Não realizados</span></TableHead>
            <TableHead className="px-2 text-right sm:px-4">A vencer</TableHead>
            <TableHead className="px-2 text-right sm:px-4">No prazo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {resultados.length === 0 && (
            <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Nenhum responsável com check list previsto neste período.</TableCell></TableRow>
          )}
          {resultados.map((r) => (
            <TableRow key={r.nome}>
              <TableCell className="px-2 font-medium sm:px-4">{r.nome}</TableCell>
              <TableCell className="px-2 text-right sm:px-4">{r.previstos}</TableCell>
              <TableCell className="px-2 text-right sm:px-4">{r.realizados}</TableCell>
              <TableCell className="px-2 text-right sm:px-4">{r.naoRealizados}</TableCell>
              <TableCell className="px-2 text-right sm:px-4">{r.aVencer}</TableCell>
              <TableCell className="px-2 text-right font-medium sm:px-4">{porcento(r.pctNoPrazo)}</TableCell>
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
  previsoes, checklists, idsDosVeiculos, hoje,
}: {
  previsoes: Previsao[];
  checklists: ChecklistDoPainel[];
  idsDosVeiculos: Set<string>;
  hoje: string;
}) {
  const [mes, setMes] = useState(TODOS_OS_PERIODOS);
  const { linhas, resumo } = painelDoMes(
    mes === TODOS_OS_PERIODOS ? null : mes,
    previsoes.filter((p) => idsDosVeiculos.has(p.veiculoId)),
    checklists.filter((c) => idsDosVeiculos.has(c.veiculoId)),
    hoje,
  );
  const grupoDe = grupoDeAreaPorNome();
  const doGrupo = (g: GrupoDeArea) => linhas.filter((l) => grupoDe(l.responsavelNome) === g);
  // Técnicos e PCM sempre aparecem (mesmo vazios, para ficar claro que não há nada previsto); os outros grupos só quando têm linhas.
  const grupos = GRUPOS_DE_AREA.filter((g) => g === "Técnicos" || g === "PCM" || doGrupo(g).length > 0);
  const todos = mes === TODOS_OS_PERIODOS;
  const periodo = todos ? "Todos os períodos" : rotuloDoMes(mes);

  return (
    <div className="space-y-8">
      <section className="space-y-3" aria-labelledby="checklist-indicadores">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="checklist-indicadores" className="text-lg font-semibold">Indicadores gerais de check list</h2>
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
        </div>
        <Indicadores resumo={resumo} todos={todos} />
      </section>

      {grupos.map((g) => {
        const dele = doGrupo(g);
        const id = `checklist-grupo-${g.toLowerCase().replace(/[^a-z]/g, "")}`;
        return (
          <section key={g} className="space-y-3" aria-labelledby={id}>
            <div>
              <h2 id={id} className="text-lg font-semibold">Indicadores · {g}</h2>
              <p className="text-sm text-muted-foreground">{periodo}{dele.length === 0 ? `: nenhum check list previsto para ${g === "Técnicos" ? "os técnicos" : g === "PCM" ? "o PCM" : g.toLowerCase()} neste período.` : "."}</p>
            </div>
            <Indicadores resumo={resumoDeLinhas(dele)} todos={todos} />
            <TabelaDeResponsaveis linhas={dele} />
          </section>
        );
      })}
    </div>
  );
}
