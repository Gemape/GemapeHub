import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { guardarRascunho, lerRascunho, limparRascunho, marcarVoltaDoRascunho } from "../src/lib/rascunho-ferramenta.ts";

const armazem = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
};
const rascunho = { editandoId: null, sigla: "FER", campos: { modelo: "X" } };

test("o formulário guardado só volta depois do botão de volta", () => {
  const a = armazem();
  guardarRascunho(rascunho, a);
  assert.equal(lerRascunho(a), null, "sair por outro caminho não reabre o formulário");
  marcarVoltaDoRascunho(a);
  assert.deepEqual(lerRascunho(a)?.campos, { modelo: "X" });
  limparRascunho(a);
  assert.equal(lerRascunho(a), null);
});

test("sem rascunho ou sem armazenamento nada quebra", () => {
  const a = armazem();
  marcarVoltaDoRascunho(a);
  assert.equal(lerRascunho(a), null);
  assert.doesNotThrow(() => { guardarRascunho(rascunho, null); marcarVoltaDoRascunho(null); limparRascunho(null); });
  assert.equal(lerRascunho(null), null);
});

test("os botões de volta marcam o rascunho e os links não aparecem na janela de compra", () => {
  for (const f of ["categorias", "tamanhos-unidades"]) {
    const rota = readFileSync(new URL(`../src/routes/_authenticated/cadastros/gerais/${f}.tsx`, import.meta.url), "utf8");
    assert.match(rota, /marcarVoltaDoRascunho\(\)/);
  }
  const modulo = readFileSync(new URL("../src/components/modules/ItensModulo.tsx", import.meta.url), "utf8");
  assert.match(modulo, /!janela && <button/);
});
