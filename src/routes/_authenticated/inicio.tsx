import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Car, FolderCog, Forklift, Handshake, HardHat, LayoutDashboard, Luggage, Shirt, Truck, Users, Wrench } from "lucide-react";

import { useAccess } from "@/lib/access-context";
import { gruposDoInicio, type IconeInicio } from "@/lib/inicio";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({ meta: [{ title: "Início | Patrimônio GEMAPE" }] }),
  component: PaginaInicio,
});

const ICONES: Record<IconeInicio, typeof Car> = {
  LayoutDashboard, HardHat, Shirt, Wrench, Car, Luggage, Forklift, FolderCog, Building2, Users, Truck, Handshake,
};

// Tela inicial: o menu em cartões (ícone, título e "Clique para acessar"), nos mesmos grupos do menu lateral.
function PaginaInicio() {
  const { isAdmin } = useAccess();
  return (
    <div className="space-y-8">
      <header>
        <p className="text-eyebrow">Início</p>
        <h1 className="text-2xl font-bold">Gestão de Patrimônio</h1>
        <p className="mt-1 text-sm text-muted-foreground">Escolha onde você quer trabalhar.</p>
      </header>
      {gruposDoInicio(isAdmin).map((grupo) => (
        <section key={grupo.titulo} aria-labelledby={`grupo-${grupo.titulo}`} className="space-y-3">
          <h2 id={`grupo-${grupo.titulo}`} className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{grupo.titulo}</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grupo.cartoes.map((c) => {
              const Icone = ICONES[c.icone];
              return (
                <li key={`${grupo.titulo}-${c.titulo}`}>
                  <Link
                    to={c.url}
                    className="group flex h-full flex-col overflow-hidden rounded-lg bg-card shadow-sm ring-1 ring-border transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    <span className="flex h-20 items-center justify-center bg-primary/10 text-primary">
                      <Icone className="size-7" aria-hidden="true" />
                    </span>
                    <span className="flex flex-1 flex-col items-center justify-center gap-1 px-4 py-4 text-center">
                      <span className="font-semibold">{c.titulo}</span>
                      <span className="text-xs text-muted-foreground">Clique para acessar</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
