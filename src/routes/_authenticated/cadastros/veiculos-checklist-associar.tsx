import { createFileRoute, redirect } from "@tanstack/react-router";

// Decisão 113: Itens check list e Associar itens ficam numa só página, Check list.
export const Route = createFileRoute("/_authenticated/cadastros/veiculos-checklist-associar")({
  beforeLoad: () => {
    throw redirect({ to: "/cadastros/veiculos-checklist" });
  },
});
