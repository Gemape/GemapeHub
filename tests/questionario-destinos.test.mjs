import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { estadoPadrao, excluirPergunta, gravarQuestionario, lerEstado, questionarioDoTipo, salvarPergunta } from "../src/lib/questionario-despesas.ts";
import { conferirOrdem, destinoPergunta, encontrarCiclo, gravarDestino, pendencias, questionarioPublicado } from "../src/lib/questionario-destinos.ts";
import { perguntasVisiveis } from "../src/lib/questionario-respostas.ts";
import { registrarResposta } from "../src/lib/respostas-despesas.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v), dados };
};
const T = "Abastecimento";
const respostas = (extra = {}) => ({ "q-03": T, ...extra });
const ids = (e, r) => perguntasVisiveis(e, T, r).map((p) => p.id);

test("sem destino a pergunta segue para a próxima", () => {
  const e = estadoPadrao();
  assert.deepEqual(ids(e, respostas({ "q-01": "Dinheiro" })).slice(0, 3), ["q-03", "q-01", "q-02"]);
});

test("destino 'Ir para' pula as perguntas do meio e 'Encerrar' termina o formulário", () => {
  const s = memoria();
  let e = estadoPadrao();
  e = gravarDestino(e, T, "q-01", "Dinheiro", destinoPergunta("q-04"), s);
  assert.deepEqual(ids(e, respostas({ "q-01": "Dinheiro" })).slice(0, 3), ["q-03", "q-01", "q-04"]);
  // outra opção continua na ordem normal
  assert.deepEqual(ids(e, respostas({ "q-01": "Ticket de abastecimento" })).slice(0, 3), ["q-03", "q-01", "q-02"]);
  e = gravarDestino(e, T, "q-01", "Dinheiro", "encerrar", s);
  assert.deepEqual(ids(e, respostas({ "q-01": "Dinheiro" })), ["q-03", "q-01"]);
  // tirar o destino volta ao padrão
  e = gravarDestino(e, T, "q-01", "Dinheiro", null, s);
  assert.equal(e.destinos[T]?.["q-01"], undefined);
  assert.deepEqual(ids(e, respostas({ "q-01": "Dinheiro" })).slice(0, 3), ["q-03", "q-01", "q-02"]);
});

test("ramificação vale só para o tipo em que foi marcada e sobrevive à gravação", () => {
  const s = memoria();
  const e = gravarDestino(estadoPadrao(), T, "q-01", "Dinheiro", "encerrar", s);
  assert.equal(lerEstado(s).destinos[T]["q-01"]["Dinheiro"], "encerrar");
  assert.ok(perguntasVisiveis(e, "Pedágio", { "q-03": "Pedágio", "q-01": "Dinheiro" }).length > 2);
});

test("validador de ciclos: volta a pergunta já visitada é recusada com o caminho", () => {
  const s = memoria();
  let e = estadoPadrao();
  // q-02 (cartões) -> q-01 (moedas) volta ao começo
  assert.throws(() => gravarDestino(e, T, "q-02", "Cartão final 0129 – Roberto", destinoPergunta("q-01"), s), /Fluxo em ciclo: 01 → 02 → 01\./);
  assert.throws(() => gravarDestino(e, T, "q-01", "Dinheiro", destinoPergunta("q-01"), s), /própria pergunta/);
  e = gravarDestino(e, T, "q-01", "Dinheiro", destinoPergunta("q-04"), s);
  assert.equal(encontrarCiclo(e, T), null);
});

test("reordenar não pode criar ciclo", () => {
  const s = memoria();
  const e = gravarDestino(estadoPadrao(), T, "q-01", "Dinheiro", destinoPergunta("q-04"), s);
  const lista = questionarioDoTipo(e, T);
  const invertida = [lista[0], ...lista.slice(1).reverse()];
  assert.throws(() => conferirOrdem(e, T, invertida), /Fluxo em ciclo/);
  conferirOrdem(e, T, lista);
});

test("só pergunta de uma resposta com opções escritas ramifica", () => {
  const s = memoria();
  const e = estadoPadrao();
  assert.throws(() => gravarDestino(e, T, "q-08", "x", "encerrar", s), /não ramifica/);
  assert.throws(() => gravarDestino(e, T, "q-03", "Pedágio", "encerrar", s), /não ramifica/);
  assert.throws(() => gravarDestino(e, T, "q-01", "Opção que não existe", "encerrar", s), /opção da pergunta/);
  assert.throws(() => gravarDestino(e, T, "q-01", "Dinheiro", destinoPergunta("q-99"), s), /deste questionário/);
});

test("ação requerida: excluir ou tirar o destino deixa o questionário sem publicar até corrigir", () => {
  const s = memoria();
  let e = gravarDestino(estadoPadrao(), T, "q-01", "Dinheiro", destinoPergunta("q-04"), s);
  assert.equal(questionarioPublicado(e, T), true);
  e = excluirPergunta(e, "q-04", s);
  const p = pendencias(e, T);
  assert.equal(p.length, 1);
  assert.match(p[0].motivo, /destino/);
  assert.equal(questionarioPublicado(e, T), false);
  assert.equal(questionarioPublicado(e, "Pedágio"), true);
  // lançamento recusado enquanto houver ação requerida
  assert.throws(() => registrarResposta(e, respostas({ "q-01": "Dinheiro" }), s), /ação requerida/);
  // corrigir (tirar o destino) publica de novo
  e = gravarDestino(e, T, "q-01", "Dinheiro", null, s);
  assert.equal(questionarioPublicado(e, T), true);
});

test("opção renomeada na pergunta vira ação requerida", () => {
  const s = memoria();
  let e = gravarDestino(estadoPadrao(), T, "q-01", "Dinheiro", "encerrar", s);
  const p = e.perguntas.find((x) => x.id === "q-01");
  e = salvarPergunta(e, { ...p, opcoes: ["Espécie", "Cartão de crédito", "Ticket de abastecimento"] }, s);
  assert.match(pendencias(e, T)[0].motivo, /opção/);
});

test("tirar a pergunta de destino do questionário também pede ação", () => {
  const s = memoria();
  let e = gravarDestino(estadoPadrao(), T, "q-01", "Dinheiro", destinoPergunta("q-04"), s);
  e = gravarQuestionario(e, T, questionarioDoTipo(e, T).filter((x) => x !== "q-04"), s);
  assert.equal(pendencias(e, T).length, 1);
});

test("renomear o tipo de despesa leva a ramificação junto", () => {
  const s = memoria();
  let e = gravarDestino(estadoPadrao(), T, "q-01", "Dinheiro", "encerrar", s);
  const tipo = e.perguntas.find((x) => x.id === "q-03");
  e = salvarPergunta(e, { ...tipo, opcoes: tipo.opcoes.map((o) => (o === T ? "Combustível" : o)) }, s);
  assert.equal(e.destinos["Combustível"]["q-01"]["Dinheiro"], "encerrar");
  assert.equal(e.destinos[T], undefined);
});

test("construtor e painel mostram a ramificação e a ação requerida", () => {
  const c = readFileSync("src/components/parametros/QuestionarioDespesasConstrutor.tsx", "utf8");
  assert.match(c, /Depois de responder, ir para/);
  assert.match(c, /Encerrar formulário/);
  assert.match(c, /Ação requerida/);
  const v = readFileSync("src/components/modules/ViagensPainel.tsx", "utf8");
  assert.match(v, /Ação requerida/);
  assert.match(readFileSync("src/components/parametros/QuestionarioFormulario.tsx", "utf8"), /acaoRequerida/);
});
