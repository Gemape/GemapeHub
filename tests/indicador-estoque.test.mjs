import test from "node:test";
import assert from "node:assert/strict";

import { indicadorDeEstoque, percentualDe, textoPercentual } from "../src/lib/indicador-estoque.ts";

test("percentual com uma casa, sem total fica sem valor e sem faixa", () => {
  assert.equal(percentualDe(1, 3), 33.3);
  assert.equal(percentualDe(5, 0), null);
  assert.equal(percentualDe(-2, 10), 0);
  assert.equal(percentualDe(12, 10), 100);
  assert.deepEqual(indicadorDeEstoque(0, 0), { pct: null, faixa: null });
  assert.equal(textoPercentual(null), "—");
  assert.equal(textoPercentual(68.2), "68,2%");
});

test("a faixa segue os limites padrão (90 e 70) e pode ser dispensada", () => {
  assert.equal(indicadorDeEstoque(95, 100).faixa, "verde");
  assert.equal(indicadorDeEstoque(80, 100).faixa, "amarelo");
  assert.equal(indicadorDeEstoque(50, 100).faixa, "vermelho");
  assert.deepEqual(indicadorDeEstoque(50, 100, false), { pct: 50, faixa: null });
});
