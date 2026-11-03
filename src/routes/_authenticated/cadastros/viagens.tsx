import { createFileRoute, redirect } from "@tanstack/react-router";

// As faixas de desempenho de Viagens estão em Parâmetros > Veículos > Parâmetros Específicos (decisão 199) e os prazos, em Parâmetros > Viagens > Parâmetros Específicos (decisão 334); o endereço antigo leva às faixas.
export const Route = createFileRoute("/_authenticated/cadastros/viagens")({
  beforeLoad: () => {
    throw redirect({ to: "/cadastros/gerais/categorias", search: { de: "veiculos" } });
  },
});
