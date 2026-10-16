import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registrarRelatorio } from "../src/lib/relatorios-viagens.ts";

import { estadoPadrao as estadoNovo, gravarRegra } from "../src/lib/questionario-despesas.ts";
import { legado } from "./estado-legado.mjs";
const estadoDeFabrica = () => legado(estadoNovo());
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
const agora = new Date("2026-10-14T08:05:00-03:00");

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
  assert.equal(r.itens.length, 11);
  assert.deepEqual(r.itens[0], { perguntaId: "q-03", titulo: "Tipos de despesas", resposta: "Abastecimento" });
  assert.equal(r.itens.find((i) => i.perguntaId === "q-01").resposta, "Dinheiro");
  assert.equal(r.itens.find((i) => i.perguntaId === "q-08").resposta, "14/10/2026");
  assert.equal(listarRespostas(s).length, 1);
  assert.equal(listarRespostas(s)[0].id, r.id);
  assert.equal(horaLocal(new Date("2026-10-14T23:59:00-03:00")), "23:59");
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
  assert.equal(r.itens.length, 10);
});

test("respostas antigas guardam o título da época; resumo e remoção", () => {
  const s = memoria();
  const e = estadoPadrao();
  const r1 = registrarResposta(e, completas, s, agora);
  const r2 = registrarResposta(e, { ...completas, "q-03": ["Manutenção do veículo de trabalho"], "q-15": "Fulano de Tal" }, s, new Date("2026-10-14T09:00:00-03:00"));
  assert.deepEqual(listarRespostas(s).map((r) => r.tipo), ["Manutenção do veículo de trabalho", "Abastecimento"]);
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

// Dec 218: classificação Avulso ou Não conformidade no questionário de Alimentação.
import { OPCAO_AVULSO, OPCAO_NAO_CONFORMIDADE, lerEstado } from "../src/lib/questionario-despesas.ts";
import { perguntasVisiveis } from "../src/lib/questionario-respostas.ts";

test("dec 218/219: Alimentação, Hospedagem, Pedágio, Estacionamento e Compra de peças trazem a classificação logo depois de quem lança; os outros tipos não mudam", () => {
  const e = estadoNovo();
  for (const tipo of ["Alimentação", "Hospedagem", "Pedágio", "Estacionamento", "Compra de peças para cliente", "Abastecimento", "Manutenção do veículo de trabalho"]) {
    const ali = e.questionarios[tipo];
    assert.deepEqual(ali.slice(ali.indexOf("q-04"), ali.indexOf("q-04") + 4), ["q-04", "q-13", "q-14", "q-15"], tipo);
    assert.deepEqual(e.regras[tipo]["q-14"], { origem: "q-13", operador: "igual", valor: OPCAO_NAO_CONFORMIDADE }, tipo);
    assert.deepEqual(e.regras[tipo]["q-15"], { origem: "q-13", operador: "igual", valor: OPCAO_AVULSO }, tipo);
    assert.ok(ali.includes("q-11"), tipo);
  }
  for (const tipo of ["Outro"]) {
    assert.ok(!e.questionarios[tipo].includes("q-15"), tipo);
    assert.equal(e.questionarios[tipo].at(-1), "q-13", tipo);
  }
});

test("dec 218: só PCM ou Administrativo é classificado; Avulso abre o nome do empregado e Não conformidade pede o técnico que não lançou", () => {
  const e = estadoNovo();
  const ids = (r) => perguntasVisiveis(e, "Alimentação", { "q-03": ["Alimentação"], ...r }).map((p) => p.id);
  const oficina = ids({ "q-04": ["Roberto (Oficina)"] });
  for (const id of ["q-13", "q-14", "q-15"]) assert.ok(!oficina.includes(id), id);
  const pcm = { "q-04": ["Eduardo (PCM)"] };
  assert.ok(ids(pcm).includes("q-13"));
  assert.ok(!ids(pcm).includes("q-14") && !ids(pcm).includes("q-15"));
  const avulso = ids({ ...pcm, "q-13": OPCAO_AVULSO });
  assert.ok(avulso.includes("q-15") && !avulso.includes("q-14"));
  const nc = ids({ ...pcm, "q-13": OPCAO_NAO_CONFORMIDADE });
  assert.ok(nc.includes("q-14") && !nc.includes("q-15"));
  assert.deepEqual(nc.slice(0, 5), ["q-03", "q-04", "q-13", "q-14", "q-08"]);
  // Depois da classificação seguem as demais perguntas.
  assert.ok(nc.indexOf("q-14") < nc.indexOf("q-05") && nc.includes("q-12"));
  // Dec 219: nos outros três tipos da lógica vale o mesmo; em Abastecimento o comportamento é o de antes: PCM responde aparece para todos.
  for (const tipo of ["Hospedagem", "Pedágio", "Estacionamento", "Compra de peças para cliente", "Abastecimento"]) {
    assert.ok(!perguntasVisiveis(e, tipo, { "q-03": [tipo], "q-04": ["Roberto (Oficina)"] }).some((p) => p.id === "q-13"), tipo);
    assert.ok(perguntasVisiveis(e, tipo, { "q-03": [tipo], "q-04": ["Bruno (PCM)"] }).some((p) => p.id === "q-13"), tipo);
  }
  // Dec 223: Abastecimento segue Alimentação; só Manutenção e Outro mantêm o comportamento de antes.
  assert.ok(perguntasVisiveis(e, "Outro", { "q-03": ["Outro"], "q-04": ["Roberto (Oficina)"] }).some((p) => p.id === "q-13"));
});

test("dec 218: registrar exige o nome no Avulso e grava o nome; na Não conformidade grava o técnico que não lançou", () => {
  const e = estadoNovo();
  const base = { ...completas, "q-03": ["Alimentação"], "q-04": ["Eduardo (PCM)"], "q-01": ["Dinheiro"] };
  delete base["q-02"]; delete base["q-13"];
  assert.throws(() => registrarResposta(e, base, memoria(), agora), /PCM responde/);
  assert.throws(() => registrarResposta(e, { ...base, "q-13": OPCAO_AVULSO }, memoria(), agora), /Nome do empregado/);
  const a = registrarResposta(e, { ...base, "q-13": OPCAO_AVULSO, "q-15": "Carlos Souza" }, memoria(), agora);
  assert.equal(a.itens.find((i) => i.perguntaId === "q-15").resposta, "Carlos Souza");
  assert.ok(!a.itens.some((i) => i.perguntaId === "q-14"));
  const n = registrarResposta(e, { ...base, "q-13": OPCAO_NAO_CONFORMIDADE, "q-14": ["Roberto (Oficina)"], "q-15": "sobra" }, memoria(), agora);
  assert.equal(n.itens.find((i) => i.perguntaId === "q-14").resposta, "Roberto (Oficina)");
  assert.ok(!n.itens.some((i) => i.perguntaId === "q-15"));
});

test("dec 218: dado salvo antes ganha a classificação em Alimentação uma vez só, mantendo o resto", () => {
  const e = estadoNovo();
  const semNova = e.perguntas.filter((p) => p.id !== "q-15");
  const antigoQ = Object.fromEntries(Object.entries(e.questionarios).map(([t, ids]) => [t, ids.filter((id) => id !== "q-15" && id !== "q-13").concat("q-13")]));
  const antigoQ2 = { ...antigoQ, "Alimentação": ["q-01", "q-02", "q-04", "q-14", "q-05", "q-06", "q-07", "q-08", "q-09", "q-11", "q-12", "q-13"] };
  const s = memoria();
  s.setItem("gemape-demo-questionario-despesas", JSON.stringify({ versao: 1, litrosAjustado: true, tecnicoAjustado: true, cartaoAjustado: true, codigosOrdenados: true, perguntas: semNova, questionarios: antigoQ2, regras: {} }));
  const lido = lerEstado(s);
  assert.ok(lido.perguntas.some((p) => p.id === "q-15"));
  const ali = lido.questionarios["Alimentação"];
  assert.deepEqual(ali.slice(0, 5), ["q-04", "q-13", "q-14", "q-15", "q-08"]);
  assert.equal(lido.regras["Alimentação"]["q-15"].valor, OPCAO_AVULSO);
  assert.equal(lido.classificacaoAjustada, true);
  // Dec 219: Pedágio (e Hospedagem, Estacionamento) ganha a classificação na mesma leitura.
  assert.deepEqual(lido.questionarios["Pedágio"].slice(lido.questionarios["Pedágio"].indexOf("q-04"), lido.questionarios["Pedágio"].indexOf("q-04") + 4), ["q-04", "q-13", "q-14", "q-15"]);
  assert.equal(lido.classificacaoTiposAjustada, true);
  assert.deepEqual(lido.questionarios["Outro"], antigoQ2["Outro"]);
  // Depois do ajuste, tirar a classificação de Alimentação não a traz de volta.
  s.setItem("gemape-demo-questionario-despesas", JSON.stringify({ ...JSON.parse(JSON.stringify(lido)), questionarios: { ...lido.questionarios, "Alimentação": ali.filter((id) => id !== "q-15") } }));
  assert.ok(!lerEstado(s).questionarios["Alimentação"].includes("q-15"));
});

test("hora e mês de hoje seguem Brasília, mesmo com o relógio do dispositivo em outro fuso", async () => {
  const { horaBrasilia } = await import("../src/lib/empregados.ts");
  const { periodoAtual } = await import("../src/lib/viagens.ts");
  // 01:30 UTC de 01/11 ainda é 22:30 de 31/10 em Brasília.
  const virada = new Date("2026-11-01T01:30:00Z");
  assert.equal(horaBrasilia(virada), "22:30");
  assert.equal(horaLocal(virada), "22:30");
  assert.deepEqual(periodoAtual(virada), { ano: 2026, mes: 10 });
  assert.equal(horaBrasilia(new Date("2026-10-15T03:05:00Z")), "00:05");
});

// Dec 221: nova ordem das perguntas e justificativa da ausência do documento.
import { TIPOS_ORDEM_VIAGENS, ID_JUSTIFICATIVA } from "../src/lib/questionario-despesas.ts";
import { chaveJustificativaPedida } from "../src/lib/questionario-respostas.ts";

test("dec 221: os cinco tipos seguem Técnico responsável, data, UF, município, moeda, valor, (detalhamento só em compra de peças) e documento", () => {
  const e = estadoNovo();
  for (const tipo of TIPOS_ORDEM_VIAGENS) {
    const ids = e.questionarios[tipo];
    const sem = ids.filter((id) => !["q-13", "q-14", "q-15", "q-02"].includes(id));
    const esperado = ["q-04", "q-08", "q-05", "q-06", "q-01", "q-11", ...(tipo === "Abastecimento" ? ["q-10"] : []), ...(["Compra de peças para cliente", "Manutenção do veículo de trabalho"].includes(tipo) ? ["q-09"] : []), "q-12", ID_JUSTIFICATIVA];
    assert.deepEqual(sem, esperado, tipo);
  }
  assert.equal(e.perguntas.find((p) => p.id === "q-04").titulo, "Técnico responsável");
  assert.ok(!e.questionarios["Outro"].includes(ID_JUSTIFICATIVA));
});

test("dec 221: sem documento a justificativa abre; com ela escrita encerra, e o anexo esconde a justificativa", () => {
  const e = estadoNovo();
  const base = { ...completas, "q-03": ["Pedágio"], "q-04": ["Roberto (Oficina)"], "q-01": ["Dinheiro"], "q-12": [] };
  delete base["q-02"]; delete base["q-09"];
  const ids = (r) => perguntasVisiveis(e, "Pedágio", r).map((p) => p.id);
  assert.ok(!ids(base).includes(ID_JUSTIFICATIVA));
  assert.throws(() => registrarResposta(e, base, memoria(), agora), /Foto do comprovante/);
  const pedida = { ...base, [chaveJustificativaPedida]: "1" };
  assert.ok(ids(pedida).includes(ID_JUSTIFICATIVA));
  assert.throws(() => registrarResposta(e, pedida, memoria(), agora), /Justifique/);
  const r = registrarResposta(e, { ...pedida, [ID_JUSTIFICATIVA]: "Recibo não entregue" }, memoria(), agora);
  assert.equal(r.itens.find((i) => i.perguntaId === ID_JUSTIFICATIVA).resposta, "Recibo não entregue");
  assert.equal(respostasParaEdicao(e, r)[chaveJustificativaPedida], "1");
  assert.ok(!ids({ ...pedida, "q-12": ["a.png"] }).includes(ID_JUSTIFICATIVA));
});

// Dec 222: Clientes fora de todos os questionários.
test("dec 222: Clientes sai de todos os questionários; dado salvo migra uma vez só", () => {
  const e = estadoNovo();
  for (const ids of Object.values(e.questionarios)) assert.ok(!ids.includes("q-07"));
  assert.ok(e.perguntas.some((p) => p.id === "q-07"));
  const salvo = JSON.parse(JSON.stringify(e));
  delete salvo.clientesRetiradosDeTodos;
  salvo.clientesRetirados = true; // marca da primeira versão da dec 222 (só quatro tipos): não impede a retirada nos demais
  for (const tipo of ["Alimentação", "Compra de peças para cliente", "Outro"]) salvo.questionarios[tipo] = [...salvo.questionarios[tipo], "q-07"];
  const s = memoria();
  s.setItem("gemape-demo-questionario-despesas", JSON.stringify(salvo));
  const lido = lerEstado(s);
  for (const ids of Object.values(lido.questionarios)) assert.ok(!ids.includes("q-07"));
  assert.equal(lido.clientesRetiradosDeTodos, true);
  // Depois do ajuste, voltar Clientes ao questionário não é desfeito.
  s.setItem("gemape-demo-questionario-despesas", JSON.stringify({ ...lido, questionarios: { ...lido.questionarios, "Pedágio": [...lido.questionarios["Pedágio"], "q-07"] } }));
  assert.ok(lerEstado(s).questionarios["Pedágio"].includes("q-07"));
});

test("dec 221: com seções, a falta do documento não trava a página do documento quando a justificativa está aberta", () => {
  const form = readFileSync(new URL("../src/components/parametros/QuestionarioFormulario.tsx", import.meta.url), "utf8");
  assert.match(form, /visiveis\.some\(\(p\) => p\.id === ID_JUSTIFICATIVA\)\) for \(const p of perguntasDaPagina\) if \(p\.tipo === "upload"\) delete achados\[p\.id\]/);
});

// Dec 223: do Novo abastecimento voltam só a data e o valor.
import { respostasDoAbastecimento } from "../src/lib/questionario-respostas.ts";

test("dec 223/225: o abastecimento registrado preenche data, valor e litros da despesa, com máscara de duas casas", () => {
  assert.deepEqual(respostasDoAbastecimento({ data: "2026-10-16", valor: 250, litros: 40.5, km: 1000, veiculoId: "v1" }), { "q-08": "2026-10-16", "q-11": "250,00", "q-10": "40,50" });
  assert.deepEqual(respostasDoAbastecimento({ data: "2026-10-16", valor: 1234.56 }), { "q-08": "2026-10-16", "q-11": "1.234,56" });
  assert.deepEqual(respostasDoAbastecimento({ data: "2026-10-16", valor: 0 }), { "q-08": "2026-10-16" });
  assert.deepEqual(respostasDoAbastecimento({ data: "2026-10-16" }), { "q-08": "2026-10-16" });
});

test("dec 223: escolher o cartão no card Abastecimento abre o Novo abastecimento do módulo de Veículos", () => {
  const form = readFileSync(new URL("../src/components/parametros/QuestionarioFormulario.tsx", import.meta.url), "utf8");
  assert.match(form, /tipo === TIPO_ABASTECIMENTO && id === ID_CARTOES && !vazia\(valor\) && !respostas\[chaveAbastecimento\]\) setAbastecimentoAberto\(true\)/);
  assert.match(form, /<NovoAbastecimentoDialog/);
  const modulo = readFileSync(new URL("../src/components/modules/AbastecimentoVeiculoModulo.tsx", import.meta.url), "utf8");
  assert.match(modulo, /<NovoAbastecimentoDialog/);
});

