import { NotebookPen } from "lucide-react";
import { useState } from "react";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { quandoComecou } from "@/lib/lancamento-aberto";

// Banner discreto de retomada: "Você tem um lançamento não finalizado de hoje às 11:20. [Continuar de onde parou] [Descartar]".
// Descartar pede confirmação, porque joga fora o que já foi avaliado.
export function BannerLancamentoAberto({ criadoEm, nome, outros = 0, aoContinuar, aoDescartar, podeDescartar = true }: {
  criadoEm: string; nome: string; outros?: number; aoContinuar: () => void; aoDescartar: () => void; podeDescartar?: boolean;
}) {
  const [confirmando, setConfirmando] = useState(false);
  return (
    <>
      <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        <NotebookPen className="size-4 shrink-0" aria-hidden="true" />
        <p className="min-w-0 flex-1">
          Você tem um lançamento não finalizado {quandoComecou(criadoEm)} <span className="text-amber-800/80 dark:text-amber-200/80">({nome})</span>
          {outros > 0 && <span className="text-amber-800/80 dark:text-amber-200/80"> e mais {outros}</span>}.
        </p>
        <Button type="button" size="sm" onClick={aoContinuar}>Continuar de onde parou</Button>
        {podeDescartar && <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmando(true)}>Descartar</Button>}
      </div>
      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar o lançamento não finalizado?</AlertDialogTitle>
            <AlertDialogDescription>Tudo o que já foi preenchido em “{nome}” será perdido.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmando(false); aoDescartar(); }}>Descartar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
