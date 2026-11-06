import { createFileRoute } from "@tanstack/react-router";

import { EyebrowDoCard } from "@/components/layout/EyebrowDoCard";
import { AbastecimentoEquipamentoModulo } from "@/components/modules/equipamento/AbastecimentoEquipamentoModulo";
import { ChecklistEquipamentoModulo } from "@/components/modules/equipamento/ChecklistEquipamentoModulo";
import { IndicadoresEquipamentoModulo } from "@/components/modules/equipamento/IndicadoresEquipamentoModulo";
import { InventarioEquipamentoModulo } from "@/components/modules/equipamento/InventarioEquipamentoModulo";
import { ManutencaoEquipamentoModulo } from "@/components/modules/equipamento/ManutencaoEquipamentoModulo";
import { OcorrenciasEquipamentoModulo } from "@/components/modules/equipamento/OcorrenciasEquipamentoModulo";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { abaDoModulo, descricaoDaAba, tituloDaAba } from "@/lib/menu-parametros";
import { MODO_DEMO } from "@/lib/modo-demo";

export const Route = createFileRoute("/_authenticated/equipamentos")({
  validateSearch: (search: Record<string, unknown>): { aba?: string } => (typeof search["aba"] === "string" ? { aba: search["aba"] } : {}),
  head: () => ({ meta: [{ title: "Equipamentos | Patrimônio GEMAPE" }] }),
  component: PaginaEquipamentosModulo,
});

// Módulo Equipamentos, na mesma lógica de Veículos: inventário, abastecimento, manutenção, ocorrências e os dois check lists (manutenção e vistoria).
// O cadastro e os parâmetros ficam em Parâmetros > Equipamentos. As abas viram submenus no menu e nos cartões da tela inicial.
function PaginaEquipamentosModulo() {
  const { aba } = Route.useSearch();
  const abaValida = abaDoModulo("equipamento", aba);
  return (
    <div className="space-y-5">
      <header>
        <EyebrowDoCard fallback="Módulo" />
        <h1 className="text-2xl font-bold">{tituloDaAba("equipamento", aba)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{descricaoDaAba("equipamento", aba, "")}</p>
      </header>
      {MODO_DEMO ? (
        <Tabs value={abaValida}>
          <TabsContent value="inventario" className="mt-5"><InventarioEquipamentoModulo /></TabsContent>
          <TabsContent value="indicadores" className="mt-5"><IndicadoresEquipamentoModulo /></TabsContent>
          <TabsContent value="abastecimento" className="mt-5"><AbastecimentoEquipamentoModulo /></TabsContent>
          <TabsContent value="manutencao" className="mt-5"><ManutencaoEquipamentoModulo /></TabsContent>
          <TabsContent value="ocorrencias" className="mt-5"><OcorrenciasEquipamentoModulo /></TabsContent>
          <TabsContent value="checklist-manutencao" className="mt-5"><ChecklistEquipamentoModulo finalidade="manutencao" /></TabsContent>
          <TabsContent value="checklist-vistoria" className="mt-5"><ChecklistEquipamentoModulo finalidade="vistoria" /></TabsContent>
        </Tabs>
      ) : (
        <p className="text-sm text-muted-foreground">O módulo Equipamentos estará disponível após a Fase 2 (banco real).</p>
      )}
    </div>
  );
}
