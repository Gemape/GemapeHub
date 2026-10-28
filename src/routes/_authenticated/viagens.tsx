import { createFileRoute } from "@tanstack/react-router";

import { EyebrowDoCard } from "@/components/layout/EyebrowDoCard";
import { ViagensRelatorio } from "@/components/modules/ViagensRelatorio";
import { ViagensPainel } from "@/components/modules/ViagensPainel";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { abaDoModulo, tituloDaAba } from "@/lib/menu-parametros";

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
  // Emitente do relatório: quem está logado (nome informado no cadastro de acesso ou, sem ele, o e-mail).
  const { user } = Route.useRouteContext();
  const emitente = String((user.user_metadata as { nome?: unknown } | undefined)?.nome ?? user.email ?? "Usuário");

  return (
    <div className="space-y-5">
      <header>
        <EyebrowDoCard fallback="Módulo" />
        <h1 className="text-2xl font-bold">{tituloDaAba("viagem", aba)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Despesas em viagens e saídas externas dos técnicos, com os comprovantes.</p>
      </header>

      {/* As abas viraram submenus no menu lateral (decisão 43). */}
      <Tabs value={abaValida}>
        <TabsContent value="painel" className="mt-5">
          <ViagensPainel emitente={emitente} />
        </TabsContent>
        <TabsContent value="relatorio" className="mt-5">
          <ViagensRelatorio emitente={emitente} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
