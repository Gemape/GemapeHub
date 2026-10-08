import { createFileRoute } from "@tanstack/react-router";
import { ChecklistParametros } from "@/components/parametros/ChecklistParametros";

export const Route = createFileRoute("/_authenticated/cadastros/veiculos-checklist")({
  head: () => ({ meta: [{ title: "Check list | Patrimônio GEMAPE" }] }),
  component: ChecklistParametros,
});
