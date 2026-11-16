import { createFileRoute } from "@tanstack/react-router";

import { PaginaModulo } from "@/components/modules/PaginaModulo";

export const Route = createFileRoute("/_authenticated/epi")({
  // empresa, empregado e ordem: a volta do cadastro da Ordem de Serviço (decisão 388) reabre a tela com a escolha que estava feita.
  validateSearch: (search: Record<string, unknown>): { aba?: string; empresa?: string; empregado?: string; ordem?: string; funcao?: string; modo?: "devolucao" } => ({
    ...(typeof search["aba"] === "string" ? { aba: search["aba"] } : {}),
    ...(typeof search["empresa"] === "string" && search["empresa"] ? { empresa: search["empresa"] } : {}),
    ...(typeof search["empregado"] === "string" && search["empregado"] ? { empregado: search["empregado"] } : {}),
    ...(search["modo"] === "devolucao" ? { modo: "devolucao" as const } : {}),
    ...(typeof search["ordem"] === "string" && search["ordem"] ? { ordem: search["ordem"] } : {}),
    ...(typeof search["funcao"] === "string" && search["funcao"] ? { funcao: search["funcao"] } : {}),
  }),
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
  component: Pagina,
});

function Pagina() {
  const { aba } = Route.useSearch();
  return (
    <PaginaModulo
      aba={aba}
      modulo="epi"
      descricao="Equipamentos de proteção individual, com Certificado de Aprovação (CA), entrega por empregado e alerta automático de reposição."
    />
  );
}
