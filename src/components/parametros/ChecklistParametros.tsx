import { AssociarChecklistVeiculo } from "@/components/parametros/AssociarChecklistVeiculo";
import { ChecklistVeiculoLista } from "@/components/parametros/VeiculosListasParametros";

// Parâmetros > Veículos > Check list (decisões 113 e 119): numa só página, primeiro os itens do check list, separados por
// tipo de veículo, e depois a associação deles a cada veículo (decisão 148).
export function ChecklistParametros() {
  return (
    <div className="space-y-10">
      <header>
        <p className="text-eyebrow">Parâmetros</p>
        <h1 className="text-2xl font-bold">Check list</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Os itens do check list, separados por tipo de veículo, e a associação deles a cada veículo, na mesma página: primeiro os itens, depois a associação aos veículos.
        </p>
      </header>
      <ChecklistVeiculoLista secao />
      <AssociarChecklistVeiculo secao />
    </div>
  );
}
