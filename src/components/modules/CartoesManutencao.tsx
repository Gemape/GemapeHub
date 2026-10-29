import { AlertTriangle, CalendarClock, Wrench } from "lucide-react";
import { useState } from "react";

import { Cartao } from "@/components/modules/CartoesIndicadoresFrota";
import { Button } from "@/components/ui/button";
import type { IndicadoresDaManutencao } from "@/lib/manutencao-indicadores";

// Alto de Manutenção (decisão 319), no modelo da Frota: dois botões escolhem o grupo mostrado. "Manutenções" tem as preventivas e as corretivas registradas (quantidade e parte do
// total); "Indicadores" tem, das revisões do plano dos veículos, as realizadas no prazo, as não realizadas no prazo (cor e seta da faixa) e as previstas (quantidade).
const GRUPOS = [{ id: "manutencoes", rotulo: "Manutenções" }, { id: "indicadores", rotulo: "Indicadores" }] as const;

export function CartoesManutencao({ indicadores }: { indicadores: IndicadoresDaManutencao }) {
  const [grupo, setGrupo] = useState<(typeof GRUPOS)[number]["id"]>("manutencoes");
  return (
    <section className="space-y-3" aria-label="Indicadores de manutenção">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Grupo de cards">
        {GRUPOS.map((g) => (
          <Button key={g.id} type="button" size="sm" variant={grupo === g.id ? "default" : "outline"} aria-pressed={grupo === g.id} onClick={() => setGrupo(g.id)}>
            {g.rotulo}
          </Button>
        ))}
      </div>
      {grupo === "manutencoes" ? (
        <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Cartao titulo="Preventivas" valor={String(indicadores.preventivas.qtd)} icone={Wrench} indicador={indicadores.preventivas.indicador} />
          <Cartao titulo="Corretivas" valor={String(indicadores.corretivas.qtd)} icone={AlertTriangle} indicador={indicadores.corretivas.indicador} />
        </div>
      ) : (
        <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Cartao titulo="Realizadas no prazo" indicador={indicadores.noPrazo} />
          <Cartao titulo="Não realizadas no prazo" indicador={indicadores.naoRealizadas} />
          <Cartao titulo="Previstas" valor={String(indicadores.previstas.qtd)} icone={CalendarClock} indicador={indicadores.previstas.indicador} />
        </div>
      )}
    </section>
  );
}