// Dec 224: a despesa fica ligada ao abastecimento de Veículos e puxa data e valor dele ao gravar.
import { registrarAbastecimento, removerAbastecimento } from "../src/lib/registros-veiculo.ts";
import { chaveAbastecimento, sincronizarAbastecimento } from "../src/lib/questionario-respostas.ts";

const doAbastecimento = () => ({ ...completas, "q-03": ["Abastecimento"], "q-04": ["Roberto (Oficina)"], "q-15": "Fulano de Tal" });

test("dec 224: o registro do abastecimento devolve o id para ligar a despesa", () => {
  assert.deepEqual(respostasDoAbastecimento({ id: "a1", data: "2026-10-16", valor: 63 }), { "q-08": "2026-10-16", "q-11": "63,00", [chaveAbastecimento]: "a1" });
});

test("dec 224: ao gravar, a despesa puxa data e valor do abastecimento ligado e guarda o vínculo", () => {
  const storage = memoria();
  const a = registrarAbastecimento({ veiculoId: "v1", data: "2026-10-13", hora: "09:00", km: "100", litros: "10", valor: "63,00" }, storage, agora);
  // Respostas com data e valor diferentes do abastecimento: valem os do abastecimento.
  const r = registrarResposta(estadoPadrao(), { ...doAbastecimento(), "q-08": "2026-10-01", "q-11": "1,00", "q-10": "1,00", [chaveAbastecimento]: a.id }, storage, agora);
  assert.equal(r.valores[chaveAbastecimento], a.id);
  assert.equal(r.valores["q-08"], "2026-10-13");
  assert.equal(r.valores["q-11"], "63,00");
  assert.equal(r.valores["q-10"], "10,00");
  assert.equal(respostasParaEdicao(estadoPadrao(), r)[chaveAbastecimento], a.id);
});

