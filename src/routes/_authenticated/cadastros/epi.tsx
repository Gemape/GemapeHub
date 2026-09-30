import { createFileRoute } from "@tanstack/react-router";
import { CadastroEpi } from "@/components/modules/CadastroEpi";

export const Route = createFileRoute("/_authenticated/cadastros/epi")({
  head: () => ({
    meta: [
      { title: "Cadastro de EPIs | Patrimônio GEMAPE" },
      {
        name: "description",
        content: "Gestão e cadastro de Equipamentos de Proteção Individual.",
      },
    ],
  }),
  component: () => (
    <div className="space-y-5">
      <header>
        <p className="text-eyebrow">Cadastros</p>
        <h1 className="text-2xl font-bold">Cadastro de EPIs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Código automático, subcategoria de Cadastros &gt; Gerais, descrição e estoque mínimo.
        </p>
      </header>
      <CadastroEpi />
    </div>
  ),
});
