// Guarda estática das migrations: funções SECURITY DEFINER sempre com search_path fixo e tabelas com RLS. Só lê arquivos; não toca em banco nenhum.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const pasta = new URL("../supabase/migrations/", import.meta.url);
const arquivos = readdirSync(pasta).filter((f) => f.endsWith(".sql") && f !== "apply_all_schema.sql").sort();
const sql = (f) => readFileSync(new URL(f, pasta), "utf8");

// Dívida conhecida e documentada em docs/propostas-sql/2026-11-04-endurecimento-banco.md (item 1): não aumenta.
const LEGADO_SEM_SEARCH_PATH = ["20260911104000_schema_optimizations_and_fixes.sql:101"];

test("toda função SECURITY DEFINER fixa o search_path (exceto a dívida conhecida)", () => {
  const sem = [];
  for (const f of arquivos) {
    const t = sql(f);
    for (const m of t.matchAll(/SECURITY DEFINER/gi)) {
      if (/search_path/i.test(t.slice(m.index, m.index + 140))) continue;
      const linhaFuncao = t.slice(0, m.index).split("\n").length - 3; // CREATE ... a poucas linhas acima
      sem.push(`${f}:${t.slice(0, m.index).lastIndexOf("CREATE") >= 0 ? t.slice(0, t.slice(0, m.index).lastIndexOf("CREATE")).split("\n").length : linhaFuncao}`);
    }
  }
  assert.deepEqual(sem, LEGADO_SEM_SEARCH_PATH, "uma função SECURITY DEFINER nova sem search_path abre brecha de desvio de esquema");
});

test("as funções RPC de gravação têm EXECUTE negado a PUBLIC e anon", () => {
  const t = sql("20260916000000_security_integrity.sql");
  assert.match(t, /REVOKE ALL ON FUNCTION public\.salvar_caixa\(uuid,jsonb,jsonb\) FROM PUBLIC, anon;/);
  assert.match(t, /GRANT EXECUTE ON FUNCTION public\.salvar_caixa\(uuid,jsonb,jsonb\) TO authenticated;/);
});

test("a salvar_caixa final confere permissão por empresa e a empresa de cada ferramenta", () => {
  const t = sql("20260928120000_empresa_papeis_rls.sql");
  const funcao = t.slice(t.indexOf("CREATE OR REPLACE FUNCTION public.salvar_caixa"));
  assert.match(funcao, /SECURITY INVOKER/, "roda com a RLS de quem chama");
  assert.match(funcao, /gemape_pode_gerir\(\(p_valores->>'empresa_id'\)::uuid\)/);
  assert.match(funcao, /Ferramenta inexistente ou de outra empresa/);
});

test("as políticas finais não deixam acesso aberto (USING true) nas tabelas de negócio", () => {
  const t = sql("20260928120000_empresa_papeis_rls.sql");
  // O script derruba as políticas antigas (inclusive as "auth_all_*" com USING (true)) e cria as por empresa.
  assert.match(t, /DROP POLICY %I ON public\.%I/);
  assert.doesNotMatch(t, /USING \(true\)/i, "nenhuma política nova com USING (true)");
  assert.match(t, /REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public\.perfis FROM anon, authenticated;/, "perfis só muda pelo servidor");
});

test("toda tabela criada em public tem RLS ligada (exceto a dívida conhecida)", () => {
  const todo = arquivos.map(sql).join("\n");
  const tabelas = [...todo.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?public\.(\w+)/gi)].map((m) => m[1]);
  const comRls = new Set([...todo.matchAll(/ALTER TABLE (?:ONLY )?public\.(\w+) ENABLE ROW LEVEL SECURITY/gi)].map((m) => m[1]));
  // Os laços FOREACH das migrations ligam a RLS em lote, pela lista de nomes.
  for (const m of todo.matchAll(/FOREACH \w+ IN ARRAY ARRAY\[([^\]]+)\]/g)) for (const n of m[1].matchAll(/'(\w+)'/g)) comRls.add(n[1]);
  const sem = [...new Set(tabelas)].filter((t) => !comRls.has(t));
  // Dívida conhecida: docs/propostas-sql/2026-11-04-endurecimento-banco.md, item 0 (aguarda ordem do responsável).
  assert.deepEqual(sem, ["auditoria_movimentacoes"], "tabela nova sem RLS fica exposta pela API do Supabase");
});