test("dec 224: abastecimento ligado que foi excluído impede gravar a despesa e nada é salvo", () => {
  const storage = memoria();
  const a = registrarAbastecimento({ veiculoId: "v1", data: "2026-10-13", hora: "09:00", km: "100", litros: "10", valor: "63,00" }, storage, agora);
  removerAbastecimento(a.id, storage);
  assert.throws(() => registrarResposta(estadoPadrao(), { ...doAbastecimento(), [chaveAbastecimento]: a.id }, storage, agora), /foi excluído de Veículos/);
  assert.equal(listarRespostas(storage).length, 0);
});

test("dec 224: sem vínculo, nada muda; o vínculo só vale no card Abastecimento", () => {
  const r = { "q-08": "2026-10-01", "q-11": "1,00" };
  assert.equal(sincronizarAbastecimento(r, []), r);
  const storage = memoria();
  const alimentacao = registrarResposta(estadoPadrao(), { ...completas, "q-03": ["Alimentação"], "q-15": "Fulano de Tal", [chaveAbastecimento]: "a-qualquer" }, storage, agora);
  assert.equal(alimentacao.valores[chaveAbastecimento], undefined);
});

test("dec 224: o formulário oferece escolher um abastecimento já registrado", () => {
  const form = readFileSync(new URL("../src/components/parametros/QuestionarioFormulario.tsx", import.meta.url), "utf8");
  assert.match(form, /<EscolherAbastecimentoDialog/);
  assert.match(form, /Escolher abastecimento já registrado/);
});

