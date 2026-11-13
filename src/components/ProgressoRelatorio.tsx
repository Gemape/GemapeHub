import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

export type EstadoProgresso = { percentual: number; texto: string };

// Janela de progresso para relatórios pesados: barra com a porcentagem real da leitura e o que está sendo feito agora.
export function ProgressoRelatorio({ progresso, titulo }: { progresso: EstadoProgresso | null; titulo: string }) {
  return (
    <Dialog open={progresso !== null}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription aria-live="polite">{progresso ? `${progresso.texto} ${progresso.percentual}%` : ""}</DialogDescription>
        </DialogHeader>
        <Progress value={progresso?.percentual ?? 0} aria-label={titulo} />
      </DialogContent>
    </Dialog>
  );
}
