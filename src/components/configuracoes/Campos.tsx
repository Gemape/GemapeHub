import type { ComponentType, ReactNode } from "react";

// Peças comuns das telas de Configurações: um bloco com título e uma linha "texto à esquerda, controle à direita".
export function Bloco({ titulo, descricao, children }: { titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <header>
        <h3 className="text-sm font-semibold">{titulo}</h3>
        {descricao && <p className="mt-0.5 text-xs text-muted-foreground">{descricao}</p>}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function Linha({ rotulo, ajuda, htmlFor, children }: { rotulo: string; ajuda?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="text-sm font-medium">{rotulo}</label>
        {ajuda && <p className="text-xs text-muted-foreground">{ajuda}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export const AvisoDeTeste = () => (
  <p className="rounded-lg border bg-primary/5 px-3 py-2 text-xs text-muted-foreground">Modo de teste: as escolhas ficam gravadas só neste navegador e nada é enviado a ninguém.</p>
);

// Menu de seções feito de botões (o sistema não usa abas superiores: decisão 43). Em linha rolável no celular; com `vertical`, em coluna a partir do `md`.
export function MenuDeSecoes<T extends string>({ itens, ativo, aoEscolher, rotulo, vertical = false }: {
  itens: readonly { id: T; nome: string; Icone?: ComponentType<{ className?: string }> }[]; ativo: T; aoEscolher: (id: T) => void; rotulo: string; vertical?: boolean;
}) {
  return (
    <nav aria-label={rotulo} className={vertical ? "flex shrink-0 gap-1.5 overflow-x-auto border-b bg-gradient-to-b from-primary/[0.07] to-primary/[0.02] p-2.5 md:w-72 md:flex-col md:gap-1 md:overflow-y-auto md:overflow-x-visible md:border-b-0 md:border-r md:p-3 lg:w-80" : "flex gap-1 overflow-x-auto rounded-lg bg-muted/70 p-1"}>
      {itens.map(({ id, nome, Icone }, i) => {
        const ligado = id === ativo;
        return (
          <button
            key={id}
            type="button"
            aria-current={ligado ? "page" : undefined}
            onClick={() => aoEscolher(id)}
            style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}
            className={`group relative flex shrink-0 cursor-pointer items-center gap-2.5 ${vertical ? "rounded-xl md:px-3.5 md:py-2.5" : "rounded-md"} px-3 py-2 text-left text-sm font-medium transition-[transform,background-color,color,box-shadow] duration-300 ease-out animate-in fade-in-0 slide-in-from-left-2 motion-reduce:animate-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring before:absolute before:left-0 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-primary before:transition-transform before:duration-300 ${ligado ? "before:scale-y-100" : "before:scale-y-0"} ${vertical ? "md:whitespace-normal" : "whitespace-nowrap py-1"} ${ligado ? "bg-background text-foreground shadow" : "text-muted-foreground hover:translate-x-0.5 hover:bg-background/60 hover:text-foreground"}`}
          >
            {Icone && (
              <span className={`grid ${vertical ? "size-9" : "size-8"} shrink-0 place-items-center rounded-lg transition-[transform,background-color,color,box-shadow] duration-300 ease-out ${vertical ? "group-hover:scale-105" : "group-hover:-rotate-6 group-hover:scale-110"} ${ligado ? `bg-primary text-primary-foreground shadow-md ${vertical ? "" : "[animation:icone-pop_.5s_ease-out] motion-reduce:[animation:none]"}` : "bg-primary/10 text-primary group-hover:bg-primary/20"}`}>
                <Icone className={vertical ? "size-5" : "size-4"} aria-hidden="true" />
              </span>
            )}
            {nome}
          </button>
        );
      })}
    </nav>
  );
}
