import { CalendarClock } from "lucide-react";
import type { ReactNode } from "react";

import { Cartao } from "@/components/modules/CartoesIndicadoresFrota";
import type { IndicadoresDaManutencao } from "@/lib/manutencao-indicadores";

// Alto de Manutenção (decisão 319), no modelo dos cards da Frota (decisão 404): os indicadores das revisões do plano dos veículos (realizadas no prazo, não realizadas no prazo e previstas),
// cada um com a fórmula logo abaixo do título e a cor e a seta da faixa. Em tela larga os gráficos ficam ao lado dos cards, na mesma faixa, como na Frota. As manutenções preventivas e
// corretivas são botões da lista, no módulo.
export function CartoesManutencao({ indicadores, graficos, itens = "veículos" }: { indicadores: IndicadoresDaManutencao; graficos?: ReactNode; itens?: string }) {
  return (
    <section className="grid items-stretch gap-3 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" aria-label="Indicadores de manutenção">
      <div className="grid auto-rows-fr gap-3 sm:grid-cols-3">
        <Cartao
          titulo="Revisões realizadas no prazo"
          subtitulo="Revisões do plano não vencidas ÷ revisões com registro."
          indicador={indicadores.noPrazo}
          compacto
        />
        <Cartao
          titulo="Revisões não realizadas no prazo"
          subtitulo="Revisões vencidas ÷ revisões com registro (o oposto do ao lado)."
          indicador={indicadores.naoRealizadas}
          compacto
        />
        <Cartao
          titulo="Revisões previstas"
          subtitulo={`Todas as revisões do plano dos ${itens}.`}
          valor={String(indicadores.previstas.qtd)}
          icone={CalendarClock}
          compacto
          indicador={indicadores.previstas.indicador}
        />
      </div>
      {graficos}
    </section>
  );
}
