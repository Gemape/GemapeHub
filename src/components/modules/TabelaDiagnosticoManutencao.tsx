import { EtiquetaVencimento } from "@/components/modules/FrotaModulo";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Faixa } from "@/lib/faixas-desempenho";
import type { SituacaoColuna } from "@/lib/frota-situacao";
import { formatarData } from "@/lib/gemape";

// Diagnóstico de manutenção de cada veículo (decisão 348): a tabela da Frota, só com os dados de manutenção. Clicar na linha ou em Ver extrato abre o extrato do veículo.
export type LinhaDiagnostico = {
  id: string;
  veiculo: string;
  km: number;
  ultima: { data: string; tipo: string } | null;
  preventivas: SituacaoColuna;
  realizadas: number;
  corretivas: number;
  custo: number;
  pctPreventivo: number | null;
  faixaPreventivo: Faixa | null;
};

const moeda = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const COR_FAIXA: Record<Faixa, string> = { verde: "text-emerald-700", amarelo: "font-semibold text-amber-700", vermelho: "font-semibold text-red-700" };

export function TabelaDiagnosticoManutencao({ linhas, aoAbrir }: { linhas: LinhaDiagnostico[]; aoAbrir: (id: string, secao: "sugeridas" | null) => void }) {
  return (
    <section aria-label="Diagnóstico de manutenção por veículo">
      <div className="flex max-h-[max(8rem,calc(100dvh-47.5rem))] flex-col overflow-hidden rounded-xl border [&>div]:min-h-0 [&>div]:flex-1 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card">
        <Table className="min-w-[1100px] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[28%]">Veículo</TableHead>
              <TableHead className="w-[8%] pr-6 text-right">Km atual</TableHead>
              <TableHead className="w-[14%]">Última manutenção</TableHead>
              <TableHead className="w-[11%] text-center">Preventivas</TableHead>
              <TableHead className="w-[8%] pr-6 text-right">Realizadas</TableHead>
              <TableHead className="w-[8%] pr-6 text-right">Corretivas</TableHead>
              <TableHead className="w-[10%] pr-6 text-right">Custo total</TableHead>
              <TableHead className="w-[8%] pr-6 text-right" title="Parte do gasto em manutenção que é preventiva (meta de 80%)">% preventivo</TableHead>
              <TableHead className="w-[9%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && <TableRow><TableCell colSpan={9} className="py-6 text-center text-muted-foreground">Nenhum veículo encontrado.</TableCell></TableRow>}
            {linhas.map((l) => (
              <TableRow key={l.id} className="cursor-pointer" onClick={() => aoAbrir(l.id, null)}>
                <TableCell className="font-medium">{l.veiculo}</TableCell>
                <TableCell className="pr-6 text-right tabular-nums">{l.km.toLocaleString("pt-BR")}</TableCell>
                <TableCell>{l.ultima ? `${formatarData(l.ultima.data)} · ${l.ultima.tipo}` : "—"}</TableCell>
                <TableCell><EtiquetaVencimento valor={l.preventivas} dica="Ver as manutenções sugeridas" aoClicar={() => aoAbrir(l.id, "sugeridas")} /></TableCell>
                <TableCell className="pr-6 text-right tabular-nums">{l.realizadas}</TableCell>
                <TableCell className="pr-6 text-right tabular-nums">{l.corretivas}</TableCell>
                <TableCell className="pr-6 text-right tabular-nums">{moeda(l.custo)}</TableCell>
                <TableCell className={`pr-6 text-right tabular-nums ${l.faixaPreventivo ? COR_FAIXA[l.faixaPreventivo] : "text-muted-foreground"}`}>
                  {l.pctPreventivo === null ? "—" : `${l.pctPreventivo.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" className="rounded-full" onClick={(e) => { e.stopPropagation(); aoAbrir(l.id, null); }}>Ver extrato</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
