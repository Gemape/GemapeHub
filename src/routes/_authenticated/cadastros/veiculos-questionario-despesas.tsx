import { createFileRoute } from "@tanstack/react-router";
import { QuestionarioDespesasConstrutor } from "@/components/parametros/QuestionarioDespesasConstrutor";

export const Route = createFileRoute("/_authenticated/cadastros/veiculos-questionario-despesas")({
  head: () => ({ meta: [{ title: "Questionário de Despesas | Patrimônio GEMAPE" }] }),
  component: QuestionarioDespesasConstrutor,
});
