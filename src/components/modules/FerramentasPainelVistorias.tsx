import { CalendarCheck, CalendarClock, CircleCheck, CircleX } from "lucide-react";
import { useState } from "react";
import { GradeDeCartoes } from "@/components/GradeDeCartoes";
import { LinhasEsqueleto } from "@/components/Esqueletos";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarData } from "@/lib/gemape";
import { lerMesesBase, MESES_DO_ANO } from "@/lib/escalonamento-vistorias";
import type { SituacaoDaVistoria } from "@/lib/situacao-vistoria";
import { useVistoriasDasCaixas } from "@/lib/use-vistorias-caixas";

// Mesmas cores do painel do Check list da Frota: verde (realizada), amarelo (pendente, ainda no prazo) e vermelho (não realizada no prazo).
const SITUACAO: Record<SituacaoDaVistoria, { rotulo: string; classe: string }> = {
  "Em dia": { rotulo: "Realizada", classe: "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
  Pendente: { rotulo: "Pendente", classe: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  Vencida: { rotulo: "Não realizada no prazo", classe: "border-red-300 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200" },
  "Sem escalonamento": { rotulo: "Sem escalonamento", classe: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" },
};
const ORDEM: SituacaoDaVistoria[] = ["Vencida", "Pendente", "Em dia", "Sem escalonamento"];
const LINHAS_VISIVEIS = 8;
const pct = (n: number, total: number) => (total === 0 ? null : Math.round((n / total) * 100));

// Termo de vistoria periódica > painel: as caixas com a situação da vistoria (cards no padrão da Frota) e, ao lado de cada uma, o botão que abre a vistoria dela.
export function FerramentasPainelVistorias({ onFazerVistoria }: { onFazerVistoria: (caixaId: string) => void }) {
  // Lido a cada desenho (é pequeno), para acompanhar o que se definir no Plano de vistorias.
  const mesesBase = lerMesesBase();
  const { linhas, isLoading, periodicidade } = useVistoriasDasCaixas(mesesBase);
  const [todas, setTodas] = useState(false);
  const por = (s: SituacaoDaVistoria) => linhas.filter((l) => l.resultado.situacao === s).length;
  const realizadas = por("Em dia");
  const pendentes = por("Pendente");
  const vencidas = por("Vencida");
  const previstas = realizadas + pendentes + vencidas;
  const ordenadas = [...linhas].sort((a, b) => ORDEM.indexOf(a.resultado.situacao) - ORDEM.indexOf(b.resultado.situacao));
  const visiveis = todas ? ordenadas : ordenadas.slice(0, LINHAS_VISIVEIS);

  return (
    <section className="space-y-3" aria-label="Painel das vistorias periódicas">
      <div>
        <h2 className="text-sm font-semibold">Vistorias das caixas</h2>
        <p className="text-xs text-muted-foreground">Periodicidade {periodicidade.toLowerCase()}, com o mês-base de cada caixa definido em Parâmetros &gt; Ferramentas &gt; Plano de vistorias.</p>
      </div>
      <GradeDeCartoes colunas={4}>
        <StatCard titulo="Realizadas" subtitulo="Caixas com a vistoria do ciclo atual feita." pct={pct(realizadas, previstas)} faixa="verde" valor={realizadas} detalhe={previstas > 0 ? `${realizadas} de ${previstas} escalonadas` : "Nenhuma caixa escalonada"} icone={CircleCheck} compacto />
        <StatCard titulo="Pendentes" subtitulo="Ainda dentro do prazo para a vistoria." pct={pct(pendentes, previstas)} faixa="amarelo" valor={pendentes} detalhe={previstas > 0 ? `${pendentes} de ${previstas} escalonadas` : "Nenhuma caixa escalonada"} icone={CalendarClock} compacto />
        <StatCard titulo="Não realizadas no prazo" subtitulo="O prazo da vistoria passou sem ela ser feita." pct={pct(vencidas, previstas)} faixa="vermelho" valor={vencidas} detalhe={previstas > 0 ? `${vencidas} de ${previstas} escalonadas` : "Nenhuma caixa escalonada"} icone={CircleX} compacto />
        <StatCard titulo="Escalonadas" subtitulo="Caixas com mês-base definido." valor={previstas} detalhe={linhas.length - previstas > 0 ? `${linhas.length - previstas} sem escalonamento` : "Todas as caixas"} icone={CalendarCheck} compacto />
      </GradeDeCartoes>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Caixa</TableHead><TableHead>Portador</TableHead><TableHead>Responsável pela vistoria</TableHead><TableHead>Mês-base</TableHead><TableHead>Prazo</TableHead>
              <TableHead>Última vistoria</TableHead><TableHead>Situação</TableHead><TableHead className="text-right">Vistoria</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <LinhasEsqueleto colunas={8} />
              : linhas.length === 0 ? <TableRow><TableCell colSpan={8} className="py-6 text-center text-muted-foreground">Nenhuma caixa habilitada.</TableCell></TableRow>
                : visiveis.map(({ caixa, portador, responsavel, mesBase, ultimaVistoria, resultado }) => (
                  <TableRow key={caixa.id}>
                    <TableCell className="font-mono text-xs">{caixa.codigo}</TableCell>
                    <TableCell>{portador ?? "—"}</TableCell>
                    <TableCell>{responsavel ?? "—"}</TableCell>
                    <TableCell>{mesBase ? MESES_DO_ANO[mesBase - 1] : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{resultado.limite ? `até ${formatarData(resultado.limite)}` : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{ultimaVistoria ? formatarData(ultimaVistoria) : "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={SITUACAO[resultado.situacao].classe}>{SITUACAO[resultado.situacao].rotulo}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button requiresWrite="operar" type="button" size="sm" variant={resultado.situacao === "Em dia" ? "outline" : "default"} aria-label={`Fazer a vistoria da caixa ${caixa.codigo}`} onClick={() => onFazerVistoria(caixa.id)}>Fazer vistoria</Button>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
      {ordenadas.length > LINHAS_VISIVEIS && (
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => setTodas((v) => !v)}>{todas ? "Mostrar menos" : `Mostrar todas as ${ordenadas.length} caixas`}</Button>
        </div>
      )}
    </section>
  );
}
