// Variáveis que o navegador precisa para falar com o Supabase.
// Mesma leitura usada por src/integrations/supabase/client.ts.
export function variaveisSupabaseFaltando(): string[] {
  if (import.meta.env["VITE_DEMO_MODE"] === "true") return [];
  const faltando: string[] = [];
  if (!import.meta.env["VITE_SUPABASE_URL"]) faltando.push("VITE_SUPABASE_URL");
  if (!import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]) faltando.push("VITE_SUPABASE_PUBLISHABLE_KEY");
  return faltando;
}
