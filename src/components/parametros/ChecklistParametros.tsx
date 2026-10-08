import { AssociarChecklistVeiculo } from "@/components/parametros/AssociarChecklistVeiculo";
import { ChecklistVeiculoLista } from "@/components/parametros/VeiculosListasParametros";

// Parâmetros > Veículos > Check list (decisões 113 e 119): numa só página, primeiro a associação dos itens a cada
// veículo e depois os itens do check list separados por tipo de veículo.
export function ChecklistParametros() {
  return (
    <div className="space-y-10">
      <header>
        <p className="text-eyebrow">Parâmetros &gt; Veículos</p>
        <h1 className="text-2xl font-bold">Check list</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A associação dos itens a cada veículo e os itens do check list, separados por tipo de veículo, na mesma página: primeiro a associação aos veículos, depois os itens.
        </p>
      </header>
      <AssociarChecklistVeiculo secao />
      <ChecklistVeiculoLista secao />
    </div>
  );
}
