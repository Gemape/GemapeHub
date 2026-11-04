// Banco de dados de verdade (PostgreSQL em memória via PGlite): migration 20261104120000 (auditoria de 04/11/2026).
// Monta o esquema base (apply_all_schema.sql) mais as migrations de segurança e roda a salvar_caixa e as políticas com papéis reais
// (anon, authenticated) e com a RLS ligada. Nada vai a nenhum Supabase: o banco existe só durante o teste.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

const pasta = new URL("../supabase/migrations/", import.meta.url);
const sql = (f) => readFileSync(new URL(f, pasta), "utf8");
const BASE = ["apply_all_schema.sql", "20260916000000_security_integrity.sql", "20260916001000_purchases.sql", "20260928120000_empresa_papeis_rls.sql", "20260928130000_enderecamentos.sql", "20260928140000_vistoria_sem_estoque.sql"];
const NOVA = "20261104120000_caixas_contrato_e_auditoria.sql";

const U = { adm: "aaaaaaaa-0000-4000-8000-000000000001", gesA: "aaaaaaaa-0000-4000-8000-000000000002", gesB: "aaaaaaaa-0000-4000-8000-000000000003", opA: "aaaaaaaa-0000-4000-8000-000000000004" };
const E = { a: "eeeeeeee-0000-4000-8000-00000000000a", b: "eeeeeeee-0000-4000-8000-00000000000b" };
const F = { f1: "ffffffff-0000-4000-8000-000000000001", f2: "ffffffff-0000-4000-8000-000000000002", f3: "ffffffff-0000-4000-8000-000000000003", fb: "ffffffff-0000-4000-8000-0000000000bb" };

// Tabela antiga e função antiga da auditoria, como criadas em 20260911104000 (essa migration não reaplica do zero, então só o trecho que interessa).
const LEGADO = (() => {
  const t = sql("20260911104000_schema_optimizations_and_fixes.sql");
  const tabela = t.slice(t.indexOf("CREATE TABLE IF NOT EXISTS public.auditoria_movimentacoes"), t.indexOf("CREATE OR REPLACE FUNCTION public.auditar_movimentacao"));
  const funcao = t.slice(t.indexOf("CREATE OR REPLACE FUNCTION public.auditar_movimentacao"), t.indexOf("DROP TRIGGER IF EXISTS trg_auditoria_movimentacoes"));
  return tabela + funcao;
})();

