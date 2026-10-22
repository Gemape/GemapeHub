import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { ChecklistEquipamento } from "@/components/parametros/ChecklistEquipamento";
import { ehFinalidade } from "@/lib/equipamentos-checklist";

export const Route = createFileRoute("/_authenticated/cadastros/equipamentos-checklist")({
  head: () => ({ meta: [{ title: "Check list de equipamentos | Patrimônio GEMAPE" }] }),
  validateSearch: (busca: Record<string, unknown>): { aba?: "manutencao" | "vistoria" } => (ehFinalidade(busca["aba"]) ? { aba: busca["aba"] } : {}),
  component: PaginaChecklistEquipamentos,
});

function PaginaChecklistEquipamentos() {
  const { aba } = Route.useSearch();
  const navegar = useNavigate({ from: Route.fullPath });
  if (import.meta.env["VITE_DEMO_MODE"] === "false") {
    return <p>O check list de equipamentos será conectado ao banco após a aprovação da demonstração.</p>;
  }
  return <ChecklistEquipamento finalidade={aba ?? null} aoEscolher={(f) => void navegar({ search: { aba: f } })} />;
}
