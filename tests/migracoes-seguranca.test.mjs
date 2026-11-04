// Guarda estática das migrations: funções SECURITY DEFINER sempre com search_path fixo e tabelas com RLS. Só lê arquivos; não toca em banco nenhum.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const pasta = new URL("../supabase/migrations/", import.meta.url);
const arquivos = readdirSync(pasta).filter((f) => f.endsWith(".sql") && f !== "apply_all_schema.sql").sort();
const sql = (f) => readFileSync(new URL(f, pasta), "utf8");

// Uma função SECURITY DEFINER sem search_path só é aceita se uma migration posterior a corrige com ALTER FUNCTION ... SET search_path.
const corrigidas = (nome) => arquivos.some((f) => new RegExp(`ALTER FUNCTION public\\.${nome}\\([^)]*\\) SET search_path`, "i").test(sql(f)));

test("toda função SECURITY DEFINER fixa o search_path (na criação ou em correção posterior)", () => {
  const sem = [];
  for (const f of arquivos) {
    const t = sql(f);
    for (const m of t.matchAll(/SECURITY DEFINER/gi)) {
      if (/search_path/i.test(t.slice(m.index, m.index + 140))) continue;
      const nome = [...t.slice(0, m.index).matchAll(/FUNCTION public\.(\w+)/gi)].at(-1)?.[1] ?? "?";
      if (!corrigidas(nome)) sem.push(`${f}:${nome}`);
    }
  }
  assert.deepEqual(sem, [], "uma função SECURITY DEFINER sem search_path abre brecha de desvio de esquema");
});
test("a função antiga auditar_movimentacao teve o search_path fixado pela migration de 04/11/2026", () => {
  assert.ok(corrigidas("auditar_movimentacao"));
});

test("as funções RPC de gravação têm EXECUTE negado a PUBLIC e anon", () => {
  const t = sql("20260916000000_security_integrity.sql");
  assert.match(t, /REVOKE ALL ON FUNCTION public\.salvar_caixa\(uuid,jsonb,jsonb\) FROM PUBLIC, anon;/);
  assert.match(t, /GRANT EXECUTE ON FUNCTION public\.salvar_caixa\(uuid,jsonb,jsonb\) TO authenticated;/);
});

test("a salvar_caixa final (migration de 04/11/2026) confere permissão por empresa, a empresa de cada ferramenta e a ferramenta em outra caixa", () => {
  const t = sql("20261104120000_caixas_contrato_e_auditoria.sql");
  const funcao = t.slice(t.indexOf("CREATE OR REPLACE FUNCTION public.salvar_caixa"));
  assert.match(funcao, /SECURITY INVOKER/, "roda com a RLS de quem chama");
  assert.match(funcao, /gemape_pode_gerir\(v_empresa\)/);
  assert.match(funcao, /Ferramenta inexistente ou de outra empresa/);
  assert.match(funcao, /cada ferramenta fica em uma caixa só/);
  assert.match(funcao, /REVOKE ALL ON FUNCTION public\.salvar_caixa\(uuid,jsonb,jsonb\) FROM PUBLIC, anon;/);
});

test("as políticas finais não deixam acesso aberto (USING true) nas tabelas de negócio", () => {
  const t = sql("20260928120000_empresa_papeis_rls.sql");
  // O script derruba as políticas antigas (inclusive as "auth_all_*" com USING (true)) e cria as por empresa.
  assert.match(t, /DROP POLICY %I ON public\.%I/);
  assert.doesNotMatch(t, /USING \(true\)/i, "nenhuma política nova com USING (true)");
  assert.match(t, /REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public\.perfis FROM anon, authenticated;/, "perfis só muda pelo servidor");
});

test("toda tabela criada em public tem RLS ligada (a auditoria_movimentacoes foi coberta pela migration de 04/11/2026)", () => {
  const todo = arquivos.map(sql).join("\n");
  const tabelas = [...todo.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?public\.(\w+)/gi)].map((m) => m[1]);
  const comRls = new Set([...todo.matchAll(/ALTER TABLE (?:ONLY )?public\.(\w+) ENABLE ROW LEVEL SECURITY/gi)].map((m) => m[1]));
  // Os laços FOREACH das migrations ligam a RLS em lote, pela lista de nomes.
  for (const m of todo.matchAll(/FOREACH \w+ IN ARRAY ARRAY\[([^\]]+)\]/g)) for (const n of m[1].matchAll(/'(\w+)'/g)) comRls.add(n[1]);
  const sem = [...new Set(tabelas)].filter((t) => !comRls.has(t));
  assert.deepEqual(sem, [], "tabela nova sem RLS fica exposta pela API do Supabase");
});

test("nenhuma migration de segurança (a partir de 28/09/2026) cria política aberta com USING (true)", () => {
  const novas = arquivos.filter((f) => f >= "20260928");
  assert.ok(novas.length >= 4, "a lista inclui as migrations novas");
  for (const f of novas) assert.doesNotMatch(sql(f), /USING\s*\(\s*true\s*\)/i, `${f} não pode abrir uma tabela a todos`);
});
