import { createFileRoute } from "@tanstack/react-router";
import { TiposOcorrenciaVeiculoLista } from "@/components/parametros/VeiculosListasParametros";

export const Route = createFileRoute("/_authenticated/cadastros/veiculos-tipos-ocorrencia")({
  head: () => ({ meta: [{ title: "Tipos de ocorrência | Patrimônio GEMAPE" }] }),
  component: TiposOcorrenciaVeiculoLista,
});
