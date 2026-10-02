import { createFileRoute } from "@tanstack/react-router";

import { CadastroEpi } from "@/components/modules/CadastroEpi";

export const Route = createFileRoute("/_authenticated/epi-cadastrar")({
  head: () => ({
    meta: [
      { title: "Cadastrar EPI | Patrimônio GEMAPE" },
      { name: "description", content: "Catálogo de EPIs por descrição e tamanho." },
    ],
  }),
  component: () => (
    <div className="space-y-5">
      <header>
        <p className="text-eyebrow">EPI</p>
        <h1 className="text-2xl font-bold">Cadastrar EPI</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Demonstração: um cadastro por descrição e tamanho, com código automático e estoque mínimo.
          O catálogo é de todas as empresas; o estoque de cada uma fica separado. No banco real
          continua o cadastro antigo até a Fase 2.
        </p>
      </header>
      <CadastroEpi />
    </div>
  ),
});
