import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Car, Forklift, HardHat, Luggage, Shirt, Wrench } from "lucide-react";
import { useEffect } from "react";

import { LogoEntrada } from "@/components/layout/LogoEntrada";
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

const MODULOS = [
  { titulo: "EPIs", texto: "CA, entrega por empregado e alerta de reposição", icone: HardHat },
  { titulo: "Uniformes", texto: "Tipo, tamanho, cor e controle de entrega", icone: Shirt },
  { titulo: "Ferramentas", texto: "Caixas, vistorias e ocorrências, cada ferramenta em uma caixa só", icone: Wrench },
  { titulo: "Veículos", texto: "Abastecimento, manutenção, check list e extrato", icone: Car },
  { titulo: "Equipamentos", texto: "Horímetro, plano de manutenção e check list", icone: Forklift },
  { titulo: "Viagens", texto: "Despesas dos empregados e relatório de viagens", icone: Luggage },
];

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
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="mancha-luz mancha-a -left-24 top-10 size-[28rem] bg-[oklch(0.62_0.22_262/0.55)]" />
        <div className="mancha-luz mancha-b -right-20 top-1/3 size-[32rem] bg-[oklch(0.7_0.16_235/0.4)]" />
        <div className="mancha-luz mancha-a bottom-0 left-1/3 size-[26rem] bg-[oklch(0.5_0.25_285/0.45)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:py-24">
        <div className="flex flex-col items-center gap-10 text-center">
          <div className="vidro-entra flex w-full justify-center" style={{ "--atraso": "0.05s" } as React.CSSProperties}>
            <LogoEntrada grande />
          </div>

          <div
            className="vidro-claro vidro-reflexo vidro-entra max-w-3xl rounded-3xl p-7 sm:p-12"
            style={{ "--atraso": "0.25s" } as React.CSSProperties}
          >
            <p className="text-lg font-medium leading-relaxed text-white sm:text-xl">
              EPIs, uniformes, ferramentas, veículos e equipamentos de GEMAPE, GMP e LAPA em um só lugar: estoque, movimentações por empregado, check lists,
              vistorias, ocorrências, manutenção e alertas de reposição.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-4">
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

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:mt-24 lg:grid-cols-3">
          {MODULOS.map((m, i) => (
            <div
              key={m.titulo}
              className="vidro-claro vidro-reflexo vidro-entra group rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-white/40"
              style={{ "--atraso": `${0.45 + i * 0.08}s` } as React.CSSProperties}
            >
              <div className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-white/30 bg-white/15 text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.4)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-6deg]">
                <m.icone className="size-7" />
              </div>
              <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">{m.titulo}</h2>
              <p className="mt-2 text-sm font-light leading-relaxed text-white/75">{m.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
