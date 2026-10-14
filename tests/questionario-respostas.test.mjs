import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { ID_TIPO_DESPESA, estadoPadrao as estadoDeFabrica, excluirPergunta, gravarQuestionario, gravarRegra, lerEstado, salvarPergunta, questionarioDoTipo } from "../src/lib/questionario-despesas.ts";
import {
  aplicarFormato, areaDeQuemLanca, lancadoPorGestor, dimensoesReduzidas, mascaraDecimal2, mascaraInteiro, mascaraMoeda, perguntasVisiveis, validarRespostas, valorNumerico, visivel,
} from "../src/lib/questionario-respostas.ts";

// Estado de fábrica sem a condição do cartão (dec 182), para os testes que preenchem todas as perguntas.
const estadoPadrao = () => ({ ...estadoDeFabrica(), regras: {} });

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v), dados };
};
const T = "Abastecimento";
const cartao = (e, s) => gravarRegra(e, T, "q-02", { origem: "q-01", operador: "igual", valor: "Cartão de crédito" }, s);

test("máscaras: duas casas entram sozinhas, moeda leva R$, inteiro só dígitos", () => {
  assert.equal(mascaraDecimal2("1"), "0,01");
  assert.equal(mascaraDecimal2("12345"), "123,45");
  assert.equal(mascaraDecimal2("1234567"), "12.345,67");
  assert.equal(mascaraDecimal2("abc"), "");
  assert.equal(mascaraDecimal2("0001"), "0,01");
  assert.equal(mascaraMoeda("150000"), "R$ 1.500,00");
  assert.equal(mascaraInteiro("12a3"), "123");
  assert.equal(aplicarFormato("x1", "livre"), "x1");
  assert.equal(valorNumerico("R$ 1.234,56"), 1234.56);
  assert.equal(valorNumerico("12"), 12);
});

test("se/então: a pergunta só aparece quando a resposta bate, e some ao trocar", () => {
  const s = memoria();
  const e = cartao(estadoPadrao(), s);
  assert.equal(e.regras[T]["q-02"].valor, "Cartão de crédito");
  assert.equal(visivel(e, T, "q-02", {}), false);
  assert.equal(visivel(e, T, "q-02", { "q-01": ["Dinheiro"] }), false);
  assert.equal(visivel(e, T, "q-02", { "q-01": ["Cartão de crédito"] }), true);
  assert.ok(!perguntasVisiveis(e, T, {}).some((p) => p.id === "q-02"));
  assert.ok(perguntasVisiveis(e, T, { "q-01": ["Cartão de crédito"] }).some((p) => p.id === "q-02"));
  // "não for"
  const n = gravarRegra(e, T, "q-02", { origem: "q-01", operador: "diferente", valor: "Dinheiro" }, s);
  assert.equal(visivel(n, T, "q-02", {}), true);
  assert.equal(visivel(n, T, "q-02", { "q-01": ["Dinheiro"] }), false);
});

test("a regra vale só no questionário do tipo e só com origem anterior, com opções escritas", () => {
  const s = memoria();
  const e = cartao(estadoPadrao(), s);
  assert.equal(visivel(e, "Hospedagem", "q-02", {}), true);
  assert.throws(() => gravarRegra(estadoPadrao(), T, "q-01", { origem: "q-02", operador: "igual", valor: "Cartão final 0129 – Roberto" }, s), /antes/);
  assert.throws(() => gravarRegra(estadoPadrao(), T, "q-08", { origem: "q-07", operador: "igual", valor: "x" }, s), /opções escritas/);
  assert.throws(() => gravarRegra(estadoPadrao(), T, "q-02", { origem: "q-01", operador: "igual", valor: "Pix" }, s), /opção da pergunta/);
  assert.throws(() => gravarRegra(estadoPadrao(), T, ID_TIPO_DESPESA, { origem: "q-01", operador: "igual", valor: "Dinheiro" }, s), /inicial/);
  assert.throws(() => gravarRegra(estadoPadrao(), T, "q-02", { origem: ID_TIPO_DESPESA, operador: "igual", valor: "Pedágio" }, s), /opções escritas/);
});

