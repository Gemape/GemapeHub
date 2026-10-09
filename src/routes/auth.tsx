import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { LogoEntrada } from "@/components/layout/LogoEntrada";
import { variaveisSupabaseFaltando } from "@/lib/supabase-env";

export const Route = createFileRoute("/auth")({ ssr: false, component: PaginaAuth });
function PaginaAuth() {
  const faltando = variaveisSupabaseFaltando();
  if (faltando.length) return <ConfiguracaoAusente variaveis={faltando} />;
  return <FormularioAuth />;
}

function ConfiguracaoAusente({ variaveis }: { variaveis: string[] }) {
  return <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 p-4 [background-attachment:fixed]">
    <LogoEntrada />
    <Card className="w-full max-w-md bg-white/85! shadow-2xl backdrop-blur-xl"><CardHeader><CardTitle className="text-2xl">Conexão com o banco não configurada</CardTitle><p className="text-sm text-muted-foreground">Defina estas variáveis no arquivo <code>.env</code> e reinicie o servidor:</p></CardHeader>
      <CardContent><ul role="alert" className="space-y-1 font-mono text-sm">{variaveis.map(v => <li key={v}>{v}</li>)}</ul><p className="mt-4 text-xs text-muted-foreground">Os valores ficam no painel do Supabase em Project Settings, API. Veja o <code>.env.example</code>.</p></CardContent>
    </Card>
  </main>;
}

function FormularioAuth() {
  const navigate = useNavigate();
  const demo = import.meta.env["VITE_DEMO_MODE"] !== "false";
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
        if (error) throw new Error(error.message === "Invalid login credentials" ? "E-mail ou senha inválidos" : `Não foi possível entrar: ${error.message}`);
        const { data: perfil, error: profileError } = await supabase.from("perfis" as never).select("ativo").eq("id", data.user.id).single();
        if (profileError) {
          console.error("[Auth] Falha ao consultar perfil", profileError);
          await supabase.auth.signOut(); throw new Error("Não foi possível verificar seu perfil. Contate o administrador.");
        }
        if (!(perfil as { ativo: boolean } | null)?.ativo) {
          await supabase.auth.signOut(); throw new Error("Seu acesso não está ativo. Contate o administrador.");
        }
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível concluir"); }
    finally { setCarregando(false); }
  }
  if (demo) return <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 p-4 [background-attachment:fixed]">
    <LogoEntrada />
    <Card className="w-full max-w-md bg-white/85! shadow-2xl backdrop-blur-xl"><CardHeader><CardTitle className="text-2xl">Modo demonstração</CardTitle><p className="text-sm text-muted-foreground">Explore o sistema com dados salvos neste navegador. O acesso real será configurado após a aprovação.</p></CardHeader>
      <CardContent><Button className="w-full" onClick={() => { void supabase.auth.signInWithPassword({ email: "demo@local", password: "demo" }).then(() => navigate({ to: "/dashboard", replace: true })); }}>Acessar demonstração</Button></CardContent>
    </Card>
  </main>;
  return <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 p-4 [background-attachment:fixed]">
    <LogoEntrada />
    <Card className="w-full max-w-md bg-white/85! shadow-2xl backdrop-blur-xl"><CardHeader><CardTitle className="text-2xl">Gestão de patrimônio</CardTitle><p className="text-sm text-muted-foreground">{modo === "entrar" ? "Entre com sua conta corporativa." : modo === "recuperar" ? "Recupere seu acesso por e-mail." : "Defina uma nova senha com pelo menos 12 caracteres."}</p></CardHeader>
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
