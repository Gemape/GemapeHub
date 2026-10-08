import { createFileRoute, redirect } from "@tanstack/react-router";

// Decisão 112: Ações de manutenção e Plano de manutenções ficam numa só página, Manutenção.
export const Route = createFileRoute("/_authenticated/cadastros/veiculos-plano-manutencao")({
  beforeLoad: () => {
    throw redirect({ to: "/cadastros/veiculos-manutencao" });
  },
});
