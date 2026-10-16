import test from "node:test";
import assert from "node:assert/strict";
import { demoSupabase } from "../src/integrations/supabase/demo-client.ts";
import { validarTermoResponsabilidade } from "../src/lib/encerramento-ferramentas.ts";

const nova = async () => {
  const empresa = crypto.randomUUID();
  const id = crypto.randomUUID();
  await demoSupabase.from("ferramentas").insert({ id, empresa_id: empresa, nome: "Amperimetro", codigo_sku: "FER-0002", estoque_atual: 0, estoque_minimo: 0, status: "Ativo" });
  return { empresa, id };
};
const mov = (empresa, id, extra) => ({ modulo: "ferramenta", item_id: id, empresa_id: empresa, quantidade: 1, data_movimentacao: "2026-10-16", ...extra });
const estoque = async (id) => (await demoSupabase.from("ferramentas").select("*").eq("id", id)).data[0].estoque_atual;

test("entrega da caixa (Termo de Responsabilidade) não exige estoque do cadastro", async () => {
  const { empresa, id } = await nova();
  const { error } = await demoSupabase.from("movimentacoes").insert([mov(empresa, id, { tipo_movimentacao: "Saida", empregado_id: "ana", caixa_id: "cx-1", tipo_vistoria: "Inicial (Entrega da caixa)" })]);
  assert.equal(error, null);
  assert.equal(await estoque(id), 0);
});

test("devolução à caixa não infla o estoque do cadastro", async () => {
  const { empresa, id } = await nova();
  await demoSupabase.from("movimentacoes").insert([mov(empresa, id, { tipo_movimentacao: "Saida", empregado_id: "ana", caixa_id: "cx-1" })]);
  const { error } = await demoSupabase.from("movimentacoes").insert([mov(empresa, id, { tipo_movimentacao: "Devolucao", empregado_id: "ana", caixa_id: "cx-1" })]);
  assert.equal(error, null);
  assert.equal(await estoque(id), 0);
});

test("entrega avulsa (sem caixa) sem estoque continua recusada", async () => {
  const { empresa, id } = await nova();
  const { error } = await demoSupabase.from("movimentacoes").insert([mov(empresa, id, { tipo_movimentacao: "Saida", empregado_id: "ana" })]);
  assert.match(error?.message ?? "", /Estoque insuficiente/);
});

test("Termo com caixa confere o guardado na caixa, não o estoque do cadastro", () => {
  const itens = [{ id: "f", nome: "Amperimetro", estoque_atual: 0 }];
  assert.equal(validarTermoResponsabilidade([{ item_id: "f", quantidade: 1 }], itens, { f: 1 }), null);
  assert.match(validarTermoResponsabilidade([{ item_id: "f", quantidade: 2 }], itens, { f: 1 }) ?? "", /guardad[ao]s? na caixa \(1\)/);
  assert.match(validarTermoResponsabilidade([{ item_id: "f", quantidade: 1 }], itens) ?? "", /estoque/);
});
