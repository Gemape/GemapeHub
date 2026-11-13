import type { ReactNode } from "react";

// Padrão de todas as telas com busca ou filtro (decisões 339 e 406): os filtros (busca, seleção, período) ficam sempre no topo, à esquerda da página, e os botões de ação, à direita da mesma linha.
// Os rótulos acima das caixas ficam centralizados, em todas as telas (decisão 423). Os campos de busca ficam com a mesma largura em todas as telas (w-96, sem o max-w que cada tela punha): o campo é w-full e, sem largura fixa, a barra se mede estreita e quebra em duas linhas. A tela monta a linha como `flex flex-wrap items-end gap-2`, com esta barra primeiro e as ações depois (a ordem do Tab segue a da tela); ela é a primeira da linha (à esquerda) e a margem automática à direita empurra os botões para o fim, à direita. Sem espaço, os botões descem para a linha de baixo.
export function BarraDeFiltros({ children }: { children: ReactNode }) {
  return (
    <div className="mr-auto flex max-w-full flex-wrap items-end justify-start gap-2 max-sm:w-full [&_:not(.items-center)>label:not(:has(input))]:block [&_:not(.items-center)>label:not(:has(input))]:text-center [&>input:not([type=date])]:w-96 [&>input:not([type=date])]:max-w-full [&>[data-campo-limpavel]]:w-96 [&>[data-campo-limpavel]]:max-w-full" role="group" aria-label="Filtros">
      {children}
    </div>
  );
}
