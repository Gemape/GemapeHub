import { createFileRoute } from "@tanstack/react-router";
import { VeiculosCadastroModulo } from "@/components/modules/VeiculosCadastroModulo";

export const Route = createFileRoute("/_authenticated/cadastros/veiculos")({
  head: () => ({
    meta: [
      { title: "Cadastro de Veículos | Patrimônio GEMAPE" },
      {
        name: "description",
        content: "Gestão e cadastro de Veículos da frota.",
      },
    ],
  }),
  component: () => (
    <div className="space-y-5">
      <header>
        <p className="text-eyebrow">Cadastros</p>
        <h1 className="text-2xl font-bold">Cadastro de Veículos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Código automático, subcategoria de Cadastros &gt; Gerais, descrição e dados da frota.
        </p>
      </header>
      <VeiculosCadastroModulo />
    </div>
  ),
});
