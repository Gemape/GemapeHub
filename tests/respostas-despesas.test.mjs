import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registrarRelatorio } from "../src/lib/relatorios-viagens.ts";

import { estadoPadrao as estadoDeFabrica, gravarRegra } from "../src/lib/questionario-despesas.ts";
import { atualizarResposta, horaLocal, listarRespostas, respostasParaEdicao, removerResposta, registrarResposta, resumoDaResposta, tipoEscolhido } from "../src/lib/respostas-despesas.ts";

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

test("dec 201: a tela única do menu de Parâmetros abre na configuração, sem rota nem link próprios", () => {
  const tela = readFileSync(new URL("../src/components/parametros/QuestionarioDespesasTela.tsx", import.meta.url), "utf8");
  assert.match(tela, /QuestionarioDespesasConstrutor/);
  assert.doesNotMatch(tela, /QuestionarioFormulario/);
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

test("dec 211: editar mantém id, data e hora e troca as respostas", () => {
  const s = memoria();
  const e = estadoPadrao();
  const r = registrarResposta(e, completas, s, agora);
  assert.ok(r.valores);
  const nova = atualizarResposta(e, r.id, { ...completas, "q-11": "50,00" }, s);
  assert.equal(nova.id, r.id);
  assert.equal(nova.hora, "08:05");
  assert.equal(listarRespostas(s).length, 1);
  assert.equal(listarRespostas(s)[0].itens.find((i) => i.perguntaId === "q-11").resposta, "50,00");
  assert.throws(() => atualizarResposta(e, "nao-existe", completas, s), /não|encontr/i);
});

test("dec 211: despesa num relatório (Finalizada) não pode ser editada", () => {
  const s = memoria();
  const e = estadoPadrao();
  const r = registrarResposta(e, completas, s, agora);
  registrarRelatorio({ emitente: "Ana", empresa: "GEMAPE", comprovantesPorPagina: 4, supervisor: "", diretor: "", despesas: [{ id: r.id, data: r.data, responsavel: "Roberto" }] }, s, agora);
  assert.throws(() => atualizarResposta(e, r.id, completas, s), /Finalizada/);
});

test("dec 211: respostasParaEdicao devolve as respostas para reabrir o formulário", () => {
  const e = estadoPadrao();
  const r = registrarResposta(e, completas, memoria(), agora);
  const v = respostasParaEdicao(e, r);
  assert.equal(v["q-11"], "1.234,56");
  assert.deepEqual(v["q-03"], ["Abastecimento"]);
  const { valores: _v, ...antiga } = r;
  const w = respostasParaEdicao(e, antiga);
  assert.deepEqual(w["q-03"], ["Abastecimento"]);
  assert.equal(w["q-08"], "2026-10-14");
});

test("decs 211 e 212: botão Editar na lista e botão Novo na confirmação", () => {
  const f = readFileSync(new URL("../src/components/parametros/QuestionarioFormulario.tsx", import.meta.url), "utf8");
  assert.match(f, /Editar/);
  assert.match(f, /Cancelar edição/);
  assert.match(f, />\s*Novo\s*</);
  assert.doesNotMatch(f, /Preencher novamente/);
});

// Dec 216: lógica de perguntas de Alimentação, Hospedagem, Pedágio e Estacionamento (scanner do dono).
import { ORDEM_LOGICA_PCM, TIPOS_COM_LOGICA_PCM, lerEstado } from "../src/lib/questionario-despesas.ts";
import { aceitaJustificativa, chaveJustificativa, perguntasVisiveis } from "../src/lib/questionario-respostas.ts";

test("dec 216: os 4 tipos seguem a ordem do scanner, sem Detalhamento, e os outros tipos não mudam", () => {
  const e = estadoDeFabrica();
  for (const tipo of ["Alimentação", "Hospedagem", "Pedágio", "Estacionamento"]) {
    assert.deepEqual(e.questionarios[tipo], ORDEM_LOGICA_PCM);
    assert.ok(!e.questionarios[tipo].includes("q-09"));
  }
  assert.ok(e.questionarios["Compra de peças para cliente"].includes("q-09"));
  assert.deepEqual(TIPOS_COM_LOGICA_PCM, ["Alimentação", "Hospedagem", "Pedágio", "Estacionamento"]);
});

test("dec 216: PCM responde só para quem lança pelo PCM ou Administrativo, e o técnico que não lançou só na Não conformidade", () => {
  const e = estadoDeFabrica();
  const ids = (r) => perguntasVisiveis(e, "Alimentação", { "q-03": ["Alimentação"], ...r }).map((p) => p.id);
  assert.ok(!ids({ "q-04": ["Roberto (Oficina)"] }).includes("q-13"));
  assert.ok(!ids({ "q-04": ["Roberto (Oficina)"] }).includes("q-14"));
  const pcm = { "q-04": ["Eduardo (PCM)"] };
  assert.ok(ids(pcm).includes("q-13"));
  assert.ok(!ids(pcm).includes("q-14"));
  assert.ok(!ids({ ...pcm, "q-13": "Avulso – técnico não monitorado" }).includes("q-14"));
  const lista = ids({ ...pcm, "q-13": "Não conformidade – técnico monitorado não preencheu" });
  assert.ok(lista.includes("q-14"));
  assert.deepEqual(lista.slice(0, 4), ["q-03", "q-04", "q-13", "q-14"]);
  assert.equal(lista[4], "q-08");
});

test("dec 216: dado salvo antes passa uma vez para a ordem do scanner e mantém pergunta criada pelo responsável antes do comprovante", () => {
  const e = estadoDeFabrica();
  const propria = { ...e.perguntas.find((p) => p.id === "q-08"), id: "q-x", codigo: "15", titulo: "Observação" };
  const antigo = {
    versao: 1, litrosAjustado: true, tecnicoAjustado: true, cartaoAjustado: true, codigosOrdenados: true,
    perguntas: [...e.perguntas, propria],
    questionarios: { ...e.questionarios, Pedágio: ["q-03", "q-01", "q-02", "q-04", "q-14", "q-05", "q-06", "q-07", "q-08", "q-09", "q-11", "q-12", "q-13", "q-x"] },
    regras: {},
  };
  const s = memoria();
  s.setItem("gemape-demo-questionario-despesas", JSON.stringify(antigo));
  const lido = lerEstado(s);
  assert.deepEqual(lido.questionarios["Pedágio"], [...ORDEM_LOGICA_PCM.slice(0, -1), "q-x", "q-12"]);
  assert.equal(lido.logicaViagemAjustada, true);
  assert.deepEqual(lido.questionarios["Outro"], e.questionarios["Outro"]);
});

test("dec 216: sem comprovante o envio pede a justificativa e grava com ela; nos outros tipos o comprovante continua obrigatório", () => {
  const e = estadoDeFabrica();
  const base = { ...completas, "q-03": ["Pedágio"], "q-04": ["Roberto (Oficina)"] };
  delete base["q-02"]; delete base["q-13"]; delete base["q-09"]; delete base["q-12"];
  base["q-01"] = ["Dinheiro"];
  assert.equal(aceitaJustificativa("Pedágio"), true);
  assert.equal(aceitaJustificativa("Abastecimento"), false);
  assert.throws(() => registrarResposta(e, base, memoria(), agora), /Foto do comprovante.*justificativa/);
  assert.throws(() => registrarResposta(e, { ...base, [chaveJustificativa("q-12")]: "   " }, memoria(), agora), /justificativa/);
  const s = memoria();
  const r = registrarResposta(e, { ...base, [chaveJustificativa("q-12")]: "Pedágio sem recibo emitido" }, s, agora);
  assert.equal(r.itens.at(-1).resposta, "Pedágio sem recibo emitido");
  assert.equal(r.itens.at(-1).titulo, "Justificativa da ausência do comprovante");
  assert.equal(r.valores[chaveJustificativa("q-12")], "Pedágio sem recibo emitido");
  // Com comprovante a justificativa é ignorada.
  const com = registrarResposta(e, { ...base, "q-12": ["a.jpg"], [chaveJustificativa("q-12")]: "sobra" }, memoria(), agora, { "q-12": [{ nome: "a.jpg", dataUrl: "data:image/png;base64,AAAA" }] });
  assert.ok(!com.itens.some((i) => i.perguntaId === chaveJustificativa("q-12")));
  // Abastecimento não aceita justificativa.
  const abast = { ...completas, "q-12": [], [chaveJustificativa("q-12")]: "x" };
  assert.throws(() => registrarResposta(e, abast, memoria(), agora), /Foto do comprovante/);
});

test("dec 216: o formulário abre a tela de justificativa quando só falta o comprovante", () => {
  const f = readFileSync(new URL("../src/components/parametros/QuestionarioFormulario.tsx", import.meta.url), "utf8");
  assert.match(f, /Comprovante não anexado/);
  assert.match(f, /Encerrar com justificativa/);
  assert.match(f, /Voltar e anexar/);
});
