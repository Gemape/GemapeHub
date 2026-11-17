import { createFileRoute } from "@tanstack/react-router";
import { confirmar } from "@/components/ConfirmarAcao";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ROTULO_PAPEL, useAccess, type Papel } from "@/lib/access-context";
import { useEmpresasQuery } from "@/lib/empresa-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export const Route = createFileRoute("/_authenticated/usuarios")({ component: Usuarios });
type Usuario = { id: string; email: string; ativo: boolean; papel: Papel; empresa_id: string | null };
async function api(method = "GET", body?: unknown, page = 1) {
  const { data } = await supabase.auth.getSession();
  const result = await fetch(`/api/admin/users?page=${page}`, { method, headers: { Authorization: `Bearer ${data.session?.access_token}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const json = await result.json(); if (!result.ok) throw new Error(json.error ?? "Falha na administração"); return json;
}
const acesso = (u: Usuario) => ({ id: u.id, papel: u.papel, ativo: u.ativo, empresa_id: u.empresa_id ?? null });
function Usuarios() {
  const { isAdmin, perfil } = useAccess(); const queryClient = useQueryClient();
  const { data: empresas = [] } = useEmpresasQuery();
  const [page, setPage] = useState(1); const [busy, setBusy] = useState(false);
  const demo = import.meta.env["VITE_DEMO_MODE"] !== "false";
  const { data = [], error, isLoading } = useQuery<Usuario[]>({ queryKey: ["usuarios", page], queryFn: () => api("GET", undefined, page), enabled: isAdmin && !demo });
  async function executar(action: () => Promise<unknown>) {
    setBusy(true);
    try { await action(); await queryClient.invalidateQueries({ queryKey: ["usuarios"] }); toast.success("Operação concluída"); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  const nomeEmpresa = (id: string | null) => id ? empresas.find(e => e.id === id)?.nome_fantasia ?? "—" : "Todas";
  if (!isAdmin) return <p role="alert">Acesso restrito ao administrador.</p>;
  if (demo) return <p>Usuários e permissões estarão disponíveis quando a autenticação e o banco de dados forem configurados.</p>;
  return <section className="space-y-6"><div><h1 className="text-2xl font-bold">Usuários e permissões</h1><p className="mt-1 text-sm text-muted-foreground">Cria os usuários do sistema e define o que cada um pode ver e alterar.</p></div>
    <form className="panel flex flex-wrap items-end gap-3 p-4" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void executar(() => api("POST", { email: f.get("email"), password: f.get("password") })); }}>
      <div><Label htmlFor="new-email">E-mail</Label><Input name="email" id="new-email" type="email" required /></div><div><Label htmlFor="new-password">Senha inicial</Label><Input name="password" id="new-password" type="password" minLength={12} required autoComplete="new-password" /></div><Button type="submit" disabled={busy}>Criar conta desativada</Button>
    </form>{error && <p role="alert">{error.message}</p>}{isLoading && <p>Carregando usuários…</p>}
    <div className="space-y-3">{data.map(u => <article className="panel flex flex-wrap items-center gap-3 p-4" key={u.id}><div className="mr-auto"><p className="font-medium">{u.email}</p><p className="text-sm">{ROTULO_PAPEL[u.papel] ?? u.papel} · {nomeEmpresa(u.empresa_id)} · {u.ativo ? "Ativo" : "Desativado"}</p></div>
      <form className="flex flex-wrap items-center gap-2" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); const papel = f.get("papel") as Papel; const empresa = String(f.get("empresa_id") || ""); void executar(() => api("PATCH", { ...acesso(u), papel, empresa_id: papel === "admin" ? null : empresa || null })); }}>
        <select aria-label={`Papel de ${u.email}`} name="papel" defaultValue={u.papel} disabled={busy || u.id === perfil?.id} className="h-9 rounded-md border bg-background px-2 text-sm">
          {(Object.keys(ROTULO_PAPEL) as Papel[]).map(p => <option key={p} value={p}>{ROTULO_PAPEL[p]}</option>)}
        </select>
        <select aria-label={`Empresa de ${u.email}`} name="empresa_id" defaultValue={u.empresa_id ?? ""} disabled={busy || u.id === perfil?.id} className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="">Todas (somente admin)</option>
          {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_fantasia}</option>)}
        </select>
        <Button type="submit" variant="outline" disabled={busy || u.id === perfil?.id}>Salvar acesso</Button>
      </form>
      <Button disabled={busy || u.id === perfil?.id} variant="outline" onClick={async () => { if (await confirmar({ titulo: `${u.ativo ? "Desativar" : "Ativar"} o acesso de ${u.email}?`, rotuloConfirmar: u.ativo ? "Desativar" : "Ativar", destrutivo: u.ativo })) void executar(() => api("PATCH", { ...acesso(u), ativo: !u.ativo })); }}>{u.ativo ? "Desativar" : "Ativar"}</Button>
      <Button disabled={busy} variant="outline" onClick={() => void executar(async () => { const { error } = await supabase.auth.resetPasswordForEmail(u.email, { redirectTo: `${window.location.origin}/auth?password=update` }); if (error) throw error; })}>Enviar recuperação</Button>
    </article>)}</div><div className="flex gap-3"><Button disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button><span>Página {page}</span><Button disabled={data.length < 50} onClick={() => setPage(page + 1)}>Próxima</Button></div>
  </section>;
}
