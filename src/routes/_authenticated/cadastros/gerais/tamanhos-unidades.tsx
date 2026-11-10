import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { marcarVoltaDoRascunho } from "@/lib/rascunho-ferramenta";

import { TamanhosMedidasUnificado } from "@/components/parametros/TamanhosMedidasUnificado";

const DE = ["epi", "uniformes", "ferramentas"] as const; // menu de onde a pessoa veio (decisões 86 e 89)
type De = (typeof DE)[number];

export const Route = createFileRoute("/_authenticated/cadastros/gerais/tamanhos-unidades")({
  // O ?aba= antigo (cadastro, associar) é aceito e ignorado: as duas rotinas são uma tela só (decisão 89).
  validateSearch: (search: Record<string, unknown>): { aba?: "cadastro" | "associar"; de?: De; voltar?: "cadastro-ferramenta" } => ({
    ...(search["aba"] === "cadastro" || search["aba"] === "associar" ? { aba: search["aba"] } : {}),
    ...(DE.includes(search["de"] as De) ? { de: search["de"] as De } : {}),
    ...(search["voltar"] === "cadastro-ferramenta" ? { voltar: "cadastro-ferramenta" as const } : {}),
  }),
  head: () => ({ meta: [{ title: "Tamanho e medidas de produto | Patrimônio GEMAPE" }] }),
  component: TamanhoEMedidas,
});

function TamanhoEMedidas() {
  const { de, aba, voltar } = Route.useSearch();
  const navegar = useNavigate();
  return (
    <div className="space-y-4">
      {/* Aberto pelo link Cadastrar do formulário de ferramenta: o botão devolve a ele, com o que já foi preenchido. */}
      {voltar && (
        <div className="flex justify-end">
          <Button type="button" onClick={() => { marcarVoltaDoRascunho(); void navegar({ to: "/cadastros/ferramentas" }); }}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar para Cadastrar ferramenta
          </Button>
        </div>
      )}
      <TamanhosMedidasUnificado de={de} irParaAssociar={aba === "associar"} />
    </div>
  );
}