// Dec 226: Manutenção do veículo de trabalho na ordem de Alimentação, ligada à manutenção de Veículos.
import { registrarManutencao, removerManutencao, resumoManutencao } from "../src/lib/registros-veiculo.ts";
import { chaveManutencao, respostasDaManutencao, sincronizarManutencao } from "../src/lib/questionario-respostas.ts";

const ACOES_MANUT = [{ id: "a1", nome: "Freios", subitens: [{ id: "s1", nome: "Pastilha" }] }];
const manutencaoBase = { veiculoId: "v1", data: "2026-10-13", km: "1000", tipo: "Preventiva", grupos: [{ acaoId: "a1", itens: [{ subitemId: "s1" }] }], locais: [{ local: "empresa", descricao: "Troca", condicaoPagamento: "", custoPecas: "100", custoMaoDeObra: "50,50" }] };
const daManutencao = () => ({ ...completas, "q-03": ["Manutenção do veículo de trabalho"], "q-04": ["Roberto (Oficina)"], "q-15": "Fulano de Tal" });

test("dec 226: a manutenção devolve data, detalhamento e custo total para o card e o id para ligar", () => {
  assert.deepEqual(
    respostasDaManutencao({ id: "m1", data: "2026-10-13", custoTotal: 150.5 }, " Freios: Pastilha "),
    { "q-08": "2026-10-13", [chaveManutencao]: "m1", "q-09": "Freios: Pastilha", "q-11": "150,50" },
  );
  assert.deepEqual(respostasDaManutencao({ data: "2026-10-13" }, ""), { "q-08": "2026-10-13" });
});

