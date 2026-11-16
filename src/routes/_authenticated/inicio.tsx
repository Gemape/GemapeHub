import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChevronsUp, Star, ChartPie, createLucideIcon, MapPin, Plane, UserStar, Building2, Car, ChartColumn, Factory, FileText, Fuel, Hammer, ScreenShare, UserCheck, ChevronDown, FolderCog, Forklift, Handshake, HardHat, LayoutDashboard, Luggage, Settings, Shirt, Truck, Users, Wrench } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";

import { CicladorDeIcones } from "@/components/CicladorDeIcones";
import { FundoVidroQuantico } from "@/components/FundoVidroQuantico";
import { AtalhosPessoais, useAtalhosPessoais } from "@/components/inicio/atalhosPessoais";
import { AtencaoHoje } from "@/components/inicio/AtencaoHoje";
import { BuscaRapida } from "@/components/inicio/BuscaRapida";
import { ICONES } from "@/components/layout/AppSidebar";
import { useAccess } from "@/lib/access-context";
import { chaveDoAtalho, type AtalhoGuardado } from "@/lib/atalhos-usuario";
import { gruposDoInicio, lerAbertos, guardarAbertos, type IconeInicio, type SecaoInicio, type SubitemInicio } from "@/lib/inicio";

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

// EPIs (botina de segurança de cano alto, com cadarço, costura e solado com cravos) e calça (Uniformes): o lucide não traz; mesmo traço dos outros ícones.
const Botina = createLucideIcon("Botina", [
  ["path", { d: "M5.5 2.5h6.5v7l6.4 2.5A3.5 3.5 0 0 1 21 15.3V18H3v-6z", key: "cano" }],
  ["path", { d: "M3 18h18v2.5H3z", key: "solado" }],
  ["path", { d: "M6.5 20.5v1.5M10.5 20.5v1.5M14.5 20.5v1.5M18.5 20.5v1.5", key: "cravos" }],
  ["path", { d: "M8.5 4.5l3.5 1M8.5 7l3.5 1M8.5 9.5l4.5 1.5", key: "cadarco" }],
  ["path", { d: "M3.3 15h13", key: "costura" }],
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
const classeApertar = "active:scale-[0.99] motion-reduce:active:scale-100";
const classeFoco = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
// Um cartão por linha em celular estreito, dois a partir de 480 px e três em tela larga. As linhas se centralizam (`justify-center`), então a última, mais curta, fica no meio
// em vez de colada à esquerda. O espaço entre os cartões é a variável --gap, usada no `gap` e na conta da largura (sem número repetido).
const gradeDeCartoes = "grade-entra flex flex-wrap items-start justify-center [--gap:1.25rem] gap-[var(--gap)]";
const larguraDoCartao = "w-full min-[480px]:w-[calc((100%-var(--gap))/2)] lg:w-[calc((100%-2*var(--gap))/3)]";
// Id do grupo na página (sem espaço nem acento), igual no atalho e na seção.
const idDoGrupo = (titulo: string) => `secao-${titulo.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
const SECOES: readonly SecaoInicio[] = ["Módulo", "Relatórios", "Parâmetros"];

// Faixa do alto do cartão: degradê azul, duas luzes suaves de fundo e o ícone (dois que se alternam) (mais baixa no celular, para caber mais cartões na tela).
function FaixaDoCartao({ Icone, tipo, atraso }: { Icone: typeof Car; tipo: IconeInicio | "Settings"; atraso: string }) {
  const Morph = ICONES_MORPH[tipo];
  const icones = useMemo(() => [Icone, ...(Morph ? [Morph] : [])], [Icone, Morph]);
  const atrasoMs = Math.abs(Number.parseFloat(atraso) || 0) * 1000;
  return (
    <span className="relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br from-[oklch(0.88_0.06_255)] via-[oklch(0.93_0.04_255)] to-[oklch(0.98_0.015_255)] text-primary min-[480px]:h-32 sm:h-40 lg:h-44">
      <span aria-hidden="true" className="pointer-events-none absolute -left-8 -top-10 size-32 rounded-full bg-white/60 blur-2xl" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-12 -right-6 size-36 rounded-full bg-primary/15 blur-2xl" />
      <span className="medalhao-cartao relative transition-transform duration-300 ease-out group-hover/cartao:scale-110 motion-reduce:transition-none motion-reduce:group-hover/cartao:scale-100" style={{ "--atraso": atraso } as React.CSSProperties}>
        <CicladorDeIcones icones={icones} atrasoMs={atrasoMs} />
      </span>
    </span>
  );
}

// Faixa de atalhos para os grupos da página (Visão geral, Módulos, Cadastros): em tela comprida, um toque desliza até o grupo. "Recolher tudo" aparece quando há cartão aberto.
function AtalhoDosGrupos({ grupos, temAberto, aoRecolher }: { grupos: readonly string[]; temAberto: boolean; aoRecolher: () => void }) {
  const ir = (id: string) => {
    const reduz = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduz ? "auto" : "smooth", block: "start" });
  };
  const chip = `rounded-full border bg-background/70 px-3 py-1 text-xs font-medium transition-colors hover:bg-primary/10 ${classeFoco}`;
  return (
    <nav aria-label="Ir para um grupo" className="mx-auto flex w-full max-w-xl flex-wrap items-center justify-center gap-2">
      {grupos.map((g) => <button key={g} type="button" className={chip} onClick={() => ir(idDoGrupo(g))}>{g}</button>)}
      {temAberto && (
        <button type="button" className={`${chip} inline-flex items-center gap-1 text-primary`} onClick={aoRecolher}>
          <ChevronsUp className="size-3.5" aria-hidden="true" />Recolher tudo
        </button>
      )}
    </nav>
  );
}

function AtalhoDoCartao({ sub, cartao, fixado, aoFixar }: { sub: SubitemInicio; cartao: string; fixado: boolean; aoFixar: (a: AtalhoGuardado) => void }) {
  const IconeSub = ICONES[sub.icone];
  const guardado: AtalhoGuardado = { titulo: sub.titulo, cartao, secao: sub.secao, url: sub.url, ...(sub.search ? { search: sub.search } : {}) };
  return (
    <div className="flex items-center hover:bg-primary/10">
      <Link to={sub.url} search={sub.search as never} className={`flex min-w-0 flex-1 items-center gap-2 py-2.5 pl-4 pr-2 text-sm ${classeFoco}`}>
        <IconeSub className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="truncate">{sub.titulo}</span>
      </Link>
      <button
        type="button"
        aria-pressed={fixado}
        aria-label={`${fixado ? "Desafixar" : "Fixar"} ${sub.titulo} no topo da tela inicial`}
        title={fixado ? "Desafixar do topo" : "Fixar no topo"}
        onClick={() => aoFixar(guardado)}
        className={`mr-2 grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:text-primary ${classeFoco}`}
      >
        <Star className={`size-4 transition-transform duration-200 ${fixado ? "fill-primary text-primary scale-110" : ""}`} aria-hidden="true" />
      </button>
    </div>
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
  // O que o operador abriu ou recolheu fica guardado neste navegador: a tela volta como ele deixou. Lê depois de montar para não divergir do HTML do servidor.
  useEffect(() => setAbertos(lerAbertos()), []);
  const alternar = (chave: string) => {
    const nova = new Set(abertos);
    if (!nova.delete(chave)) nova.add(chave);
    setAbertos(nova);
    guardarAbertos(nova);
  };
  const { fixados, recentes, alternar: alternarFixado } = useAtalhosPessoais();
  const grupos = useMemo(() => gruposDoInicio(isAdmin, podeVerCaminho), [isAdmin, podeVerCaminho]);

  return (
    <div className="fonte-manrope">
      {/* Só a animação e o vidro da vitrine: a cor e o layout da tela seguem os mesmos. */}
      <FundoVidroQuantico claro />
      {/* Sem título na tela: ela começa direto nos cartões. O título fica só para o leitor de tela. */}
      <h1 className="sr-only">Início</h1>
      <div className="relative z-10 mx-auto max-w-5xl space-y-8 sm:space-y-10">
      <BuscaRapida grupos={grupos} />
      <AtalhoDosGrupos grupos={grupos.map((g) => g.titulo)} temAberto={grupos.some((g) => g.cartoes.some((c) => c.itens && abertos.has(`${g.titulo}/${c.titulo}`)))} aoRecolher={() => { const vazio = new Set<string>(); setAbertos(vazio); guardarAbertos(vazio); }} />
      <AtencaoHoje />
      <AtalhosPessoais fixados={fixados.filter((a) => podeVerCaminho(a.url, a.search))} recentes={recentes.filter((a) => podeVerCaminho(a.url, a.search))} />
      {grupos.map((grupo) => (
        <section key={grupo.titulo} aria-labelledby={`grupo-${grupo.titulo}`} id={idDoGrupo(grupo.titulo)} className="mx-auto w-full max-w-5xl scroll-mt-24 space-y-4">
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
                  <li key={chave} className={larguraDoCartao}>
                    <Link to={c.url ?? "/inicio"} className={`flex flex-col ${classeCartao} ${classeFoco} ${classeApertar}`}>
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
                <li key={chave} className={`${larguraDoCartao} ${classeCartao}`}>
                  <button
                    type="button"
                    aria-expanded={aberto}
                    aria-controls={idLista}
                    onClick={() => alternar(chave)}
                    className={`flex w-full flex-col text-left ${classeFoco} ${classeApertar}`}
                  >
                    {faixa}
                    <span className="flex flex-col items-center gap-1 px-4 py-4 text-center">
                      <span className="transition-colors duration-200 group-hover/cartao:text-primary font-medium">{c.titulo}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        {aberto ? "Clique para recolher" : "Clique para acessar"}
                        <span aria-hidden="true">·</span>
                        <span>{c.itens.length} atalhos</span>
                        <ChevronDown className={`size-3.5 transition-transform motion-reduce:transition-none ${aberto ? "rotate-180" : ""}`} aria-hidden="true" />
                      </span>
                    </span>
                  </button>
                  {aberto && (
                    <div id={idLista} className="animate-in fade-in-0 slide-in-from-top-2 border-t duration-200 motion-reduce:animate-none">
                      {SECOES.map((secao) => {
                        const doCartao = (c.itens ?? []).filter((i) => i.secao === secao);
                        if (doCartao.length === 0) return null;
                        return (
                          <section key={secao} aria-label={secao}>
                            <h3 className="bg-muted/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{secao}</h3>
                            <ul className="divide-y">
                              {doCartao.map((sub) => (
                                <li key={`${sub.titulo}-${sub.url}-${JSON.stringify(sub.search ?? {})}`}><AtalhoDoCartao sub={sub} cartao={c.titulo} fixado={fixados.some((f) => chaveDoAtalho(f) === chaveDoAtalho({ url: sub.url, search: sub.search }))} aoFixar={alternarFixado} /></li>
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
              <li className={larguraDoCartao}>
                <button type="button" onClick={() => setConfigAberta(true)} className={`flex w-full flex-col text-left ${classeCartao} ${classeFoco} ${classeApertar}`}>
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
