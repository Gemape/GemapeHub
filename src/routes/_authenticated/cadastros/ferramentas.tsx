import { createFileRoute } from "@tanstack/react-router";
import { ItensModulo } from "@/components/modules/ItensModulo";

export const Route = createFileRoute("/_authenticated/cadastros/ferramentas")({
  head: () => ({
    meta: [
      { title: "Cadastro de Ferramentas | Patrimônio GEMAPE" },
      {
        name: "description",
        content: "Gestão e cadastro de Ferramentas.",
      },
    ],
  }),
  component: () => (
    <div className="space-y-5">
      <header>
        <p className="text-eyebrow">Cadastros</p>
        <h1 className="text-2xl font-bold">Cadastro de Ferramentas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerenciamento de ferramentas com marca, modelo e número de série.
        </p>
      </header>
      <ItensModulo modulo="ferramenta" />
    </div>
  ),
});