test("dec 226: ao gravar, a despesa puxa data e custo total da manutenção ligada e mantém o detalhamento digitado", () => {
  const storage = memoria();
  const m = registrarManutencao(manutencaoBase, storage, agora, ACOES_MANUT);
  const r = registrarResposta(estadoPadrao(), { ...daManutencao(), "q-08": "2026-10-01", "q-11": "1,00", "q-09": "Texto que eu ajustei", [chaveManutencao]: m.id }, storage, agora);
  assert.equal(r.valores[chaveManutencao], m.id);
  assert.equal(r.valores["q-08"], "2026-10-13");
  assert.equal(r.valores["q-11"], "150,50");
  assert.equal(r.valores["q-09"], "Texto que eu ajustei");
  assert.equal(respostasParaEdicao(estadoPadrao(), r)[chaveManutencao], m.id);
  assert.match(resumoManutencao(m, undefined), /Freios/);
});

test("dec 226: manutenção ligada excluída impede gravar a despesa; sem vínculo nada muda", () => {
  const storage = memoria();
  const m = registrarManutencao(manutencaoBase, storage, agora, ACOES_MANUT);
  removerManutencao(m.id, storage);
  assert.throws(() => registrarResposta(estadoPadrao(), { ...daManutencao(), [chaveManutencao]: m.id }, storage, agora), /foi excluída de Veículos/);
  assert.equal(listarRespostas(storage).length, 0);
  const r = { "q-08": "2026-10-01" };
  assert.equal(sincronizarManutencao(r, []), r);
  const alimentacao = registrarResposta(estadoPadrao(), { ...completas, "q-03": ["Alimentação"], "q-15": "Fulano de Tal", [chaveManutencao]: "m-qualquer" }, memoria(), agora);
  assert.equal(alimentacao.valores[chaveManutencao], undefined);
});

