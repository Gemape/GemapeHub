import { createFileRoute, redirect } from "@tanstack/react-router";

// Habilitar caixas passou para a tela Caixas de Ferramentas (decisão 36); o endereço antigo continua abrindo a aba.
export const Route = createFileRoute("/_authenticated/cadastros/gerais/caixas")({
  beforeLoad: () => {
    throw redirect({ to: "/caixas-ferramentas", search: { aba: "habilitar" } });
  },
});
