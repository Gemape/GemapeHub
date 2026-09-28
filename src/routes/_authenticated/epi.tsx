import { createFileRoute } from "@tanstack/react-router";

import { PaginaModulo } from "@/components/modules/PaginaModulo";

export const Route = createFileRoute("/_authenticated/epi")({
  head: () => ({
    meta: [
      { title: "EPIs | Patrimônio GEMAPE" },
      {
        name: "description",
        content:
          "Cadastro de EPIs com CA, controle de entrega e devolução por empregado e alertas de reposição por cobertura de estoque.",
      },
      { property: "og:title", content: "EPIs | Patrimônio GEMAPE" },
      { property: "og:description", content: "Controle de EPIs do grupo GEMAPE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PaginaModulo
      modulo="epi"
      titulo="EPIs"
      descricao="Equipamentos de proteção individual, com Certificado de Aprovação (CA), entrega por empregado e alerta automático de reposição."
    />
  ),
});
