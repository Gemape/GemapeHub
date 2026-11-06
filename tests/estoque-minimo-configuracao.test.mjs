import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { prepararMinimoDaLinha } from "../src/lib/estoque-configuracao.ts";
import { abaixoDoMinimo } from "../src/lib/sugestao-epi.ts";

test("linha de um tamanho: grava só aquele tamanho e o total vira a soma", () => {
  assert.deepEqual(prepararMinimoDaLinha({ M: 5, G: 3 }, "M", "8"), { estoque_minimo: 11, minimos_tamanho: { M: 8, G: 3 } });
  assert.deepEqual(prepararMinimoDaLinha({}, "P", "4"), { estoque_minimo: 4, minimos_tamanho: { P: 4 } });
});
test("zero desliga o alerta do tamanho; os outros ficam", () => {
  assert.deepEqual(prepararMinimoDaLinha({ M: 5, G: 3 }, "M", "0"), { estoque_minimo: 3, minimos_tamanho: { G: 3 } });
});
test("sem tamanho grava o mínimo único; valor inválido é recusado", () => {
  assert.deepEqual(prepararMinimoDaLinha({ M: 5 }, null, "7"), { estoque_minimo: 7, minimos_tamanho: {} });
  for (const ruim of ["", "-1", "2.5", "abc"]) assert.throws(() => prepararMinimoDaLinha({}, "M", ruim), /inválido/);
  assert.throws(() => prepararMinimoDaLinha({}, null, "-1"), /inválido/);
});
test("o mínimo configurado muda o alerta: saldo 5 com mínimo 4 não alerta, com mínimo 6 alerta", () => {
  const l = (minimo) => [{ total: 5, minimo, descricao: "Luva" }];
  assert.equal(abaixoDoMinimo(l(4)).length, 0);
  assert.equal(abaixoDoMinimo(l(6)).length, 1);
});
test("a aba Estoque de EPI e de Uniformes tem o botão Configurar que grava o mínimo no item (decisão 416)", () => {
  const t = readFileSync(new URL("../src/components/modules/EstoqueEpiModulo.tsx", import.meta.url), "utf8");
  assert.match(t, /prepararMinimoDaLinha\(/);
  assert.match(t, /useSalvar\(modulo === "epi" \? "epis" : "uniformes", \["estoque-modulo"\]\)/);
  assert.match(t, /<Button requiresWrite variant="outline" size="sm" onClick=\{\(\) => setEditando\(l\)\}>/);
});
