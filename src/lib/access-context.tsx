import { createContext, useContext, type ReactNode } from "react";

export type Perfil = { id: string; papel: "admin" | "consulta"; ativo: boolean };
const AccessContext = createContext<Perfil | null>(null);

export function AccessProvider({ perfil, children }: { perfil: Perfil; children: ReactNode }) {
  return <AccessContext.Provider value={perfil}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const perfil = useContext(AccessContext);
  return { perfil, canWrite: perfil?.ativo === true && perfil.papel === "admin" };
}
