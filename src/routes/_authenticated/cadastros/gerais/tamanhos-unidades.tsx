import { createFileRoute } from "@tanstack/react-router";

import { AssociarTamanhosPainel } from "@/components/parametros/AssociarTamanhosPainel";
import { TamanhosMedidasPainel } from "@/components/parametros/TamanhosMedidasPainel";
import { Tabs, TabsContent } from "@/components/ui/tabs";

const ABAS = ["cadastro", "associar"] as const;
type Aba = (typeof ABAS)[number];
const DE = ["epi", "uniformes", "ferramentas"] as const; // menu de onde a pessoa veio (decisão 86)
type De = (typeof DE)[number];

export const Route = createFileRoute("/_authenticated/cadastros/gerais/tamanhos-unidades")({
  validateSearch: (search: Record<string, unknown>): { aba?: Aba; de?: De } => ({
    ...(ABAS.includes(search["aba"] as Aba) ? { aba: search["aba"] as Aba } : {}),
    ...(DE.includes(search["de"] as De) ? { de: search["de"] as De } : {}),
  }),
  head: () => ({ meta: [{ title: "Tamanho e medidas de produto | Patrimônio GEMAPE" }] }),
  component: TamanhoEMedidas,
});

// Um menu só (decisão 38): o cadastro dos tamanhos e medidas e a associação ao produto são submenus no menu lateral (decisão 43).
// As duas ficam montadas (forceMount) para não perder a categoria escolhida nem uma confirmação em andamento ao trocar de aba.
function TamanhoEMedidas() {
  const { aba: pedida } = Route.useSearch();
  const inicial: Aba = pedida ?? "cadastro";
  return (
    <Tabs value={inicial} className="space-y-5">
      <TabsContent value="cadastro" forceMount className="data-[state=inactive]:hidden"><TamanhosMedidasPainel /></TabsContent>
      <TabsContent value="associar" forceMount className="data-[state=inactive]:hidden"><AssociarTamanhosPainel /></TabsContent>
    </Tabs>
  );
}
