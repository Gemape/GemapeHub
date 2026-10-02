import { createFileRoute, redirect } from "@tanstack/react-router";

// Associar passou para a aba "Associar ao produto" de Tamanho e Medidas (decisão 38); o endereço antigo continua abrindo a aba.
export const Route = createFileRoute("/_authenticated/cadastros/gerais/associar-tamanhos")({
  beforeLoad: () => {
    throw redirect({ to: "/cadastros/gerais/tamanhos-unidades", search: { aba: "associar" } });
  },
});
