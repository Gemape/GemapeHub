import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Car, ChevronDown, FolderCog, Forklift, Handshake, HardHat, LayoutDashboard, Luggage, Shirt, Truck, Users, Wrench } from "lucide-react";
import { useState } from "react";

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
  "overflow-hidden rounded-lg bg-card shadow-sm ring-1 ring-border transition hover:shadow-md motion-reduce:transition-none";
const classeFoco = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
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
  const { isAdmin } = useAccess();
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(new Set());
  const alternar = (chave: string) =>
    setAbertos((a) => {
      const nova = new Set(a);
      if (!nova.delete(chave)) nova.add(chave);
      return nova;
    });

  return (
    <div className="space-y-8">
      {/* Sem título na tela: ela começa direto nos cartões. O título fica só para o leitor de tela. */}
      <h1 className="sr-only">Início</h1>
      {gruposDoInicio(isAdmin).map((grupo) => (
        <section key={grupo.titulo} aria-labelledby={`grupo-${grupo.titulo}`} className="space-y-3">
          <h2 id={`grupo-${grupo.titulo}`} className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{grupo.titulo}</h2>
          <ul className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grupo.cartoes.map((c) => {
              const Icone = ICONES_CARTAO[c.icone];
              const chave = `${grupo.titulo}/${c.titulo}`;
              const faixa = (
                <span className="flex h-20 items-center justify-center bg-primary/10 text-primary">
                  <Icone className="size-7" aria-hidden="true" />
                </span>
              );
              if (!c.itens) {
                return (
                  <li key={chave}>
                    <Link to={c.url ?? "/inicio"} className={`group flex flex-col ${classeCartao} ${classeFoco}`}>
                      {faixa}
                      <span className="flex flex-col items-center gap-1 px-4 py-4 text-center">
                        <span className="font-semibold">{c.titulo}</span>
                        <span className="text-xs text-muted-foreground">Clique para acessar</span>
                      </span>
                    </Link>
                  </li>
                );
              }
              const aberto = abertos.has(chave);
              const idLista = `atalhos-${grupo.titulo}-${c.titulo}`;
              return (
                <li key={chave} className={classeCartao}>
                  <button
                    type="button"
                    aria-expanded={aberto}
                    aria-controls={idLista}
                    onClick={() => alternar(chave)}
                    className={`flex w-full flex-col text-left ${classeFoco}`}
                  >
                    {faixa}
                    <span className="flex flex-col items-center gap-1 px-4 py-4 text-center">
                      <span className="font-semibold">{c.titulo}</span>
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
  );
}
