import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({ ssr: false, component: PaginaAuth });
function PaginaAuth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [modo, setModo] = useState<"entrar" | "recuperar" | "alterar">(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("password") === "update" ? "alterar" : "entrar");
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(event => { if (event === "PASSWORD_RECOVERY") setModo("alterar"); });
    return () => data.subscription.unsubscribe();
  }, []);
  async function enviar(e: React.FormEvent) {
    e.preventDefault(); setCarregando(true);
    try {
      if (modo === "recuperar") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth?password=update` });
        if (error) throw error;
        toast.success("Se o e-mail estiver cadastrado, você receberá instruções de recuperação."); setModo("entrar");
      } else if (modo === "alterar") {
        if (senha !== confirmacao) throw new Error("As senhas não coincidem");
        const { error } = await supabase.auth.updateUser({ password: senha });
        if (error) throw error;
        await supabase.auth.signOut(); setSenha(""); setConfirmacao(""); setModo("entrar");
        window.history.replaceState(null, "", "/auth"); toast.success("Senha alterada. Entre novamente.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
        if (error) throw new Error("E-mail ou senha inválidos");
        const { data: perfil, error: profileError } = await supabase.from("perfis" as never).select("ativo").eq("id", data.user.id).single();
        if (profileError || !(perfil as { ativo: boolean } | null)?.ativo) {
          await supabase.auth.signOut(); throw new Error("Seu acesso não está ativo. Contate o administrador.");
        }
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível concluir"); }
    finally { setCarregando(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 p-4">
    <Card className="w-full max-w-md shadow-xl"><CardHeader><p className="text-sm font-semibold tracking-widest text-primary">GEMAPE</p><CardTitle className="text-2xl">Gestão de patrimônio</CardTitle><p className="text-sm text-muted-foreground">{modo === "entrar" ? "Entre com sua conta corporativa." : modo === "recuperar" ? "Recupere seu acesso por e-mail." : "Defina uma nova senha com pelo menos 12 caracteres."}</p></CardHeader>
      <CardContent><form onSubmit={enviar} className="space-y-4">
        {modo !== "alterar" && <div><Label htmlFor="email">E-mail</Label><Input id="email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></div>}
        {modo !== "recuperar" && <div><Label htmlFor="senha">Senha</Label><Input id="senha" type="password" autoComplete={modo === "entrar" ? "current-password" : "new-password"} minLength={modo === "alterar" ? 12 : 1} maxLength={128} required value={senha} onChange={e => setSenha(e.target.value)} /></div>}
        {modo === "alterar" && <div><Label htmlFor="confirmacao">Confirmar senha</Label><Input id="confirmacao" type="password" autoComplete="new-password" required value={confirmacao} onChange={e => setConfirmacao(e.target.value)} /></div>}
        <Button className="w-full" type="submit" disabled={carregando}>{carregando ? "Aguarde…" : modo === "entrar" ? "Entrar" : modo === "recuperar" ? "Enviar instruções" : "Salvar nova senha"}</Button>
        <Button className="w-full" variant="link" type="button" onClick={() => setModo(modo === "entrar" ? "recuperar" : "entrar")}>{modo === "entrar" ? "Esqueci minha senha" : "Voltar ao acesso"}</Button>
      </form><p className="mt-4 text-xs text-muted-foreground">Contas e permissões são gerenciadas pelo administrador.</p></CardContent>
    </Card>
  </main>;
}
