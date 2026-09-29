import { createFileRoute, Outlet } from "@tanstack/react-router";

import { useAccess } from "@/lib/access-context";

export const Route = createFileRoute("/_authenticated/parametros")({
  component: ParametrosBase,
});

// Especificação: Parâmetros Base só para o Administrador. Usuário simples não tem acesso.
function ParametrosBase() {
  const { isAdmin } = useAccess();
  if (!isAdmin) {
    return (
      <div className="panel p-6 text-sm text-muted-foreground">
        Você não tem acesso aos Parâmetros Base.
      </div>
    );
  }
  return <Outlet />;
}
