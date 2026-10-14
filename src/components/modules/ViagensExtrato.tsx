import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listarRelatorios, relatorioPorDespesa } from "@/lib/relatorios-viagens";
import type { RespostaRegistrada } from "@/lib/respostas-despesas";
import { formatarMoeda, rotuloPeriodo, type PeriodoMes } from "@/lib/viagens";
import { deslocarMes, extratoDoTecnico } from "@/lib/viagens-lista";

const dataBr = (iso: string) => iso.split("-").reverse().join("/");

// Extrato do técnico (dec 187): despesas do mês dele, com a quantidade e o custo total no topo e navegação entre meses.
// Em demonstração qualquer pessoa abre o de qualquer técnico; a restrição "só o próprio" depende do login (Fase 2).
export function ViagensExtrato({ tecnico, periodoInicial, lista, aoFechar }: {
  tecnico: string; periodoInicial: PeriodoMes; lista: readonly RespostaRegistrada[]; aoFechar: () => void;
}) {
  const [periodo, setPeriodo] = useState(periodoInicial);
  const relatorios = useMemo(() => relatorioPorDespesa(listarRelatorios()), []);
  const extrato = useMemo(() => extratoDoTecnico(lista, periodo, tecnico, relatorios), [lista, periodo, tecnico, relatorios]);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) aoFechar(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Extrato de {tecnico}</DialogTitle>
          <DialogDescription>Despesas lançadas em nome do técnico no mês.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="icon" aria-label="Mês anterior" onClick={() => setPeriodo((p) => deslocarMes(p, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <p className="text-sm font-medium" aria-live="polite">{rotuloPeriodo(periodo)}</p>
          <Button variant="outline" size="icon" aria-label="Próximo mês" onClick={() => setPeriodo((p) => deslocarMes(p, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="panel p-3"><p className="text-xs text-muted-foreground">Despesas no mês</p><p className="text-xl font-bold">{extrato.quantidade}</p></div>
          <div className="panel p-3"><p className="text-xs text-muted-foreground">Custo total</p><p className="text-xl font-bold">{formatarMoeda(extrato.custoTotal)}</p></div>
        </div>
        {extrato.linhas.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">Nenhuma despesa neste mês.</p>
        ) : (
          <ul className="divide-y rounded-md border text-sm">
            {extrato.linhas.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="font-medium">{l.tipo} · {dataBr(l.data)}</p>
                  <p className="truncate text-xs text-muted-foreground">{l.cliente ?? "Cliente não informado"}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <span className="whitespace-nowrap font-medium">{l.valor === null ? "—" : formatarMoeda(l.valor)}</span>
                  {l.conforme !== null && <Badge variant="outline">{l.conforme ? "Lançada pelo técnico" : "Lançada pelo gestor"}</Badge>}
                  <Badge variant={l.status === "Em aberto" ? "outline" : "secondary"}>{l.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