async function criar({ comNova, extra = "" }) {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
  `);
  for (const f of BASE) await db.exec(sql(f));
  await db.exec(LEGADO); // as migrations antigas dão ao anon e ao authenticated os privilégios padrão do Supabase
  await db.exec(`
    SET session_replication_role = replica;
    INSERT INTO auth.users(id,email) VALUES ('${U.adm}','adm@x'),('${U.gesA}','gesa@x'),('${U.gesB}','gesb@x'),('${U.opA}','opa@x');
    INSERT INTO public.empresas(id,razao_social,nome_fantasia,cnpj) VALUES ('${E.a}','A','A','11.111.111/0001-11'),('${E.b}','B','B','22.222.222/0001-22');
    INSERT INTO public.perfis(id,papel,ativo,empresa_id) VALUES ('${U.adm}','admin',true,NULL),('${U.gesA}','gestor',true,'${E.a}'),('${U.gesB}','gestor',true,'${E.b}'),('${U.opA}','operador',true,'${E.a}')
      ON CONFLICT (id) DO UPDATE SET papel=EXCLUDED.papel, ativo=true, empresa_id=EXCLUDED.empresa_id;
    INSERT INTO public.ferramentas(id,empresa_id,nome,codigo_sku,categoria) VALUES
      ('${F.f1}','${E.a}','Chave 1','F-1','Chaves'),('${F.f2}','${E.a}','Chave 2','F-2','Chaves'),('${F.f3}','${E.a}','Chave 3','F-3','Chaves'),('${F.fb}','${E.b}','Chave B','F-B','Chaves');
    ${extra}
    RESET session_replication_role;
  `);
  if (comNova) await db.exec(sql(NOVA));
  return db;
}
// Roda uma consulta como o papel do banco (anon/authenticated) e o usuário do token, como o PostgREST faz.
async function como(db, uid, papel, consulta, params = []) {
  await db.exec(`SET ROLE ${papel}; SELECT set_config('request.jwt.claim.sub','${uid ?? ""}',false)`);
  try { return await db.query(consulta, params); } finally { await db.exec("RESET ROLE"); }
}
const salvar = (db, uid, id, valores, itens = []) => como(db, uid, "authenticated", "SELECT public.salvar_caixa($1::uuid,$2::jsonb,$3::jsonb) AS id", [id, JSON.stringify(valores), JSON.stringify(itens)]);
const recusa = async (promessa, trecho) => assert.rejects(promessa, (e) => { assert.match(e.message, trecho); return true; });
const caixasDe = (db) => db.query("SELECT id,codigo,codigo_num,nome,responsavel_id,status,descricao,localizacao FROM public.caixas_ferramentas ORDER BY created_at, codigo_num");

test("1. auditoria_movimentacoes: antes da migration o anônimo lia e gravava; depois, ninguém além do administrador lê", async () => {
  const antes = await criar({ comNova: false });
  const aberta = await como(antes, null, "anon", "INSERT INTO public.auditoria_movimentacoes(acao,dados_novos) VALUES ('INSERT','{\"x\":1}') RETURNING id");
  assert.equal(aberta.rows.length, 1, "defeito: o anônimo gravava na tabela de auditoria");
  assert.equal((await como(antes, null, "anon", "SELECT count(*)::int AS n FROM public.auditoria_movimentacoes")).rows[0].n, 1, "defeito: o anônimo lia");
  await antes.close();

  const db = await criar({ comNova: true, extra: "INSERT INTO public.auditoria_movimentacoes(acao,dados_novos) VALUES ('INSERT','{\"x\":1}');" });
  assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.auditoria_movimentacoes'::regclass")).rows[0].relrowsecurity, true);
  await recusa(como(db, null, "anon", "SELECT * FROM public.auditoria_movimentacoes"), /permission denied/);
  await recusa(como(db, null, "anon", "INSERT INTO public.auditoria_movimentacoes(acao) VALUES ('INSERT')"), /permission denied/);
  await recusa(como(db, U.gesA, "authenticated", "INSERT INTO public.auditoria_movimentacoes(acao) VALUES ('INSERT')"), /permission denied/);
  await recusa(como(db, U.gesA, "authenticated", "DELETE FROM public.auditoria_movimentacoes"), /permission denied/);
  assert.equal((await como(db, U.gesA, "authenticated", "SELECT count(*)::int AS n FROM public.auditoria_movimentacoes")).rows[0].n, 0, "gestor não vê a auditoria");
  assert.equal((await como(db, U.adm, "authenticated", "SELECT count(*)::int AS n FROM public.auditoria_movimentacoes")).rows[0].n, 1, "administrador vê");
  assert.equal((await db.query("SELECT count(*)::int AS n FROM public.auditoria_movimentacoes")).rows[0].n, 1, "nenhuma linha foi apagada");
  const func = await db.query("SELECT proconfig FROM pg_proc WHERE proname='auditar_movimentacao'");
  assert.match(String(func.rows[0].proconfig), /search_path=""/, "a função antiga fixa o search_path");
  await db.close();
});

test("1b. sem a tabela antiga a migration passa sem erro (banco que nunca a criou)", async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
  `);
  for (const f of [...BASE, NOVA]) await db.exec(sql(f));
  assert.equal((await db.query("SELECT to_regclass('public.auditoria_movimentacoes') AS t")).rows[0].t, null, "a migration não cria a tabela antiga");
  await db.close();
});