test("mexer na ordem, nas opções ou excluir limpa a regra que deixou de valer", () => {
  const s = memoria();
  let e = cartao(estadoPadrao(), s);
  // origem passa para depois: regra cai
  const ordem = questionarioDoTipo(e, T).filter((x) => x !== ID_TIPO_DESPESA);
  e = gravarQuestionario(e, T, [ordem[1], ordem[0], ...ordem.slice(2)], s);
  assert.equal(e.regras[T], undefined);
  // opção renomeada: regra cai
  e = cartao(estadoPadrao(), s);
  const q1 = e.perguntas.find((p) => p.id === "q-01");
  e = salvarPergunta(e, { ...q1, opcoes: ["Dinheiro", "Cartão", "Ticket de abastecimento"] }, s);
  assert.equal(e.regras[T], undefined);
  // excluir a origem
  e = excluirPergunta(cartao(estadoPadrao(), s), "q-01", s);
  assert.equal(e.regras[T], undefined);
  // tirar a condição
  assert.equal(gravarRegra(cartao(estadoPadrao(), s), T, "q-02", null, s).regras[T]?.["q-02"], undefined);
});

test("a condição de uma pergunta oculta não vale e a regra grava e relê do navegador", () => {
  const s = memoria();
  let e = cartao(estadoPadrao(), s);
  e = gravarRegra(e, T, "q-04", { origem: "q-02", operador: "igual", valor: "Cartão final 0129 – Roberto" }, s);
  // q-02 oculta => q-04 oculta mesmo com a resposta marcada
  assert.ok(!perguntasVisiveis(e, T, { "q-02": ["Cartão final 0129 – Roberto"] }).some((p) => p.id === "q-04"));
  assert.deepEqual(lerEstado(s).regras, e.regras);
  assert.deepEqual(lerEstado(memoria()).regras, estadoDeFabrica().regras);
});

test("validação: obrigatórias, formatos, horário, data, upload e uma só resposta", () => {
  const e = estadoPadrao();
  const todas = perguntasVisiveis(e, T, {});
  const vazios = validarRespostas(todas, {});
  assert.equal(Object.keys(vazios).length, 13);
  assert.match(vazios["q-12"], /ao menos uma imagem/);
  const ok = {
    "q-01": ["Dinheiro"], "q-02": ["Cartão final 0129 – Roberto"], "q-03": ["Abastecimento"], "q-04": ["Roberto (Oficina)"], "q-05": "Acre - AC", "q-06": "Rio Branco",
    "q-07": "00001 - Cliente", "q-08": "2026-10-14", "q-09": "Almoço", "q-10": "10,50", "q-11": "1.234,56", "q-12": ["a.jpg"], "q-13": "Avulso – técnico não monitorado",
  };
  assert.deepEqual(validarRespostas(todas, ok), {});
  assert.match(validarRespostas(todas, { ...ok, "q-10": "10" })["q-10"], /duas casas/);
  assert.match(validarRespostas(todas, { ...ok, "q-08": "14/10/2026" })["q-08"], /data/);
  assert.match(validarRespostas(todas, { ...ok, "q-12": ["a", "b", "c", "d"] })["q-12"], /No máximo 3/);
  assert.match(validarRespostas(todas, { ...ok, "q-01": ["Dinheiro", "Cartão de crédito"] })["q-01"], /apenas uma/);
  const hora = { ...todas[0], id: "h", tipo: "hora", obrigatoria: true };
  assert.deepEqual(validarRespostas([hora], { h: "08:30" }), {});
  assert.match(validarRespostas([hora], { h: "25:00" }).h, /hh:mm/);
  const inteiro = { ...todas[0], id: "i", tipo: "curta", formato: "inteiro", obrigatoria: false };
  assert.deepEqual(validarRespostas([inteiro], {}), {});
  assert.match(validarRespostas([inteiro], { i: "1,5" }).i, /inteiro/);
});

test("revisão: opção fora da lista, data impossível, moeda ancorada e valor numérico", () => {
  const e = estadoPadrao();
  const todas = perguntasVisiveis(e, T, {});
  const base = {
    "q-01": ["Dinheiro"], "q-02": ["Cartão final 0129 – Roberto"], "q-03": ["Abastecimento"], "q-04": ["Roberto (Oficina)"], "q-05": "Acre - AC", "q-06": "Rio Branco",
    "q-07": "00001 - Cliente", "q-08": "2026-10-14", "q-09": "Almoço", "q-10": "10,50", "q-11": "1.234,56", "q-12": ["a.jpg"], "q-13": "Avulso – técnico não monitorado",
  };
  assert.deepEqual(validarRespostas(todas, base), {});
  assert.match(validarRespostas(todas, { ...base, "q-05": "Xyz" })["q-05"], /opções da lista/);
  assert.match(validarRespostas(todas, { ...base, "q-02": ["Pix"] })["q-02"], /opções da lista/);
  assert.match(validarRespostas(todas, { ...base, "q-08": "2026-02-30" })["q-08"], /data/);
  assert.match(validarRespostas(todas, { ...base, "q-08": "2026-13-45" })["q-08"], /data/);
  assert.deepEqual(validarRespostas(todas, { ...base, "q-08": "2028-02-29" }), {});
  assert.match(validarRespostas(todas, { ...base, "q-11": "A1,00" })["q-11"], /duas casas/);
  assert.match(validarRespostas(todas, { ...base, "q-11": "lixo 99,99" })["q-11"], /duas casas/);
  assert.equal(valorNumerico("1,5"), 1.5);
  assert.equal(valorNumerico("R$ 1.234,56"), 1234.56);
  assert.equal(valorNumerico("12"), 12);
});

