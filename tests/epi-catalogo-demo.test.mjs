import test, { before } from "node:test";
import assert from "node:assert/strict";
let contador = 0;
import { demoSupabase } from "../src/integrations/supabase/demo-client.ts";

// O sistema começa sem empresas: o estoque do catálogo nasce em cada empresa cadastrada, então o teste cadastra uma.
before(async () => {
  await demoSupabase.from("empresas").insert({ id: "empresa-do-teste", nome_fantasia: "Empresa do teste", razao_social: "Empresa do teste Ltda", cnpj: "00.000.000/0001-00", status: "Ativa" });
});

const novo = (extra = {}) => ({
  id: crypto.randomUUID(), codigo_sku: `EPI-9${String(++contador).padStart(3, "0")}`, nome: `Bota ${crypto.randomUUID()}`,
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

test("duas gravações iguais no mesmo lote: nenhuma entra", async () => {
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

test("a edição do catálogo não repete tamanho nem código, e a exclusão é recusada", async () => {
  const a = novo();
  const b = novo({ nome: a.nome, tamanho_id: "t-41" });
  await demoSupabase.from("epis_catalogo").insert([a, b]);
  const t = await demoSupabase.from("epis_catalogo").update({ tamanho_id: "t-40" }).eq("id", b.id);
  assert.match(String(t.error?.message), /já está cadastrado neste tamanho/);
  const c = await demoSupabase.from("epis_catalogo").update({ codigo_sku: a.codigo_sku }).eq("id", b.id);
  assert.match(String(c.error?.message), /código/i);
  const d = await demoSupabase.from("epis_catalogo").delete().eq("id", a.id);
  assert.match(String(d.error?.message), /não pode ser excluído/);
  const { data } = await demoSupabase.from("epis").select("*").eq("catalogo_id", a.id);
  assert.ok(data.length > 0);
});

test("as operações de editar e excluir EPI do catálogo funcionam no demo e recusam o que não pode", async () => {
  const a = novo();
  await demoSupabase.from("epis_catalogo").insert([a]);
  const ed = await demoSupabase.rpc("editar_epi_catalogo", { p_id: a.id, p_valores: { nome: "Descrição editada", estoque_minimo: "9" } });
  assert.equal(ed.error, null);
  const { data: lido } = await demoSupabase.from("epis_catalogo").select("*").eq("id", a.id);
  assert.equal(lido[0].nome, "Descrição editada");
  const { data: estoques } = await demoSupabase.from("epis").select("*").eq("catalogo_id", a.id);
  assert.ok(estoques.length > 0 && estoques.every((e) => e.estoque_minimo === 9 && e.nome === "Descrição editada"));
  const ruim = await demoSupabase.rpc("editar_epi_catalogo", { p_id: a.id, p_valores: { nome: "x", estoque_minimo: "-3" } });
  assert.match(String(ruim.error?.message), /estoque mínimo/i);
  const ex = await demoSupabase.rpc("excluir_epi_catalogo", { p_id: a.id });
  assert.equal(ex.error, null);
  const { data: depois } = await demoSupabase.from("epis").select("*").eq("catalogo_id", a.id);
  assert.equal(depois.length, 0);
});
