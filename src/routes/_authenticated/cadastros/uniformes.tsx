import { createFileRoute, redirect } from "@tanstack/react-router";

// Cadastrar Uniforme passou para Parâmetros > Uniformes (decisão 48); o endereço antigo continua abrindo a tela nova.
export const Route = createFileRoute("/_authenticated/cadastros/uniformes")({
  beforeLoad: () => {
    throw redirect({ to: "/uniformes-cadastrar" });
  },
});
