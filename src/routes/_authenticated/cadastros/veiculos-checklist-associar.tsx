import { createFileRoute } from "@tanstack/react-router";
import { AssociarChecklistVeiculo } from "@/components/parametros/AssociarChecklistVeiculo";

export const Route = createFileRoute("/_authenticated/cadastros/veiculos-checklist-associar")({
  head: () => ({ meta: [{ title: "Associar itens de check list a um veículo | Patrimônio GEMAPE" }] }),
  component: AssociarChecklistVeiculo,
});
