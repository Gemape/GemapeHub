import { createFileRoute } from "@tanstack/react-router";
import { AcoesManutencaoVeiculoLista } from "@/components/parametros/VeiculosListasParametros";

export const Route = createFileRoute("/_authenticated/cadastros/veiculos-acoes-manutencao")({
  head: () => ({ meta: [{ title: "Ações de manutenção | Patrimônio GEMAPE" }] }),
  component: AcoesManutencaoVeiculoLista,
});
