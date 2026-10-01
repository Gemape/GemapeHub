// Lê os cadastros que podem usar um tamanho ou uma unidade de Gerais (decisão 23), em paralelo.
import { supabase } from "@/integrations/supabase/client";
import type { CadastrosComTamanho } from "@/lib/uso-parametros";

export async function lerCadastrosDeUso(
  tabelas: (keyof CadastrosComTamanho)[],
): Promise<CadastrosComTamanho | null> {
  const respostas = await Promise.all(tabelas.map((tabela) => supabase.from(tabela).select("*")));
  if (respostas.some((r) => r.error)) return null;
  return Object.fromEntries(
    tabelas.map((tabela, i) => [tabela, (respostas[i]?.data ?? []) as Record<string, unknown>[]]),
  );
}
