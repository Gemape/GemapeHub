import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { LogoEntrada } from "@/components/layout/LogoEntrada";
import { FundoVidroQuantico } from "@/components/FundoVidroQuantico";
import { variaveisSupabaseFaltando } from "@/lib/supabase-env";

export const Route = createFileRoute("/auth")({ ssr: false, component: PaginaAuth });
function PaginaAuth() {
  const faltando = variaveisSupabaseFaltando();
  if (faltando.length) return <ConfiguracaoAusente variaveis={faltando} />;
  return <FormularioAuth />;
}

function ConfiguracaoAusente({ variaveis }: { variaveis: string[] }) {
  return <main className="fundo-vidro relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden p-4">
    <FundoVidroQuantico />
    <div className="relative z-10 flex w-full justify-center"><LogoEntrada grande /></div>
    <Card className="relative z-10 w-full max-w-md vidro-reflexo overflow-hidden rounded-3xl border-white/70 bg-white/80! shadow-[0_24px_60px_-20px_oklch(0.2_0.2_268/0.6),inset_0_1px_0_oklch(1_0_0/0.9)] backdrop-blur-2xl backdrop-saturate-150"><CardHeader><CardTitle className="text-2xl">Conexão com o banco não configurada</CardTitle><p className="text-sm text-muted-foreground">Defina estas variáveis no arquivo <code>.env</code> e reinicie o servidor:</p></CardHeader>
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
        navigate({ to: "/inicio", replace: true });
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível concluir"); }
    finally { setCarregando(false); }
  }
  async function entrarComo(usuario: string, chave: string) {
    setCarregando(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: usuario, password: chave });
      if (error) throw error;
      navigate({ to: "/inicio", replace: true });
    } catch (erro) { toast.error(erro instanceof Error ? `Não foi possível entrar: ${erro.message}` : "Não foi possível entrar"); }
    finally { setCarregando(false); }
  }
  // A demonstração aceita qualquer e-mail e senha: entra sempre com a conta local de teste. A recuperação de senha é só simulada (nenhum e-mail sai, nada vai ao banco).
  const [linkEnviado, setLinkEnviado] = useState(false);
  function enviarNaDemonstracao(e: React.FormEvent) {
    e.preventDefault();
    if (modo === "recuperar") { setLinkEnviado(true); toast.success(`Simulação: enviamos as instruções para ${email.trim()}.`); }
    else if (modo === "alterar") {
      if (senha !== confirmacao) { toast.error("As senhas não coincidem"); return; }
      setSenha(""); setConfirmacao(""); setLinkEnviado(false); setModo("entrar"); toast.success("Simulação: senha alterada. Entre novamente.");
    } else void entrarComo("demo@local", "demo");
  }
  const voltarAoAcesso = () => { setLinkEnviado(false); setModo("entrar"); };
  // Modo demonstração: tela de login de verdade (e-mail e senha), com acesso aberto: qualquer e-mail e senha entram, só com os dados fictícios deste navegador.
  if (demo) return <main className="fundo-vidro relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden p-4">
    <FundoVidroQuantico />
    <div className="relative z-10 flex w-full justify-center"><LogoEntrada grande /></div>
    <Card className="relative z-10 w-full max-w-md vidro-reflexo overflow-hidden rounded-3xl border-white/70 bg-white/80! shadow-[0_24px_60px_-20px_oklch(0.2_0.2_268/0.6),inset_0_1px_0_oklch(1_0_0/0.9)] backdrop-blur-2xl backdrop-saturate-150"><CardHeader><CardTitle className="text-2xl">{modo === "entrar" ? "Entrar no sistema" : modo === "recuperar" ? "Recuperar senha" : "Criar nova senha"}</CardTitle><p className="text-sm text-muted-foreground">{modo === "entrar" ? "Ambiente de teste com dados fictícios, salvos só neste navegador. O acesso real será configurado após a aprovação." : modo === "recuperar" ? "Informe o e-mail e simulamos o envio do link de recuperação." : "Escolha a nova senha (simulação, nada é gravado)."}</p></CardHeader>
      <CardContent><form onSubmit={enviarNaDemonstracao} className="space-y-4">
        {modo !== "alterar" && <div><Label htmlFor="email">E-mail</Label><Input id="email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="teste@gemape.com.br" /></div>}
        {modo === "entrar" && <div><Label htmlFor="senha">Senha</Label><Input id="senha" type="password" autoComplete="current-password" required value={senha} onChange={e => setSenha(e.target.value)} placeholder="Qualquer senha" /></div>}
        {modo === "alterar" && <>
          <div><Label htmlFor="senha">Nova senha</Label><Input id="senha" type="password" autoComplete="new-password" minLength={12} required value={senha} onChange={e => setSenha(e.target.value)} /></div>
          <div><Label htmlFor="confirmacao">Confirmar senha</Label><Input id="confirmacao" type="password" autoComplete="new-password" minLength={12} required value={confirmacao} onChange={e => setConfirmacao(e.target.value)} /></div>
        </>}
        <Button className="w-full" type="submit" disabled={carregando}>{carregando ? "Aguarde…" : modo === "entrar" ? "Entrar" : modo === "recuperar" ? "Enviar instruções" : "Salvar nova senha"}</Button>
        {modo === "recuperar" && linkEnviado && <div role="status" className="rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">
          <p>Link de recuperação gerado (simulado). Em produção ele chegaria por e-mail.</p>
          <button type="button" className="mt-1 font-semibold text-primary underline underline-offset-2" onClick={() => setModo("alterar")}>Abrir link de recuperação</button>
        </div>}
        {modo === "entrar" && <Button className="w-full" variant="outline" type="button" disabled={carregando} onClick={() => { void entrarComo("demo@local", "demo"); }}>Acessar demonstração</Button>}
        <Button className="w-full" variant="link" type="button" onClick={() => (modo === "entrar" ? setModo("recuperar") : voltarAoAcesso())}>{modo === "entrar" ? "Esqueci minha senha" : "Voltar ao acesso"}</Button>
      </form><p className="mt-4 text-xs text-muted-foreground">Acesso aberto para teste: qualquer e-mail e senha entram. Nada aqui é gravado no banco real.</p></CardContent>
    </Card>
  </main>;
  return <main className="fundo-vidro relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden p-4">
    <FundoVidroQuantico />
    <div className="relative z-10 flex w-full justify-center"><LogoEntrada grande /></div>
    <Card className="relative z-10 w-full max-w-md vidro-reflexo overflow-hidden rounded-3xl border-white/70 bg-white/80! shadow-[0_24px_60px_-20px_oklch(0.2_0.2_268/0.6),inset_0_1px_0_oklch(1_0_0/0.9)] backdrop-blur-2xl backdrop-saturate-150"><CardHeader><CardTitle className="text-2xl">Gestão de patrimônio</CardTitle><p className="text-sm text-muted-foreground">{modo === "entrar" ? "Entre com sua conta corporativa." : modo === "recuperar" ? "Recupere seu acesso por e-mail." : "Defina uma nova senha com pelo menos 12 caracteres."}</p></CardHeader>
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
