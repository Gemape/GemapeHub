import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { estadoPadrao as estadoDeFabrica, gravarRegra } from "../src/lib/questionario-despesas.ts";
import { horaLocal, listarRespostas, removerResposta, registrarResposta, resumoDaResposta, tipoEscolhido } from "../src/lib/respostas-despesas.ts";

// Estado de fábrica sem a condição do cartão (dec 182), para os testes que preenchem todas as perguntas.
const estadoPadrao = () => ({ ...estadoDeFabrica(), regras: {} });

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v), dados };
};
const completas = {
  "q-01": ["Dinheiro"], "q-02": ["Cartão final 0129 – Roberto"], "q-03": ["Abastecimento"], "q-04": ["Roberto (Oficina)"], "q-05": "Minas Gerais - MG", "q-06": "Belo Horizonte",
  "q-07": "00001 - Cliente Teste", "q-08": "2026-10-14", "q-09": "Almoço com o cliente", "q-10": "10,50", "q-11": "1.234,56", "q-12": ["comprovante.jpg"], "q-13": "Avulso – técnico não monitorado",
};
const agora = new Date(2026, 9, 14, 8, 5);

test("o tipo escolhido é a opção marcada na pergunta 3", () => {
  assert.equal(tipoEscolhido({ "q-03": ["Pedágio"] }), "Pedágio");
  assert.equal(tipoEscolhido({}), "");
  assert.equal(tipoEscolhido({ "q-03": [] }), "");
});

test("registrar grava a resposta com tipo, data e hora locais e as perguntas daquele momento", () => {
  const s = memoria();
  const e = estadoPadrao();
  const r = registrarResposta(e, completas, s, agora);
  assert.equal(r.tipo, "Abastecimento");
  assert.equal(r.data, "2026-10-14");
  assert.equal(r.hora, "08:05");
  assert.equal(r.itens.length, 13);
  assert.deepEqual(r.itens[0], { perguntaId: "q-03", titulo: "Tipos de despesas", resposta: "Abastecimento" });
  assert.equal(r.itens.find((i) => i.perguntaId === "q-01").resposta, "Dinheiro");
  assert.equal(r.itens.find((i) => i.perguntaId === "q-08").resposta, "14/10/2026");
  assert.equal(listarRespostas(s).length, 1);
  assert.equal(listarRespostas(s)[0].id, r.id);
  assert.equal(horaLocal(new Date(2026, 9, 14, 23, 59)), "23:59");
});

test("só grava o que passa na validação, de uma vez, e nada fica pela metade", () => {
  const s = memoria();
  const e = estadoPadrao();
  assert.throws(() => registrarResposta(e, {}, s, agora), /tipo de despesa/);
  assert.throws(() => registrarResposta(e, { ...completas, "q-11": "" }, s, agora), /Valor da despesa/);
  assert.throws(() => registrarResposta(e, { ...completas, "q-10": "10" }, s, agora), /Litros abastecidos/);
  assert.equal(s.dados.size, 0);
});

test("pergunta oculta pela condição não é exigida nem gravada", () => {
  const s = memoria();
  const e = gravarRegra(estadoPadrao(), "Abastecimento", "q-02", { origem: "q-01", operador: "igual", valor: "Cartão de crédito" }, memoria());
  const { "q-02": _cartao, ...semCartao } = completas;
  const r = registrarResposta(e, { ...semCartao }, s, agora);
  assert.ok(!r.itens.some((i) => i.perguntaId === "q-02"));
  assert.equal(r.itens.length, 12);
});

test("respostas antigas guardam o título da época; resumo e remoção", () => {
  const s = memoria();
  const e = estadoPadrao();
  const r1 = registrarResposta(e, completas, s, agora);
  const r2 = registrarResposta(e, { ...completas, "q-03": ["Pedágio"] }, s, new Date(2026, 9, 14, 9, 0));
  assert.deepEqual(listarRespostas(s).map((r) => r.tipo), ["Pedágio", "Abastecimento"]);
  assert.match(resumoDaResposta(r1), /Abastecimento/);
  assert.match(resumoDaResposta(r1), /1\.234,56/);
  removerResposta(r2.id, s);
  assert.deepEqual(listarRespostas(s).map((r) => r.id), [r1.id]);
});

