import { createFileRoute } from "@tanstack/react-router";
import { PlanoManutencaoVeiculo } from "@/components/parametros/PlanoManutencaoVeiculo";

export const Route = createFileRoute("/_authenticated/cadastros/veiculos-plano-manutencao")({
  head: () => ({ meta: [{ title: "Plano de manutenções | Patrimônio GEMAPE" }] }),
  component: PlanoManutencaoVeiculo,
});
