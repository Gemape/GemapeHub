import test from "node:test";
import assert from "node:assert/strict";
import { demoSupabase } from "../src/integrations/supabase/demo-client.ts";

// Ferramenta cadastrada em Parâmetros nasce sem estoque (o que existe fica na caixa): a baixa pela caixa não pode exigir estoque.
const novaFerramenta = async (estoque = 0) => {
  const empresa = crypto.randomUUID();
  const id = crypto.randomUUID();
  await demoSupabase.from("ferramentas").insert({ id, empresa_id: empresa, nome: "Amperímetro", codigo_sku: "FER-0002", estoque_atual: estoque, estoque_minimo: 0, status: "Ativo" });
  return { empresa, id };
};
const baixa = (empresa, id, extra = {}) => ({
  modulo: "ferramenta", item_id: id, empresa_id: empresa, tipo_movimentacao: "Saida", quantidade: 1,
  motivo_baixa: "Desaparecimento", onus_baixa: "Da Empresa", data_movimentacao: "2026-10-16", ...extra,
});
const saldo = async (id) => (await demoSupabase.from("ferramentas").select("*").eq("id", id)).data[0].estoque_atual;

test("baixa pela caixa de ferramenta sem estoque cadastrado é gravada e não deixa o estoque negativo", async () => {
  const { empresa, id } = await novaFerramenta(0);
  const { error } = await demoSupabase.from("movimentacoes").insert([baixa(empresa, id, { caixa_id: "cx-1" })]);
  assert.equal(error, null);
  assert.equal(await saldo(id), 0);
  const { data } = await demoSupabase.from("movimentacoes").select("*").eq("item_id", id);
  assert.equal(data.length, 1);
});

test("baixa pela caixa com empregado também é gravada", async () => {
  const { empresa, id } = await novaFerramenta(0);
  const { error } = await demoSupabase.from("movimentacoes").insert([baixa(empresa, id, { caixa_id: "cx-1", empregado_id: "ana" })]);
  assert.equal(error, null);
});

test("saída comum sem estoque continua recusada", async () => {
  const { empresa, id } = await novaFerramenta(0);
  const { error } = await demoSupabase.from("movimentacoes").insert([baixa(empresa, id)]);
  assert.match(error?.message ?? "", /Estoque insuficiente/);
});
