import { createFileRoute } from "@tanstack/react-router";

import { TamanhosMedidasUnificado } from "@/components/parametros/TamanhosMedidasUnificado";

const DE = ["epi", "uniformes", "ferramentas"] as const; // menu de onde a pessoa veio (decisões 86 e 89)
type De = (typeof DE)[number];

export const Route = createFileRoute("/_authenticated/cadastros/gerais/tamanhos-unidades")({
  // O ?aba= antigo (cadastro, associar) é aceito e ignorado: as duas rotinas são uma tela só (decisão 89).
  validateSearch: (search: Record<string, unknown>): { aba?: "cadastro" | "associar"; de?: De } => ({
    ...(search["aba"] === "cadastro" || search["aba"] === "associar" ? { aba: search["aba"] } : {}),
    ...(DE.includes(search["de"] as De) ? { de: search["de"] as De } : {}),
  }),
  head: () => ({ meta: [{ title: "Tamanho e medidas de produto | Patrimônio GEMAPE" }] }),
  component: TamanhoEMedidas,
});

function TamanhoEMedidas() {
  const { de, aba } = Route.useSearch();
  return <TamanhosMedidasUnificado de={de} irParaAssociar={aba === "associar"} />;
}
