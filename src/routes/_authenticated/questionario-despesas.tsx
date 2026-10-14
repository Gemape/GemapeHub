import { createFileRoute } from "@tanstack/react-router";
import { QuestionarioFormulario } from "@/components/parametros/QuestionarioFormulario";

// Formulário de preenchimento do Questionário de Despesas. Sem link no menu lateral: abre pelo botão da tela de cadastro.
export const Route = createFileRoute("/_authenticated/questionario-despesas")({
  validateSearch: (search: Record<string, unknown>): { tipo?: string } =>
    typeof search["tipo"] === "string" ? { tipo: search["tipo"] } : {},
  head: () => ({ meta: [{ title: "Questionário de despesas | Patrimônio GEMAPE" }] }),
  component: PaginaFormulario,
});

function PaginaFormulario() {
  const { tipo } = Route.useSearch();
  return <QuestionarioFormulario tipoInicial={tipo} />;
}
