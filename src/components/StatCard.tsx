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
      <CardContent className="flex items-start justify-between gap-3 pt-6">
        <div>
          <p className="text-eyebrow">{titulo}</p>
          <p className="mt-1 font-display text-2xl font-bold">{valor}</p>
          {detalhe ? <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p> : null}
        </div>
        {Icone ? (
          <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icone className="size-5" />
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
