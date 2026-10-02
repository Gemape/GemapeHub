import { createFileRoute, redirect } from "@tanstack/react-router";

// Cadastrar EPI passou para o módulo EPI (decisão 35); o endereço antigo continua abrindo a tela nova.
export const Route = createFileRoute("/_authenticated/cadastros/epi")({
  beforeLoad: () => {
    throw redirect({ to: "/epi-cadastrar" });
  },
});
