import type { ReactNode } from "react";

export function Cabecalho({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-eyebrow">Cadastros · Gerais</p>
        <h1 className="text-2xl font-bold">{titulo}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
      </div>
      {children}
    </header>
  );
}
