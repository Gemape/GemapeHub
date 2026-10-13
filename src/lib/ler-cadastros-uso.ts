// Lê os cadastros que podem usar um tamanho ou uma unidade de Gerais (decisão 23), em paralelo.
import { supabase } from "@/integrations/supabase/client";
import { lerTodas } from "@/lib/ler-todas";
import type { CadastrosComTamanho } from "@/lib/uso-parametros";

export async function lerCadastrosDeUso(
  tabelas: (keyof CadastrosComTamanho)[],
): Promise<CadastrosComTamanho | null> {
  try {
    const listas = await Promise.all(
      tabelas.map((tabela) => lerTodas<Record<string, unknown>>(() => supabase.from(tabela).select("*"), (q) => q.order("id"))),
    );
    return Object.fromEntries(tabelas.map((tabela, i) => [tabela, listas[i] ?? []]));
  } catch {
    return null;
  }
}