test("2. uma ferramenta em uma caixa só: o índice único existe e o banco recusa a repetição direta", async () => {
  const db = await criar({ comNova: true });
  assert.equal((await db.query("SELECT indexdef FROM pg_indexes WHERE indexname='caixa_ferramenta_itens_ferramenta_unica'")).rows.length, 1);
  // Inserção direta como dono do banco (sem os gatilhos de perfil), para provar que a regra está na estrutura e não só na função.
  await db.exec(`SET session_replication_role = replica; INSERT INTO public.caixas_ferramentas(id,empresa_id,nome,codigo,codigo_num) VALUES ('c0000000-0000-4000-8000-000000000001','${E.a}','X','CX-0001',1),('c0000000-0000-4000-8000-000000000002','${E.a}','Y','CX-0002',2)`);
  await db.exec(`INSERT INTO public.caixa_ferramenta_itens(caixa_id,ferramenta_id,quantidade) VALUES ('c0000000-0000-4000-8000-000000000001','${F.f1}',1)`);
  await recusa(db.exec(`INSERT INTO public.caixa_ferramenta_itens(caixa_id,ferramenta_id,quantidade) VALUES ('c0000000-0000-4000-8000-000000000002','${F.f1}',1)`), /duplicate key|unique/i);
  await db.close();
});

test("2b. se já houver ferramenta em duas caixas o índice NÃO é criado, nada é apagado e a migration não falha", async () => {
  const db = await criar({
    comNova: false,
    extra: `INSERT INTO public.caixas_ferramentas(id,empresa_id,nome,codigo,codigo_num) VALUES ('c0000000-0000-4000-8000-000000000001','${E.a}','X','CX-0001',1),('c0000000-0000-4000-8000-000000000002','${E.a}','Y','CX-0002',2);
            INSERT INTO public.caixa_ferramenta_itens(caixa_id,ferramenta_id,quantidade) VALUES ('c0000000-0000-4000-8000-000000000001','${F.f1}',1),('c0000000-0000-4000-8000-000000000002','${F.f1}',1);`,
  });
  await db.exec(sql(NOVA)); // não pode lançar erro
  assert.equal((await db.query("SELECT 1 FROM pg_indexes WHERE indexname='caixa_ferramenta_itens_ferramenta_unica'")).rows.length, 0, "sem índice enquanto houver duplicata");
  assert.equal((await db.query("SELECT count(*)::int AS n FROM public.caixa_ferramenta_itens")).rows[0].n, 2, "os dados do responsável ficam intactos");
  // A salvar_caixa continua barrando novos casos, mesmo sem o índice.
  await recusa(salvar(db, U.gesA, null, { empresa_id: E.a, nome: "Z" }, [{ ferramenta_id: F.f1, quantidade: 1, observacao: "" }]), /já está na caixa/);
  await db.close();
});

