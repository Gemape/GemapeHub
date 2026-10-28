import { createFileRoute } from "@tanstack/react-router";
import { HabilitarEmpregadosViagens } from "@/components/parametros/HabilitarEmpregadosViagens";

// Parâmetros > Viagens > Parâmetros Específicos (decisão 299): escolher, entre todos os empregados, os habilitados a lançar despesas no questionário de despesas.
export const Route = createFileRoute("/_authenticated/cadastros/viagens-especificos")({
  head: () => ({ meta: [{ title: "Parâmetros Específicos de Viagens | Patrimônio GEMAPE" }] }),
  component: HabilitarEmpregadosViagens,
});
