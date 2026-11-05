import { GradeDeCartoes } from "@/components/GradeDeCartoes";
import { Cartao } from "@/components/modules/CartoesIndicadoresFrota";
import type { IndicadorDaFrota } from "@/lib/frota-indicadores";

// Alto de Ocorrências (decisões 320 e 321), no modelo dos cards da Frota: só os indicadores, as ocorrências tratadas no prazo e as não tratadas (cor e seta da
// faixa). Abertas, em tratativa, encerradas e todas são botões da lista, no módulo.
export function CartoesOcorrencias({
  indicadores,
}: {
  indicadores: { noPrazo: IndicadorDaFrota; naoTratadas: IndicadorDaFrota };
}) {
  return (
    <GradeDeCartoes colunas={4} rotulo="Indicadores de ocorrências">
      <Cartao titulo="Tratadas no prazo" subtitulo="Tratadas no prazo ÷ tratadas + vencidas sem tratativa." indicador={indicadores.noPrazo} compacto />
      <Cartao titulo="Não tratadas" subtitulo="Vencidas sem tratativa ÷ tratadas + vencidas sem tratativa." indicador={indicadores.naoTratadas} compacto />
    </GradeDeCartoes>
  );
}
