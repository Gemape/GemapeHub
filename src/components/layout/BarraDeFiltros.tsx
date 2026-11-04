import type { ReactNode } from "react";

// Padrão de todas as telas com busca ou filtro (decisão 339): os filtros ficam sempre no topo, à direita da página, e os botões de ação, à esquerda da mesma linha.
// Os campos de busca ficam com a mesma largura em todas as telas (w-96, sem o max-w que cada tela punha): o campo é w-full e, sem largura fixa, a barra se mede estreita e quebra em duas linhas. A tela monta a linha como `flex flex-wrap items-end gap-2`, com as ações primeiro e esta barra por último; ela empurra os filtros para a direita.
export function BarraDeFiltros({ children }: { children: ReactNode }) {
  return (
    <div className="ml-auto flex max-w-full flex-wrap items-end justify-end gap-2 max-sm:w-full max-sm:justify-start [&>input:not([type=date])]:w-96 [&>input:not([type=date])]:max-w-full" role="group" aria-label="Filtros">
      {children}
    </div>
  );
}
