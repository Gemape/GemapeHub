import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  atualizarPergunta, duplicarPergunta, excluirPergunta, lerQuestionario, moverPergunta, mudarTipo, novaPergunta,
  questionarioVazio, salvarQuestionario, validarQuestionario,
} from "../src/lib/questionario-despesas.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v), dados };
};
const com = (...perguntas) => ({ ...questionarioVazio(), perguntas });
const p = (titulo, extra = {}) => ({ ...novaPergunta("texto"), titulo, ...extra });

test("pergunta nova de múltipla escolha vem com uma opção; texto não tem opções", () => {
  assert.deepEqual(novaPergunta("multipla").opcoes, ["Opção 1"]);
  assert.deepEqual(novaPergunta("texto").opcoes, []);
});

test("trocar o tipo guarda o enunciado e só mantém opções onde existem", () => {
  const m = { ...novaPergunta("multipla"), titulo: "Forma de pagamento", opcoes: ["Pix", "Cartão"] };
  assert.deepEqual(mudarTipo(m, "caixas").opcoes, ["Pix", "Cartão"]);
  const t = mudarTipo(m, "texto");
  assert.equal(t.titulo, "Forma de pagamento");
  assert.deepEqual(t.opcoes, []);
  assert.deepEqual(mudarTipo(t, "lista").opcoes, ["Opção 1"]);
});

test("duplicar põe a cópia logo abaixo, com id novo e opções independentes", () => {
  const a = p("A", { tipo: "multipla", opcoes: ["x"] });
  const lista = duplicarPergunta([a, p("B")], a.id);
  assert.equal(lista.length, 3);
  assert.equal(lista[1].titulo, "A");
  assert.notEqual(lista[1].id, a.id);
  lista[1].opcoes.push("y");
  assert.deepEqual(a.opcoes, ["x"]);
});

test("mover (arrastar) e excluir", () => {
  const [a, b, c] = [p("A"), p("B"), p("C")];
  assert.deepEqual(moverPergunta([a, b, c], c.id, a.id).map((x) => x.titulo), ["C", "A", "B"]);
  assert.deepEqual(moverPergunta([a, b, c], a.id, c.id).map((x) => x.titulo), ["B", "C", "A"]);
  assert.equal(moverPergunta([a, b], a.id, a.id).length, 2);
  assert.deepEqual(excluirPergunta([a, b, c], b.id).map((x) => x.titulo), ["A", "C"]);
  assert.equal(atualizarPergunta([a, b], { ...b, obrigatoria: true })[1].obrigatoria, true);
});

test("validação: título, enunciado, opções vazias ou repetidas e escala", () => {
  assert.deepEqual(validarQuestionario(com()), []);
  assert.match(validarQuestionario({ ...com(), titulo: " " })[0], /título/);
  assert.match(validarQuestionario(com(p("")))[0], /Pergunta 1: informe o enunciado/);
  assert.match(validarQuestionario(com(p("A", { tipo: "lista", opcoes: ["a", ""] })))[0], /preencha todas as opções/);
  assert.match(validarQuestionario(com(p("A", { tipo: "lista", opcoes: ["Pix", "pix"] })))[0], /repetidas/);
  assert.match(validarQuestionario(com(p("A", { tipo: "escala", escalaMax: 11 })))[0], /2 a 10/);
});

test("salvar grava o esquema limpo e ler devolve o mesmo; inválido não grava", () => {
  const s = memoria();
  assert.deepEqual(lerQuestionario(s), questionarioVazio());
  assert.throws(() => salvarQuestionario(com(p("")), s), /enunciado/);
  assert.equal(s.dados.size, 0);
  const gravado = salvarQuestionario(com(p("  Valor gasto  ", { obrigatoria: true })), s);
  assert.equal(gravado.perguntas[0].titulo, "Valor gasto");
  assert.deepEqual(lerQuestionario(s), gravado);
});

test("dado salvo ilegível não é sobrescrito", () => {
  const s = memoria();
  s.setItem("gemape-demo-questionario-despesas", "{quebrado");
  assert.deepEqual(lerQuestionario(s), questionarioVazio());
  assert.throws(() => salvarQuestionario(com(p("A")), s), /ilegível/);
  assert.equal(s.getItem("gemape-demo-questionario-despesas"), "{quebrado");
});

test("o submenu fica em Parâmetros > Veículos e a rota existe", () => {
  const menu = readFileSync(new URL("../src/lib/menu-parametros.ts", import.meta.url), "utf8");
  assert.match(menu, /Questionário de Despesas", url: "\/cadastros\/veiculos-questionario-despesas"/);
  const rota = readFileSync(new URL("../src/routes/_authenticated/cadastros/veiculos-questionario-despesas.tsx", import.meta.url), "utf8");
  assert.match(rota, /QuestionarioDespesasConstrutor/);
});
