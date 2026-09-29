import { createFileRoute, redirect } from "@tanstack/react-router";

// O Endereçamento passou para Cadastros > Gerais. O endereço antigo continua funcionando.
export const Route = createFileRoute("/_authenticated/cadastros/enderecamento")({
  beforeLoad: () => {
    throw redirect({ to: "/cadastros/gerais/enderecamento" });
  },
});
