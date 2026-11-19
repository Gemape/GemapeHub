import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MovimentacoesModulo } from "@/components/modules/MovimentacoesModulo";
import { FerramentasEntregaCaixa } from "@/components/modules/FerramentasEntregaCaixa";
import { FerramentasBaixaCaixa } from "@/components/modules/FerramentasBaixaCaixa";
import { FerramentasReposicaoCaixa } from "@/components/modules/FerramentasReposicaoCaixa";

const VISOES = [
  { id: "entrada", rotulo: "Entrada no estoque" },
  { id: "entrega", rotulo: "Saída do estoque" },
  { id: "reposicao", rotulo: "Reposição" },
  { id: "baixa", rotulo: "Baixa definitiva" },
] as const;

// Ferramentas > Movimentações: entrada no estoque, saída do estoque (entrega à caixa), reposição e baixa definitiva. A ferramenta se liga à caixa, nunca a uma pessoa;
// o que cada empregado portou sai depois, no relatório do empregado, pelo histórico de portadores da caixa.
export function FerramentasMovimentacoes() {
  const [visao, setVisao] = useState<(typeof VISOES)[number]["id"]>("entrada");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de movimentação">
        {VISOES.map((v) => (
          <Button key={v.id} type="button" variant={visao === v.id ? "default" : "outline"} aria-pressed={visao === v.id} onClick={() => setVisao(v.id)}>{v.rotulo}</Button>
        ))}
      </div>
      {visao === "entrada" && <MovimentacoesModulo modulo="ferramenta" foco="entrada" />}
      {visao === "entrega" && <FerramentasEntregaCaixa />}
      {visao === "reposicao" && <FerramentasReposicaoCaixa />}
      {visao === "baixa" && <FerramentasBaixaCaixa />}
    </div>
  );
}
