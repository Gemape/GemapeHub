import { createFileRoute } from "@tanstack/react-router";

import { EyebrowDoCard } from "@/components/layout/EyebrowDoCard";
import { CadastroUniforme } from "@/components/modules/CadastroUniforme";

export const Route = createFileRoute("/_authenticated/uniformes-cadastrar")({
  head: () => ({
    meta: [
      { title: "Cadastrar Uniforme | Patrimônio GEMAPE" },
      { name: "description", content: "Catálogo de uniformes por descrição e tamanho." },
    ],
  }),
  component: () => (
    <div className="space-y-5">
      <header>
        <EyebrowDoCard fallback="Parâmetros" />
        <h1 className="text-2xl font-bold">Cadastrar Uniforme</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Demonstração: um cadastro por descrição e tamanho, com código automático e estoque mínimo.
          O catálogo é de todas as empresas; o estoque de cada uma fica separado. No banco real
          continua o cadastro antigo até a Fase 2.
        </p>
      </header>
      <CadastroUniforme />
    </div>
  ),
});
