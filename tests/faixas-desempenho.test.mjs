import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { FAIXAS, faixaDoIndice } from "../src/lib/faixas-desempenho.ts";

const faixa = (v) => faixaDoIndice(v)?.faixa ?? null;

test("limites das faixas: verde de 90, amarelo de 70, vermelho abaixo", () => {
  assert.equal(faixa(100), "verde");
  assert.equal(faixa(90), "verde");
  assert.equal(faixa(89.9), "amarelo");
  assert.equal(faixa(70), "amarelo");
  assert.equal(faixa(69.9), "vermelho");
  assert.equal(faixa(0), "vermelho");
});

test("o valor é comparado como aparece na tela (1 casa)", () => {
  assert.equal(faixa(89.95), "verde");
  assert.equal(faixa(89.94), "amarelo");
  assert.equal(faixa(69.95), "amarelo");
  assert.equal(faixa(69.94), "vermelho");
});

test("sem índice não há faixa", () => {
  assert.equal(faixaDoIndice(null), null);
  assert.equal(faixaDoIndice(Number.NaN), null);
});

test("a tabela de faixas traz cor, intervalo, classificação e significado do esquema", () => {
  assert.deepEqual(FAIXAS.map((f) => f.cor), ["Verde", "Amarelo", "Vermelho"]);
  assert.deepEqual(FAIXAS.map((f) => f.intervalo), ["90% a 100%", "70% a 89,9%", "Abaixo de 70%"]);
  assert.deepEqual(FAIXAS.map((f) => f.classificacao), ["Excelente / No prazo", "Atenção / Alerta", "Crítico / Inaceitável"]);
  for (const f of FAIXAS) assert.ok(f.significado.length > 20);
});

test("o painel usa as faixas nos cartões, na tabela e na legenda", () => {
  const src = readFileSync(new URL("../src/components/modules/ViagensPainel.tsx", import.meta.url), "utf8");
  assert.match(src, /faixaDoIndice\(/);
  assert.match(src, /ValorComFaixa/);
  assert.match(src, /LegendaFaixas/);
  assert.match(src, /Faixas de desempenho/);
});
