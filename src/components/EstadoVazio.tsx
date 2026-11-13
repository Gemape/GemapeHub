import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";

// Lista sem registros: diz o que falta e oferece o botão que resolve, no centro, em vez de uma tabela em branco.
export function EstadoVazio({ titulo, dica, acao, aoAcionar, Icone = Inbox }: { titulo: string; dica?: string; acao?: string; aoAcionar?: () => void; Icone?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><Icone className="size-6" aria-hidden="true" /></span>
      <p className="font-medium">{titulo}</p>
      {dica && <p className="max-w-sm text-sm text-muted-foreground">{dica}</p>}
      {acao && aoAcionar && <Button type="button" requiresWrite onClick={aoAcionar}>{acao}</Button>}
    </div>
  );
}
