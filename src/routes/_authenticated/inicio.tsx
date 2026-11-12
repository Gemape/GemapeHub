import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChartPie, createLucideIcon, MapPin, Plane, UserStar, Building2, Car, ChartColumn, Factory, FileText, Fuel, Hammer, ScreenShare, UserCheck, ChevronDown, FolderCog, Forklift, Handshake, HardHat, LayoutDashboard, Luggage, Settings, Shirt, Truck, Users, Wrench } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";

import { FundoVidroQuantico } from "@/components/FundoVidroQuantico";
import { ICONES } from "@/components/layout/AppSidebar";
import { useAccess } from "@/lib/access-context";
import { gruposDoInicio, type IconeInicio, type SecaoInicio, type SubitemInicio } from "@/lib/inicio";

// Matriz de acessos por usuário (card Configurações): só no modo demonstração; na produção a condição é falsa na compilação e o código nem é gerado.
const ConfiguracoesAcessos = import.meta.env.VITE_DEMO_MODE !== "false"
  ? lazy(() => import("@/components/layout/ConfiguracoesAcessos").then((m) => ({ default: m.ConfiguracoesAcessos })))
  : null;

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({ meta: [{ title: "Início | Patrimônio GEMAPE" }] }),
  component: PaginaInicio,
});

const ICONES_CARTAO: Record<IconeInicio, typeof Car> = {
  LayoutDashboard: ChartPie, HardHat, Shirt, Wrench, Car, Luggage, Forklift, FolderCog, Building2, Users, Truck, Handshake,
};

// Pá carregadeira (o lucide não traz uma): corpo com cabine, duas rodas, braço e caçamba, no mesmo traço dos outros ícones.
const PaCarregadeira = createLucideIcon("PaCarregadeira", [
  ["circle", { cx: "6.5", cy: "17", r: "2.5", key: "r1" }],
  ["circle", { cx: "15.5", cy: "17", r: "2.5", key: "r2" }],
  ["path", { d: "M4 17H3v-5l2-4h5v6h2", key: "cabine" }],
  ["path", { d: "M9 17h4M10 11l5-3", key: "braco" }],
  ["path", { d: "M15 6l6 .5-1 6.5h-6z", key: "cacamba" }],
]);

// EPIs (máscara e botas de borracha com brilhos) e calça (Uniformes): o lucide não traz; mesmo traço dos outros ícones.
const Botina = createLucideIcon("Botina", [
  ["path", { d: "M5 2.5h5.5a1 1 0 0 1 1 1V6a4.5 4.5 0 0 1-3.75 4.4A4.5 4.5 0 0 1 4 6V3.5a1 1 0 0 1 1-1z", key: "mascara" }],
  ["path", { d: "M7.8 6.5h.01", key: "filtro" }],
  ["path", { d: "M3.5 12.5h4v5l2.9 1c.5.2.8.6.8 1.2V21H3.5z", key: "bota1" }],
  ["path", { d: "M12.8 12.5h4v5l2.9 1c.5.2.8.6.8 1.2V21h-7.7z", key: "bota2" }],
  ["path", { d: "M19 2.5v3M17.5 4h3M15 8h.01", key: "brilhos" }],
]);
const Calca = createLucideIcon("Calca", [
  ["path", { d: "M7 3h10l1.5 18h-5L12 10l-1.5 11h-5z", key: "pernas" }],
  ["path", { d: "M7.3 7h9.4", key: "cintura" }],
]);

// Morphing: cada ícone se desmancha e se refaz como este outro (do mesmo assunto), no mesmo lugar dentro do círculo, e volta.
const ICONES_MORPH: Record<IconeInicio | "Settings", typeof Car> = {
  LayoutDashboard: ChartColumn, Settings: ScreenShare, HardHat: Botina, Shirt: Calca, Wrench: Hammer, Car: Fuel,
  Luggage: Plane, Forklift: PaCarregadeira, FolderCog: FileText, Building2: Factory, Users: UserCheck, Truck: MapPin, Handshake: UserStar,
};

const classeCartao =
  "vidro-cartao group/cartao overflow-hidden rounded-2xl transition duration-200 ease-out hover:-translate-y-1 hover:shadow-2xl hover:ring-2 hover:ring-primary/30 motion-reduce:transition-none motion-reduce:hover:translate-y-0";
const classeFoco = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
// Dois cartões por linha em qualquer tela (um só em celular bem estreito); com número ímpar, o último fica sozinho e centralizado na largura de um cartão.
const gradeDeCartoes =
  "grade-entra mx-auto grid max-w-4xl grid-cols-1 items-start gap-4 min-[480px]:grid-cols-2 sm:gap-6 min-[480px]:[&>li:last-child:nth-child(odd)]:col-span-2 min-[480px]:[&>li:last-child:nth-child(odd)]:mx-auto min-[480px]:[&>li:last-child:nth-child(odd)]:w-[calc(50%-0.5rem)] sm:min-[480px]:[&>li:last-child:nth-child(odd)]:w-[calc(50%-0.75rem)]";
const SECOES: readonly SecaoInicio[] = ["Módulo", "Relatórios", "Parâmetros"];

