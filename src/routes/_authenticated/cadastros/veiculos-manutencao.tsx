import { createFileRoute } from "@tanstack/react-router";
import { ManutencaoParametros } from "@/components/parametros/ManutencaoParametros";

export const Route = createFileRoute("/_authenticated/cadastros/veiculos-manutencao")({
  head: () => ({ meta: [{ title: "Manutenção | Patrimônio GEMAPE" }] }),
  component: ManutencaoParametros,
});
