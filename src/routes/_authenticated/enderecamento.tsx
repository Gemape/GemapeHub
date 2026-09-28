import { createFileRoute } from "@tanstack/react-router";

import { EnderecamentoModulo } from "@/components/modules/EnderecamentoModulo";

export const Route = createFileRoute("/_authenticated/enderecamento")({
  head: () => ({ meta: [{ title: "Endereçamento de estoque | Patrimônio GEMAPE" }] }),
  component: () => <EnderecamentoModulo secao="Módulo" />,
});
