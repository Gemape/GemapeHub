import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Car, ChevronDown, FolderCog, Forklift, Handshake, HardHat, LayoutDashboard, Luggage, Shirt, Truck, Users, Wrench } from "lucide-react";
import { useEffect, useState } from "react";

import { ICONES } from "@/components/layout/AppSidebar";
import { useAccess } from "@/lib/access-context";
import { gruposDoInicio, type IconeInicio, type SecaoInicio, type SubitemInicio } from "@/lib/inicio";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({ meta: [{ title: "Início | Patrimônio GEMAPE" }] }),
  component: PaginaInicio,
});

const ICONES_CARTAO: Record<IconeInicio, typeof Car> = {
  LayoutDashboard, HardHat, Shirt, Wrench, Car, Luggage, Forklift, FolderCog, Building2, Users, Truck, Handshake,
};

const classeCartao =
  "vidro-cartao group/cartao overflow-hidden rounded-2xl transition duration-300 hover:-translate-y-1 hover:shadow-2xl motion-reduce:transition-none motion-reduce:hover:translate-y-0";
const classeFoco = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
// Três cartões por linha no desktop; a última linha, se incompleta, fica centralizada.
const larguraCartao = "w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]";
const SECOES: readonly SecaoInicio[] = ["Módulo", "Parâmetros"];

function AtalhoDoCartao({ sub }: { sub: SubitemInicio }) {
  const IconeSub = ICONES[sub.icone];
  return (
    <Link to={sub.url} search={sub.search as never} className={`flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-primary/10 ${classeFoco}`}>
      <IconeSub className="size-4 shrink-0 text-primary" aria-hidden="true" />
      {sub.titulo}
    </Link>
  );
}

// Tela inicial: o menu em cartões. Cartão com submenus abre a lista de atalhos no próprio cartão; os outros abrem a tela direto.
// Não há menu lateral: tudo se acessa por aqui, e as outras telas têm o botão Voltar ao início no topo.
function PaginaInicio() {
  const { isAdmin, podeVerCaminho } = useAccess();
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(new Set());
  const alternar = (chave: string) =>
    setAbertos((a) => {
      const nova = new Set(a);
      if (!nova.delete(chave)) nova.add(chave);
      return nova;
    });

  // Clicar em qualquer lugar fora dos cartões (ou apertar Esc) recolhe os menus abertos.
  useEffect(() => {
    const fora = (e: PointerEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest("[data-cartao]")) setAbertos((a) => (a.size ? new Set() : a));
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbertos((a) => (a.size ? new Set() : a));
    };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  return (
    <div className="fonte-manrope">
      {/* Sem título na tela: ela começa direto nos cartões. O título fica só para o leitor de tela. */}
      <h1 className="sr-only">Início</h1>
      <div className="mx-auto max-w-6xl space-y-10">
      {gruposDoInicio(isAdmin, podeVerCaminho).map((grupo) => (
        <section key={grupo.titulo} aria-labelledby={`grupo-${grupo.titulo}`} className="space-y-4">
          <h2 id={`grupo-${grupo.titulo}`} className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.18em] text-primary/80">
            {grupo.titulo}
            <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
          </h2>
          <ul className="flex flex-wrap items-start justify-center gap-6">
            {grupo.cartoes.map((c, indice) => {
              const Icone = ICONES_CARTAO[c.icone];
              const chave = `${grupo.titulo}/${c.titulo}`;
              const faixa = (
                <span className="flex h-36 items-center justify-center bg-gradient-to-br from-[oklch(0.9_0.05_255)] to-[oklch(0.965_0.025_255)] text-primary">
                  <span className="medalhao-cartao" style={{ "--atraso": `${(indice % 6) * -0.8}s` } as React.CSSProperties}>
                    <Icone aria-hidden="true" />
                  </span>
                </span>
              );
              if (!c.itens) {
                return (
                  <li key={chave} data-cartao className={larguraCartao}>
                    <Link to={c.url ?? "/inicio"} className={`flex flex-col ${classeCartao} ${classeFoco}`}>
                      {faixa}
                      <span className="flex flex-col items-center gap-1 px-4 py-4 text-center">
                        <span className="font-medium">{c.titulo}</span>
                        <span className="text-xs text-muted-foreground">Clique para acessar</span>
                      </span>
                    </Link>
                  </li>
                );
              }
              const aberto = abertos.has(chave);
              const idLista = `atalhos-${grupo.titulo}-${c.titulo}`;
              return (
                <li key={chave} data-cartao className={`${classeCartao} ${larguraCartao}`}>
                  <button
                    type="button"
                    aria-expanded={aberto}
                    aria-controls={idLista}
                    onClick={() => alternar(chave)}
                    className={`flex w-full flex-col text-left ${classeFoco}`}
                  >
                    {faixa}
                    <span className="flex flex-col items-center gap-1 px-4 py-4 text-center">
                      <span className="font-medium">{c.titulo}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        {aberto ? "Clique para recolher" : "Clique para acessar"}
                        <ChevronDown className={`size-3.5 transition-transform motion-reduce:transition-none ${aberto ? "rotate-180" : ""}`} aria-hidden="true" />
                      </span>
                    </span>
                  </button>
                  {aberto && (
                    <div id={idLista} className="border-t">
                      {SECOES.map((secao) => {
                        const doCartao = (c.itens ?? []).filter((i) => i.secao === secao);
                        if (doCartao.length === 0) return null;
                        return (
                          <section key={secao} aria-label={secao}>
                            <h3 className="bg-muted/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{secao}</h3>
                            <ul className="divide-y">
                              {doCartao.map((sub) => (
                                <li key={`${sub.titulo}-${sub.url}`}><AtalhoDoCartao sub={sub} /></li>
                              ))}
                            </ul>
                          </section>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      </div>
    </div>
  );
}
