import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { ID_TIPO_DESPESA, estadoPadrao as estadoDeFabrica, excluirPergunta, gravarQuestionario, lerEstado, questionarioDoTipo, salvarPergunta } from "../src/lib/questionario-despesas.ts";
import { encontrarCiclo, gravarDestino, pendencias } from "../src/lib/questionario-destinos.ts";
import { criarQuestionario, gravarSecao, inicioDaProximaSecao, paginasDoPreenchimento, secaoDaPergunta, secoesDoTipo } from "../src/lib/questionario-secoes.ts";
import { perguntasVisiveis } from "../src/lib/questionario-respostas.ts";
import { registrarResposta } from "../src/lib/respostas-despesas.ts";

// Estado de fábrica sem a condição do cartão (dec 182), para os testes que preenchem todas as perguntas.
const estadoPadrao = () => ({ ...estadoDeFabrica(), regras: {} });

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v), dados };
};
const T = "Abastecimento";
const respostas = (extra = {}) => ({ "q-03": T, ...extra });
const ids = (e, r) => perguntasVisiveis(e, T, r).map((p) => p.id);

function comSecoes(s) {
  let e = estadoPadrao();
  e = gravarSecao(e, T, "q-03", { titulo: "Dados", subtitulo: "Quem e como pagou" }, s);
  e = gravarSecao(e, T, "q-05", { titulo: "Local", subtitulo: "" }, s);
  e = gravarSecao(e, T, "q-08", { titulo: "", subtitulo: "" }, s);
  return e;
}

test("seções: cada uma começa numa pergunta e a pergunta pertence à última que começou", () => {
  const s = memoria();
  const e = comSecoes(s);
  assert.deepEqual(secoesDoTipo(e, T).map((x) => x.inicio), ["q-03", "q-05", "q-08"]);
  assert.equal(secaoDaPergunta(e, T, "q-04").titulo, "Dados");
  assert.equal(secaoDaPergunta(e, T, "q-06").titulo, "Local");
  assert.equal(secaoDaPergunta(e, T, "q-09").titulo, "");
  assert.equal(secaoDaPergunta(estadoPadrao(), T, "q-04"), null);
  assert.equal(inicioDaProximaSecao(e, T, "q-04"), "q-05");
  assert.equal(inicioDaProximaSecao(e, T, "q-09"), null);
});

test("cada seção vira uma página no preenchimento, inclusive a sem título", () => {
  const s = memoria();
  const e = comSecoes(s);
  const paginas = paginasDoPreenchimento(e, T, perguntasVisiveis(e, T, respostas()));
  assert.equal(paginas.length, 3);
  assert.equal(paginas[0].perguntas[0].id, "q-03");
  assert.equal(paginas[1].perguntas[0].id, "q-05");
  assert.equal(paginas[2].secao.titulo, "");
  // sem seções, uma página só
  assert.equal(paginasDoPreenchimento(estadoPadrao(), T, perguntasVisiveis(estadoPadrao(), T, respostas())).length, 1);
});

test("a primeira seção não se remove; as outras se removem, editam e persistem", () => {
  const s = memoria();
  let e = comSecoes(s);
  assert.throws(() => gravarSecao(e, T, "q-03", null, s), /primeira seção/);
  e = gravarSecao(e, T, "q-05", { titulo: "Onde", subtitulo: "Cidade" }, s);
  assert.equal(lerEstado(s).secoes[T].find((x) => x.inicio === "q-05").subtitulo, "Cidade");
  e = gravarSecao(e, T, "q-05", null, s);
  assert.equal(secoesDoTipo(e, T).length, 2);
  assert.throws(() => gravarSecao(e, T, "q-99", { titulo: "x", subtitulo: "" }, s), /não está/);
});

test("destino 'Ir para a próxima seção' pula o resto da seção atual", () => {
  const s = memoria();
  let e = comSecoes(s);
  e = gravarDestino(e, T, "q-01", "Dinheiro", "proxima-secao", s);
  assert.deepEqual(ids(e, respostas({ "q-01": "Dinheiro" })).slice(0, 3), ["q-03", "q-01", "q-05"]);
  assert.deepEqual(ids(e, respostas({ "q-01": "Ticket de abastecimento" })).slice(0, 3), ["q-03", "q-01", "q-02"]);
  assert.equal(encontrarCiclo(e, T), null);
});

test("sem seção seguinte, 'Ir para a próxima seção' encerra o formulário", () => {
  const s = memoria();
  let e = gravarSecao(estadoPadrao(), T, "q-03", { titulo: "Única", subtitulo: "" }, s);
  e = gravarDestino(e, T, "q-01", "Dinheiro", "proxima-secao", s);
  assert.deepEqual(ids(e, respostas({ "q-01": "Dinheiro" })), ["q-03", "q-01"]);
});

