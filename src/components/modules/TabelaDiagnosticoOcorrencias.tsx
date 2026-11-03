import { EtiquetaVencimento } from "@/components/modules/FrotaModulo";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SituacaoColuna } from "@/lib/frota-situacao";
import { formatarData, formatarMoeda } from "@/lib/gemape";

// Diagnóstico de ocorrências de cada veículo (decisão 349): a tabela da Frota, só com os dados de ocorrências. Clicar na linha ou em Ver extrato abre o extrato do veículo.
export type LinhaDiagnosticoOcorrencias = {
  id: string;
  veiculo: string;
  ultima: { data: string; tipo: string } | null;
  total: number;
  abertas: number;
  emTratativa: number;
  encerradas: number;
  prazos: SituacaoColuna;
  custo: number;
};


export function TabelaDiagnosticoOcorrencias({ linhas, aoAbrir }: { linhas: LinhaDiagnosticoOcorrencias[]; aoAbrir: (id: string, secao: "ocorrenciasAbertas" | null) => void }) {
  return (
    <section aria-label="Diagnóstico de ocorrências por veículo">
      <div className="flex max-h-[max(8rem,calc(100dvh-48.5rem))] flex-col overflow-hidden rounded-xl border [&>div]:min-h-0 [&>div]:flex-1 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card">
        <Table className="min-w-[1100px] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[28%]">Veículo</TableHead>
              <TableHead className="w-[15%]">Última ocorrência</TableHead>
              <TableHead className="w-[7%] pr-6 text-right">Total</TableHead>
              <TableHead className="w-[8%] pr-6 text-right">Abertas</TableHead>
              <TableHead className="w-[9%] pr-6 text-right">Em tratativa</TableHead>
              <TableHead className="w-[8%] pr-6 text-right">Encerradas</TableHead>
              <TableHead className="w-[11%] text-center">Prazos</TableHead>
              <TableHead className="w-[10%] pr-6 text-right" title="Custo da empresa informado nas tratativas">Custo empresa</TableHead>
              <TableHead className="w-[9%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && <TableRow><TableCell colSpan={9} className="py-6 text-center text-muted-foreground">Nenhum veículo encontrado.</TableCell></TableRow>}
            {linhas.map((l) => (
              <TableRow key={l.id} className="cursor-pointer" onClick={() => aoAbrir(l.id, null)}>
                <TableCell className="font-medium">{l.veiculo}</TableCell>
                <TableCell>{l.ultima ? `${formatarData(l.ultima.data)} · ${l.ultima.tipo}` : "—"}</TableCell>
                <TableCell className="pr-6 text-right tabular-nums">{l.total}</TableCell>
                <TableCell className="pr-6 text-right tabular-nums">{l.abertas}</TableCell>
                <TableCell className="pr-6 text-right tabular-nums">{l.emTratativa}</TableCell>
                <TableCell className="pr-6 text-right tabular-nums">{l.encerradas}</TableCell>
                <TableCell><EtiquetaVencimento valor={l.prazos} dica="Ver as ocorrências em aberto" aoClicar={() => aoAbrir(l.id, "ocorrenciasAbertas")} /></TableCell>
                <TableCell className="pr-6 text-right tabular-nums">{formatarMoeda(l.custo)}</TableCell>
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