test("revisão: município some quando a UF some por condição, e a condição acompanha o tipo renomeado", () => {
  const s = memoria();
  let e = gravarRegra(estadoPadrao(), T, "q-05", { origem: "q-01", operador: "igual", valor: "Dinheiro" }, s);
  const sem = perguntasVisiveis(e, T, { "q-01": ["Cartão de crédito"] }).map((p) => p.id);
  assert.ok(!sem.includes("q-05") && !sem.includes("q-06"));
  assert.ok(perguntasVisiveis(e, T, { "q-01": ["Dinheiro"] }).some((p) => p.id === "q-06"));
  // renomear o tipo leva a condição junto
  const q3 = e.perguntas.find((p) => p.id === ID_TIPO_DESPESA);
  e = salvarPergunta(e, { ...q3, opcoes: q3.opcoes.map((o) => (o === T ? "Refeição" : o)) }, s);
  assert.equal(e.regras["Refeição"]["q-05"].valor, "Dinheiro");
  assert.equal(e.regras[T], undefined);
  // pergunta 3 nunca aceita mais de uma opção
  const forcada = salvarPergunta(e, { ...e.perguntas.find((p) => p.id === ID_TIPO_DESPESA), multiplas: true }, s);
  assert.equal(forcada.perguntas.find((p) => p.id === ID_TIPO_DESPESA).multiplas, false);
});

test("imagem econômica: lado maior até 1280 sem ampliar", () => {
  assert.deepEqual(dimensoesReduzidas(4000, 3000, 1280), { largura: 1280, altura: 960 });
  assert.deepEqual(dimensoesReduzidas(3000, 4000, 1280), { largura: 960, altura: 1280 });
  assert.deepEqual(dimensoesReduzidas(800, 600, 1280), { largura: 800, altura: 600 });
});

test("a tela tem o botão Abrir formulário e a condição se/então", () => {
  const tela = readFileSync(new URL("../src/components/parametros/QuestionarioDespesasConstrutor.tsx", import.meta.url), "utf8");
  assert.match(tela, /Abrir formulário/);
  assert.match(tela, /Mostrar esta pergunta só se/);
});

test("técnico responsável pela despesa só aparece quando quem lança é PCM ou Administrativo", () => {
  const e = estadoPadrao();
  const ids = (r) => perguntasVisiveis(e, "Pedágio", r).map((p) => p.id);
  assert.ok(!ids({}).includes("q-14"));
  assert.ok(!ids({ "q-04": ["Roberto (Oficina)"] }).includes("q-14"));
  assert.ok(ids({ "q-04": ["Eduardo (PCM)"] }).includes("q-14"));
  assert.ok(ids({ "q-04": "Maria (Administrativo)" }).includes("q-14"));
  assert.equal(lancadoPorGestor({ "q-04": ["Bruno (PCM)"] }), true);
  assert.equal(lancadoPorGestor({ "q-04": ["Wagner (Oficina)"] }), false);
  assert.equal(areaDeQuemLanca({}), null);
});

test("dec 182: Cartões de crédito só aparece com Moedas = Cartão de crédito, e dados salvos antes também ganham a condição", () => {
  const e = estadoDeFabrica();
  const aparece = (r) => perguntasVisiveis(e, T, r).some((p) => p.id === "q-02");
  assert.equal(aparece({}), false);
  assert.equal(aparece({ "q-01": ["Dinheiro"] }), false);
  assert.equal(aparece({ "q-01": ["Cartão de crédito"] }), true);
  assert.equal(visivel(e, "Hospedagem", "q-02", { "q-01": ["Ticket de abastecimento"] }), false);
  const antigo = estadoDeFabrica();
  const s = memoria();
  const { cartaoAjustado: _a, regras: _r, ...semMarca } = antigo;
  s.setItem("gemape-demo-questionario-despesas", JSON.stringify({ ...semMarca, regras: {} }));
  assert.equal(lerEstado(s).regras[T]?.["q-02"]?.valor, "Cartão de crédito");
});
