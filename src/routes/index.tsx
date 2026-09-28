import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Car, HardHat, Shirt, Wrench } from "lucide-react";
import { useEffect } from "react";

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
        content: "Gestão de EPIs, uniformes, ferramentas e veículos.",
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
  { titulo: "Ferramentas", texto: "Número de série, vistorias e ocorrências", icone: Wrench },
  { titulo: "Veículos", texto: "Placa, RENAVAM, km e responsável", icone: Car },
];

function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    if (variaveisSupabaseFaltando().length) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <div className="relative min-h-screen bg-primary overflow-hidden selection:bg-white/30">
      {/* Background elements - Removed pulses and circles for solid match */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-primary" />

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-20 lg:py-32">
        <div className="flex flex-col items-center text-center gap-12">
          <div className="w-full max-w-[500px] flex flex-col items-center animate-float">
            <img
              src="/logo.png"
              alt="GEMAPE"
              className="w-full h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
            />
          </div>

          <div className="max-w-3xl bg-white/10 backdrop-blur-xl rounded-3xl p-8 sm:p-12 border border-white/20 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            <p className="text-xl text-white leading-relaxed font-medium">
              EPIs, uniformes, ferramentas e veículos de GEMAPE, GMP e LAPA em um só lugar: estoque,
              movimentações por empregado, vistorias, ocorrências e alertas de reposição.
            </p>
            <div className="mt-10 flex justify-center flex-wrap gap-4">
              <Button
                asChild
                size="lg"
                className="bg-white text-primary hover:bg-white/90 font-bold px-10 py-7 text-lg rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95"
              >
                <Link to="/auth">Acessar o sistema</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {MODULOS.map((m) => (
            <div
              key={m.titulo}
              className="group relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all hover:bg-white/10 hover:border-white/20 hover:-translate-y-1 shadow-2xl"
            >
              <div className="flex size-12 items-center justify-center rounded-xl bg-white/10 text-white mb-6 group-hover:scale-110 transition-transform">
                <m.icone className="size-6" />
              </div>
              <h2 className="font-display text-xl font-black text-white uppercase tracking-tight">
                {m.titulo}
              </h2>
              <p className="mt-3 text-sm text-primary-foreground/70 leading-relaxed font-light">
                {m.texto}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
