// Variáveis que o navegador precisa para falar com o Supabase.
// Mesma leitura usada por src/integrations/supabase/client.ts.
export function variaveisSupabaseFaltando(): string[] {
  // Sem VITE_DEMO_MODE=false o app roda em demonstração (ver client.ts) e não precisa delas.
  if (import.meta.env["VITE_DEMO_MODE"] !== "false") return [];
  const faltando: string[] = [];
  if (!import.meta.env["VITE_SUPABASE_URL"]) faltando.push("VITE_SUPABASE_URL");
  if (!import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]) faltando.push("VITE_SUPABASE_PUBLISHABLE_KEY");
  return faltando;
}