// Faixa do alto do cartão: degradê azul, duas luzes suaves de fundo e o medalhão com o ícone (mais baixa no celular, para caber mais cartões na tela).
function FaixaDoCartao({ Icone, tipo, atraso }: { Icone: typeof Car; tipo: IconeInicio | "Settings"; atraso: string }) {
  const Morph = ICONES_MORPH[tipo];
  return (
    <span className="relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br from-[oklch(0.88_0.06_255)] via-[oklch(0.93_0.04_255)] to-[oklch(0.98_0.015_255)] text-primary min-[480px]:h-32 sm:h-40 lg:h-44">
      <span aria-hidden="true" className="pointer-events-none absolute -left-8 -top-10 size-32 rounded-full bg-white/60 blur-2xl" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-12 -right-6 size-36 rounded-full bg-primary/15 blur-2xl" />
      <span aria-hidden="true" className="onda-cartao" style={{ "--atraso": atraso } as React.CSSProperties} />
      <span aria-hidden="true" className="onda-cartao" style={{ "--atraso": `calc(${atraso} + 1.8s)` } as React.CSSProperties} />
      <span className="medalhao-cartao relative" style={{ "--atraso": atraso } as React.CSSProperties}>
        <Icone aria-hidden="true" strokeWidth={1.6} />
        {Morph && <Morph aria-hidden="true" strokeWidth={1.6} data-morph="" />}
      </span>
    </span>
  );
}

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
  const [configAberta, setConfigAberta] = useState(false);
  // Configurações é um cartão extra do grupo Visão geral (só o Administrador, só no modo demonstração): a mesma conta vale para o cartão e para o contador do grupo.
  const comConfiguracoes = (titulo: string) => !!ConfiguracoesAcessos && isAdmin && titulo === "Visão geral";
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
      {/* Só a animação e o vidro da vitrine: a cor e o layout da tela seguem os mesmos. */}
      <FundoVidroQuantico claro />
      {/* Sem título na tela: ela começa direto nos cartões. O título fica só para o leitor de tela. */}
      <h1 className="sr-only">Início</h1>
      <div className="relative z-10 mx-auto max-w-5xl space-y-8 sm:space-y-10">
      {gruposDoInicio(isAdmin, podeVerCaminho).map((grupo) => (
        <section key={grupo.titulo} aria-labelledby={`grupo-${grupo.titulo}`} className="mx-auto w-full max-w-4xl space-y-4">
          <h2 id={`grupo-${grupo.titulo}`} className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-primary/80 sm:text-sm">
            {grupo.titulo}
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold tracking-normal text-primary">{grupo.cartoes.length + (comConfiguracoes(grupo.titulo) ? 1 : 0)}</span>
            <span aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
          </h2>
          <ul className={gradeDeCartoes}>
            {grupo.cartoes.map((c, indice) => {
              const Icone = ICONES_CARTAO[c.icone];
              const chave = `${grupo.titulo}/${c.titulo}`;
              const faixa = <FaixaDoCartao Icone={Icone} tipo={c.icone} atraso={`${(indice % 6) * -0.8}s`} />;
              if (!c.itens) {
                return (
                  <li key={chave} data-cartao >
                    <Link to={c.url ?? "/inicio"} className={`flex flex-col ${classeCartao} ${classeFoco}`}>
                      {faixa}
                      <span className="flex flex-col items-center gap-1 px-4 py-4 text-center">
                        <span className="transition-colors duration-200 group-hover/cartao:text-primary font-medium">{c.titulo}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          Clique para acessar
                          <ArrowRight className="size-3.5 transition-transform group-hover/cartao:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              }
              const aberto = abertos.has(chave);
              const idLista = `atalhos-${grupo.titulo}-${c.titulo}`;
              return (
                <li key={chave} data-cartao className={classeCartao}>
                  <button
                    type="button"
                    aria-expanded={aberto}
                    aria-controls={idLista}
                    onClick={() => alternar(chave)}
                    className={`flex w-full flex-col text-left ${classeFoco}`}
                  >
                    {faixa}
                    <span className="flex flex-col items-center gap-1 px-4 py-4 text-center">
                      <span className="transition-colors duration-200 group-hover/cartao:text-primary font-medium">{c.titulo}</span>
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
            {/* Configurações é um cartão ao lado do Dashboard (só o Administrador, só no modo demonstração). */}
            {comConfiguracoes(grupo.titulo) && (
              <li data-cartao>
                <button type="button" onClick={() => setConfigAberta(true)} className={`flex w-full flex-col text-left ${classeCartao} ${classeFoco}`}>
                  <FaixaDoCartao Icone={Settings} tipo="Settings" atraso="-2.4s" />
                  <span className="flex flex-col items-center gap-1 px-4 py-4 text-center">
                    <span className="transition-colors duration-200 group-hover/cartao:text-primary font-medium">Configurações</span>
                    <span className="text-xs text-muted-foreground">Acessos por usuário e por menu</span>
                  </span>
                </button>
              </li>
            )}
          </ul>
        </section>
      ))}
      </div>
      {ConfiguracoesAcessos && isAdmin && configAberta && (
        <Suspense fallback={null}><ConfiguracoesAcessos aberto={configAberta} onAberto={setConfigAberta} /></Suspense>
      )}
    </div>
  );
}
