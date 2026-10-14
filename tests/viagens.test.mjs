import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { estadoPadrao } from "../src/lib/questionario-despesas.ts";
import { registrarResposta } from "../src/lib/respostas-despesas.ts";
import { dadosDoLancamento } from "../src/lib/viagens.ts";
import { ABAS_VIAGEM, abaDoModulo } from "../src/lib/menu-parametros.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const completas = {
  "q-01": ["Dinheiro"], "q-02": ["Cartão final 0129 – Roberto"], "q-03": ["Abastecimento"], "q-04": ["Roberto (Oficina)"], "q-05": "Minas Gerais - MG", "q-06": "Belo Horizonte",
  "q-07": "00001 - Cliente Teste", "q-08": "2026-10-14", "q-09": "Almoço com o cliente", "q-10": "10,50", "q-11": "1.234,56", "q-12": ["comprovante.jpg"], "q-13": "Avulso – técnico não monitorado",
};
const agora = new Date(2026, 9, 14, 8, 5);

test("o menu de Módulos tem Viagens, com o Painel como primeira aba", () => {
  assert.equal(ABAS_VIAGEM[0]?.aba, "painel");
  assert.equal(abaDoModulo("viagem", undefined), "painel");
  assert.equal(abaDoModulo("viagem", "qualquer"), "painel");
  const menu = readFileSync(new URL("../src/components/layout/AppSidebar.tsx", import.meta.url), "utf8");
  assert.match(menu, /titulo: "Viagens", url: "\/viagens"/);
});

test("o lançamento tem estrutura única e flexível: campos não respondidos ficam nulos", () => {
  const e = estadoPadrao();
  const r = registrarResposta(e, completas, memoria(), agora);
  const d = dadosDoLancamento(r);
  assert.equal(d.tipo, "Abastecimento");
  assert.equal(d.dataDespesa, "2026-10-14");
  assert.equal(d.valor, 1234.56);
  assert.equal(d.cliente, "00001 - Cliente Teste");
  assert.equal(d.descricao, "Almoço com o cliente");
  assert.equal(d.tecnico, "Roberto");
  assert.equal(d.tecnicoArea, "Oficina");
  const vazio = dadosDoLancamento({ id: "x", tipo: "Pedágio", data: "2026-10-01", hora: "10:00", itens: [] });
  assert.deepEqual([vazio.valor, vazio.cliente, vazio.descricao, vazio.tecnico, vazio.tecnicoArea, vazio.dataDespesa], [null, null, null, null, null, null]);
});

test("a data da despesa volta para o formato ISO e valor aceita moeda com R$", () => {
  const d = dadosDoLancamento({ id: "x", tipo: "Pedágio", data: "2026-10-01", hora: "10:00", itens: [
    { perguntaId: "q-08", titulo: "Data da despesa", resposta: "05/10/2026" },
    { perguntaId: "q-11", titulo: "Valor da despesa", resposta: "R$ 12,30" },
  ] });
  assert.equal(d.dataDespesa, "2026-10-05");
  assert.equal(d.valor, 12.3);
});

