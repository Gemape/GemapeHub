import { useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

export type LinhaDaGaveta = { texto: string; valor?: string | number; alerta?: boolean };
export type SecaoDaGaveta = { titulo: string; vazio: string; linhas: LinhaDaGaveta[] };
export type IndicadorDaGaveta = { rotulo: string; valor: string | number; alerta?: boolean };

// Gaveta lateral de resumo (peek): o essencial do registro sem sair da lista. "Abrir ficha completa" leva a quem realmente precisa editar.
export function GavetaResumo({ aberto, onAbertoMudou, titulo, subtitulo, indicadores, secoes, carregando = false, rotuloFicha = "Abrir ficha completa", aoAbrirFicha, aoAbrirLinhaDoTempo }: {
  aberto: boolean; onAbertoMudou: (aberto: boolean) => void; titulo: string; subtitulo?: string; indicadores: IndicadorDaGaveta[]; secoes: SecaoDaGaveta[];
  carregando?: boolean; rotuloFicha?: string; aoAbrirFicha?: () => void; aoAbrirLinhaDoTempo?: () => void;
}) {
  // A ficha completa abre num diálogo: só depois que a gaveta terminou de fechar (e devolveu o foco), para dois modais não ficarem um sobre o outro.
  const fichaPendente = useRef<(() => void) | null>(null);
  return (
    <Sheet open={aberto} onOpenChange={onAbertoMudou}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-md"
        onCloseAutoFocus={(e) => {
          const abrir = fichaPendente.current;
          fichaPendente.current = null;
          if (abrir) { e.preventDefault(); abrir(); }
        }}
      >
        <SheetHeader>
          <SheetTitle>{titulo}</SheetTitle>
          <SheetDescription>{subtitulo ?? "Resumo rápido"}</SheetDescription>
        </SheetHeader>
        {indicadores.length > 0 && (
          <dl className="grid grid-cols-2 gap-2">
            {indicadores.map((i) => (
              <div key={i.rotulo} className={`rounded-md border p-2 ${i.alerta ? "border-destructive/40 bg-destructive/10" : ""}`}>
                <dt className="text-xs text-muted-foreground">{i.rotulo}</dt>
                <dd className={`text-lg font-semibold tabular-nums ${i.alerta ? "text-destructive" : ""}`}>{i.valor}</dd>
              </div>
            ))}
          </dl>
        )}
        {secoes.map((s) => (
          <section key={s.titulo} aria-label={s.titulo}>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.titulo}</h3>
            {carregando ? <div role="status" aria-label="Carregando" className="space-y-1.5"><Skeleton className="h-3.5 w-full" /><Skeleton className="h-3.5 w-4/5" /></div>
              : s.linhas.length === 0 ? <p className="text-sm text-muted-foreground">{s.vazio}</p>
              : <ul className="space-y-1 text-sm">{s.linhas.map((l, n) => (
                  <li key={`${l.texto}-${n}`} className="flex justify-between gap-2">
                    <span className={l.alerta ? "text-destructive" : ""}>{l.texto}</span>
                    {l.valor !== undefined && <span className="tabular-nums text-muted-foreground">{l.valor}</span>}
                  </li>
                ))}</ul>}
          </section>
        ))}
        {aoAbrirLinhaDoTempo && <Button type="button" variant="outline" className="mt-auto" onClick={() => { fichaPendente.current = aoAbrirLinhaDoTempo; onAbertoMudou(false); }}>Ver linha do tempo completa</Button>}
        {aoAbrirFicha && <Button type="button" className={aoAbrirLinhaDoTempo ? "" : "mt-auto"} onClick={() => { fichaPendente.current = aoAbrirFicha; onAbertoMudou(false); }}>{rotuloFicha}</Button>}
      </SheetContent>
    </Sheet>
  );
}

// Nome que abre o resumo ao clicar e, com o mouse parado em cima, mostra um cartão rápido (cargo, validade do CA...) sem clicar.
// No celular não existe passar o mouse: o clique abre a gaveta do mesmo jeito.
export function NomeComResumo({ children, cartao, aoAbrir, rotulo }: { children: ReactNode; cartao?: ReactNode; aoAbrir: () => void; rotulo: string }) {
  const botao = (
    <button type="button" onClick={(e) => { e.stopPropagation(); aoAbrir(); }} aria-label={`Ver resumo de ${rotulo}`} className="cursor-pointer rounded-sm text-left font-medium underline-offset-2 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      {children}
    </button>
  );
  if (!cartao) return botao;
  return (
    <HoverCard openDelay={350} closeDelay={80}>
      <HoverCardTrigger asChild>{botao}</HoverCardTrigger>
      <HoverCardContent className="w-72 space-y-1 text-sm" align="start">{cartao}</HoverCardContent>
    </HoverCard>
  );
}

// Só o cartão ao passar o mouse (sem gaveta): para o nome de um EPI num relatório, mostra o CA e a validade dele sem clicar.
export function CartaoDoNome({ titulo, aviso = false, children }: { titulo: string; aviso?: boolean; children: ReactNode }) {
  return (
    <HoverCard openDelay={350} closeDelay={80}>
      <HoverCardTrigger asChild><span tabIndex={0} className={`cursor-help rounded-sm underline decoration-dotted underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${aviso ? "text-destructive" : ""}`}>{titulo}</span></HoverCardTrigger>
      <HoverCardContent className="w-64 space-y-1 text-sm" align="start"><p className="font-semibold">{titulo}</p>{children}</HoverCardContent>
    </HoverCard>
  );
}