test("dec 226: a ordem da Manutenção é a de Alimentação mais o detalhamento, e o formulário liga à Nova manutenção", () => {
  const e = estadoNovo();
  const sem = e.questionarios["Manutenção do veículo de trabalho"].filter((id) => !["q-13", "q-14", "q-15", "q-02"].includes(id));
  assert.deepEqual(sem, ["q-04", "q-08", "q-05", "q-06", "q-01", "q-11", "q-09", "q-12", ID_JUSTIFICATIVA]);
  const form = readFileSync(new URL("../src/components/parametros/QuestionarioFormulario.tsx", import.meta.url), "utf8");
  assert.match(form, /tipo === TIPO_MANUTENCAO && id === ID_CARTOES && !vazia\(valor\) && !respostas\[chaveManutencao\]\) setManutencaoAberta\(true\)/);
  assert.match(form, /<NovaManutencaoDialog/);
  assert.match(form, /Escolher manutenção já registrada/);
  const modulo = readFileSync(new URL("../src/components/modules/ManutencaoVeiculoModulo.tsx", import.meta.url), "utf8");
  assert.match(modulo, /<NovaManutencaoDialog/);
});

// Ajustes da revisão dos PRs #289 a #291.
import { trazerAbastecimento, trazerManutencao } from "../src/lib/questionario-respostas.ts";

