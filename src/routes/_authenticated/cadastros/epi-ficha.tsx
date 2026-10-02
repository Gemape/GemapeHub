import { createFileRoute, redirect } from "@tanstack/react-router";

// A ficha passou para Parâmetros > EPI (decisões 35 e 37); o endereço antigo continua abrindo a tela nova.
export const Route = createFileRoute("/_authenticated/cadastros/epi-ficha")({
  validateSearch: (search: Record<string, unknown>): { epi?: string } =>
    typeof search["epi"] === "string" ? { epi: search["epi"] } : {},
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/epi-ficha", search });
  },
});
