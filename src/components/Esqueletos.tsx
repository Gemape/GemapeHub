import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

// Esqueletos: blocos cinzas pulsando no formato do que vai aparecer, no lugar do "Carregando…". Anunciam o carregamento aos leitores de tela uma vez só.
const LARGURAS = ["w-3/4", "w-1/2", "w-5/6", "w-2/3", "w-1/3", "w-4/5"];

/** Linhas de tabela de mentira: `colunas` células por linha, com larguras variadas para parecer conteúdo. */
export function LinhasEsqueleto({ colunas, linhas = 5 }: { colunas: number; linhas?: number }) {
  return (
    <>
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={colunas} className="sr-only"><span role="status">Carregando…</span></TableCell>
      </TableRow>
      {Array.from({ length: linhas }, (_, l) => (
        <TableRow key={l} aria-hidden="true" className="hover:bg-transparent">
          {Array.from({ length: colunas }, (_, c) => (
            <TableCell key={c} className={c > 1 ? "max-sm:hidden" : ""}><Skeleton className={`h-4 ${LARGURAS[(l + c) % LARGURAS.length]}`} /></TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/** Bloco de cartões de mentira (indicadores, resumos) seguido de linhas de lista. */
export function BlocoEsqueleto({ cartoes = 4, linhas = 4, rotulo = "Carregando" }: { cartoes?: number; linhas?: number; rotulo?: string }) {
  return (
    <div role="status" aria-label={rotulo} className="space-y-4">
      <span className="sr-only">{rotulo}…</span>
      <div aria-hidden="true" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cartoes }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div aria-hidden="true" className="space-y-2">
        {Array.from({ length: linhas }, (_, i) => <Skeleton key={i} className="h-8 w-full" />)}
      </div>
    </div>
  );
}
