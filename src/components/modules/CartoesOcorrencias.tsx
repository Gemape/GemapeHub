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
    <section
      // Cards de largura limitada, alinhados à esquerda: não esticam a tela inteira em monitor largo.
      className="grid justify-start gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(15rem,100%),18rem))]"
      aria-label="Indicadores de ocorrências"
    >
      <Cartao titulo="Tratadas no prazo" indicador={indicadores.noPrazo} compacto />
      <Cartao titulo="Não tratadas" indicador={indicadores.naoTratadas} compacto />
    </section>
  );
}
