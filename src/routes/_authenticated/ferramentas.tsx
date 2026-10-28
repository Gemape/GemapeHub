import { createFileRoute } from "@tanstack/react-router";

import { PaginaModulo } from "@/components/modules/PaginaModulo";

export const Route = createFileRoute("/_authenticated/ferramentas")({
  validateSearch: (search: Record<string, unknown>): { aba?: string } =>
    typeof search["aba"] === "string" ? { aba: search["aba"] } : {},
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
  component: Pagina,
});

function Pagina() {
  const { aba } = Route.useSearch();
  return (
    <PaginaModulo
      aba={aba}
      modulo="ferramenta"
      descricao="Número de série, vistorias (inicial, periódica, reposição e final), ocorrências e histórico de quem estava com cada ferramenta."
    />
  );
}
