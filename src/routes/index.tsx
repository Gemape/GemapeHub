import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { LogoEntrada } from "@/components/layout/LogoEntrada";
import { FundoVidroQuantico } from "@/components/FundoVidroQuantico";
import { TextoDecodificado } from "@/components/TextoDecodificado";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { variaveisSupabaseFaltando } from "@/lib/supabase-env";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gestão GEMAPE" },
      {
        name: "description",
        content: "Sistema de controle de patrimônio e estoque GEMAPE.",
      },
      { property: "og:title", content: "Gestão GEMAPE" },
      {
        property: "og:description",
        content: "Gestão de EPIs, uniformes, ferramentas, veículos, equipamentos e viagens.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    if (variaveisSupabaseFaltando().length) return;
    // Só na demonstração: /?vitrine mostra esta página mesmo com a sessão de teste (some do pacote de produção).
    if (import.meta.env.VITE_DEMO_MODE !== "false" && new URLSearchParams(window.location.search).has("vitrine")) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/inicio", replace: true });
    });
  }, [navigate]);

  return (
    <div className="fundo-vidro relative min-h-screen overflow-hidden selection:bg-white/30">
      {/* Manchas de luz que derivam devagar atrás do vidro. */}
      <FundoVidroQuantico />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center justify-center px-5 py-14 sm:px-6 lg:py-24">
        <div className="flex w-full flex-col items-center gap-10 text-center">
          <div className="vidro-entra flex w-full justify-center" style={{ "--atraso": "0.05s" } as React.CSSProperties}>
            <LogoEntrada grande />
          </div>

          <div
            className="vidro-entra max-w-5xl px-2 sm:px-8"
            style={{ "--atraso": "0.25s" } as React.CSSProperties}
          >
            <TextoDecodificado texto="Sistema de Gestão de Patrimônio Gemape" destaque="Gemape" className="font-display text-4xl font-black leading-[1.05] tracking-tight text-white [text-wrap:balance] sm:text-6xl lg:text-7xl" />
            <div className="mt-10 flex flex-wrap justify-center gap-4 sm:mt-14">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-white px-10 py-7 text-lg font-bold text-primary shadow-[0_12px_40px_-8px_oklch(1_0_0/0.55)] transition-all hover:scale-105 hover:bg-white/95 active:scale-95"
              >
                <Link to="/auth">Acessar o sistema</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
