import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  titulo,
  valor,
  detalhe,
  icone: Icone,
}: {
  titulo: string;
  valor: string | number;
  detalhe?: string;
  icone?: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-3 pt-3 sm:p-6 sm:pt-6">
        <div className="min-w-0">
          <p className="text-eyebrow">{titulo}</p>
          <p className="mt-1 break-words font-display text-xl font-bold sm:text-2xl">{valor}</p>
          {detalhe ? <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p> : null}
        </div>
        {Icone ? (
          <span className="hidden size-9 shrink-0 items-center justify-center sm:flex rounded-md bg-primary/10 text-primary">
            <Icone className="size-5" />
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