test("revisão: trazer outro abastecimento ou outra manutenção tira o valor, os litros e o detalhamento que o novo não tem", () => {
  const antes = { "q-08": "2026-10-01", "q-10": "10,00", "q-11": "63,00", "q-09": "Troca de óleo", "q-04": ["Roberto (Oficina)"] };
  assert.deepEqual(trazerAbastecimento(antes, { id: "a2", data: "2026-10-02" }), { "q-08": "2026-10-02", "abastecimento:id": "a2", "q-09": "Troca de óleo", "q-04": ["Roberto (Oficina)"] });
  assert.deepEqual(trazerManutencao(antes, { id: "m2", data: "2026-10-03" }, ""), { "q-08": "2026-10-03", "manutencao:id": "m2", "q-10": "10,00", "q-04": ["Roberto (Oficina)"] });
  assert.equal(trazerManutencao(antes, { id: "m3", data: "2026-10-03", custoTotal: 5 }, "Freios")["q-11"], "5,00");
});

test("revisão: abastecimento sem litros apaga os litros antigos, e trocar a moeda solta o vínculo", () => {
  const storage = memoria();
  const a = registrarAbastecimento({ veiculoId: "v1", data: "2026-10-13", hora: "09:00", km: "100", litros: "10", valor: "63,00" }, storage, agora);
  assert.equal(sincronizarAbastecimento({ "q-10": "99,00", [chaveAbastecimento]: a.id }, [{ ...a, litros: 0 }])["q-10"], undefined);
  // Moeda trocada para dinheiro: o cartão some, o vínculo não vale e a exclusão do abastecimento não trava a despesa.
  removerAbastecimento(a.id, storage);
  const r = registrarResposta(estadoNovo(), { ...doAbastecimento(), "q-01": ["Dinheiro"], [chaveAbastecimento]: a.id }, storage, agora);
  assert.equal(r.valores[chaveAbastecimento], undefined);
});

test("revisão: a janela Novo abastecimento recomeça vazia a cada abertura e as janelas de Veículos só montam nos cards que as usam", () => {
  const dialogo = readFileSync(new URL("../src/components/modules/NovoAbastecimentoDialog.tsx", import.meta.url), "utf8");
  assert.match(dialogo, /useEffect\(\(\) => \{\s*if \(aberto\) \{ setVeiculoId\(""\); setKm\(""\); \}/);
  const form = readFileSync(new URL("../src/components/parametros/QuestionarioFormulario.tsx", import.meta.url), "utf8");
  assert.match(form, /\{tipo === TIPO_ABASTECIMENTO && \(\s*<>\s*<NovoAbastecimentoDialog/);
  assert.match(form, /\{tipo === TIPO_MANUTENCAO && \(\s*<>\s*<NovaManutencaoDialog/);
});
