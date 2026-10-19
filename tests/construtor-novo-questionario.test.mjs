import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const construtor = readFileSync(new URL("../src/components/parametros/QuestionarioDespesasConstrutor.tsx", import.meta.url), "utf8");

test("o botão que abre a edição dos cards se chama Novo questionário", () => {
  assert.match(construtor, /<Pencil className="mr-1 h-4 w-4" \/>Novo questionário<\/Button>/);
  assert.doesNotMatch(construtor, /Editar cards/);
});

test("o botão continua abrindo a edição da pergunta dos cards (Tipos de despesas)", () => {
  assert.match(construtor, /porId\.get\(ID_TIPO_DESPESA\)[\s\S]{0,120}setDialogo\(\{ modo: "editar", inicial: q \}\)/);
});

import { numerosNaTela } from "../src/lib/questionario-despesas.ts";

test("numerosNaTela numera pela posição (01, 02, ...) sem contar a pergunta fixa dos cards", () => {
  const n = numerosNaTela(["q-03", "q-04", "q-14", "q-05"], ["q-03"]);
  assert.equal(n.get("q-04"), "01");
  assert.equal(n.get("q-14"), "02");
  assert.equal(n.get("q-05"), "03");
  assert.equal(n.has("q-03"), false);
});

test("a numeração acompanha a ordem: reordenar muda os números, e passa de 99 sem quebrar", () => {
  assert.equal(numerosNaTela(["a", "b"], []).get("a"), "01");
  assert.equal(numerosNaTela(["b", "a"], []).get("a"), "02");
  const muitos = Array.from({ length: 120 }, (_, i) => `p${i}`);
  assert.equal(numerosNaTela(muitos, []).get("p119"), "120");
});

test("a montagem mostra o número da posição, não o código fixo, nos cartões e nas mensagens", () => {
  assert.match(construtor, /numerosNaTela\(/);
  assert.doesNotMatch(construtor, /\{p\.codigo\}/);
  assert.doesNotMatch(construtor, /Pergunta \$\{p\.codigo\}/);
  assert.doesNotMatch(construtor, /pergunta \$\{p\.codigo\}/);
  assert.doesNotMatch(construtor, /\)\?\.codigo\}/);
});

test("o título da janela da pergunta usa o mesmo número da tela", () => {
  const dialogo = readFileSync(new URL("../src/components/parametros/PerguntaDialog.tsx", import.meta.url), "utf8");
  assert.match(dialogo, /numero\?: string/);
  assert.match(dialogo, /Pergunta \$\{numero \?\? pergunta\.codigo\}/);
  assert.match(construtor, /numero=\{dialogo\?\.inicial \? numeroDe\(dialogo\.inicial\.id\) : String\(numeros\.size \+ 1\)\.padStart\(2, "0"\)\}/);
});
