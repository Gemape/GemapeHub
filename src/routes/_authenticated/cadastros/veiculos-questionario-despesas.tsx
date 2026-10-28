import { createFileRoute, redirect } from "@tanstack/react-router";

// O Questionário de Despesas passou para Parâmetros > Viagens (decisão 299); o endereço antigo leva para lá.
export const Route = createFileRoute("/_authenticated/cadastros/veiculos-questionario-despesas")({
  beforeLoad: () => {
    throw redirect({ to: "/cadastros/viagens-questionario-despesas" });
  },
});
