import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { MODO_DEMO } from "@/lib/modo-demo";

export interface Empresa {
  id: string;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  // Endereço e status só existem no demonstrativo; no banco real entram na Fase 2.
  rua?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cep?: string | null;
  cidade?: string | null;
  estado?: string | null;
  status?: string | null;
}

interface EmpresaContextValue {
  empresas: Empresa[];
  empresaId: string;
  setEmpresaId: (id: string) => void;
  carregando: boolean;
}

const EmpresaContext = createContext<EmpresaContextValue | null>(null);

export const TODAS = "todas";

// Fora da demonstração, só as colunas que o banco real já tem (endereço e status: Fase 2).
const COLUNAS: string = MODO_DEMO ? "*" : "id, nome_fantasia, razao_social, cnpj";

export function useEmpresasQuery() {
  return useQuery({
    queryKey: ["empresas"],
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select(COLUNAS)
        .order("nome_fantasia");
      if (error) throw error;
      return (data ?? []) as unknown as Empresa[];
    },
  });
}

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const [empresaId, setEmpresaId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("gemape:empresa-id") || TODAS;
    }
    return TODAS;
  });
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("gemape:empresa-id", empresaId);
    }
  }, [empresaId]);

  const { data, isLoading } = useEmpresasQuery();

  return (
    <EmpresaContext.Provider
      value={{ empresas: data ?? [], empresaId, setEmpresaId, carregando: isLoading }}
    >
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa() {
  const ctx = useContext(EmpresaContext);
  if (!ctx) throw new Error("useEmpresa precisa estar dentro de EmpresaProvider");
  return ctx;
}
