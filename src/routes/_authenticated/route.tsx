import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { EmpresaProvider, TODAS, useEmpresa } from "@/lib/empresa-context";
import { AccessProvider, type Perfil } from "@/lib/access-context";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: perfil, error: profileError } = await supabase
      .from("perfis" as never).select("id,papel,ativo").eq("id", data.user.id).single();
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
    <Select value={empresaId} onValueChange={setEmpresaId}>
      <SelectTrigger className="w-[210px]">
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

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AccessProvider perfil={perfil}><EmpresaProvider>
      <SidebarProvider>
        <AppSidebar />
        <main className="flex min-h-screen w-full flex-col bg-background">
          <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b bg-card/95 px-4 py-3 backdrop-blur">
            <SidebarTrigger />
            <span className="text-eyebrow hidden sm:inline">Grupo GEMAPE</span>
            <span className="text-xs text-muted-foreground">{perfil.papel === "admin" ? "Administrador" : "Somente consulta"}</span>
            <div className="ml-auto flex items-center gap-2">
              <FiltroEmpresa />
              <a className="text-xs underline" href="/auth?password=update">Trocar senha</a>
              <Button variant="ghost" size="sm" onClick={sair}>
                <LogOut className="mr-1 size-4" /> Sair
              </Button>
            </div>
          </header>
          <div className="flex-1 p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </SidebarProvider>
    </EmpresaProvider></AccessProvider>
  );
}
