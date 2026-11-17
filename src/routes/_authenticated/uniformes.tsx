import { createFileRoute } from "@tanstack/react-router";

import { PaginaModulo } from "@/components/modules/PaginaModulo";

export const Route = createFileRoute("/_authenticated/uniformes")({
  validateSearch: (search: Record<string, unknown>): { aba?: string; q?: string } => ({
    ...(typeof search["aba"] === "string" ? { aba: search["aba"] } : {}),
    // q: o Estoque abre já filtrado pelo item achado na busca global.
    ...(typeof search["q"] === "string" && search["q"] ? { q: search["q"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Uniformes | Patrimônio GEMAPE" },
      {
        name: "description",
        content:
          "Cadastro de uniformes por tipo, tamanho e cor, com controle de entrega por empregado e baixas registradas.",
      },
      { property: "og:title", content: "Uniformes | Patrimônio GEMAPE" },
      { property: "og:description", content: "Controle de uniformes do grupo GEMAPE." },
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
      modulo="uniforme"
      descricao="Tipo, tamanho e cor de cada peça, com entrega por empregado."
    />
  );
}
