import test from "node:test";
import assert from "node:assert/strict";
import { demoSupabase } from "../src/integrations/supabase/demo-client.ts";

const novo = (extra = {}) => ({
  id: crypto.randomUUID(), codigo_sku: `EPI-9${Math.floor(Math.random() * 900 + 100)}`, nome: `Bota ${crypto.randomUUID()}`,
  categoria: "Calçado", subcategoria_id: "sub-x", unidade_id: null, unidade_medida: null,
  tamanho_id: "t-40", estoque_minimo: 4, status: "Ativo", ...extra,
});

test("gravar um EPI no catálogo cria o estoque de cada empresa, com saldo zero e o mínimo", async () => {
  const epi = novo();
  const { error } = await demoSupabase.from("epis_catalogo").insert(epi);
  assert.equal(error, null);
  const { data } = await demoSupabase.from("epis").select("*").eq("catalogo_id", epi.id);
  const { data: empresas } = await demoSupabase.from("empresas").select("*");
  assert.equal(data.length, empresas.length);
  assert.ok(data.every((l) => l.estoque_atual === 0 && l.estoque_minimo === 4 && l.codigo_sku === epi.codigo_sku));
  assert.deepEqual(data[0].tamanhos_selecionados, ["t-40"]);
});

test("o catálogo recusa o mesmo EPI no mesmo tamanho e o mesmo código", async () => {
  const epi = novo();
  await demoSupabase.from("epis_catalogo").insert(epi);
  const repetido = await demoSupabase.from("epis_catalogo").insert(novo({ nome: epi.nome.toUpperCase() }));
  assert.match(String(repetido.error?.message), /já está cadastrado neste tamanho/);
  const mesmoCodigo = await demoSupabase.from("epis_catalogo").insert(novo({ codigo_sku: epi.codigo_sku, tamanho_id: "t-41" }));
  assert.match(String(mesmoCodigo.error?.message), /código/i);
  const outroTamanho = await demoSupabase.from("epis_catalogo").insert(novo({ nome: epi.nome, tamanho_id: "t-41" }));
  assert.equal(outroTamanho.error, null);
});

test("duas gravações iguais em lote não passam: só a primeira entra", async () => {
  const a = novo();
  const { error } = await demoSupabase.from("epis_catalogo").insert([a, { ...a, id: crypto.randomUUID(), codigo_sku: `${a.codigo_sku}X` }]);
  assert.match(String(error?.message), /já está cadastrado neste tamanho/);
  const { data } = await demoSupabase.from("epis_catalogo").select("*").eq("nome", a.nome);
  assert.equal(data.length, 0);
});

test("a compra de um EPI do catálogo soma só no estoque da empresa escolhida", async () => {
  const epi = novo();
  await demoSupabase.from("epis_catalogo").insert(epi);
  const { data: [linha] } = await demoSupabase.from("epis").select("*").eq("catalogo_id", epi.id);
  const { error } = await demoSupabase.from("compras_epis").insert({
    empresa_id: linha.empresa_id, item_id: linha.id, fornecedor: "ACME", nota_fiscal: "1",
    data_compra: "2026-10-02", quantidade: 3, valor_unitario: 10,
  });
  assert.equal(error, null);
  const { data } = await demoSupabase.from("epis").select("*").eq("id", linha.id).single();
  assert.equal(data.estoque_atual, 3);
});
