import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/lib/access-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export const Route = createFileRoute("/_authenticated/usuarios")({ component: Usuarios });
type Usuario = { id: string; email: string; ativo: boolean; papel: "admin" | "consulta" };
async function api(method = "GET", body?: unknown, page = 1) {
  const { data } = await supabase.auth.getSession();
  const result = await fetch(`/api/admin/users?page=${page}`, { method, headers: { Authorization: `Bearer ${data.session?.access_token}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const json = await result.json(); if (!result.ok) throw new Error(json.error ?? "Falha na administração"); return json;
}
function Usuarios() {
  const { canWrite, perfil } = useAccess(); const queryClient = useQueryClient();
  const [page, setPage] = useState(1); const [busy, setBusy] = useState(false);
  const { data = [], error, isLoading } = useQuery<Usuario[]>({ queryKey: ["usuarios", page], queryFn: () => api("GET", undefined, page), enabled: canWrite });
  async function executar(action: () => Promise<unknown>) {
    setBusy(true);
    try { await action(); await queryClient.invalidateQueries({ queryKey: ["usuarios"] }); toast.success("Operação concluída"); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  if (!canWrite) return <p role="alert">Acesso restrito ao administrador.</p>;
  return <section className="space-y-6"><h1 className="text-2xl font-bold">Usuários e permissões</h1>
    <form className="panel flex flex-wrap items-end gap-3 p-4" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void executar(() => api("POST", { email: f.get("email"), password: f.get("password") })); }}>
      <div><Label htmlFor="new-email">E-mail</Label><Input name="email" id="new-email" type="email" required /></div><div><Label htmlFor="new-password">Senha inicial</Label><Input name="password" id="new-password" type="password" minLength={12} required autoComplete="new-password" /></div><Button type="submit" disabled={busy}>Criar conta desativada</Button>
    </form>{error && <p role="alert">{error.message}</p>}{isLoading && <p>Carregando usuários…</p>}
    <div className="space-y-3">{data.map(u => <article className="panel flex flex-wrap items-center gap-3 p-4" key={u.id}><div className="mr-auto"><p className="font-medium">{u.email}</p><p className="text-sm">{u.papel} · {u.ativo ? "Ativo" : "Desativado"}</p></div>
      <Button disabled={busy || u.id === perfil?.id} variant="outline" onClick={() => { if (confirm(`Alterar acesso de ${u.email}?`)) void executar(() => api("PATCH", { id: u.id, papel: u.papel, ativo: !u.ativo })); }}>{u.ativo ? "Desativar" : "Ativar"}</Button>
      <Button disabled={busy || u.id === perfil?.id} variant="outline" onClick={() => { if (confirm(`Alterar papel de ${u.email}?`)) void executar(() => api("PATCH", { id: u.id, ativo: u.ativo, papel: u.papel === "admin" ? "consulta" : "admin" })); }}>Alterar papel</Button>
      <Button disabled={busy} variant="outline" onClick={() => void executar(async () => { const { error } = await supabase.auth.resetPasswordForEmail(u.email, { redirectTo: `${window.location.origin}/auth?password=update` }); if (error) throw error; })}>Enviar recuperação</Button>
    </article>)}</div><div className="flex gap-3"><Button disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button><span>Página {page}</span><Button disabled={data.length < 50} onClick={() => setPage(page + 1)}>Próxima</Button></div>
  </section>;
}
