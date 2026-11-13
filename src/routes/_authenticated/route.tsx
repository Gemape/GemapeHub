import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense, useEffect } from "react";
import { ArrowLeft, LogOut } from "lucide-react";

import { RedeEFila } from "@/components/layout/RedeEFila";
import { ConsultaRapida } from "@/components/layout/ConsultaRapida";
import { RegistraRecente } from "@/components/inicio/atalhosPessoais";
import { TrocaDeModulo, TrilhaDeNavegacao } from "@/components/layout/NavegacaoRapida";
import { MenuDaArea } from "@/components/layout/MenuDaArea";
import { VisualizadorDocumento } from "@/components/layout/VisualizadorDocumento";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarProvider } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { EmpresaProvider, TODAS, useEmpresa } from "@/lib/empresa-context";
import logoSite from "@/assets/logo-gemape-site.png";
import { AccessProvider, ROTULO_PAPEL, useAccess, type Perfil } from "@/lib/access-context";
import { variaveisSupabaseFaltando } from "@/lib/supabase-env";

// Menu Restaurar e Limpar dados de teste: só existe no modo demonstração (na produção, a condição é falsa na compilação e o código nem é gerado).
const MenuDadosDeTeste = import.meta.env.VITE_DEMO_MODE !== "false"
  ? lazy(() => import("@/components/layout/MenuDadosDeTeste").then((m) => ({ default: m.MenuDadosDeTeste })))
  : null;

// Troca de usuário de teste e matriz de acessos (Configurações): só no modo demonstração, como o menu acima.
const ConfiguracoesDemo = import.meta.env.VITE_DEMO_MODE !== "false"
  ? lazy(() => import("@/components/layout/ConfiguracoesDemo").then((m) => ({ default: m.ConfiguracoesDemo })))
  : null;

// Tela sem permissão (modo demonstração): mostra o aviso no lugar do conteúdo. Em produção `semAcesso` é sempre falso.
function ConteudoComAcesso() {
  const { semAcesso } = useAccess();
  if (!semAcesso) return <Outlet />;
  return (
    <div role="alert" className="panel mx-auto max-w-lg space-y-3 p-6 text-center">
      <p className="text-lg font-semibold">Sem acesso a esta tela</p>
      <p className="text-sm text-muted-foreground">O usuário atual não tem permissão para ver esta tela. Um Administrador pode liberar em Configurações.</p>
      <Button asChild variant="outline"><Link to="/inicio">Ir para o início</Link></Button>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (variaveisSupabaseFaltando().length) throw redirect({ to: "/auth" });
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: perfil, error: profileError } = await supabase
      .from("perfis" as never).select("*").eq("id", data.user.id).single();
    if (profileError || !(perfil as Perfil | null)?.ativo) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }
    return { user: data.user, perfil: perfil as Perfil };
  },
  component: LayoutAutenticado,
});

