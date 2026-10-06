import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { lerParametros, autorizados } from "../src/lib/parametros-base.ts";
import { criarTamanhoParaSubcategoria } from "../src/lib/tamanho-subcategoria.ts";

const storage = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};

test("criar tamanho para a subcategoria cadastra em Gerais e já associa", () => {
  const s = storage();
  const sub = lerParametros(s).subcategorias[0];
  const t = criarTamanhoParaSubcategoria("XG Especial", sub.id, s);
  const d = lerParametros(s);
  assert.ok(d.tamanhos.some((x) => x.id === t.id));
  assert.ok(autorizados(d, sub.id, "tamanhos").some((x) => x.id === t.id));
  assert.throws(() => criarTamanhoParaSubcategoria("xg especial", sub.id, s), /já está cadastrado/);
  assert.throws(() => criarTamanhoParaSubcategoria("Novo", "nao-existe", s), /não encontrad/i);
  assert.equal(lerParametros(s).tamanhos.some((x) => x.nome === "Novo"), false);
});

for (const [arquivo, rotulo] of [["CadastroEpi", "EPI"], ["CadastroUniforme", "uniforme"]]) {
  test(`${arquivo}: o link Cadastrar tamanho aparece com ou sem tamanho na lista e abre o cadastro na mesma tela, em diálogo irmão`, () => {
    const tela = readFileSync(`src/components/modules/${arquivo}.tsx`, "utf8");
    assert.match(tela, /Cadastrar tamanho/);
    assert.match(tela, /<DialogTamanhoSubcategoria/);
    assert.match(tela, /onCriado=\{setTamanhoSel\}/);
    assert.doesNotMatch(tela, /para ter tamanho, associe em Cadastros/);
  });
}

test("o diálogo é só do Administrador, trava duplo clique e não toca o Supabase", () => {
  const c = readFileSync("src/components/parametros/DialogTamanhoSubcategoria.tsx", "utf8");
  assert.match(c, /isAdmin/);
  assert.match(c, /setNome\(""\)/);
  assert.match(c, /criarTamanhoParaSubcategoria/);
  assert.doesNotMatch(c, /supabase/i);
});
