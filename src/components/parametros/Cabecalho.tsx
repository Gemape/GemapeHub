import type { ReactNode } from "react";
import { EyebrowDoCard } from "@/components/layout/EyebrowDoCard";

// `nivel="secao"` serve às telas que juntam duas rotinas numa página só (decisão 89): o título vira h2, sem o rótulo de topo.
export function Cabecalho({
  titulo,
  descricao,
  topo = "Cadastros · Gerais",
  nivel = "pagina",
  children,
}: {
  titulo: string;
  descricao: string;
  topo?: string;
  nivel?: "pagina" | "secao";
  children?: ReactNode;
}) {
  const secao = nivel === "secao";
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 [&>:not(:first-child)]:ml-auto">
      <div className="min-w-0 flex-1 basis-[28rem]">
        {!secao && <EyebrowDoCard fallback={topo} />}
        {secao ? <h2 className="text-lg font-semibold">{titulo}</h2> : <h1 className="text-2xl font-bold">{titulo}</h1>}
        <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
      </div>
      {/* Os botões ficam juntos, no alto, à direita do título (decisão 406). */}
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}
