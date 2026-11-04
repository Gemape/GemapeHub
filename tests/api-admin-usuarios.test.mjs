// API administrativa de usuários (src/server/api.ts): sessão, papel, origem (CSRF), validação e limites. O Supabase é simulado; nada vai à rede.
import assert from "node:assert/strict";
import test from "node:test";

import { handleApi } from "../src/server/api.ts";

const APP = "https://gemape.exemplo";
const ADMIN = "11111111-1111-4111-8111-111111111111";
const OUTRO = "22222222-2222-4222-8222-222222222222";
const EMPRESA = "33333333-3333-4333-8333-333333333333";

// Falso PostgREST/GoTrue: responde a /auth/v1/user e /rest/v1/perfis conforme o papel do "usuário logado".
function simular(papel, { ativo = true } = {}) {
  const chamadas = [];
  globalThis.fetch = async (entrada, opcoes = {}) => {
    const url = String(entrada);
    chamadas.push({ url, metodo: opcoes.method ?? "GET", corpo: opcoes.body });
    if (url.includes("/auth/v1/user")) return Response.json({ id: ADMIN, email: "admin@exemplo.com", aud: "authenticated", role: "authenticated" });
    if (url.includes("/rest/v1/perfis") && (opcoes.method ?? "GET") === "GET") return Response.json({ papel, ativo }, { status: 200 });
    if (url.includes("/rest/v1/perfis") && opcoes.method === "PATCH") return Response.json([{ id: OUTRO }], { status: 200 });
    if (url.includes("/auth/v1/admin/users") && opcoes.method === "POST") return Response.json({ id: OUTRO, email: "novo@exemplo.com" }, { status: 200 });
    return Response.json({}, { status: 200 });
  };
  return chamadas;
}
function ambiente(extra = {}) {
  Object.assign(process.env, { SUPABASE_URL: "https://projeto.supabase.test", SUPABASE_PUBLISHABLE_KEY: "chave-publica-teste", SUPABASE_SERVICE_ROLE_KEY: "chave-servico-teste", APP_URL: APP, ...extra });
}
const pedido = (caminho, { metodo = "GET", corpo, auth = true, origem = APP } = {}) =>
  new Request(`${APP}${caminho}`, {
    method: metodo,
    headers: { ...(auth ? { authorization: "Bearer token-teste" } : {}), ...(origem ? { origin: origem } : {}), "content-type": "application/json" },
    ...(corpo === undefined ? {} : { body: typeof corpo === "string" ? corpo : JSON.stringify(corpo) }),
  });

test("rotas que não são da API passam direto", async () => {
  ambiente();
  assert.equal(await handleApi(pedido("/inicio")), null);
});

test("sem configuração do banco a API responde 503 e não vaza nada", async () => {
  ambiente(); const antes = process.env.SUPABASE_URL; delete process.env.SUPABASE_URL;
  const r = await handleApi(pedido("/api/admin/users"));
  process.env.SUPABASE_URL = antes;
  assert.equal(r.status, 503);
  assert.equal(r.headers.get("Cache-Control"), "no-store");
});

test("sem Authorization a administração responde 401", async () => {
  ambiente(); simular("admin");
  const r = await handleApi(pedido("/api/admin/users", { auth: false }));
  assert.equal(r.status, 401);
});

test("quem não é administrador recebe 403, mesmo ativo e com sessão válida", async () => {
  ambiente();
  for (const papel of ["gestor", "operador"]) {
    simular(papel);
    const r = await handleApi(pedido("/api/admin/users", { metodo: "PATCH", corpo: { id: OUTRO, papel: "admin", ativo: true, empresa_id: null } }));
    assert.equal(r.status, 403, papel);
  }
});

test("administrador inativo recebe 403", async () => {
  ambiente(); simular("admin", { ativo: false });
  const r = await handleApi(pedido("/api/admin/users"));
  assert.equal(r.status, 403);
});

test("escrita de outra origem é recusada (CSRF) e nada é gravado", async () => {
  ambiente(); const chamadas = simular("admin");
  for (const origem of ["https://evil.test", null]) {
    const r = await handleApi(pedido("/api/admin/users", { metodo: "PATCH", origem, corpo: { id: OUTRO, papel: "gestor", ativo: true, empresa_id: EMPRESA } }));
    assert.equal(r.status, 403, String(origem));
  }
  assert.ok(!chamadas.some((c) => c.metodo === "PATCH" && c.url.includes("/rest/v1/perfis")), "nenhuma alteração chegou ao banco");
});

