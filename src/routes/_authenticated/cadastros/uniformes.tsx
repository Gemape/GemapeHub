import { createFileRoute } from "@tanstack/react-router";
import { CadastroProduto } from "@/components/modules/CadastroProduto";

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
          Código automático, subcategoria de Cadastros &gt; Gerais e descrição do produto.
        </p>
      </header>
      <CadastroProduto tabela="uniformes" />
    </div>
  ),
});
