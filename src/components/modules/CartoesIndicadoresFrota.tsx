import { BarraDeFiltros } from "@/components/layout/BarraDeFiltros";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowDown, ArrowLeftRight, ArrowUp, Coins, Minus, type LucideIcon } from "lucide-react";

import type { Faixa } from "@/lib/faixas-desempenho";
import { LIMITE_REATIVO, noModoReativo, reais, type CustoPorKm, type IndicadorDaFrota, type IndicadoresDaFrota } from "@/lib/frota-indicadores";

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
  subtitulo,
  indicador,
  valor,
  icone,
  extra,
  alerta,
  classe = "",
  compacto = false,
}: {
  titulo: string;
  // Uma linha que explica como o indicador é calculado (decisão 342), logo abaixo do título.
  subtitulo?: string;
  indicador: IndicadorDaFrota;
  valor?: string;
  icone?: LucideIcon | undefined;
  extra?: ReactNode;
  // Aviso em vermelho no pé do card (decisão 344), para o gestor não deixar passar.
  alerta?: string;
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
          {subtitulo && <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{subtitulo}</p>}
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
          <p className={`text-xs text-muted-foreground ${compacto ? "line-clamp-2" : ""}`} title={compacto ? indicador.detalhe : undefined}>
            {indicador.detalhe}
          </p>
        )}
        {alerta && (
          <p role="alert" className="flex items-start gap-1 text-xs font-semibold text-red-700 dark:text-red-300">
            <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            {alerta}
          </p>
        )}
      </div>
    </div>
  );
}

// Alto da Frota (decisão 342): os sete cartões sempre à vista, sem alternar botões. Cada título diz de quem é o indicador (PCM, Técnicos ou Geral da frota) e o subtítulo explica como ele
// é calculado. `acoes` e `filtros` são o que a tela põe na linha de cima: as ações à esquerda e os filtros (subcategoria e busca) à direita, na barra padrão (decisão 339); `graficos` são os
// gráficos, que em tela larga ficam ao lado dos cartões, na mesma faixa, para cartões, gráficos e a lista caberem numa tela só.
export function CartoesIndicadoresFrota({ indicadores, cpk, custoPreventivo, acoes, filtros, graficos }: { indicadores: IndicadoresDaFrota; cpk: CustoPorKm; custoPreventivo: IndicadorDaFrota; acoes?: ReactNode; filtros?: ReactNode; graficos?: ReactNode }) {
  return (
    <section className="space-y-2" aria-label="Indicadores da frota">
      {(acoes || filtros) && (
        <div className="flex flex-wrap items-end gap-2">
          {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
          {filtros && <BarraDeFiltros>{filtros}</BarraDeFiltros>}
        </div>
      )}
      <div className="grid items-stretch gap-3 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Cartao
            titulo="Frota · Conformidade geral (SLA)"
            subtitulo="Tarefas no prazo ÷ tarefas atribuídas: preventivas, check lists e ocorrências."
            indicador={indicadores.conformidadeGeral}
            compacto
          />
          <Cartao
            titulo="Frota · Custo por km rodado (CPK)"
            subtitulo="(Abastecimento + manutenção) ÷ km rodados, em todo o histórico registrado."
            indicador={{ pct: null, faixa: null, detalhe: cpk.valor === null ? "Sem km rodados para calcular" : `${reais(cpk.abastecimento)} abast. + ${reais(cpk.manutencao)} manut. em ${cpk.km.toLocaleString("pt-BR")} km` }}
            valor={cpk.valor === null ? "—" : `${reais(cpk.valor)}/km`}
            icone={Coins}
            compacto
          />
          <Cartao
            titulo="Frota · Custo preventivo (meta 80%)"
            subtitulo="Gasto preventivo ÷ gasto total de manutenção. Referência 80/20."
            indicador={custoPreventivo}
            {...(noModoReativo(custoPreventivo.pct) ? { alerta: `Abaixo de ${LIMITE_REATIVO}%: modo reativo.` } : {})}
            compacto
          />
          <Cartao
            titulo="PCM · Índice de manutenções preventivas em dia"
            subtitulo="Preventivas não vencidas ÷ preventivas com registro."
            indicador={indicadores.manutencoes}
            compacto
          />
          <Cartao
            titulo="PCM · Índice de check lists realizados no prazo"
            subtitulo="Realizados no prazo ÷ os que já venceram (feitos + não feitos)."
            indicador={indicadores.checklistPcm}
            compacto
          />
          <Cartao
            titulo="PCM · Índice de ocorrências tratadas no prazo"
            subtitulo="Tratadas no prazo ÷ tratadas + vencidas sem tratativa."
            indicador={indicadores.ocorrencias}
            compacto
          />
          <Cartao
            titulo="Técnicos · Índice de check lists realizados no prazo"
            subtitulo="Realizados no prazo ÷ os que já venceram (feitos + não feitos)."
            indicador={indicadores.tecnicosNoPrazo}
            compacto
          />
          <Cartao
            titulo="Técnicos · Índice de check lists atrasados"
            subtitulo="Não feitos no prazo ÷ os que já venceram (o oposto do ao lado)."
            indicador={indicadores.tecnicosNaoRealizados}
            compacto
          />
        </div>
        {graficos}
      </div>
    </section>
  );
}
