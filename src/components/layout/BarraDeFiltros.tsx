import type { ReactNode } from "react";

// Padrão de todas as telas com busca ou filtro (decisões 339 e 406): os filtros (busca, seleção, período) ficam sempre no topo, à esquerda da página, e os botões de ação, à direita da mesma linha.
// Os campos de busca ficam com a mesma largura em todas as telas (w-96, sem o max-w que cada tela punha): o campo é w-full e, sem largura fixa, a barra se mede estreita e quebra em duas linhas. A tela monta a linha como `flex flex-wrap items-end gap-2`, com as ações primeiro e esta barra por último; ela vai para o começo da linha (order-first) e a margem automática à direita empurra os botões para o fim, à direita. Sem espaço, os botões descem para a linha de baixo.
export function BarraDeFiltros({ children }: { children: ReactNode }) {
  return (
    <div className="order-first mr-auto flex max-w-full flex-wrap items-end justify-start gap-2 max-sm:w-full [&>input:not([type=date])]:w-96 [&>input:not([type=date])]:max-w-full" role="group" aria-label="Filtros">
      {children}
    </div>
  );
}
