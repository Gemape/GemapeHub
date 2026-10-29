import { Cartao } from "@/components/modules/CartoesIndicadoresFrota";
import type { IndicadorDaFrota } from "@/lib/frota-indicadores";

// Alto de Ocorrências (decisões 320 e 321), no modelo dos cards da Frota: só os indicadores, as ocorrências realizadas no prazo e as não realizadas no prazo (cor e seta da
// faixa). Abertas, em tratativa, encerradas e todas são botões da lista, no módulo.
export function CartoesOcorrencias({ indicadores }: { indicadores: { noPrazo: IndicadorDaFrota; naoRealizadas: IndicadorDaFrota } }) {
  return (
    <section className="grid auto-rows-fr gap-3 sm:grid-cols-2" aria-label="Indicadores de ocorrências">
      <Cartao titulo="Realizadas no prazo" indicador={indicadores.noPrazo} />
      <Cartao titulo="Não realizadas no prazo" indicador={indicadores.naoRealizadas} />
    </section>
  );
}
