import { createFileRoute } from "@tanstack/react-router";

import { PaginaModulo } from "@/components/modules/PaginaModulo";

export const Route = createFileRoute("/_authenticated/ferramentas")({
  head: () => ({
    meta: [
      { title: "Ferramentas | Patrimônio GEMAPE" },
      {
        name: "description",
        content:
          "Cadastro de ferramentas com número de série, vistorias inicial, periódica, reposição e final, além do registro de ocorrências.",
      },
      { property: "og:title", content: "Ferramentas | Patrimônio GEMAPE" },
      { property: "og:description", content: "Controle de ferramentas do grupo GEMAPE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PaginaModulo
      modulo="ferramenta"
      titulo="Ferramentas"
      descricao="Número de série, vistorias (inicial, periódica, reposição e final), ocorrências e histórico de quem estava com cada ferramenta."
    />
  ),
});
