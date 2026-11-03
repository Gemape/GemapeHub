import { createFileRoute } from "@tanstack/react-router";
import { HabilitarEmpregadosViagens } from "@/components/parametros/HabilitarEmpregadosViagens";

// Parâmetros > Viagens > Parâmetros Específicos (decisões 299 e 334): os empregados habilitados a lançar despesas no questionário de despesas e, abaixo, os prazos de lançamento e de fechamento.
export const Route = createFileRoute("/_authenticated/cadastros/viagens-especificos")({
  head: () => ({ meta: [{ title: "Parâmetros Específicos de Viagens | Patrimônio GEMAPE" }] }),
  component: HabilitarEmpregadosViagens,
});
