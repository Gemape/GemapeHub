import { AcoesManutencaoVeiculoLista } from "@/components/parametros/VeiculosListasParametros";
import { PlanoManutencaoVeiculo } from "@/components/parametros/PlanoManutencaoVeiculo";

// Parâmetros > Veículos > Manutenção (decisão 112): numa só página, as ações de manutenção (grupos e
// subitens) e o plano de manutenções de cada veículo, que usa essas ações.
export function ManutencaoParametros() {
  return (
    <div className="space-y-10">
      <header>
        <p className="text-eyebrow">Parâmetros &gt; Veículos</p>
        <h1 className="text-2xl font-bold">Manutenção</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Permite revisar o painel de nome da rotina de manutenção ao qual está diretamente relacionado, e redefinir seus itens e organização. As modificações selecionadas não poderão ser desfeitas.
        </p>
      </header>
      <AcoesManutencaoVeiculoLista secao />
      <PlanoManutencaoVeiculo secao />
    </div>
  );
}
