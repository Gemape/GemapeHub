import type { ReactNode } from "react";

// A grade padrão dos cartões de indicador de todo o sistema (decisão 375): o mesmo espaçamento, todos os cartões com a mesma altura e o mesmo número de colunas por largura de tela,
// como na Frota. Todos os cartões e KPIs de uma tela ficam juntos numa só grade, logo abaixo da barra de ações e filtros. `colunas` é o máximo em tela larga.
const COLUNAS: Record<2 | 3 | 4 | 5, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3 max-sm:[&>*:last-child:nth-child(odd)]:col-span-2",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
};

export function GradeDeCartoes({ colunas = 4, classe = "", children, rotulo }: { colunas?: 2 | 3 | 4 | 5; classe?: string; children: ReactNode; rotulo?: string }) {
  return (
    <section aria-label={rotulo ?? "Indicadores"} className={`grid auto-rows-fr items-stretch gap-3 ${COLUNAS[colunas]} ${classe}`}>
      {children}
    </section>
  );
}
