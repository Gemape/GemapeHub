import { createFileRoute } from "@tanstack/react-router";
import { EyebrowDoCard } from "@/components/layout/EyebrowDoCard";
import { ItensModulo } from "@/components/modules/ItensModulo";

export const Route = createFileRoute("/_authenticated/cadastros/ferramentas")({
  head: () => ({
    meta: [
      { title: "Cadastrar Ferramenta | Patrimônio GEMAPE" },
      {
        name: "description",
        content: "Gestão e cadastro de Ferramentas.",
      },
    ],
  }),
  component: () => (
    <div className="space-y-5">
      <header>
        <EyebrowDoCard fallback="Parâmetros" />
        <h1 className="text-2xl font-bold">Cadastrar Ferramenta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastro das ferramentas por grupo, modelo e marca, com estoque mínimo.
        </p>
      </header>
      <ItensModulo modulo="ferramenta" />
    </div>
  ),
});