test("3. salvar_caixa respeita o número escolhido na tela, o responsável e os campos que não vêm no envio", async () => {
  const db = await criar({ comNova: true });
  const id = (await salvar(db, U.gesA, null, { empresa_id: E.a, nome: "CX-0077", codigo: "CX-0077", codigo_num: 77, descricao: "d", localizacao: "L1", status: "Ativa" }, [{ ferramenta_id: F.f1, quantidade: 2, observacao: "o" }])).rows[0].id;
  let c = (await caixasDe(db)).rows.find((x) => x.id === id);
  assert.equal(c.codigo_num, 77); assert.equal(c.codigo, "CX-0077", "o número escolhido vale (antes o banco sorteava outro)");
  assert.equal((await db.query("SELECT quantidade FROM public.caixa_ferramenta_itens WHERE caixa_id=$1", [id])).rows[0].quantidade, 2);

  // O banco do responsável: a tela não envia responsavel_id; a edição não pode apagá-lo.
  await db.exec(`INSERT INTO public.empregados(id,empresa_id,nome,cpf) VALUES ('e0000000-0000-4000-8000-000000000001','${E.a}','Fulano','000.000.000-00')`);
  await db.exec(`UPDATE public.caixas_ferramentas SET responsavel_id='e0000000-0000-4000-8000-000000000001' WHERE id='${id}'`);
  await salvar(db, U.gesA, id, { empresa_id: E.a, nome: "CX-0077", codigo: "CX-0077", codigo_num: 77, status: "Em manutenção" }, [{ ferramenta_id: F.f1, quantidade: 3, observacao: "" }]);
  c = (await caixasDe(db)).rows.find((x) => x.id === id);
  assert.equal(c.responsavel_id, "e0000000-0000-4000-8000-000000000001", "responsavel_id preservado (antes era zerado)");
  assert.equal(c.descricao, "d", "descrição preservada quando não vem no envio"); assert.equal(c.localizacao, "L1");
  assert.equal(c.status, "Em manutenção");
  // Enviar o campo vazio limpa de propósito; omitir o status mantém o que já estava.
  await salvar(db, U.gesA, id, { empresa_id: E.a, nome: "CX-0077", responsavel_id: null, descricao: null }, []);
  c = (await caixasDe(db)).rows.find((x) => x.id === id);
  assert.equal(c.responsavel_id, null, "campo enviado como nulo limpa"); assert.equal(c.descricao, null); assert.equal(c.status, "Em manutenção", "status omitido é mantido");
  assert.equal((await db.query("SELECT count(*)::int AS n FROM public.caixa_ferramenta_itens WHERE caixa_id=$1", [id])).rows[0].n, 0, "lista de itens vazia esvazia a caixa");

  // Sem número, o gatilho do banco escolhe o próximo; status padrão Ativa.
  const outro = (await salvar(db, U.gesA, null, { empresa_id: E.a, nome: "Sem número" })).rows[0].id;
  c = (await caixasDe(db)).rows.find((x) => x.id === outro);
  assert.ok(c.codigo_num >= 1 && /^CX-\d{4}$/.test(c.codigo)); assert.equal(c.status, "Ativa");
  await db.close();
});

test("3b. salvar_caixa recusa e não grava nada: número repetido, ferramenta em outra caixa ou de outra empresa, repetida, quantidade inválida, nome vazio", async () => {
  const db = await criar({ comNova: true });
  await salvar(db, U.gesA, null, { empresa_id: E.a, nome: "CX-0010", codigo_num: 10 }, [{ ferramenta_id: F.f1, quantidade: 1, observacao: "" }]);
  const antes = (await caixasDe(db)).rows.length;
  const itensAntes = (await db.query("SELECT count(*)::int AS n FROM public.caixa_ferramenta_itens")).rows[0].n;

  await recusa(salvar(db, U.gesA, null, { empresa_id: E.a, nome: "dup", codigo_num: 10 }, []), /Já existe a caixa CX-0010/);
  await recusa(salvar(db, U.gesA, null, { empresa_id: E.a, nome: "n", codigo_num: 11 }, [{ ferramenta_id: F.f1, quantidade: 1, observacao: "" }]), /já está na caixa CX-0010/);
  await recusa(salvar(db, U.gesA, null, { empresa_id: E.a, nome: "n", codigo_num: 12 }, [{ ferramenta_id: F.fb, quantidade: 1, observacao: "" }]), /outra empresa/);
  await recusa(salvar(db, U.gesA, null, { empresa_id: E.a, nome: "n", codigo_num: 13 }, [{ ferramenta_id: F.f2, quantidade: 1, observacao: "" }, { ferramenta_id: F.f2, quantidade: 1, observacao: "" }]), /mais de uma vez/);
  await recusa(salvar(db, U.gesA, null, { empresa_id: E.a, nome: "n", codigo_num: 14 }, [{ ferramenta_id: F.f2, quantidade: 0, observacao: "" }]), /quantidade inválida/);
  await recusa(salvar(db, U.gesA, null, { empresa_id: E.a, nome: "   " }, []), /Caixa inválida/);
  await recusa(salvar(db, U.gesA, null, { empresa_id: E.a }, []), /Caixa inválida/, "nome ausente (antes passava e quebrava no INSERT)");
  await recusa(salvar(db, U.gesA, null, { empresa_id: E.a, nome: "n", codigo_num: 0 }, []), /Número da caixa inválido/);
  await recusa(salvar(db, U.adm, null, { nome: "sem empresa" }, []), /Informe a empresa/);

  assert.equal((await caixasDe(db)).rows.length, antes, "nenhuma caixa foi criada pelas tentativas recusadas (tudo ou nada)");
  assert.equal((await db.query("SELECT count(*)::int AS n FROM public.caixa_ferramenta_itens")).rows[0].n, itensAntes);
  // Editar a mesma caixa com a mesma ferramenta continua valendo (não conta como "outra caixa").
  const id = (await caixasDe(db)).rows.find((x) => x.codigo_num === 10).id;
  await salvar(db, U.gesA, id, { empresa_id: E.a, nome: "CX-0010", codigo_num: 10 }, [{ ferramenta_id: F.f1, quantidade: 5, observacao: "" }]);
  assert.equal((await db.query("SELECT quantidade FROM public.caixa_ferramenta_itens WHERE caixa_id=$1", [id])).rows[0].quantidade, 5);
  await db.close();
});

