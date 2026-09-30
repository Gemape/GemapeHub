import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { TabelaProduto } from "@/lib/parametros-base";

export type ProdutoGemape = {
  tabela: TabelaProduto;
  codigo_sku: string;
  nome: string;
  empresa_id: string | null;
};

export const ROTULO_TABELA: Record<TabelaProduto, string> = {
  epis: "EPI",
  uniformes: "Uniforme",
  ferramentas: "Ferramenta",
};

// Produtos já cadastrados na GEMAPE (EPIs, uniformes e ferramentas) que têm código.
export function useProdutosGemape() {
  return useQuery({
    queryKey: ["produtos-gemape"],
    staleTime: 60_000,
    queryFn: async () => {
      const tabelas = Object.keys(ROTULO_TABELA) as TabelaProduto[];
      const listas = await Promise.all(
        tabelas.map(async (tabela) => {
          const { data, error } = await supabase
            .from(tabela)
            .select("codigo_sku,nome,empresa_id")
            .order("nome");
          if (error) throw error;
          return ((data ?? []) as Omit<ProdutoGemape, "tabela">[]).map((p) => ({ ...p, tabela }));
        }),
      );
      return listas.flat().filter((p) => p.codigo_sku);
    },
  });
}
