import { createFileRoute } from "@tanstack/react-router";
import { QuestionarioDespesasTela } from "@/components/parametros/QuestionarioDespesasTela";

// Parâmetros > Veículos > Questionário de Despesas: uma tela só, o formulário com a montagem dentro (dec 173).
export const Route = createFileRoute("/_authenticated/cadastros/veiculos-questionario-despesas")({
  head: () => ({ meta: [{ title: "Questionário de Despesas | Patrimônio GEMAPE" }] }),
  component: QuestionarioDespesasTela,
});
