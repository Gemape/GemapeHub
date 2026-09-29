import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/parametros/")({
  beforeLoad: () => {
    throw redirect({ to: "/parametros/categorias" });
  },
});
