import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

// Barra de etapas no topo de um fluxo guiado: 1. Seleção → 2. Contagem → 3. Revisão → 4. Conclusão.
// As etapas já feitas são botões (voltar sem perder o que foi preenchido); as da frente só se alcançam pelo botão Próximo.
export function Etapas({ titulos, atual, aoIr }: { titulos: readonly string[]; atual: number; aoIr: (i: number) => void }) {
  return (
    <nav aria-label="Etapas">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {titulos.map((t, i) => {
          const feita = i < atual;
          const marca = (
            <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
              i === atual ? "border-primary bg-primary text-primary-foreground" : feita ? "border-primary text-primary" : "text-muted-foreground")}>
              {feita ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
            </span>
          );
          return (
            <li key={t} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true" className={cn("h-px w-6", feita || i === atual ? "bg-primary" : "bg-border")} />}
              {feita ? (
                <button type="button" onClick={() => aoIr(i)} className="flex items-center gap-1.5 rounded-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {marca}{t}<span className="sr-only"> (voltar para esta etapa)</span>
                </button>
              ) : (
                <span aria-current={i === atual ? "step" : undefined} className={cn("flex items-center gap-1.5", i === atual ? "font-semibold" : "text-muted-foreground")}>
                  {marca}{t}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
