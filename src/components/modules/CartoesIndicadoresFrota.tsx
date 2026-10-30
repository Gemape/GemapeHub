import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowLeftRight, ArrowUp, Minus, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Faixa } from "@/lib/faixas-desempenho";
import type { IndicadorDaFrota, IndicadoresDaFrota } from "@/lib/frota-indicadores";

const porcento = (n: number | null) =>
  n === null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

// Cor e seta de cada faixa (decisão 317): vermelho com seta para baixo, amarelo com setas nos dois sentidos (<=>) e verde com seta para cima. A barra de baixo mostra o percentual.
const ESTILO: Record<
  Faixa,
  {
    cartao: string;
    texto: string;
    seta: string;
    barra: string;
    Icone: typeof ArrowUp;
    rotulo: string;
  }
> = {
  verde: {
    cartao:
      "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:border-emerald-800 dark:from-emerald-950/50 dark:via-transparent dark:to-emerald-950/30",
    texto: "text-emerald-700 dark:text-emerald-200",
    seta: "bg-emerald-600 text-white shadow-emerald-600/30",
    barra: "bg-emerald-500",
    Icone: ArrowUp,
    rotulo: "Verde",
  },
  amarelo: {
    cartao:
      "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50 dark:border-amber-800 dark:from-amber-950/50 dark:via-transparent dark:to-amber-950/30",
    texto: "text-amber-700 dark:text-amber-200",
    seta: "bg-amber-500 text-white shadow-amber-500/30",
    barra: "bg-amber-400",
    Icone: ArrowLeftRight,
    rotulo: "Amarelo",
  },
  vermelho: {
    cartao:
      "border-red-200 bg-gradient-to-br from-red-50 via-white to-red-50 dark:border-red-800 dark:from-red-950/50 dark:via-transparent dark:to-red-950/30",
    texto: "text-red-700 dark:text-red-200",
    seta: "bg-red-600 text-white shadow-red-600/30",
    barra: "bg-red-500",
    Icone: ArrowDown,
    rotulo: "Vermelho",
  },
};

// O card padrão de todos os indicadores do sistema (decisão 324). Com `valor`, o número grande é ele (uma contagem, em vez do percentual) e o card é neutro, com o `icone` dado; a barra
// segue o percentual e some quando não há percentual nem faixa. `extra` é um complemento ao lado do título (por exemplo, o ícone de explicação) e `classe` ajusta a moldura.
export function Cartao({
  titulo,
  indicador,
  valor,
  icone,
  extra,
  classe = "",
  compacto = false,
}: {
  titulo: string;
  indicador: IndicadorDaFrota;
  valor?: string;
  icone?: LucideIcon | undefined;
  extra?: ReactNode;
  classe?: string;
  // Telas que mostram muitos indicadores de uma vez (Check list): menos folga, número e ícone menores, detalhe em uma linha.
  compacto?: boolean;
}) {
  const estilo = indicador.faixa ? ESTILO[indicador.faixa] : null;
  const Icone = estilo?.Icone ?? icone ?? Minus;
  const largura = indicador.pct === null ? 0 : Math.max(0, Math.min(100, indicador.pct));
  return (
    <div
      className={`${compacto ? "flex h-full flex-col justify-between gap-1.5 rounded-2xl border p-2.5 shadow-sm transition-shadow hover:shadow-md" : "flex h-full flex-col justify-between gap-3 rounded-2xl border p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4 [@media(max-height:820px)]:sm:p-3"} ${estilo?.cartao ?? "border-border bg-card"} ${classe}`}
      data-faixa={indicador.faixa ?? "sem-dado"}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-eyebrow">{titulo}</p>
            {extra}
          </div>
          <p
            className={`${compacto ? "mt-1 break-words font-display text-xl font-bold leading-none tracking-tight" : "mt-1.5 break-words font-display text-2xl font-bold leading-none tracking-tight sm:text-3xl [@media(max-height:820px)]:sm:text-2xl"} ${estilo?.texto ?? (valor ? "text-foreground" : "text-muted-foreground")}`}
          >
            {valor ?? porcento(indicador.pct)}
          </p>
        </div>
        <span
          className={`${compacto ? "flex size-8 shrink-0 items-center justify-center rounded-full shadow-md ring-4" : "flex size-8 shrink-0 items-center justify-center rounded-full shadow-md ring-4 sm:size-10"} ring-white/70 dark:ring-white/10 ${estilo?.seta ?? (valor ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground shadow-none")}`}
          title={estilo ? `Faixa ${estilo.rotulo.toLowerCase()}` : "Sem dados"}
        >
          <Icone className="size-5" aria-hidden="true" />
          <span className="sr-only">
            {estilo ? `Faixa ${estilo.rotulo.toLowerCase()}` : "Sem dados"}
          </span>
        </span>
      </div>
      <div className="space-y-1.5">
        {(indicador.pct !== null || !valor) && (
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15"
            role="presentation"
          >
            <div
              className={`h-full rounded-full ${estilo?.barra ?? (valor ? "bg-primary" : "bg-transparent")}`}
              style={{ width: `${largura}%` }}
            />
          </div>
        )}
        {indicador.detalhe && (
          <p className={`text-xs text-muted-foreground ${compacto ? "truncate" : ""}`} title={compacto ? indicador.detalhe : undefined}>
            {indicador.detalhe}
          </p>
        )}
      </div>
    </div>
  );
}

// Alto da Frota: dois botões escolhem o grupo de indicadores mostrado, o do PCM (manutenções, check list do PCM, ocorrências e conformidade geral) ou o dos técnicos
// (só check list), para a tela ficar mais limpa. Cada card tem percentual, barra, cor da faixa e a seta da faixa.
const GRUPOS = [
  { id: "pcm", rotulo: "Indicadores do PCM" },
  { id: "tecnicos", rotulo: "Indicadores dos técnicos · check list" },
] as const;

export function CartoesIndicadoresFrota({ indicadores }: { indicadores: IndicadoresDaFrota }) {
  const [grupo, setGrupo] = useState<(typeof GRUPOS)[number]["id"]>("pcm");
  return (
    <section className="space-y-3" aria-label="Indicadores da frota">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Grupo de indicadores">
        {GRUPOS.map((g) => (
          <Button
            key={g.id}
            type="button"
            size="sm"
            variant={grupo === g.id ? "default" : "outline"}
            aria-pressed={grupo === g.id}
            onClick={() => setGrupo(g.id)}
          >
            {g.rotulo}
          </Button>
        ))}
      </div>
      {grupo === "pcm" ? (
        <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Cartao titulo="Manutenções" indicador={indicadores.manutencoes} />
          <Cartao titulo="Check list PCM" indicador={indicadores.checklistPcm} />
          <Cartao titulo="Ocorrências" indicador={indicadores.ocorrencias} />
          <Cartao titulo="Conformidade geral" indicador={indicadores.conformidadeGeral} />
        </div>
      ) : (
        <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Cartao titulo="Técnicos: no prazo" indicador={indicadores.tecnicosNoPrazo} />
          <Cartao titulo="Técnicos: não realizados" indicador={indicadores.tecnicosNaoRealizados} />
        </div>
      )}
    </section>
  );
}
