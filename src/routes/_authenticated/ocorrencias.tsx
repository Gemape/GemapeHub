import { createFileRoute } from "@tanstack/react-router";
import { OcorrenciasModulo } from "@/components/modules/OcorrenciasModulo";

export const Route = createFileRoute("/_authenticated/ocorrencias")({
  component: () => (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tighter text-foreground font-display uppercase">
          Cadastro de Ocorrências
        </h1>
        <p className="text-muted-foreground mt-1">
          Registro e acompanhamento de ocorrências patrimoniais.
        </p>
      </div>
      <OcorrenciasModulo />
    </div>
  ),
});
