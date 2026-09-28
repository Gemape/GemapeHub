import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/ocorrencias")({
  component: () => (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tighter text-foreground font-display uppercase">Ocorrências por módulo</h1>
        <p className="text-muted-foreground mt-1">
          Abra a aba Ocorrências do módulo correspondente para registrar e acompanhar seus casos.
        </p>
      </div>
      <nav className="grid gap-3 sm:grid-cols-2">
        <Link className="panel p-4 font-medium hover:underline" to="/epi">EPIs</Link>
        <Link className="panel p-4 font-medium hover:underline" to="/uniformes">Uniformes</Link>
        <Link className="panel p-4 font-medium hover:underline" to="/ferramentas">Ferramentas</Link>
        <Link className="panel p-4 font-medium hover:underline" to="/veiculos">Veículos</Link>
      </nav>
    </div>
  ),
});
