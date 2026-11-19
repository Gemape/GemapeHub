import test from "node:test";
import assert from "node:assert/strict";

import { linhasDaSugestaoFerramentas } from "../src/lib/sugestao-ferramentas.ts";

const ferr = (id, minimo, extra = {}) => ({ id, codigo_sku: `FER-${id}`, nome: `Ferramenta ${id}`, empresa_id: "e1", estoque_minimo: minimo, ...extra });
const baixa = (item_id, quantidade, data) => ({ item_id, tipo_movimentacao: "Saida", motivo_baixa: "Quebra", quantidade, data_movimentacao: data });

test("status pelo estoque mínimo: sem saldo é ruptura, abaixo é comprar já, no mínimo é planejar, acima é estável", () => {
  const saldos = { a: 0, b: 2, c: 5, d: 9 };
  const l = linhasDaSugestaoFerramentas({
    ferramentas: ["a", "b", "c", "d"].map((id) => ferr(id, 5)),
    saldoDe: (id) => saldos[id],
    movimentos: [],
    hoje: "2026-11-11",
  });
  assert.deepEqual(l.map((x) => x.status), ["ruptura", "comprar_ja", "planejar", "estavel"]);
  assert.deepEqual(l.map((x) => x.quantidadeSugerida > 0), [true, true, true, false]);
});

test("só a baixa dos últimos 12 meses conta como consumo; entrega e devolução não", () => {
  const l = linhasDaSugestaoFerramentas({
    ferramentas: [ferr("a", 2)],
    saldoDe: () => 6,
    movimentos: [
      baixa("a", 6, "2026-06-01"),
      baixa("a", 9, "2025-10-01"), // fora do ano
      { item_id: "a", tipo_movimentacao: "Saida", motivo_baixa: "Fornecimento ao Empregado", quantidade: 4, data_movimentacao: "2026-05-01" },
      { item_id: "a", tipo_movimentacao: "Devolucao", motivo_baixa: null, quantidade: 4, data_movimentacao: "2026-06-01" },
    ],
    hoje: "2026-11-11",
  });
  assert.equal(l[0].mediaMensal, 0.5);
  assert.equal(l[0].cobertura, 360);
});

test("ferramenta inativa não entra", () => {
  const l = linhasDaSugestaoFerramentas({ ferramentas: [ferr("a", 2, { status: "Inativo" }), ferr("b", 2)], saldoDe: () => 0, movimentos: [], hoje: "2026-11-11" });
  assert.deepEqual(l.map((x) => x.itemId), ["b"]);
});

test("a baixa por devolução ao estoque não conta como consumo", () => {
  const entrada = { ferramentas: [ferr("a", 5)], saldoDe: () => 5, hoje: "2026-11-18" };
  const consumo = (motivo) => JSON.stringify(linhasDaSugestaoFerramentas({ ...entrada, movimentos: [{ ...baixa("a", 6, "2026-06-01"), motivo_baixa: motivo }] }));
  assert.notEqual(consumo("Quebra"), consumo("Devolução"));
  assert.equal(consumo("Devolução"), JSON.stringify(linhasDaSugestaoFerramentas({ ...entrada, movimentos: [] })));
});
