import { createFileRoute } from "@tanstack/react-router";

import { ViagensPainel } from "@/components/modules/ViagensPainel";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { abaDoModulo } from "@/lib/menu-parametros";

export const Route = createFileRoute("/_authenticated/viagens")({
  validateSearch: (search: Record<string, unknown>): { aba?: string } =>
    typeof search["aba"] === "string" ? { aba: search["aba"] } : {},
  head: () => ({
    meta: [
      { title: "Viagens | Patrimônio GEMAPE" },
      { name: "description", content: "Despesas de viagem e saídas externas: questionários, indicadores e relatório." },
    ],
  }),
  component: PaginaViagens,
});

function PaginaViagens() {
  const { aba } = Route.useSearch();
  const abaValida = abaDoModulo("viagem", aba);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-eyebrow">Módulo</p>
        <h1 className="text-2xl font-bold">Viagens</h1>
        <p className="mt-1 text-sm text-muted-foreground">Despesas em viagens e saídas externas dos técnicos, com os comprovantes.</p>
      </header>

      {/* As abas viraram submenus no menu lateral (decisão 43). */}
      <Tabs value={abaValida}>
        <TabsContent value="painel" className="mt-5">
          <ViagensPainel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
