import { createFileRoute } from "@tanstack/react-router";
import { ChecklistVeiculoLista } from "@/components/parametros/VeiculosListasParametros";

export const Route = createFileRoute("/_authenticated/cadastros/veiculos-checklist")({
  head: () => ({ meta: [{ title: "Itens check list | Patrimônio GEMAPE" }] }),
  component: ChecklistVeiculoLista,
});
