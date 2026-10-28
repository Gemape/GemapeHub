import { createFileRoute } from "@tanstack/react-router";
import { QuestionarioDespesasTela } from "@/components/parametros/QuestionarioDespesasTela";

// Parâmetros > Viagens > Questionário de Despesas (decisão 299; antes em Veículos): uma tela só, o formulário com a montagem dentro (dec 173).
export const Route = createFileRoute("/_authenticated/cadastros/viagens-questionario-despesas")({
  head: () => ({ meta: [{ title: "Questionário de Despesas | Patrimônio GEMAPE" }] }),
  component: QuestionarioDespesasTela,
});