test("dado salvo ilegível não é sobrescrito", () => {
  const s = memoria();
  s.setItem("gemape-demo-respostas-despesas", "{quebrado");
  assert.deepEqual(listarRespostas(s), []);
  assert.throws(() => registrarResposta(estadoPadrao(), completas, s, agora), /ilegíveis/);
  assert.equal(s.getItem("gemape-demo-respostas-despesas"), "{quebrado");
});

test("revisão: tipo que não existe no cadastro não grava e item estragado não derruba a lista", () => {
  const s = memoria();
  assert.throws(() => registrarResposta(estadoPadrao(), { ...completas, "q-03": ["Pix"] }, s, agora), /não existe mais/);
  assert.equal(s.dados.size, 0);
  s.setItem("gemape-demo-respostas-despesas", JSON.stringify([null, { id: "x" }, { id: "r1", tipo: "Pedágio", data: "2026-10-14", hora: "08:00", itens: [] }]));
  assert.deepEqual(listarRespostas(s).map((r) => r.id), ["r1"]);
});

test("o formulário abre pela tela única do menu de Parâmetros, sem rota nem link próprios", () => {
  const tela = readFileSync(new URL("../src/components/parametros/QuestionarioDespesasTela.tsx", import.meta.url), "utf8");
  assert.match(tela, /QuestionarioFormulario/);
  const menu = readFileSync(new URL("../src/components/layout/AppSidebar.tsx", import.meta.url), "utf8");
  const itens = readFileSync(new URL("../src/lib/menu-parametros.ts", import.meta.url), "utf8");
  assert.doesNotMatch(menu + itens, /"\/questionario-despesas"/);
});

test("marcar Outro em Tipos de despesas exige a descrição e ela vai junto na resposta registrada", () => {
  const e = estadoPadrao();
  const s = memoria();
  const base = { ...completas, "q-03": ["Outro"] };
  delete base["q-10"];
  assert.throws(() => registrarResposta(e, base, s, agora), /Descreva o outro/);
  assert.throws(() => registrarResposta(e, { ...base, "q-03:outro": "   " }, s, agora), /Descreva o outro/);
  assert.equal(listarRespostas(s).length, 0);
  const r = registrarResposta(e, { ...base, "q-03:outro": "Lavagem do carro" }, s, agora);
  assert.equal(r.tipo, "Outro");
  assert.equal(r.itens.find((i) => i.perguntaId === "q-03")?.resposta, "Outro: Lavagem do carro");
});

test("a descrição do Outro é ignorada quando outra opção está marcada", () => {
  const e = estadoPadrao();
  const r = registrarResposta(e, { ...completas, "q-03:outro": "sobra" }, memoria(), agora);
  assert.equal(r.itens.find((i) => i.perguntaId === "q-03")?.resposta, "Abastecimento");
});

test("o formulário abre o campo de descrição ao marcar Outro", () => {
  const fonte = readFileSync(new URL("../src/components/parametros/QuestionarioFormulario.tsx", import.meta.url), "utf8");
  assert.match(fonte, /marcouOutro\(p, respostas\) &&/);
  assert.match(fonte, /placeholder="Descreva o outro"/);
});

test("a foto do comprovante vai junto na resposta registrada e só imagem é guardada", () => {
  const e = estadoPadrao();
  const png = "data:image/png;base64,iVBORw0KGgo=";
  const r = registrarResposta(e, completas, memoria(), agora, { "q-12": [{ nome: "comprovante.jpg", dataUrl: png }, { nome: "x.html", dataUrl: "data:text/html;base64,PGI+" }], "q-09": [{ nome: "y.png", dataUrl: png }] });
  const foto = r.itens.find((i) => i.perguntaId === "q-12");
  assert.deepEqual(foto?.imagens, [{ nome: "comprovante.jpg", dataUrl: png }]);
  assert.equal(r.itens.find((i) => i.perguntaId === "q-09")?.imagens, undefined);
});

test("sem espaço no navegador a resposta com imagens não é gravada e o erro é claro", () => {
  const e = estadoPadrao();
  const cheio = { getItem: () => null, setItem: () => { throw new Error("QuotaExceededError"); } };
  assert.throws(() => registrarResposta(e, completas, cheio, agora), /não há espaço no navegador/i);
});

test("a lista de respostas mostra as imagens guardadas", () => {
  const fonte = readFileSync(new URL("../src/components/parametros/QuestionarioFormulario.tsx", import.meta.url), "utf8");
  assert.match(fonte, /src=\{f\.dataUrl\}/);
});
