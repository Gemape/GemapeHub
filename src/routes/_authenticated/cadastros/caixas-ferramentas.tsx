import { createFileRoute } from "@tanstack/react-router";
import { EyebrowDoCard } from "@/components/layout/EyebrowDoCard";
import { CaixasFerramentasModulo } from "@/components/modules/CaixasFerramentasModulo";

export const Route = createFileRoute("/_authenticated/cadastros/caixas-ferramentas")({
  head: () => ({
    meta: [
      { title: "Caixas de Ferramentas | Patrimônio GEMAPE" },
      {
        name: "description",
        content: "Gestão e cadastro de Caixas de Ferramentas e seus itens vinculados.",
      },
    ],
  }),
  component: () => (
    <div className="space-y-5">
      <header>
        <EyebrowDoCard fallback="Cadastros" />
        <h1 className="text-2xl font-bold">Caixas de Ferramentas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerenciamento de kits e caixas de ferramentas com vinculação individual de itens.
        </p>
      </header>
      <CaixasFerramentasModulo />
    </div>
  ),
});
