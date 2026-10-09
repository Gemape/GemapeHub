import { CalendarCheck, CalendarClock, CircleCheck, CircleX } from "lucide-react";
import { useState } from "react";

import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mesDe, mesesDisponiveis, painelDoMes, type Previsao, type SituacaoPrevisao } from "@/lib/checklist-painel";
import type { ChecklistVeiculo } from "@/lib/checklist-veiculo";
import { formatarData } from "@/lib/gemape";

const SITUACAO: Record<SituacaoPrevisao, { rotulo: string; classe: string }> = {
  realizado: { rotulo: "Realizado no prazo", classe: "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
  nao_realizado: { rotulo: "Não realizado no prazo", classe: "border-red-300 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200" },
  a_vencer: { rotulo: "A vencer", classe: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  opcional: { rotulo: "Opcional", classe: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" },
};

const rotuloDoMes = (mes: string) => {
  const texto = new Date(`${mes}-01T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};
const porcento = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);

// Painel do mês do Check list (decisão 80): os check lists previstos pela associação de cada veículo, com o
// resultado de cada um e, no topo, o percentual realizado e o não realizado no prazo. O mês atual está
// aberto; os anteriores mostram o resultado já fechado (as previsões vencidas não mudam mais).
export function ChecklistPainelMensal({
  previsoes, checklists, idsDosVeiculos, hoje, onAbrirChecklist,
}: {
  previsoes: Previsao[];
  checklists: ChecklistVeiculo[];
  idsDosVeiculos: Set<string>;
  hoje: string;
  onAbrirChecklist: (id: string) => void;
}) {
  const meses = mesesDisponiveis(hoje);
  const [mes, setMes] = useState(mesDe(hoje));
  const { linhas, resumo } = painelDoMes(
    mes,
    previsoes.filter((p) => idsDosVeiculos.has(p.veiculoId)),
    checklists.filter((c) => idsDosVeiculos.has(c.veiculoId)),
    hoje,
  );
  const atual = mes === mesDe(hoje);
  const desfechos = resumo.realizados + resumo.naoRealizados;

  return (
    <section className="space-y-3" aria-label="Painel mensal do check list">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h2 className="text-sm font-semibold">Painel do mês</h2>
          <p className="text-xs text-muted-foreground">
            {atual ? "Check lists previstos para o mês corrente." : "Mês fechado: o resultado não muda mais."}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Label htmlFor="painel_mes" className="text-xs">Mês</Label>
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger id="painel_mes" className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {meses.map((m) => <SelectItem key={m} value={m}>{rotuloDoMes(m)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          titulo="Realizados no prazo"
          valor={porcento(resumo.pctNoPrazo)}
          detalhe={desfechos > 0 ? `${resumo.realizados} de ${desfechos} com prazo definido` : "Ainda sem prazo vencido"}
          icone={CircleCheck}
        />
        <StatCard
          titulo="Não realizados no prazo"
          valor={porcento(resumo.pctNaoNoPrazo)}
          detalhe={desfechos > 0 ? `${resumo.naoRealizados} de ${desfechos} com prazo definido` : "Ainda sem prazo vencido"}
          icone={CircleX}
        />
        <StatCard titulo="Previstos no mês" valor={resumo.previstos} detalhe={resumo.opcionais > 0 ? `+ ${resumo.opcionais} opcional(is), fora dos percentuais` : "Só os obrigatórios"} icone={CalendarCheck} />
        <StatCard titulo="A vencer" valor={resumo.aVencer} icone={CalendarClock} />
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prazo</TableHead><TableHead>Veículo</TableHead><TableHead>Periodicidade</TableHead>
              <TableHead>Responsável</TableHead><TableHead>Situação</TableHead><TableHead>Check list</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                  {atual ? "Nenhum check list previsto: associe itens de check list aos veículos em Parâmetros." : "Nenhum check list previsto neste mês."}
                </TableCell>
              </TableRow>
            )}
            {linhas.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="whitespace-nowrap">
                  {l.inicio === l.fim ? formatarData(l.fim) : `${formatarData(l.inicio)} a ${formatarData(l.fim)}`}
                </TableCell>
                <TableCell>{l.veiculoRotulo}</TableCell>
                <TableCell>{l.periodicidade}</TableCell>
                <TableCell>{l.responsavelNome || "—"}</TableCell>
                <TableCell><Badge variant="outline" className={SITUACAO[l.situacao].classe}>{SITUACAO[l.situacao].rotulo}</Badge></TableCell>
                <TableCell>
                  {l.checklistId && l.checklistCodigo ? (
                    <Button variant="link" size="sm" className="h-auto p-0 font-mono text-xs" onClick={() => onAbrirChecklist(l.checklistId!)}>
                      {l.checklistCodigo}
                    </Button>
                  ) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
