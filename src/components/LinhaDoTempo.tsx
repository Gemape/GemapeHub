import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, CircleDot, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";

import { agruparPorDia, contagemPorFiltro, FILTROS, filtrarEventos, ROTULO_FILTRO, type Categoria, type EventoDoTempo, type FiltroTempo } from "@/lib/linha-do-tempo";
import { formatarData } from "@/lib/gemape";

const ICONE: Record<Categoria, { Icone: typeof CircleDot; cor: string; rotulo: string }> = {
  entrega: { Icone: ArrowUpFromLine, cor: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300", rotulo: "Entrega" },
  devolucao: { Icone: Undo2, cor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300", rotulo: "Devolução" },
  ocorrencia: { Icone: AlertTriangle, cor: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300", rotulo: "Ocorrência" },
  outros: { Icone: ArrowDownToLine, cor: "bg-muted text-muted-foreground", rotulo: "Outro" },
};

// Linha do tempo visual: eventos por dia, do mais novo para o mais antigo, com ícone e cor por tipo e filtro rápido (Entregas, Devoluções, Ocorrências).
export function LinhaDoTempo({ eventos, carregando = false }: { eventos: readonly EventoDoTempo[]; carregando?: boolean }) {
  const [filtro, setFiltro] = useState<FiltroTempo>("todos");
  const contagem = useMemo(() => contagemPorFiltro(eventos), [eventos]);
  const grupos = useMemo(() => agruparPorDia(filtrarEventos(eventos, filtro)), [eventos, filtro]);
  return (
    <div className="space-y-3">
      <div role="group" aria-label="Filtrar eventos" className="flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filtro === f}
            onClick={() => setFiltro(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${filtro === f ? "border-primary bg-primary text-primary-foreground" : "hover:bg-primary/10"}`}
          >
            {ROTULO_FILTRO[f]} <span className="tabular-nums opacity-80">({contagem[f]})</span>
          </button>
        ))}
      </div>
      {carregando ? <p role="status" className="text-sm text-muted-foreground">Carregando o histórico…</p>
        : grupos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum evento{filtro === "todos" ? "" : ` em “${ROTULO_FILTRO[filtro]}”`}.</p>
        : (
          <ol className="space-y-4" aria-label="Linha do tempo">
            {grupos.map((g) => (
              <li key={g.dia}>
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{formatarData(g.dia)}</h4>
                <ul className="relative space-y-3 border-l-2 border-border pl-5">
                  {g.eventos.map((e) => {
                    const { Icone, cor, rotulo } = ICONE[e.categoria];
                    return (
                      <li key={e.chave} className="relative">
                        <span className={`absolute -left-[2.05rem] grid size-7 place-items-center rounded-full ring-4 ring-background ${cor}`} title={rotulo}>
                          <Icone className="size-3.5" aria-hidden="true" />
                          <span className="sr-only">{rotulo}</span>
                        </span>
                        <p className="text-sm font-medium leading-snug">{e.hora && <span className="mr-1.5 tabular-nums text-muted-foreground">{e.hora} —</span>}{e.titulo}</p>
                        {e.detalhe && <p className="text-xs text-muted-foreground">{e.detalhe}</p>}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        )}
    </div>
  );
}
