import test from "node:test";
import assert from "node:assert/strict";
import { lerParametros } from "../src/lib/parametros-base.ts";
import {
  associarTamanhoNaEntrada, controlaTamanho, opcoesTamanhoEntrada, tamanhosAutorizadosDoProduto, validarLinhasTamanho,
} from "../src/lib/estoque-tamanho.ts";

const memoria = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
// Capacete (sub-epi-capacete) não tem tamanho autorizado em Gerais; a regra é a mesma do uniforme (mesmo código para os dois módulos).
const capacete = { id: "c1", nome: "Capacete", subcategoria_id: "sub-epi-capacete", estoque_atual: 19, estoque_minimo: 0 };

test("Entrada de produto sem tamanho autorizado lista todos os tamanhos ativos de Gerais", () => {
  const p = lerParametros(memoria());
  assert.equal(controlaTamanho(p, "epi", capacete), false);
  assert.equal(opcoesTamanhoEntrada(p, "epi", capacete).length, 0);
  const todos = opcoesTamanhoEntrada(p, "epi", capacete, true);
  assert.ok(todos.length > 0);
  assert.match(validarLinhasTamanho([{ item_id: "c1", quantidade: 1, tamanho: "" }], [capacete], p, "epi", "entrada", true) ?? "", /Escolha o tamanho/);
  assert.equal(validarLinhasTamanho([{ item_id: "c1", quantidade: 1, tamanho: todos[0].valor }], [capacete], p, "epi", "entrada", true), null);
  // Sem o parâmetro (Compras e demais telas) nada muda.
  assert.equal(validarLinhasTamanho([{ item_id: "c1", quantidade: 1, tamanho: "" }], [capacete], p, "epi", "entrada"), null);
});

test("produto com tamanho autorizado continua só com os autorizados", () => {
  const p = lerParametros(memoria());
  const botina = { id: "b1", nome: "Botina", subcategoria_id: "sub-epi-botina", estoque_atual: 0, estoque_minimo: 0 };
  assert.deepEqual(opcoesTamanhoEntrada(p, "epi", botina, true), opcoesTamanhoEntrada(p, "epi", botina));
});

test("o tamanho escolhido na Entrada passa a ser autorizado da subcategoria, sem duplicar", () => {
  const armazenamento = memoria();
  const tamanho = opcoesTamanhoEntrada(lerParametros(armazenamento), "epi", capacete, true)[0].valor;
  associarTamanhoNaEntrada("epi", capacete, tamanho, armazenamento);
  associarTamanhoNaEntrada("epi", capacete, tamanho, armazenamento);
  const depois = lerParametros(armazenamento);
  assert.equal(tamanhosAutorizadosDoProduto(depois, "epi", capacete).filter((t) => t.id === tamanho).length, 1);
});

test("entrada com tamanho em produto antigo soma no tamanho e mantém o saldo antigo em Sem tamanho", async () => {
  globalThis.localStorage = memoria();
  globalThis.window = { localStorage: globalThis.localStorage, addEventListener() {}, removeEventListener() {}, dispatchEvent() {} };
  const { demoSupabase } = await import("../src/integrations/supabase/demo-client.ts");
  const { saldosPorTamanho } = await import("../src/lib/estoque-tamanho.ts");
  const p = lerParametros(memoria());
  const tamanho = opcoesTamanhoEntrada(p, "epi", capacete, true)[0].valor;
  const empresa = crypto.randomUUID();
  const id = crypto.randomUUID();
  await demoSupabase.from("epis").insert({ ...capacete, id, empresa_id: empresa, codigo_sku: "EPI-0777" });
  associarTamanhoNaEntrada("epi", capacete, tamanho);
  const { error } = await demoSupabase.from("movimentacoes").insert([{ modulo: "epi", tipo_movimentacao: "Entrada", quantidade: 5, data_movimentacao: "2026-10-16", item_id: id, empresa_id: empresa, tamanho_id: tamanho }]);
  assert.equal(error, null);
  const { data } = await demoSupabase.from("epis").select("*").eq("id", id).single();
  assert.equal(data.estoque_atual, 24);
  const saldos = saldosPorTamanho(lerParametros(), "epi", data);
  assert.equal(saldos[tamanho], 5);
  assert.equal(saldos["sem-tamanho"], 19);
});
