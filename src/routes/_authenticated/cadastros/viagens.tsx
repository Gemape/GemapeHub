import { createFileRoute, redirect } from "@tanstack/react-router";

// Os prazos e as faixas de Viagens passaram para Parâmetros > Veículos > Parâmetros Específicos (decisão 199); o endereço antigo leva para lá.
export const Route = createFileRoute("/_authenticated/cadastros/viagens")({
  beforeLoad: () => {
    throw redirect({ to: "/cadastros/gerais/categorias", search: { de: "veiculos" } });
  },
});
