import { createContext, useContext, type ReactNode } from "react";

export type Papel = "admin" | "gestor" | "operador";
export type Perfil = { id: string; papel: Papel; ativo: boolean; empresa_id: string | null };
export const ROTULO_PAPEL: Record<Papel, string> = { admin: "Administrador", gestor: "Gestor", operador: "Operador" };
const AccessContext = createContext<Perfil | null>(null);

export function AccessProvider({ perfil, children }: { perfil: Perfil; children: ReactNode }) {
  return <AccessContext.Provider value={perfil}>{children}</AccessContext.Provider>;
}

// Espelha as regras do banco (20260928120000_empresa_papeis_rls.sql); a proteção real é a RLS.
export function useAccess() {
  const perfil = useContext(AccessContext);
  const ativo = perfil?.ativo === true;
  return {
    perfil,
    isAdmin: ativo && perfil?.papel === "admin",
    canWrite: ativo && (perfil?.papel === "admin" || perfil?.papel === "gestor"),
    canOperate: ativo,
  };
}