test("sem a chave de serviço a administração de usuários fica indisponível (503)", async () => {
  ambiente(); simular("admin"); const chave = process.env.SUPABASE_SERVICE_ROLE_KEY; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const r = await handleApi(pedido("/api/admin/users", { metodo: "POST", corpo: { email: "a@b.co", password: "senha-bem-longa-123" } }));
  process.env.SUPABASE_SERVICE_ROLE_KEY = chave;
  assert.equal(r.status, 503);
});

test("criar usuário exige e-mail válido e senha de 12 caracteres ou mais, e recusa campos extras", async () => {
  ambiente(); simular("admin");
  for (const corpo of [{ email: "nao-e-email", password: "senha-bem-longa-123" }, { email: "a@b.co", password: "curta" }, { email: "a@b.co", password: "senha-bem-longa-123", papel: "admin" }]) {
    const r = await handleApi(pedido("/api/admin/users", { metodo: "POST", corpo }));
    assert.equal(r.status, 400, JSON.stringify(corpo));
  }
  const ok = await handleApi(pedido("/api/admin/users", { metodo: "POST", corpo: { email: "novo@exemplo.com", password: "senha-bem-longa-123" } }));
  assert.equal(ok.status, 201);
});

test("alterar perfil: gestor e operador ativos precisam de empresa; papel inválido e campos extras são recusados", async () => {
  ambiente(); simular("admin");
  const patch = (corpo) => handleApi(pedido("/api/admin/users", { metodo: "PATCH", corpo }));
  assert.equal((await patch({ id: OUTRO, papel: "gestor", ativo: true, empresa_id: null })).status, 400, "gestor sem empresa");
  assert.equal((await patch({ id: OUTRO, papel: "operador", ativo: true, empresa_id: null })).status, 400, "operador sem empresa");
  assert.equal((await patch({ id: OUTRO, papel: "superadmin", ativo: true, empresa_id: null })).status, 400, "papel inexistente");
  assert.equal((await patch({ id: "nao-uuid", papel: "admin", ativo: true, empresa_id: null })).status, 400, "id inválido");
  assert.equal((await patch({ id: OUTRO, papel: "admin", ativo: true, empresa_id: null, extra: 1 })).status, 400, "campo extra");
  assert.equal((await patch({ id: OUTRO, papel: "gestor", ativo: true, empresa_id: EMPRESA })).status, 200, "gestor com empresa");
  assert.equal((await patch({ id: OUTRO, papel: "operador", ativo: false, empresa_id: null })).status, 200, "inativo pode ficar sem empresa");
});

test("o administrador não altera o próprio perfil (409) e o corpo grande é recusado (413)", async () => {
  ambiente(); simular("admin");
  const eu = await handleApi(pedido("/api/admin/users", { metodo: "PATCH", corpo: { id: ADMIN, papel: "operador", ativo: false, empresa_id: null } }));
  assert.equal(eu.status, 409);
  const grande = await handleApi(pedido("/api/admin/users", { metodo: "POST", corpo: "x".repeat(9000) }));
  assert.equal(grande.status, 413);
  const invalido = await handleApi(pedido("/api/admin/users", { metodo: "POST", corpo: "{não é json" }));
  assert.equal(invalido.status, 400);
});

test("método não permitido e rota desconhecida", async () => {
  ambiente(); simular("admin");
  const delet = await handleApi(pedido("/api/admin/users", { metodo: "DELETE" }));
  assert.ok([403, 405].includes(delet.status), "DELETE nunca é aceito");
  const desconhecida = await handleApi(pedido("/api/admin/outra", { metodo: "POST", corpo: {} }));
  assert.equal(desconhecida.status, 404);
});

test("/health só aceita GET e não expõe linhas", async () => {
  ambiente(); simular("admin");
  assert.equal((await handleApi(pedido("/health", { metodo: "POST", auth: false }))).status, 405);
  const r = await handleApi(pedido("/health", { auth: false }));
  const corpo = await r.json();
  assert.deepEqual(Object.keys(corpo).sort(), ["database", "status"]);
});