test("o painel mostra um botão por tipo de despesa e abre o formulário daquele tipo, sem sair do módulo", () => {
  const painel = readFileSync(new URL("../src/components/modules/ViagensPainel.tsx", import.meta.url), "utf8");
  assert.match(painel, /tiposDeDespesa\(/);
  assert.match(painel, /<QuestionarioFormulario[^>]*tipoInicial=\{tipo\}/);
  assert.match(painel, /Voltar ao painel/);
  const rota = readFileSync(new URL("../src/routes/_authenticated/viagens.tsx", import.meta.url), "utf8");
  assert.match(rota, /ViagensPainel/);
});

test("valor sem algarismos não vira zero e, com mais de um habilitado, vale o primeiro", () => {
  const d = dadosDoLancamento({ id: "x", tipo: "Pedágio", data: "2026-10-01", hora: "10:00", itens: [
    { perguntaId: "q-11", titulo: "Valor da despesa", resposta: "sem valor" },
    { perguntaId: "q-04", titulo: "Habilitados", resposta: "Roberto (Oficina), Eduardo (PCM)" },
  ] });
  assert.equal(d.valor, null);
  assert.equal(d.tecnico, "Roberto");
  assert.equal(d.tecnicoArea, "Oficina");
});

// ---- Indicadores (dec 177) ----
import { formatarPercentual, indicadoresGlobais, indiceConformidade, lancamentosDoPeriodo, periodoAtual, resultadosTecnicos, rotuloPeriodo } from "../src/lib/viagens.ts";

const lanc = (extra) => ({
  id: "x", tipo: "Pedágio", data: "2026-10-14", hora: "10:00",
  itens: Object.entries({ "q-08": "05/10/2026", "q-11": "100,00", ...extra }).map(([perguntaId, resposta]) => ({ perguntaId, titulo: perguntaId, resposta })),
});
const tecnico = (valor = "100,00", extra = {}) => lanc({ "q-04": "Roberto (Oficina)", "q-11": valor, ...extra });
const porPcm = (valor = "100,00", extra = {}) => lanc({ "q-04": "Eduardo (PCM)", "q-14": "Roberto (Oficina)", "q-11": valor, ...extra });

test("ICL: lançadas pelo técnico dividido pelo total (técnico mais gestor), como no exemplo 8 de 10 igual a 80%", () => {
  const lista = [...Array.from({ length: 8 }, () => tecnico()), ...Array.from({ length: 2 }, () => porPcm())];
  const g = indicadoresGlobais(lista, { ano: 2026, mes: 10 });
  assert.equal(g.icl, 80);
  assert.equal(g.quantidade, 10);
  assert.equal(g.custoTotal, 1000);
  assert.equal(g.naoConformes, 2);
  const [r] = resultadosTecnicos(lista, { ano: 2026, mes: 10 }, ["Roberto", "Wellington"]);
  assert.deepEqual([r.nome, r.lancamentos, r.valorTotal, r.icl], ["Roberto", 10, 1000, 80]);
});

test("técnico sem lançamentos aparece com zeros e sem índice; avulso e técnico desconhecido ficam fora do índice", () => {
  const avulso = tecnico("50,00", { "q-13": "Avulso – técnico não monitorado" });
  const semTecnico = lanc({ "q-04": "Eduardo (PCM)", "q-11": "20,00" });
  const lista = [tecnico("10,00"), avulso, semTecnico];
  const g = indicadoresGlobais(lista, { ano: 2026, mes: 10 });
  assert.equal(g.quantidade, 3);
  assert.equal(g.custoTotal, 80);
  assert.equal(g.noIndice, 1);
  assert.equal(g.icl, 100);
  const [roberto, wellington] = resultadosTecnicos(lista, { ano: 2026, mes: 10 }, ["Roberto", "Wellington"]);
  assert.equal(roberto.lancamentos, 2);
  assert.equal(roberto.icl, 100);
  assert.deepEqual([wellington.lancamentos, wellington.valorTotal, wellington.icl], [0, 0, null]);
  assert.equal(indicadoresGlobais([], { ano: 2026, mes: 10 }).icl, null);
});

test("o período filtra pelo mês da data da despesa (e pelo do registro quando não há data) e muda os dois blocos juntos", () => {
  const setembro = tecnico("30,00", { "q-08": "20/09/2026" });
  const semData = { id: "y", tipo: "Pedágio", data: "2026-10-02", hora: "09:00", itens: [{ perguntaId: "q-04", titulo: "q", resposta: "Roberto (Oficina)" }, { perguntaId: "q-11", titulo: "q", resposta: "5,00" }] };
  const lista = [tecnico("10,00"), setembro, semData];
  assert.equal(lancamentosDoPeriodo(lista, { ano: 2026, mes: 10 }).length, 2);
  assert.equal(indicadoresGlobais(lista, { ano: 2026, mes: 9 }).custoTotal, 30);
  assert.equal(resultadosTecnicos(lista, { ano: 2026, mes: 9 }, ["Roberto"])[0].valorTotal, 30);
  assert.equal(indicadoresGlobais(lista, { ano: 2025, mes: 10 }).quantidade, 0);
});

test("formatação do índice e do período", () => {
  assert.equal(formatarPercentual(null), "—");
  assert.equal(formatarPercentual(80), "80%");
  assert.equal(formatarPercentual(66.666), "66,7%");
  assert.equal(indiceConformidade(0, 0), null);
  assert.deepEqual(periodoAtual(new Date(2026, 9, 14)), { ano: 2026, mes: 10 });
  assert.equal(rotuloPeriodo({ ano: 2026, mes: 3 }), "Março de 2026");
});

test("o painel mostra os indicadores globais, os resultados dos técnicos e o seletor de mês e ano", () => {
  const painel = readFileSync(new URL("../src/components/modules/ViagensPainel.tsx", import.meta.url), "utf8");
  assert.match(painel, /Indicadores globais de despesas/);
  assert.match(painel, /Resultados dos técnicos/);
  assert.match(painel, /Índice de conformidade de lançamento/);
  assert.match(painel, /aria-label="Mês"/);
  assert.match(painel, /aria-label="Ano"/);
});

test("o ícone do menu Viagens é um avião", () => {
  const menu = readFileSync(new URL("../src/components/layout/AppSidebar.tsx", import.meta.url), "utf8");
  assert.match(menu, /Plane as IconeViagens/);
});