test("3c. salvar_caixa respeita papéis e empresas (RLS): operador, gestor de outra empresa e anônimo não gravam", async () => {
  const db = await criar({ comNova: true });
  const id = (await salvar(db, U.gesA, null, { empresa_id: E.a, nome: "CX-0020", codigo_num: 20 }, [])).rows[0].id;
  await recusa(salvar(db, U.opA, null, { empresa_id: E.a, nome: "op" }, []), /Acesso negado/);
  await recusa(salvar(db, U.gesB, null, { empresa_id: E.a, nome: "invasor" }, []), /Acesso negado/);
  await recusa(salvar(db, U.gesB, id, { empresa_id: E.b, nome: "sequestro" }, []), /Caixa inexistente/);
  await recusa(como(db, null, "anon", "SELECT public.salvar_caixa(NULL,'{\"empresa_id\":\"" + E.a + "\",\"nome\":\"x\"}'::jsonb,'[]'::jsonb)"), /permission denied/);
  assert.equal((await caixasDe(db)).rows.find((x) => x.id === id).nome, "CX-0020", "a caixa da empresa A não foi alterada");
  // Administrador grava em qualquer empresa.
  await salvar(db, U.adm, null, { empresa_id: E.b, nome: "CX-0021", codigo_num: 21 }, [{ ferramenta_id: F.fb, quantidade: 1, observacao: "" }]);
  await db.close();
});

test("3d. duas gravações da mesma ferramenta disparadas juntas: só uma entra e a outra recebe mensagem clara (o PGlite executa uma por vez; a corrida real é coberta pelo índice único do teste 2)", async () => {
  const db = await criar({ comNova: true });
  const itens = [{ ferramenta_id: F.f2, quantidade: 1, observacao: "" }];
  const r = await Promise.allSettled([
    salvar(db, U.gesA, null, { empresa_id: E.a, nome: "P1", codigo_num: 31 }, itens),
    salvar(db, U.gesA, null, { empresa_id: E.a, nome: "P2", codigo_num: 32 }, itens),
  ]);
  assert.equal(r.filter((x) => x.status === "fulfilled").length, 1, "só uma passa");
  assert.match(r.find((x) => x.status === "rejected").reason.message, /já está na caixa|Já existe uma caixa/);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM public.caixa_ferramenta_itens WHERE ferramenta_id=$1", [F.f2])).rows[0].n, 1);
  await db.close();
});
