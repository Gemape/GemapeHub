import { Link, useRouterState } from "@tanstack/react-router";
import { Clock, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useAccess } from "@/lib/access-context";
import { alternarFixado, chaveDoAtalho, lerFixados, lerRecentes, MAX_FIXADOS, registrarRecente, type AtalhoGuardado } from "@/lib/atalhos-usuario";
import { areaDaRota } from "@/lib/inicio";
import { usuarioAtivo } from "@/lib/permissoes-demo";

// Quem é o dono dos atalhos: no demo, o usuário escolhido em "Entrar como"; em produção, o perfil logado.
export function useDonoDosAtalhos(): string {
  const { perfil } = useAccess();
  if (import.meta.env.VITE_DEMO_MODE !== "false" && typeof localStorage !== "undefined") return usuarioAtivo(localStorage).id;
  return perfil?.id ?? "";
}

// Fixados e recentes do usuário: lê depois de montar (o HTML do servidor não tem o armazenamento) e relê quando o usuário muda.
export function useAtalhosPessoais() {
  const dono = useDonoDosAtalhos();
  const [fixados, setFixados] = useState<AtalhoGuardado[]>([]);
  const [recentes, setRecentes] = useState<AtalhoGuardado[]>([]);
  useEffect(() => {
    if (!dono) return;
    setFixados(lerFixados(dono));
    setRecentes(lerRecentes(dono));
  }, [dono]);
  const alternar = useCallback(
    (a: AtalhoGuardado) => {
      if (!dono) return;
      const atuais = lerFixados(dono);
      if (atuais.length >= MAX_FIXADOS && !atuais.some((f) => chaveDoAtalho(f) === chaveDoAtalho(a))) toast.info(`Limite de ${MAX_FIXADOS} fixados: o mais antigo saiu da lista.`);
      setFixados(alternarFixado(dono, a));
    },
    [dono],
  );
  return { fixados, recentes, alternar };
}

// Registra, a cada tela aberta que é um atalho de cartão, o acesso recente do usuário (vive no layout, então vale para qualquer tela).
export function RegistraRecente() {
  const dono = useDonoDosAtalhos();
  const { isAdmin, podeVerCaminho } = useAccess();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const buscaTexto = useRouterState({ select: (s) => JSON.stringify(s.location.search ?? {}) });
  useEffect(() => {
    // sem dono (perfil ainda não carregou) não registra: evitaria misturar acessos de usuários diferentes
    if (!dono) return;
    const area = areaDaRota(pathname, JSON.parse(buscaTexto) as Record<string, unknown>, isAdmin, podeVerCaminho);
    if (!area) return;
    const { cartao, atual } = area;
    registrarRecente(dono, { titulo: atual.titulo, cartao: cartao.titulo, secao: atual.secao, url: atual.url, ...(atual.search ? { search: atual.search } : {}) });
    // podeVerCaminho muda de identidade a cada render; o que importa é a tela e o dono
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dono, pathname, buscaTexto, isAdmin]);
  return null;
}

function Chip({ a }: { a: AtalhoGuardado }) {
  return (
    <Link to={a.url} search={a.search as never} className="inline-flex max-w-full items-center gap-1.5 rounded-full border bg-card/70 px-3 py-1 text-xs font-medium transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <span className="truncate">{a.titulo}</span>
      <span className="truncate text-muted-foreground">· {a.cartao}</span>
    </Link>
  );
}

// Faixa da tela inicial: atalhos fixados com a estrela e os últimos acessados; some quando não há nada para mostrar.
export function AtalhosPessoais({ fixados, recentes }: { fixados: readonly AtalhoGuardado[]; recentes: readonly AtalhoGuardado[] }) {
  if (fixados.length === 0 && recentes.length === 0) return null;
  const novos = recentes.filter((r) => !fixados.some((f) => chaveDoAtalho(f) === chaveDoAtalho(r)));
  return (
    <section aria-label="Atalhos pessoais" className="mx-auto flex w-full max-w-4xl flex-col gap-3">
      {fixados.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary/80"><Star className="size-3.5 fill-current" aria-hidden="true" />Fixados</span>
          {fixados.map((a) => <Chip key={chaveDoAtalho(a)} a={a} />)}
        </div>
      )}
      {novos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary/80"><Clock className="size-3.5" aria-hidden="true" />Recentes</span>
          {novos.map((a) => <Chip key={chaveDoAtalho(a)} a={a} />)}
        </div>
      )}
    </section>
  );
}
