import test from "node:test";
import assert from "node:assert/strict";

import { resumoEmpregado } from "../src/lib/resumo-empregado.ts";

const itens = [
  { id: "a", nome: "Botina", ca_validade: "2026-01-10" },
  { id: "b", nome: "Luva", ca_validade: "2027-05-01" },
  { id: "c", nome: "Capacete" },
];
const mov = (item_id, tipo_movimentacao, quantidade, extra = {}) => ({ item_id, empregado_id: "e1", tipo_movimentacao, quantidade, data_movimentacao: "2026-01-01", ...extra });

test("só conta o que ainda está em posse (saída menos devolução) e ordena vencidos primeiro", () => {
  const movs = [mov("b", "Saida", 2), mov("a", "Saida", 1, { tamanho_id: "42" }), mov("c", "Saida", 1), mov("c", "Devolucao", 1)];
  const r = resumoEmpregado(movs, itens, "e1", "2026-11-12");
  assert.deepEqual(r.emPosse.map((p) => [p.nome, p.quantidade, p.vencido]), [["Botina", 1, true], ["Luva", 2, false]]);
  assert.deepEqual(r.emPosse[0].tamanhos, ["42"]);
  assert.equal(r.vencidos, 1);
});

test("movimentações de outro empregado não entram, e sem movimentos o resumo é vazio", () => {
  assert.equal(resumoEmpregado([{ ...mov("a", "Saida", 1), empregado_id: "e2" }], itens, "e1", "2026-11-12").emPosse.length, 0);
  assert.deepEqual(resumoEmpregado([], itens, "e1", "2026-11-12"), { emPosse: [], vencidos: 0 });
});

test("tamanho devolvido não aparece e item fora do cadastro continua em posse", () => {
  const movs = [mov("a", "Saida", 1, { tamanho_id: "40" }), mov("a", "Devolucao", 1, { tamanho_id: "40" }), mov("a", "Saida", 1, { tamanho_id: "42" }), mov("x", "Saida", 1)];
  const r = resumoEmpregado(movs, itens, "e1", "2026-11-12");
  assert.deepEqual(r.emPosse.find((p) => p.itemId === "a").tamanhos, ["42"]);
  assert.equal(r.emPosse.find((p) => p.itemId === "x").nome, "Item removido do cadastro");
});
