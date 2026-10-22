import { createFileRoute } from "@tanstack/react-router";

import { ManutencaoEquipamentoPagina } from "@/components/parametros/ManutencaoEquipamento";

export const Route = createFileRoute("/_authenticated/cadastros/equipamentos-manutencao")({
  head: () => ({ meta: [{ title: "Manutenção de equipamentos | Patrimônio GEMAPE" }] }),
  component: Pagina,
});

function Pagina() {
  if (import.meta.env["VITE_DEMO_MODE"] === "false") {
    return <p>Esta tela será conectada ao banco após a aprovação da demonstração.</p>;
  }
  return <ManutencaoEquipamentoPagina />;
}
