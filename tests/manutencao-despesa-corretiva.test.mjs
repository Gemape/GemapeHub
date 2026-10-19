import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const dialogo = ler("components/modules/NovaManutencaoDialog.tsx");
const questionario = ler("components/parametros/QuestionarioFormulario.tsx");
const modulo = ler("components/modules/ManutencaoVeiculoModulo.tsx");

test("o diálogo aceita um tipo fixo e abre nele quando não está editando", () => {
  assert.match(dialogo, /tipoFixo\?: string/);
  assert.match(dialogo, /setTipo\(m\?\.tipo \?\? tipoFixo \?\? "Preventiva"\)/);
});

test("com tipo fixo, o campo Tipo fica travado (não dá para trocar para Preventiva)", () => {
  assert.match(dialogo, /<Select value=\{tipo\} onValueChange=\{setTipo\} disabled=\{Boolean\(tipoFixo\)\}>/);
});

test("a despesa de manutenção do questionário abre o cadastro sempre como Corretiva", () => {
  assert.match(questionario, /<NovaManutencaoDialog [^\n]*tipoFixo="Corretiva"/);
});

test("no módulo Veículos o tipo continua livre (Preventiva por padrão)", () => {
  assert.doesNotMatch(modulo, /tipoFixo/);
  assert.match(dialogo, /useState\("Preventiva"\)/);
});

test("o tipo gravado vem do estado, então a despesa grava Corretiva", () => {
  assert.match(dialogo, /veiculoId, tipo, data: String\(f\.get\("data"\)/);
});
