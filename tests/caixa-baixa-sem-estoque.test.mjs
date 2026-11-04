import test from "node:test";
import assert from "node:assert/strict";
import { demoSupabase } from "../src/integrations/supabase/demo-client.ts";

// Decisão 379: o estoque da ferramenta controla entradas e baixas como o do EPI. A entrega e a devolução pela caixa não mexem no saldo; a baixa pela caixa o reduz.
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

test("baixa pela caixa reduz o saldo da ferramenta, como a baixa do EPI", async () => {
  const { empresa, id } = await novaFerramenta(3);
  const { error } = await demoSupabase.from("movimentacoes").insert([baixa(empresa, id, { caixa_id: "cx-1", quantidade: 2 })]);
  assert.equal(error, null);
  assert.equal(await saldo(id), 1);
});

test("baixa pela caixa com empregado também reduz o saldo", async () => {
  const { empresa, id } = await novaFerramenta(2);
  const { error } = await demoSupabase.from("movimentacoes").insert([baixa(empresa, id, { caixa_id: "cx-1", empregado_id: "ana" })]);
  assert.equal(error, null);
  assert.equal(await saldo(id), 1);
});

test("baixa pela caixa sem saldo no estoque é recusada: a caixa não guarda mais do que o estoque tem", async () => {
  const { empresa, id } = await novaFerramenta(0);
  const { error } = await demoSupabase.from("movimentacoes").insert([baixa(empresa, id, { caixa_id: "cx-1" })]);
  assert.match(error?.message ?? "", /Estoque insuficiente/);
});

test("entrega e devolução pela caixa não mexem no saldo, só a baixa", async () => {
  const { empresa, id } = await novaFerramenta(2);
  const entrega = { ...baixa(empresa, id, { caixa_id: "cx-1", empregado_id: "ana" }), motivo_baixa: "Fornecimento ao Empregado" };
  assert.equal((await demoSupabase.from("movimentacoes").insert([entrega])).error, null);
  assert.equal(await saldo(id), 2);
  const devolucao = { ...entrega, tipo_movimentacao: "Devolucao", motivo_baixa: null };
  assert.equal((await demoSupabase.from("movimentacoes").insert([devolucao])).error, null);
  assert.equal(await saldo(id), 2);
});

test("saída comum sem estoque continua recusada", async () => {
  const { empresa, id } = await novaFerramenta(0);
  const { error } = await demoSupabase.from("movimentacoes").insert([baixa(empresa, id)]);
  assert.match(error?.message ?? "", /Estoque insuficiente/);
});
