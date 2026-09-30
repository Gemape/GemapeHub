import { createFileRoute, Outlet } from "@tanstack/react-router";

import { useAccess } from "@/lib/access-context";

export const Route = createFileRoute("/_authenticated/cadastros/gerais")({
  component: CadastrosGerais,
});

// Especificação (rev1): Cadastros > Gerais só para o Administrador. Usuário simples não tem acesso.
function CadastrosGerais() {
  const { isAdmin } = useAccess();
  if (!isAdmin) {
    return (
      <div className="panel p-6 text-sm text-muted-foreground">
        Você não tem acesso aos Cadastros Gerais.
      </div>
    );
  }
  return <Outlet />;
}
