import { faixaDaVida } from "@/lib/vida-util";
import { cn } from "@/lib/utils";

const COR = { verde: "bg-emerald-500", amarela: "bg-amber-400", vermelha: "bg-red-500" } as const;

// Barrinha de vida útil ao lado da data: o comprimento é o que resta do prazo e a cor diz a faixa (verde → amarela → vermelha).
export function BarraVidaUtil({ parte, className }: { parte: number | null; className?: string }) {
  if (parte === null) return null;
  const pct = Math.round(parte * 100);
  const texto = pct === 0 ? "Prazo esgotado" : `${pct}% do prazo restante`;
  return (
    <span role="img" aria-label={texto} title={texto} className={cn("mt-1 block h-1.5 w-24 overflow-hidden rounded-full bg-muted", className)}>
      <span className={cn("block h-full rounded-full", COR[faixaDaVida(parte)])} style={{ width: `${Math.max(pct, pct === 0 ? 0 : 4)}%` }} />
    </span>
  );
}
