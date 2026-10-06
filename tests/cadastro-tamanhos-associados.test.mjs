import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { lerParametros } from "../src/lib/parametros-base.ts";
import { tamanhosAssociadosParaCadastro } from "../src/lib/estoque-tamanho.ts";

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

test("Novo EPI e Novo Uniforme só oferecem os tamanhos autorizados da subcategoria (decisão 71)", () => {
  const p = lerParametros(null);
  const luva = { categoria: "Luva", subcategoria_id: "sub-epi-luva" };
  const capacete = { categoria: "Capacete", subcategoria_id: "sub-epi-capacete" };
  // Luva: só P, M e G autorizados em Associar ao produto; os outros tamanhos de Gerais ficam de fora.
  assert.deepEqual(tamanhosAssociadosParaCadastro(p, "epi", luva).map((t) => t.rotulo), ["P", "M", "G"]);
  // Subcategoria sem autorização: lista vazia (a tela mostra o aviso e o link Cadastrar tamanho).
  assert.deepEqual(tamanhosAssociadosParaCadastro(p, "epi", capacete), []);
});

test("Novo EPI e Novo Uniforme usam os tamanhos autorizados e mostram sempre o link Cadastrar tamanho (decisão 70)", () => {
  for (const arquivo of ["CadastroEpi", "CadastroUniforme"]) {
    const tela = readFileSync(
      fileURLToPath(new URL(`../src/components/modules/${arquivo}.tsx`, import.meta.url)),
      "utf8",
    );
    assert.match(tela, /tamanhosAssociadosParaCadastro/);
    assert.doesNotMatch(tela, /tamanhosGeraisParaCadastro/);
    assert.match(tela, /Nenhum tamanho autorizado para esta subcategoria/);
    // O link fica no mesmo parágrafo para lista cheia e vazia, e o Select reinicia quando entra tamanho novo.
    assert.match(tela, /associados\.length > 0 \? "Não achou o tamanho\?" : "Nenhum tamanho autorizado para esta subcategoria\."/);
    assert.match(tela, /<Select key=\{associados\.length\} value=\{tamanhoSel\}/);
    // Nada é associado em silêncio ao salvar: a associação vem só de Associar ao produto ou do link.
    assert.doesNotMatch(tela, /autorizar\(/);
  }
});
