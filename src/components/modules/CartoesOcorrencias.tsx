import { CircleAlert, CircleCheck, Clock, ListChecks, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { Cartao } from "@/components/modules/CartoesIndicadoresFrota";
import { Button } from "@/components/ui/button";
import type { IndicadorDaFrota } from "@/lib/frota-indicadores";
import type { StatusOcorrencia } from "@/lib/ocorrencias-veiculo";

export type FiltroOcorrencia = StatusOcorrencia | "todas";

// Alto de Ocorrências (decisão 320), no modelo da Frota: dois botões escolhem o grupo mostrado. "Ocorrências" tem os cards de abertas, em tratativa, encerradas e todas (quantidade
// e parte do total); clicar num card filtra a lista por ele. "Indicadores" tem as ocorrências realizadas no prazo e as não realizadas no prazo (cor e seta da faixa).
const GRUPOS = [{ id: "ocorrencias", rotulo: "Ocorrências" }, { id: "indicadores", rotulo: "Indicadores" }] as const;

const CARTOES: { filtro: FiltroOcorrencia; titulo: string; Icone: LucideIcon; ajuda: string }[] = [
  { filtro: "Aberta", titulo: "Abertas", Icone: CircleAlert, ajuda: "tratativa ainda não iniciada" },
  { filtro: "Em tratativa", titulo: "Em tratativa", Icone: Clock, ajuda: "tratativa em andamento" },
  { filtro: "Encerrada", titulo: "Encerradas", Icone: CircleCheck, ajuda: "tratativa concluída" },
  { filtro: "todas", titulo: "Todas", Icone: ListChecks, ajuda: "todas as ocorrências registradas" },
];

export function CartoesOcorrencias({ contagem, filtro, aoFiltrar, indicadores }: {
  contagem: Record<StatusOcorrencia, number>;
  filtro: FiltroOcorrencia;
  aoFiltrar: (f: FiltroOcorrencia) => void;
  indicadores: { noPrazo: IndicadorDaFrota; naoRealizadas: IndicadorDaFrota };
}) {
  const [grupo, setGrupo] = useState<(typeof GRUPOS)[number]["id"]>("ocorrencias");
  const total = contagem.Aberta + contagem["Em tratativa"] + contagem.Encerrada;
  return (
    <section className="space-y-3" aria-label="Indicadores de ocorrências">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Grupo de cards">
        {GRUPOS.map((g) => (
          <Button key={g.id} type="button" size="sm" variant={grupo === g.id ? "default" : "outline"} aria-pressed={grupo === g.id} onClick={() => setGrupo(g.id)}>
            {g.rotulo}
          </Button>
        ))}
      </div>
      {grupo === "ocorrencias" ? (
        <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CARTOES.map(({ filtro: f, titulo, Icone, ajuda }) => {
            const qtd = f === "todas" ? total : contagem[f];
            const indicador: IndicadorDaFrota = { pct: total ? Math.round((qtd / total) * 1000) / 10 : null, faixa: null, detalhe: ajuda };
            return (
              <button
                key={f} type="button" aria-pressed={filtro === f} title={f === "todas" ? "Mostrar todas na lista" : `Mostrar só as ${titulo.toLowerCase()} na lista`}
                onClick={() => aoFiltrar(filtro === f ? "todas" : f)}
                className={`block h-full rounded-2xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${filtro === f ? "ring-2 ring-primary" : ""}`}
              >
                <Cartao titulo={titulo} valor={String(qtd)} icone={Icone} indicador={indicador} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Cartao titulo="Realizadas no prazo" indicador={indicadores.noPrazo} />
          <Cartao titulo="Não realizadas no prazo" indicador={indicadores.naoRealizadas} />
        </div>
      )}
    </section>
  );
}
