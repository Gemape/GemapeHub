import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/cadastros/gerais/")({
  beforeLoad: () => {
    throw redirect({ to: "/cadastros/gerais/categorias" });
  },
});
