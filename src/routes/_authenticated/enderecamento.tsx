import { createFileRoute, redirect } from "@tanstack/react-router";

// O Endereçamento passou para Parâmetros Base. O endereço antigo continua funcionando.
export const Route = createFileRoute("/_authenticated/enderecamento")({
  beforeLoad: () => {
    throw redirect({ to: "/parametros/enderecamento" });
  },
});
