import { createFileRoute } from "@tanstack/react-router";

import { EquipamentosEspecificos } from "@/components/parametros/EquipamentosEspecificos";

export const Route = createFileRoute("/_authenticated/cadastros/equipamentos-especificos")({
  head: () => ({ meta: [{ title: "Parâmetros Específicos de Equipamentos | Patrimônio GEMAPE" }] }),
  component: PaginaEquipamentosEspecificos,
});

function PaginaEquipamentosEspecificos() {
  if (import.meta.env["VITE_DEMO_MODE"] === "false") {
    return <p>Os parâmetros de equipamentos serão conectados ao banco após a aprovação da demonstração.</p>;
  }
  return <EquipamentosEspecificos />;
}
