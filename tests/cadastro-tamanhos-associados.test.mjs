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
