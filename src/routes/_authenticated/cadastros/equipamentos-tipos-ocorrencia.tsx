import { createFileRoute } from "@tanstack/react-router";

import { TiposOcorrenciaEquipamentoPagina } from "@/components/parametros/ManutencaoEquipamento";

export const Route = createFileRoute("/_authenticated/cadastros/equipamentos-tipos-ocorrencia")({
  head: () => ({ meta: [{ title: "Tipos de ocorrência de equipamentos | Patrimônio GEMAPE" }] }),
  component: Pagina,
});

function Pagina() {
  if (import.meta.env["VITE_DEMO_MODE"] === "false") {
    return <p>Esta tela será conectada ao banco após a aprovação da demonstração.</p>;
  }
  return <TiposOcorrenciaEquipamentoPagina />;
}
