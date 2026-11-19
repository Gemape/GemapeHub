import { createFileRoute } from "@tanstack/react-router";
import { EyebrowDoCard } from "@/components/layout/EyebrowDoCard";
import { FerramentasPlanoVistorias } from "@/components/modules/FerramentasPlanoVistorias";

export const Route = createFileRoute("/_authenticated/cadastros/ferramentas-plano-vistorias")({
  head: () => ({ meta: [{ title: "Plano de vistorias | Patrimônio GEMAPE" }] }),
  component: PaginaPlanoVistorias,
});

function PaginaPlanoVistorias() {
  return (
    <div className="space-y-5">
      <header>
        <EyebrowDoCard fallback="Parâmetros" />
        <h1 className="text-2xl font-bold">Plano de vistorias</h1>
      </header>
      {import.meta.env["VITE_DEMO_MODE"] === "false"
        ? <p>O plano de vistorias será conectado ao banco após a aprovação da demonstração.</p>
        : <FerramentasPlanoVistorias />}
    </div>
  );
}
