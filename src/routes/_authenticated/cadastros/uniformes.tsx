import { createFileRoute } from "@tanstack/react-router";
import { ItensModulo } from "@/components/modules/ItensModulo";

export const Route = createFileRoute("/_authenticated/cadastros/uniformes")({
  head: () => ({
    meta: [
      { title: "Cadastro de Uniformes | Patrimônio GEMAPE" },
      {
        name: "description",
        content: "Gestão e cadastro de Uniformes.",
      },
    ],
  }),
  component: () => (
    <div className="space-y-5">
      <header>
        <p className="text-eyebrow">Cadastros</p>
        <h1 className="text-2xl font-bold">Cadastro de Uniformes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerenciamento de uniformes por categoria, tamanho e fornecedor.
        </p>
      </header>
      <ItensModulo modulo="uniforme" />
    </div>
  ),
});
