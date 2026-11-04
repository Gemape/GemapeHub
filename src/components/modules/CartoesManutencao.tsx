import { CalendarClock } from "lucide-react";

import { Cartao } from "@/components/modules/CartoesIndicadoresFrota";
import type { IndicadoresDaManutencao } from "@/lib/manutencao-indicadores";

// Alto de Manutenção (decisão 319), no modelo dos cards da Frota: só os indicadores das revisões do plano dos veículos, as realizadas no prazo e as não realizadas no prazo
// (com a cor e a seta da faixa) e as previstas (quantidade). As manutenções preventivas e corretivas são botões da lista, no módulo.
export function CartoesManutencao({ indicadores }: { indicadores: IndicadoresDaManutencao }) {
  return (
    <section
      // Cards de largura limitada, alinhados à esquerda: não esticam a tela inteira em monitor largo.
      className="grid justify-start gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(15rem,100%),18rem))]"
      aria-label="Indicadores de manutenção"
    >
      <Cartao titulo="Realizadas no prazo" indicador={indicadores.noPrazo} compacto />
      <Cartao titulo="Não realizadas no prazo" indicador={indicadores.naoRealizadas} compacto />
      <Cartao
        titulo="Previstas"
        valor={String(indicadores.previstas.qtd)}
        icone={CalendarClock}
        compacto
        indicador={indicadores.previstas.indicador}
      />
    </section>
  );
}
