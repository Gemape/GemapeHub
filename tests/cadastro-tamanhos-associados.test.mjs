import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { lerParametros } from "../src/lib/parametros-base.ts";
import { tamanhosAssociadosParaCadastro, tamanhosGeraisParaCadastro } from "../src/lib/estoque-tamanho.ts";

test("o cadastro lista todos os tamanhos associados à subcategoria, na ordem de Gerais", () => {
  const p = lerParametros(null);
  p.inativos.push("tam-41");
  const botina = { categoria: "Botina", subcategoria_id: "sub-epi-botina" };
  assert.deepEqual(
    tamanhosAssociadosParaCadastro(p, "epi", botina).map((t) => t.rotulo),
    ["37", "38", "39", "40", "41 (desativado)", "42", "43"],
  );
  // Subcategoria sem associação: lista vazia.
  assert.deepEqual(
    tamanhosAssociadosParaCadastro(p, "epi", {
      categoria: "Capacete",
      subcategoria_id: "sub-epi-capacete",
    }),
    [],
  );
});

test("o formulário de Cadastrar EPI e Uniforme mostra o campo Tamanhos e numerações", () => {
  const tela = readFileSync(
    fileURLToPath(new URL("../src/components/modules/CadastroProduto.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(tela, /Tamanhos e numerações/);
  assert.match(tela, /tamanhosAssociadosParaCadastro/);
  assert.match(tela, /Nenhum tamanho associado a esta subcategoria/);
});

test("Novo EPI e Novo Uniforme listam todos os tamanhos ativos de Gerais, com os associados da subcategoria", () => {
  const p = lerParametros(null);
  p.inativos.push("tam-41");
  const capacete = { categoria: "Capacete", subcategoria_id: "sub-epi-capacete" };
  const botina = { categoria: "Botina", subcategoria_id: "sub-epi-botina" };
  const geral = tamanhosGeraisParaCadastro(p, "epi", capacete).map((t) => t.rotulo);
  // Sem associação, o capacete ainda enxerga os tamanhos ativos do cadastro geral.
  assert.ok(geral.length > 0);
  assert.ok(!geral.some((r) => r.includes("41")));
  // Desativado só aparece se já estiver associado à subcategoria.
  assert.ok(tamanhosGeraisParaCadastro(p, "epi", botina).some((t) => t.rotulo === "41 (desativado)"));
  // Sem nenhum tamanho em Gerais, a lista é vazia (a tela sugere Cadastrar tamanho).
  assert.deepEqual(tamanhosGeraisParaCadastro({ ...p, tamanhos: [] }, "epi", capacete), []);
});

test("Novo EPI e Novo Uniforme usam o cadastro geral e mostram sempre o link Cadastrar tamanho (decisão 70)", () => {
  for (const arquivo of ["CadastroEpi", "CadastroUniforme"]) {
    const tela = readFileSync(
      fileURLToPath(new URL(`../src/components/modules/${arquivo}.tsx`, import.meta.url)),
      "utf8",
    );
    assert.match(tela, /tamanhosGeraisParaCadastro/);
    assert.match(tela, /Nenhum tamanho cadastrado em Gerais/);
    // O link fica no mesmo parágrafo para lista cheia e vazia, e o Select reinicia quando entra tamanho novo.
    assert.match(tela, /tamanhosGerais\.length > 0 \? "Não achou o tamanho\?" : "Nenhum tamanho cadastrado em Gerais\."/);
    assert.match(tela, /<Select key=\{tamanhosGerais\.length\} value=\{tamanhoSel\}/);
    assert.match(tela, /autorizar\(/);
  }
});
