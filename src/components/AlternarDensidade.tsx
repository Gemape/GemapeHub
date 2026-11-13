import { Rows2, Rows3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { definirDensidade, useDensidade } from "@/lib/densidade";

// Botão pequeno no topo da tabela: Visão compacta (mais linhas por tela) ou confortável (mais espaço, bom para tablet).
export function AlternarDensidade() {
  const d = useDensidade();
  const compacta = d === "compacta";
  return (
    <Button
      type="button" variant="outline" size="sm" className="max-sm:hidden" aria-pressed={compacta}
      title={compacta ? "Voltar para a visão confortável (mais espaçada)" : "Visão compacta: mostra mais linhas de uma vez"}
      onClick={() => definirDensidade(compacta ? "confortavel" : "compacta")}
    >
      {compacta ? <Rows2 className="size-4" aria-hidden="true" /> : <Rows3 className="size-4" aria-hidden="true" />}
      {compacta ? "Compacta" : "Confortável"}
    </Button>
  );
}
