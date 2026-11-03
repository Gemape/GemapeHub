import { useState } from "react";

import { CartaoDeMotivos } from "@/components/parametros/CartaoDeMotivos";
import { HabilitarEmpregadosUniforme } from "@/components/parametros/HabilitarEmpregadosUniforme";
import { lerAreasUniforme, MAX_AREAS_UNIFORME, salvarAreasUniforme } from "@/lib/empregados-uniforme";

// Parâmetros Específicos dos Uniformes: as áreas da oficina e os empregados habilitados a entregar e receber uniformes (mesma lógica do EPI, decisão 357, com listas próprias).
export function ParametrosUniforme() {
  const [areas, setAreas] = useState(lerAreasUniforme);
  return (
    <section className="space-y-3" aria-labelledby="parametros-uniforme">
      <div>
        <h2 id="parametros-uniforme" className="text-lg font-semibold">
          Parâmetros dos uniformes
        </h2>
        <p className="text-sm text-muted-foreground">Áreas da oficina e empregados habilitados para entregar e receber uniformes.</p>
      </div>
      <div className="panel max-w-4xl space-y-4 p-4">
        <div className="space-y-3 rounded-lg border p-3">
          <CartaoDeMotivos
            id="areas-oficina-uniforme"
            titulo="Áreas da oficina"
            ajuda="As áreas de atuação que aparecem ao lado do nome de cada empregado habilitado. Dá para acrescentar novas; uma área em uso por um habilitado só sai depois de mudar a área dele."
            inicial={areas}
            singular="área"
            max={MAX_AREAS_UNIFORME}
            salvos="Áreas da oficina salvas."
            salvar={(lista) => {
              const gravadas = salvarAreasUniforme(lista);
              setAreas(gravadas);
              return gravadas;
            }}
          />
          <HabilitarEmpregadosUniforme areas={areas} />
        </div>
      </div>
    </section>
  );
}
