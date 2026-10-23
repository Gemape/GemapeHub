import { useRouterState } from "@tanstack/react-router";
import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

import { assinarPermissoes, fotografiaPermissoes, pode, rotaSoAdministrador, telaDaRota, usuarioAtivo, type Acao, type TelaId } from "@/lib/permissoes-demo";

export type Papel = "admin" | "gestor" | "operador";
export type Perfil = { id: string; papel: Papel; ativo: boolean; empresa_id: string | null };
export const ROTULO_PAPEL: Record<Papel, string> = { admin: "Administrador", gestor: "Gestor", operador: "Operador" };
const AccessContext = createContext<Perfil | null>(null);

export function AccessProvider({ perfil, children }: { perfil: Perfil; children: ReactNode }) {
  return <AccessContext.Provider value={perfil}>{children}</AccessContext.Provider>;
}

// Espelha as regras do banco (20260928120000_empresa_papeis_rls.sql); a proteção real é a RLS.
// No modo demonstração (só teste) quem manda são as permissões por usuário e por tela de Configurações; em produção a condição é falsa na compilação.
export function useAccess() {
  const perfil = useContext(AccessContext);
  const ativo = perfil?.ativo === true;
  if (import.meta.env.VITE_DEMO_MODE !== "false") {
    // A condição é constante na compilação: os hooks sempre rodam na mesma ordem.
    const pathname = useRouterState({ select: (s) => s.location.pathname });
    useSyncExternalStore(assinarPermissoes, () => fotografiaPermissoes(localStorage), () => "");
    const usuario = usuarioAtivo(localStorage);
    const tela = telaDaRota(pathname);
    const administrador = ativo && usuario.perfil === "admin";
    const escreve = ativo && (tela ? pode(usuario, tela, "criar") || pode(usuario, tela, "editar") : administrador);
    return {
      perfil,
      isAdmin: administrador,
      canWrite: escreve,
      canOperate: tela ? escreve : ativo,
      canDelete: ativo && pode(usuario, tela, "excluir"),
      // Tela fora das permissões do usuário (ou rotina só do Administrador): o layout mostra "sem acesso" no lugar do conteúdo.
      semAcesso: !administrador && (rotaSoAdministrador(pathname) || (tela !== null && !pode(usuario, tela, "ver"))),
      podeVerCaminho: (caminho: string) => { const t = telaDaRota(caminho); return administrador || (!rotaSoAdministrador(caminho) && (t === null || pode(usuario, t, "ver"))); },
      pode: (t: TelaId, acao: Acao) => pode(usuario, t, acao),
    };
  }
  return {
    perfil,
    isAdmin: ativo && perfil?.papel === "admin",
    canWrite: ativo && (perfil?.papel === "admin" || perfil?.papel === "gestor"),
    canOperate: ativo,
    canDelete: ativo && perfil?.papel === "admin",
    semAcesso: false,
    podeVerCaminho: (_caminho: string) => true,
    pode: (_t: TelaId, _acao: Acao) => true,
  };
}