test("seção cuja pergunta inicial saiu do questionário deixa de existir", () => {
  const s = memoria();
  let e = comSecoes(s);
  e = excluirPergunta(e, "q-08", s);
  assert.deepEqual(secoesDoTipo(e, T).map((x) => x.inicio), ["q-03", "q-05"]);
  e = gravarQuestionario(e, T, questionarioDoTipo(e, T).filter((x) => x !== "q-05" && x !== ID_TIPO_DESPESA), s);
  assert.deepEqual(lerEstado(s).secoes[T].map((x) => x.inicio), ["q-03"]);
});

test("a seção anda com a pergunta quando ela muda de lugar", () => {
  const s = memoria();
  let e = comSecoes(s);
  const lista = questionarioDoTipo(e, T).filter((x) => x !== "q-03");
  const sem = lista.filter((x) => x !== "q-05");
  e = gravarQuestionario(e, T, [...sem.slice(0, 2), "q-05", ...sem.slice(2)], s);
  assert.equal(secaoDaPergunta(e, T, "q-05").titulo, "Local");
});

test("criar novo questionário: tipo novo, primeira seção e nenhuma outra pergunta", () => {
  const s = memoria();
  const e = criarQuestionario(estadoPadrao(), "  Reembolso  ", { titulo: " Reembolso de viagem ", subtitulo: "" }, s);
  assert.ok(e.perguntas.find((p) => p.id === "q-03").opcoes.includes("Reembolso"));
  assert.deepEqual(questionarioDoTipo(e, "Reembolso"), ["q-03"]);
  assert.deepEqual(secoesDoTipo(e, "Reembolso").map((x) => [x.inicio, x.titulo]), [["q-03", "Reembolso de viagem"]]);
  assert.equal(lerEstado(s).secoes["Reembolso"].length, 1);
  assert.throws(() => criarQuestionario(e, "reembolso", { titulo: "", subtitulo: "" }, s), /Já existe/);
  assert.throws(() => criarQuestionario(e, "  ", { titulo: "", subtitulo: "" }, s), /nome/);
  // os outros questionários não mudam
  assert.ok(questionarioDoTipo(e, T).length > 5);
});

test("renomear o tipo de despesa leva as seções junto", () => {
  const s = memoria();
  let e = comSecoes(s);
  const tipo = e.perguntas.find((x) => x.id === "q-03");
  e = salvarPergunta(e, { ...tipo, opcoes: tipo.opcoes.map((o) => (o === T ? "Combustível" : o)) }, s);
  assert.equal(secoesDoTipo(e, "Combustível").length, 3);
  assert.equal(e.secoes[T], undefined);
});

test("seções salvas com formato quebrado são descartadas na leitura", () => {
  const s = memoria();
  s.setItem("gemape-demo-questionario-despesas", JSON.stringify({ ...estadoPadrao(), secoes: { [T]: [null, { id: 1 }, { id: "a", titulo: "A", subtitulo: "", inicio: "q-03" }], X: "texto" } }));
  assert.deepEqual(lerEstado(s).secoes, { [T]: [{ id: "a", titulo: "A", subtitulo: "", inicio: "q-03" }] });
});

test("o envio registra as respostas de todas as páginas", () => {
  const s = memoria();
  const e = gravarSecao(estadoPadrao(), T, "q-05", { titulo: "Local", subtitulo: "" }, s);
  assert.throws(() => registrarResposta(e, respostas(), s), /obrigat|Resposta/i);
});

test("telas (dec 204): sem botão Criar novo questionário, janela de seção e páginas com Próxima e Voltar", () => {
  const c = readFileSync("src/components/parametros/QuestionarioDespesasConstrutor.tsx", "utf8");
  assert.doesNotMatch(c, /Criar novo questionário/);
  assert.match(c, /Editar seção/);
  assert.doesNotMatch(c, /Iniciar seção aqui|Nova página/);
  assert.match(c, /Ir para a próxima seção/);
  const f = readFileSync("src/components/parametros/QuestionarioFormulario.tsx", "utf8");
  assert.match(f, /Próxima/);
  assert.match(f, /Voltar/);
  assert.match(f, /Página \{pagina \+ 1\} de/);
});

test("'Ir para a próxima seção' sem seção depois pede ação requerida", () => {
  const s = memoria();
  let e = comSecoes(s);
  e = gravarDestino(e, T, "q-01", "Dinheiro", "proxima-secao", s);
  assert.equal(pendencias(e, T).length, 0);
  e = gravarSecao(e, T, "q-05", null, s);
  e = gravarSecao(e, T, "q-08", null, s);
  assert.equal(pendencias(e, T).length, 1);
  assert.match(pendencias(e, T)[0].motivo, /seção/);
});

test("remover seção que não existe avisa; seção repetida na leitura é descartada", () => {
  const s = memoria();
  assert.throws(() => gravarSecao(estadoPadrao(), T, "q-04", null, s), /Não há seção/);
  s.setItem("gemape-demo-questionario-despesas", JSON.stringify({ ...estadoPadrao(), secoes: { [T]: [{ id: "a", titulo: "A", subtitulo: "", inicio: "q-03" }, { id: "b", titulo: "B", subtitulo: "", inicio: "q-03" }] } }));
  assert.equal(lerEstado(s).secoes[T].length, 1);
});
