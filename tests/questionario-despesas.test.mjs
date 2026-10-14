import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  ID_TIPO_DESPESA, clonarPergunta, estadoPadrao, excluirPergunta, gravarQuestionario, habilitadosAtivos, lerEstado, moverId, novaPergunta,
  perguntasPadrao, proximoCodigoPergunta, questionarioDoTipo, regraArquivos, salvarPergunta, tiposDeDespesa, tiposRemovidos, validarPergunta,
  dadosIlegiveis, ID_LITROS,
} from "../src/lib/questionario-despesas.ts";
import { filtrarMunicipios, municipiosDaUf } from "../src/lib/municipios.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v), dados };
};

test("as 13 perguntas do responsável já vêm cadastradas, com tipos, formatos e obrigatoriedade", () => {
  const p = perguntasPadrao();
  assert.equal(p.length, 13);
  assert.deepEqual(p.map((x) => x.codigo), ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13"]);
  assert.ok(p.every((x) => x.obrigatoria));
  assert.deepEqual(p.map((x) => x.tipo), ["caixas", "caixas", "caixas", "caixas", "lista", "lista", "lista", "data", "paragrafo", "curta", "curta", "upload", "lista"]);
  assert.ok(p.slice(0, 4).every((x) => x.multiplas === false));
  assert.equal(p[4].opcoes.length, 27);
  assert.equal(p[5].fonte, "municipios");
  assert.equal(p[5].dependeDe, p[4].id);
  assert.equal(p[6].fonte, "clientes");
  assert.equal(p[9].formato, "decimal2");
  assert.equal(p[10].formato, "decimal2");
  assert.equal(p[3].habilitados.length, 7);
  assert.deepEqual(p[3].habilitados.filter((h) => h.area === "PCM").map((h) => h.nome), ["Eduardo", "Bruno"]);
});

test("os tipos de despesa vêm da pergunta 3 e todo questionário começa por ela", () => {
  const e = estadoPadrao();
  assert.equal(tiposDeDespesa(e).length, 8);
  for (const tipo of tiposDeDespesa(e)) assert.equal(questionarioDoTipo(e, tipo)[0], ID_TIPO_DESPESA);
  assert.equal(questionarioDoTipo(e, "Abastecimento").length, 13);
  assert.equal(questionarioDoTipo(e, "Pedágio").length, 12);
  // Mesmo gravada fora de ordem ou repetida, a pergunta 3 volta ao início uma vez só.
  const g = gravarQuestionario(e, "Pedágio", ["q-08", ID_TIPO_DESPESA, "q-01", "q-08"], memoria());
  assert.deepEqual(questionarioDoTipo(g, "Pedágio"), [ID_TIPO_DESPESA, "q-08", "q-01"]);
});

test("arrastar reordena, mas a pergunta de tipos de despesa não se move", () => {
  assert.deepEqual(moverId(["q-03", "a", "b", "c"], "c", "a"), ["q-03", "c", "a", "b"]);
  assert.deepEqual(moverId(["q-03", "a", "b"], "a", "q-03"), ["q-03", "a", "b"]);
  assert.deepEqual(moverId(["q-03", "a", "b"], "q-03", "b"), ["q-03", "a", "b"]);
});

test("cadastrar: título obrigatório, sem título repetido, opções preenchidas e sem repetição", () => {
  const e = estadoPadrao();
  const nova = novaPergunta("multipla", proximoCodigoPergunta(e, memoria()));
  assert.equal(proximoCodigoPergunta(e, memoria()), "14");
  assert.match(validarPergunta(nova, e.perguntas)[0], /título/);
  assert.match(validarPergunta({ ...nova, titulo: "moedas" }, e.perguntas)[0], /Já existe/);
  assert.match(validarPergunta({ ...nova, titulo: "Placa" }, e.perguntas)[0], /opções/);
  assert.match(validarPergunta({ ...nova, titulo: "Placa", opcoes: ["a", "A"] }, e.perguntas)[0], /repetidas/);
  assert.deepEqual(validarPergunta({ ...nova, titulo: "Placa", opcoes: ["a", "b"] }, e.perguntas), []);
  assert.deepEqual(validarPergunta({ ...novaPergunta("data", "14"), titulo: "Outra data" }, e.perguntas), []);
});

test("salvar grava no navegador e o código excluído não é reaproveitado", () => {
  const s = memoria();
  let e = estadoPadrao();
  const nova = { ...novaPergunta("curta", proximoCodigoPergunta(e, s)), titulo: "Quilometragem", formato: "inteiro" };
  e = salvarPergunta(e, nova, s);
  assert.equal(lerEstado(s).perguntas.at(-1).titulo, "Quilometragem");
  e = excluirPergunta(e, nova.id, s);
  assert.equal(proximoCodigoPergunta(e, s), "15");
});

test("a pergunta de tipos de despesa não se exclui; excluir outra tira dos questionários", () => {
  const s = memoria();
  const e = estadoPadrao();
  assert.throws(() => excluirPergunta(e, ID_TIPO_DESPESA, s), /não pode ser excluída/);
  const sem = excluirPergunta(e, "q-10", s);
  assert.ok(!sem.perguntas.some((p) => p.id === "q-10"));
  assert.ok(Object.values(sem.questionarios).every((l) => !l.includes("q-10")));
});

test("incluir um tipo de despesa cria o questionário dele; tirar o tipo apaga o dele", () => {
  const s = memoria();
  const e = estadoPadrao();
  const q3 = e.perguntas.find((p) => p.id === ID_TIPO_DESPESA);
  const g = salvarPergunta(e, { ...q3, opcoes: [...q3.opcoes.filter((o) => o !== "Pedágio"), "Lavagem"] }, s);
  assert.ok(tiposDeDespesa(g).includes("Lavagem"));
  assert.equal(questionarioDoTipo(g, "Lavagem").length, 12);
  assert.ok(!("Pedágio" in g.questionarios));
});

test("clonar copia tudo com número novo e título de cópia", () => {
  const e = estadoPadrao();
  const c = clonarPergunta(e, "q-02", memoria());
  assert.equal(c.codigo, "14");
  assert.equal(c.titulo, "Cartões de crédito (cópia)");
  assert.deepEqual(c.opcoes, e.perguntas[1].opcoes);
  assert.notEqual(c.id, "q-02");
  assert.equal(clonarPergunta(e, ID_TIPO_DESPESA, memoria()).sistema, false);
});

test("habilitados: quem tem vínculo com empregado inativo sai da lista; sem vínculo continua", () => {
  const lista = [
    { empregadoId: "e1", nome: "Roberto", area: "Oficina" },
    { empregadoId: "e2", nome: "Bruno", area: "PCM" },
    { empregadoId: null, nome: "Levindo", area: "Oficina" },
  ];
  assert.deepEqual(habilitadosAtivos(lista, new Set(["e1"])).map((h) => h.nome), ["Roberto", "Levindo"]);
});

test("upload: até 3 arquivos, e obrigatória exige só 1", () => {
  const p = novaPergunta("upload", "14");
  assert.deepEqual(regraArquivos({ ...p, obrigatoria: true }), { minimo: 1, maximo: 3 });
  assert.deepEqual(regraArquivos({ ...p, obrigatoria: false }), { minimo: 0, maximo: 3 });
});

test("dado salvo ilegível não é sobrescrito", () => {
  const s = memoria();
  s.setItem("gemape-demo-questionario-despesas", "{quebrado");
  assert.equal(lerEstado(s).perguntas.length, 13);
  assert.throws(() => salvarPergunta(estadoPadrao(), { ...novaPergunta("data", "14"), titulo: "Nova" }, s), /ilegíveis/);
  assert.equal(s.getItem("gemape-demo-questionario-despesas"), "{quebrado");
});

test("municípios por UF vêm da lista do IBGE e a busca ignora acento e maiúscula", async () => {
  assert.equal((await municipiosDaUf("MG")).length, 853);
  assert.deepEqual(await municipiosDaUf("DF"), ["Brasília"]);
  assert.ok((await municipiosDaUf("sp")).includes("São Paulo"));
  assert.deepEqual(filtrarMunicipios(await municipiosDaUf("SP"), "sao jose do rio").slice(0, 2), ["São José do Rio Pardo", "São José do Rio Preto"]);
  assert.equal(filtrarMunicipios(["A", "B"], "").length, 2);
});

test("renomear um tipo de despesa leva o questionário dele; remover avisa e apaga só o removido", () => {
  const s = memoria();
  let e = gravarQuestionario(estadoPadrao(), "Pedágio", ["q-03", "q-08", "q-01"], s);
  const q3 = e.perguntas.find((p) => p.id === ID_TIPO_DESPESA);
  e = salvarPergunta(e, { ...q3, opcoes: q3.opcoes.map((o) => (o === "Pedágio" ? "Pedágio (ticket)" : o)) }, s);
  assert.deepEqual(questionarioDoTipo(e, "Pedágio (ticket)"), [ID_TIPO_DESPESA, "q-08", "q-01"]);
  assert.deepEqual(tiposRemovidos(e, tiposDeDespesa(e).map((o) => o.toUpperCase())), []);
  const menos = tiposDeDespesa(e).filter((o) => o !== "Hospedagem");
  assert.deepEqual(tiposRemovidos(e, menos), ["Hospedagem"]);
});

test("a marca de sistema não se perde ao salvar e a pergunta 3 não é excluída", () => {
  const s = memoria();
  const e = estadoPadrao();
  const q3 = e.perguntas.find((p) => p.id === ID_TIPO_DESPESA);
  const g = salvarPergunta(e, { ...q3, sistema: false }, s);
  assert.equal(g.perguntas.find((p) => p.id === ID_TIPO_DESPESA).sistema, true);
  assert.throws(() => excluirPergunta({ ...g, perguntas: g.perguntas.map((p) => ({ ...p, sistema: false })) }, ID_TIPO_DESPESA, s), /não pode ser excluída/);
});

test("não se exclui a pergunta de que outra depende (UF e município)", () => {
  assert.throws(() => excluirPergunta(estadoPadrao(), "q-05", memoria()), /depende desta/);
  const sem = excluirPergunta(excluirPergunta(estadoPadrao(), "q-06", memoria()), "q-05", memoria());
  assert.ok(!sem.perguntas.some((p) => p.id === "q-05"));
});

test("número repetido por formulário antigo passa para o próximo livre e ids não colidem", () => {
  const s = memoria();
  let e = estadoPadrao();
  const aberta = { ...novaPergunta("data", "14"), titulo: "Da aba" };
  const clone = { ...clonarPergunta(e, "q-02", s), titulo: "Clone" };
  e = salvarPergunta(e, clone, s);
  e = salvarPergunta(e, aberta, s);
  const codigos = e.perguntas.map((p) => p.codigo);
  assert.equal(new Set(codigos).size, codigos.length);
  assert.equal(e.perguntas.at(-1).codigo, "15");
  assert.notEqual(novaPergunta("data", "14").id, novaPergunta("data", "14").id);
});

test("lista com opções vazias não passa mesmo com dependência; questionarios nulo conta como ilegível", () => {
  const e = estadoPadrao();
  assert.match(validarPergunta({ ...novaPergunta("lista", "14"), titulo: "X", dependeDe: "q-05" }, e.perguntas)[0], /opções/);
  const s = memoria();
  s.setItem("gemape-demo-questionario-despesas", JSON.stringify({ perguntas: perguntasPadrao(), questionarios: null }));
  assert.equal(dadosIlegiveis(s), true);
  assert.throws(() => salvarPergunta(e, { ...novaPergunta("data", "14"), titulo: "Nova" }, s), /ilegíveis/);
  assert.equal(dadosIlegiveis(memoria()), false);
});

test("o submenu fica em Parâmetros > Veículos e a rota existe", () => {
  const menu = readFileSync(new URL("../src/lib/menu-parametros.ts", import.meta.url), "utf8");
  assert.match(menu, /Questionário de Despesas", url: "\/cadastros\/veiculos-questionario-despesas"/);
  const rota = readFileSync(new URL("../src/routes/_authenticated/cadastros/veiculos-questionario-despesas.tsx", import.meta.url), "utf8");
  assert.match(rota, /QuestionarioDespesasConstrutor/);
});

test("Litros abastecidos só vem no Abastecimento, também nos dados salvos antes (ajuste único)", () => {
  const e = estadoPadrao();
  for (const tipo of tiposDeDespesa(e)) {
    assert.equal(questionarioDoTipo(e, tipo).includes(ID_LITROS), tipo === "Abastecimento", tipo);
  }
  // Dado salvo antes: todos os tipos traziam Litros e não havia a marca do ajuste.
  const antigo = { ...estadoPadrao(), questionarios: Object.fromEntries(tiposDeDespesa(e).map((t) => [t, e.perguntas.map((p) => p.id)])) };
  delete antigo.litrosAjustado;
  const s = memoria();
  s.setItem("gemape-demo-questionario-despesas", JSON.stringify(antigo));
  const lido = lerEstado(s);
  assert.ok(questionarioDoTipo(lido, "Abastecimento").includes(ID_LITROS));
  assert.ok(!questionarioDoTipo(lido, "Hospedagem").includes(ID_LITROS));
  // Depois do ajuste, quem põe Litros de volta num tipo (de propósito) não perde a escolha.
  const volta = gravarQuestionario(lido, "Hospedagem", [...questionarioDoTipo(lido, "Hospedagem"), ID_LITROS], s);
  assert.ok(questionarioDoTipo(lerEstado(s), "Hospedagem").includes(ID_LITROS));
  assert.equal(volta.litrosAjustado, true);
});

test("tipo novo (opção a mais) não ganha Litros; sem tipo Abastecimento nos dados antigos o ajuste não tira nada", () => {
  const s = memoria();
  const e = estadoPadrao();
  const q3 = e.perguntas.find((p) => p.id === ID_TIPO_DESPESA);
  const g = salvarPergunta(e, { ...q3, opcoes: [...q3.opcoes, "Lavagem"] }, s);
  assert.ok(!questionarioDoTipo(g, "Lavagem").includes(ID_LITROS));
  assert.ok(questionarioDoTipo(g, "Abastecimento").includes(ID_LITROS));
  // Dado antigo em que Abastecimento foi renomeado: Litros continua onde estava.
  const antigo = { ...estadoPadrao(), questionarios: { Combustível: e.perguntas.map((p) => p.id), Pedágio: e.perguntas.map((p) => p.id) } };
  delete antigo.litrosAjustado;
  const t = memoria();
  t.setItem("gemape-demo-questionario-despesas", JSON.stringify(antigo));
  const lido = lerEstado(t);
  assert.ok(lido.questionarios["Combustível"].includes(ID_LITROS));
  assert.ok(lido.questionarios["Pedágio"].includes(ID_LITROS));
});
