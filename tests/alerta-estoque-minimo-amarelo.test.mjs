import test from "node:test";
import assert from "node:assert/strict";
import { nivelDoAlerta, textoDoAlerta } from "../src/lib/estoque-epi-visao.ts";

test("abaixo/zerado vermelho, igual ao mínimo amarelo, 1 acima 'próximo' (decisões 419 e 420)", () => {
  assert.equal(nivelDoAlerta(4, 5), "abaixo");
  assert.equal(nivelDoAlerta(0, 5), "abaixo");
  assert.equal(nivelDoAlerta(0, 0), "abaixo");
  assert.equal(nivelDoAlerta(5, 5), "minimo");
  assert.equal(nivelDoAlerta(6, 5), "proximo");
  assert.equal(nivelDoAlerta(7, 5), null);
  assert.equal(nivelDoAlerta(1, 0), null, "sem mínimo, 1 unidade não alerta");
  assert.equal(textoDoAlerta({ saldo: 5, minimo: 5 }), "Estoque mínimo");
  assert.equal(textoDoAlerta({ saldo: 6, minimo: 5 }), "Próximo do mínimo");
  assert.equal(textoDoAlerta({ saldo: 3, minimo: 5 }), "Abaixo do mínimo");
  assert.equal(textoDoAlerta({ saldo: 9, minimo: 5 }), "");
});

test("todas as telas de estoque usam os mesmos níveis (decisão 421)", async () => {
  const { readFileSync } = await import("node:fs");
  for (const f of ["EstoqueEpiModulo", "EstoqueModulo"]) {
    const src = readFileSync(new URL(`../src/components/modules/${f}.tsx`, import.meta.url), "utf8");
    assert.match(src, /CLASSE_DO_NIVEL\[/, f);
    assert.match(src, /nivelDoAlerta/, f);
  }
});