function FiltroEmpresa() {
  const { empresas, empresaId, setEmpresaId } = useEmpresa();
  return (
    <Select value={empresaId} onValueChange={(v) => { if (v) setEmpresaId(v); }}>
      <SelectTrigger className="w-full min-w-0 sm:w-[210px]">
        <SelectValue placeholder="Empresa" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TODAS}>Todas as empresas</SelectItem>
        {empresas.map((e) => (
          <SelectItem key={e.id} value={e.id}>
            {e.nome_fantasia}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function LayoutAutenticado() {
  const { perfil } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Sem menu lateral: tudo se acessa pelos cartões da tela inicial. Fora dela, o topo traz o botão de voltar ao início.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Remonta só quando troca de tela (rota), não quando só muda o parâmetro da mesma tela: formulários e filtros não se perdem.
  const telaAtual = useRouterState({ select: (s) => s.matches.at(-1)?.routeId ?? "" });
  const noInicio = pathname === "/inicio";

  // Só na demonstração: aplica a aparência escolhida em Configurações (tema, cores, fonte, densidade, favicon). Na produção a condição é falsa e o código não é gerado.
  useEffect(() => {
    if (import.meta.env.VITE_DEMO_MODE === "false") return;
    let parar = () => {};
    let cancelado = false;
    void import("@/lib/configuracoes-demo").then((m) => { if (!cancelado) parar = m.aplicarAparenciaSalva(); });
    return () => { cancelado = true; parar(); };
  }, []);

  // Sessão encerrada em outra aba ou expirada: volta ao login sem deixar dados em cache.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        queryClient.clear();
        navigate({ to: "/auth", replace: true });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [navigate, queryClient]);

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AccessProvider perfil={perfil}><EmpresaProvider>
      <SidebarProvider>
        <main className="layout-app flex min-h-screen w-full min-w-0 flex-col">
          <a href="#conteudo-principal" className="sr-only z-[80] rounded-md bg-background px-3 py-2 text-sm font-medium shadow-lg focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Pular para o conteúdo</a>
          <header className="layout-cabecalho z-10 grid md:sticky md:top-0 grid-cols-1 items-center gap-x-3 gap-y-2 glass border-x-0 border-t-0 px-3 py-3 rounded-none sm:px-4 sm:py-5 md:grid-cols-[auto_1fr_auto] min-[1760px]:grid-cols-[1fr_auto_1fr]!">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {!noInicio && <TrocaDeModulo />}
            <Link to="/inicio" aria-label="GEMAPE, tela inicial" title="Ir para a tela inicial" className="block w-32 shrink-0 rounded-md sm:w-52 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <div
                className="logo-marca-site"
                role="img"
                aria-label="GEMAPE, 40 anos, máquinas e peças"
                style={{ maskImage: `url(${logoSite})`, WebkitMaskImage: `url(${logoSite})` }}
              />
            </Link>
            {!noInicio && (
              <Button asChild variant="outline" size="sm">
                <Link to="/inicio"><ArrowLeft className="mr-1 size-4" aria-hidden="true" />Voltar ao início</Link>
              </Button>
            )}
            {!noInicio && <MenuDaArea />}
            </div>
            {/* Título da marca, centralizado no topo; no celular fica numa linha própria, entre o menu e os filtros. */}
            {/* Nas telas internas o cabeçalho já tem o seletor de módulos, o Voltar e o menu da área: o título só aparece onde sobra espaço (telas largas). */}
            <div className={`min-w-0 px-4 text-center ${noInicio ? "" : "max-[1759px]:invisible max-[1759px]:h-0 max-[1759px]:overflow-hidden"}`}>
              <TituloMarca />
              {import.meta.env["VITE_DEMO_MODE"] === "false" && <p className="text-xs text-muted-foreground">{ROTULO_PAPEL[perfil.papel] ?? perfil.papel}</p>}
            </div>
            {/* No celular os controles ficam em duas colunas (usuário em linha própria, depois testes e empresa); a partir de md voltam a uma linha só. */}
            <div className="grid grid-cols-2 items-center gap-2 md:flex md:flex-wrap md:justify-end lg:flex-nowrap [&_button]:h-8 [&_button]:gap-1.5 [&_button]:px-2.5 [&_button]:text-xs [&_svg]:size-3.5">
              {ConfiguracoesDemo && <Suspense fallback={null}><div className="col-span-2 min-w-0 md:col-auto"><ConfiguracoesDemo /></div></Suspense>}
              {MenuDadosDeTeste && <Suspense fallback={null}><div className="min-w-0"><MenuDadosDeTeste /></div></Suspense>}
              <div className="min-w-0"><FiltroEmpresa /></div>
              {import.meta.env["VITE_DEMO_MODE"] === "false" && <><a className="text-xs underline" href="/auth?password=update">Trocar senha</a>
              <Button variant="ghost" size="sm" onClick={sair}>
                <LogOut className="mr-1 size-4" /> Sair
              </Button></>}
            </div>
          </header>
          <div id="conteudo-principal" tabIndex={-1} className="min-w-0 flex-1 p-3 outline-none sm:p-4 md:p-6">
            <TrilhaDeNavegacao />
            <div key={telaAtual} className="pagina-entra"><ConteudoComAcesso /></div>
            <RegistraRecente />
          </div>
          <VisualizadorDocumento />
          <ConsultaRapida />
          <RedeEFila />
        </main>
      </SidebarProvider>
    </EmpresaProvider></AccessProvider>
  );
}

// Ponto de partida (espalhado) de cada letra na montagem: valores fixos derivados do índice, sem sorteio, para não mudar entre renderizações.
function espalhada(i: number, atraso: number): React.CSSProperties {
  const x = ((i * 37) % 13) - 6;
  const y = ((i * 53) % 9) - 4;
  return { "--d": `${(atraso + i * 0.12).toFixed(2)}s`, "--x": `${x * 14}px`, "--y": `${y * 9}px`, "--r": `${(((i * 29) % 11) - 5) * 40}deg` } as React.CSSProperties;
}

// Os dois textos do topo se alternam: um se desfaz em poeira e, em seguida, o outro se reconstrói no mesmo lugar (a metade do ciclo para cada um).
const TEXTOS_DO_TOPO = ["GESTÃO DE PATRIMÔNIO", "GEMAPE MÁQUINAS E PEÇAS LTDA"] as const;
const CICLO_S = 22; // ciclo completo em segundos: cada texto ocupa metade (a CSS lê --ciclo)

// Título do topo: cada letra grossa e arredondada, se desfazendo em poeira e se reconstruindo; o texto fica só para o leitor de tela.
function TituloMarca() {
  return (
    <p className="grid w-full justify-items-center overflow-x-clip" style={{ "--ciclo": `${CICLO_S}s` } as React.CSSProperties}>
      <span className="sr-only">Gestão de Patrimônio e Gemape Máquinas e Peças Ltda</span>
      {TEXTOS_DO_TOPO.map((texto, k) => {
        let n = 0;
        return (
          <span key={texto} aria-hidden="true" className="col-start-1 row-start-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 sm:gap-x-5">
            {texto.split(" ").map((palavra) => (
              <span key={palavra + n} className="flex gap-0.5 sm:gap-1">
                {[...palavra].map((letra) => (
                  <span key={n} className="letra-marca" style={espalhada(n++, (k * CICLO_S) / TEXTOS_DO_TOPO.length)}>
                    {letra}
                  </span>
                ))}
              </span>
            ))}
          </span>
        );
      })}
    </p>
  );
}
