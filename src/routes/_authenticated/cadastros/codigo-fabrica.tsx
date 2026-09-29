import { createFileRoute } from "@tanstack/react-router";

import { CodigoFabricaModulo } from "@/components/modules/CodigoFabricaModulo";

export const Route = createFileRoute("/_authenticated/cadastros/codigo-fabrica")({
  head: () => ({ meta: [{ title: "Código de Fábrica | Patrimônio GEMAPE" }] }),
  component: CodigoFabricaModulo,
});
