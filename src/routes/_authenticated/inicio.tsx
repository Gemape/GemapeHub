import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Car, ChevronDown, FolderCog, Forklift, Handshake, HardHat, LayoutDashboard, Luggage, Shirt, Truck, Users, Wrench } from "lucide-react";
import { useEffect, useState } from "react";

import CloudSky from "@/components/CloudSky";
import { ICONES } from "@/components/layout/AppSidebar";
import { useAccess } from "@/lib/access-context";
import { gruposDoInicio, type IconeInicio } from "@/lib/inicio";

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

// Quem pede menos movimento no sistema recebe o céu parado (decisão 114).
function useMenosMovimento(): boolean {
  const [menos, setMenos] = useState(false);
  useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const atualizar = () => setMenos(consulta.matches);
    atualizar();
    consulta.addEventListener("change", atualizar);
    return () => consulta.removeEventListener("change", atualizar);
  }, []);
  return menos;
}

// O shader do céu é pesado: ele é desenhado nesta fração do tamanho da janela e o navegador amplia (nuvens macias não mostram a diferença).
const ESCALA_DO_CEU = 2.5;
function useTamanhoDoCeu(): { w: number; h: number } {
  const [tamanho, setTamanho] = useState({ w: 640, h: 360 });
  useEffect(() => {
    const ajustar = () =>
      setTamanho({ w: Math.max(320, Math.round(window.innerWidth / ESCALA_DO_CEU)), h: Math.max(180, Math.round(window.innerHeight / ESCALA_DO_CEU)) });
    ajustar();
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, []);
  return tamanho;
}

// Tela inicial: o menu em cartões. Cartão com submenus abre a lista de atalhos no próprio cartão; os outros abrem a tela direto.
// Não há menu lateral: tudo se acessa por aqui, e as outras telas têm o botão Voltar ao início no topo.
function PaginaInicio() {
  const { isAdmin } = useAccess();
  const menosMovimento = useMenosMovimento();
  const tamanho = useTamanhoDoCeu();
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(new Set());
  const alternar = (chave: string) =>
    setAbertos((a) => {
      const nova = new Set(a);
      if (!nova.delete(chave)) nova.add(chave);
      return nova;
    });

  return (
    <>
      {/* Céu animado (Cloud Sky, Originkit) como fundo da tela inicial: atrás de tudo e sem papel para o leitor de tela. Fica fora do
          contêiner com espaçamento, senão a margem dele encolhe o fundo. O componente traz mínimo de 1200x800 e tamanho em pixels:
          aqui ele ocupa a janela e desenha em resolução menor. */}
      <div className="fixed inset-0 -z-10" aria-hidden="true">
        {menosMovimento ? (
          <CloudSky width={tamanho.w} height={tamanho.h} style={{ width: "100%", height: "100%", minWidth: 0, minHeight: 0 }} speed={0} pointer={{ wind: 0, parallax: 0, damping: 50 }} />
        ) : (
          <CloudSky width={tamanho.w} height={tamanho.h} style={{ width: "100%", height: "100%", minWidth: 0, minHeight: 0 }} />
        )}
      </div>
      <div className="space-y-8">
        <header className="inline-block max-w-full rounded-lg bg-card/85 px-4 py-3 shadow-sm backdrop-blur">
          <p className="text-eyebrow">Início</p>
          <h1 className="text-2xl font-bold">Gestão de Patrimônio</h1>
          <p className="mt-1 text-sm text-muted-foreground">Escolha onde você quer trabalhar.</p>
        </header>
        {gruposDoInicio(isAdmin).map((grupo) => (
          <section key={grupo.titulo} aria-labelledby={`grupo-${grupo.titulo}`} className="space-y-3">
            <h2 id={`grupo-${grupo.titulo}`} className="inline-block rounded-md bg-card/85 px-2.5 py-1 text-sm font-semibold uppercase tracking-wide shadow-sm backdrop-blur">{grupo.titulo}</h2>
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
                      <ul id={idLista} className="divide-y border-t">
                        {c.itens.map((sub) => {
                          const IconeSub = ICONES[sub.icone];
                          return (
                            <li key={`${sub.titulo}-${sub.url}`}>
                              <Link
                                to={sub.url}
                                search={sub.search as never}
                                className={`flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-primary/10 ${classeFoco}`}
                              >
                                <IconeSub className="size-4 shrink-0 text-primary" aria-hidden="true" />
                                {sub.titulo}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
