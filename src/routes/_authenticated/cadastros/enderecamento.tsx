import { createFileRoute } from "@tanstack/react-router";

import { EnderecamentoModulo } from "@/components/modules/EnderecamentoModulo";

export const Route = createFileRoute("/_authenticated/cadastros/enderecamento")({
  head: () => ({ meta: [{ title: "Endereçamento de estoque | Patrimônio GEMAPE" }] }),
  component: () => <EnderecamentoModulo secao="Cadastros" />,
});
