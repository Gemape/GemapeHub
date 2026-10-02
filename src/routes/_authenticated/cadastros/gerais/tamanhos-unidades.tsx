import { createFileRoute } from "@tanstack/react-router";

import { AssociarTamanhosPainel } from "@/components/parametros/AssociarTamanhosPainel";
import { TamanhosMedidasPainel } from "@/components/parametros/TamanhosMedidasPainel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ABAS = ["cadastro", "associar"] as const;
type Aba = (typeof ABAS)[number];

export const Route = createFileRoute("/_authenticated/cadastros/gerais/tamanhos-unidades")({
  validateSearch: (search: Record<string, unknown>): { aba?: Aba } =>
    ABAS.includes(search["aba"] as Aba) ? { aba: search["aba"] as Aba } : {},
  head: () => ({ meta: [{ title: "Tamanho e medidas de produto | Patrimônio GEMAPE" }] }),
  component: TamanhoEMedidas,
});

const aba = "data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap";

// Um menu só (decisão 38): o cadastro dos tamanhos e medidas e a associação ao produto são abas.
// As duas ficam montadas (forceMount) para não perder a categoria escolhida nem uma confirmação em andamento ao trocar de aba.
function TamanhoEMedidas() {
  const { aba: pedida } = Route.useSearch();
  const inicial: Aba = pedida ?? "cadastro";
  return (
    <Tabs defaultValue={inicial} key={inicial} className="space-y-5">
      <TabsList>
        <TabsTrigger value="cadastro" className={aba}>Cadastro</TabsTrigger>
        <TabsTrigger value="associar" className={aba}>Associar ao produto</TabsTrigger>
      </TabsList>
      <TabsContent value="cadastro" forceMount className="data-[state=inactive]:hidden"><TamanhosMedidasPainel /></TabsContent>
      <TabsContent value="associar" forceMount className="data-[state=inactive]:hidden"><AssociarTamanhosPainel /></TabsContent>
    </Tabs>
  );
}
