import { createFileRoute } from "@tanstack/react-router";

import { EnderecamentoModulo } from "@/components/modules/EnderecamentoModulo";

export const Route = createFileRoute("/_authenticated/cadastros/gerais/enderecamento")({
  // ?busca= abre a lista já filtrada pelo código do produto (o link da entrada de compra, decisão 384).
  validateSearch: (s: Record<string, unknown>): { busca?: string } => (typeof s["busca"] === "string" && s["busca"] ? { busca: s["busca"] } : {}),
  head: () => ({ meta: [{ title: "Endereçamento de estoque | Patrimônio GEMAPE" }] }),
  component: EnderecamentoModulo,
});
