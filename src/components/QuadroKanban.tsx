import { ArrowRight } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ColunaKanban<S extends string> = { id: S; titulo: string };

// Quadro por situação: cada coluna é uma etapa e o cartão é arrastado de uma para outra. Quem não usa o mouse (teclado, celular)
// tem o botão "Mover para …" no cartão, para a próxima etapa permitida. `podeMover` diz para onde o cartão pode ir.
export function QuadroKanban<T extends { id: string }, S extends string>({ colunas, itens, colunaDe, cartao, podeMover, aoMover, rotuloDo }: {
  colunas: readonly ColunaKanban<S>[]; itens: readonly T[]; colunaDe: (item: T) => S; cartao: (item: T) => ReactNode;
  podeMover: (item: T, para: S) => boolean; aoMover: (item: T, para: S) => void; rotuloDo: (item: T) => string;
}) {
  const [arrastando, setArrastando] = useState<T | null>(null);
  const [sobre, setSobre] = useState<S | null>(null);
  return (
    <div className="grid gap-3 md:grid-cols-[repeat(var(--colunas),minmax(0,1fr))]" style={{ ["--colunas" as string]: colunas.length }}>
      {colunas.map((c) => {
        const daColuna = itens.filter((i) => colunaDe(i) === c.id);
        const aceita = arrastando !== null && podeMover(arrastando, c.id);
        return (
          <section
            key={c.id} aria-label={`${c.titulo}: ${daColuna.length}`}
            className={cn("flex min-h-40 flex-col gap-2 rounded-xl border bg-muted/30 p-2 transition-colors",
              arrastando && (aceita ? "border-dashed border-primary" : "opacity-60"), sobre === c.id && aceita && "bg-primary/10")}
            onDragOver={(e) => { if (aceita) { e.preventDefault(); setSobre(c.id); } }}
            onDragLeave={() => setSobre((s) => (s === c.id ? null : s))}
            onDrop={(e) => { e.preventDefault(); if (arrastando && aceita) aoMover(arrastando, c.id); setArrastando(null); setSobre(null); }}
          >
            <h3 className="flex items-center justify-between px-1 text-sm font-semibold">{c.titulo}<span className="rounded-full bg-background px-2 text-xs font-normal tabular-nums">{daColuna.length}</span></h3>
            {daColuna.length === 0 && <p className="px-1 text-xs text-muted-foreground">Nenhum.</p>}
            {daColuna.map((i) => {
              const proxima = colunas.find((x) => x.id !== c.id && podeMover(i, x.id));
              return (
                <article
                  key={i.id} draggable={colunas.some((x) => x.id !== c.id && podeMover(i, x.id))}
                  onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", i.id); setArrastando(i); }}
                  onDragEnd={() => { setArrastando(null); setSobre(null); }}
                  className={cn("rounded-lg border bg-card p-2.5 text-sm shadow-sm", proxima && "cursor-grab active:cursor-grabbing", arrastando?.id === i.id && "opacity-50")}
                >
                  {cartao(i)}
                  {proxima && (
                    <Button type="button" variant="ghost" size="sm" className="mt-1 h-7 px-2 text-xs" aria-label={`Mover ${rotuloDo(i)} para ${proxima.titulo}`} onClick={() => aoMover(i, proxima.id)}>
                      Mover para {proxima.titulo} <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Button>
                  )}
                </article>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
