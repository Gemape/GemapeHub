import test from "node:test";
import assert from "node:assert/strict";

import { estadoPadrao } from "../src/lib/questionario-despesas.ts";
import { registrarResposta } from "../src/lib/respostas-despesas.ts";
import { listarRelatorios, registrarRelatorio, relatorioPorDespesa } from "../src/lib/relatorios-viagens.ts";
import { FILTRO_VAZIO, listaDoPeriodo, localDaDespesa } from "../src/lib/viagens-lista.ts";
import { linhasDasDespesas } from "../src/lib/viagens-relatorio.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const base = {
  "q-01": ["Dinheiro"], "q-03": ["Abastecimento"], "q-04": ["Roberto (Oficina)"], "q-05": "Minas Gerais - MG", "q-06": "Belo Horizonte",
  "q-07": "00001 - Cliente Teste", "q-08": "2026-10-14", "q-09": "Almoço", "q-10": "10,50", "q-11": "100,00", "q-12": ["a.jpg"], "q-13": "Avulso – técnico não monitorado",
};
const foto = { "q-12": [{ nome: "a.jpg", dataUrl: "data:image/webp;base64,AAAA" }] };
const lancar = (store, extra, tipo = "Abastecimento", dia = 14) =>
  registrarResposta(estadoPadrao(), { ...base, "q-03": [tipo], "q-08": `2026-10-${String(dia).padStart(2, "0")}`, ...extra }, store, new Date(2026, 9, dia, 8, 5), foto);
const P = { ano: 2026, mes: 10 };

test("a lista traz data, local, foto, cliente, técnico, tipo, valor e status, da mais nova para a mais antiga", () => {
  const s = memoria();
  const a = lancar(s, {}, "Abastecimento", 10);
  const b = lancar(s, { "q-11": "50,00" }, "Alimentação", 12);
  const lista = [a, b];
  const linhas = listaDoPeriodo(lista, P, new Map());
  assert.deepEqual(linhas.map((l) => l.id), [b.id, a.id]);
  assert.equal(linhas[1].local, "Belo Horizonte/MG");
  assert.equal(linhas[1].tecnico, "Roberto");
  assert.equal(linhas[1].cliente, "00001 - Cliente Teste");
  assert.equal(linhas[1].valor, 100);
  assert.equal(linhas[1].fotos.length, 1);
  assert.equal(linhas[1].status, "Em aberto");
  assert.equal(localDaDespesa({ itens: [] }), null);
});

test("os filtros de tipo, técnico e datas valem dentro do mês escolhido", () => {
  const s = memoria();
  const a = lancar(s, {}, "Abastecimento", 10);
  const b = lancar(s, { "q-04": ["Maria (Oficina)"] }, "Alimentação", 12);
  const fora = lancar(s, {}, "Abastecimento", 12);
  const lista = [a, b, { ...fora, itens: fora.itens.map((i) => (i.perguntaId === "q-08" ? { ...i, resposta: "12/09/2026" } : i)) }];
  assert.equal(listaDoPeriodo(lista, P, new Map()).length, 2);
  assert.deepEqual(listaDoPeriodo(lista, P, new Map(), { ...FILTRO_VAZIO, tipo: "Alimentação" }).map((l) => l.id), [b.id]);
  assert.deepEqual(listaDoPeriodo(lista, P, new Map(), { ...FILTRO_VAZIO, tecnico: "Roberto" }).map((l) => l.id), [a.id]);
  assert.deepEqual(listaDoPeriodo(lista, P, new Map(), { ...FILTRO_VAZIO, de: "2026-10-11" }).map((l) => l.id), [b.id]);
  assert.deepEqual(listaDoPeriodo(lista, P, new Map(), { ...FILTRO_VAZIO, ate: "2026-10-10" }).map((l) => l.id), [a.id]);
});

test("gerar relatório finaliza as despesas marcadas e elas não entram em outro relatório", () => {
  const s = memoria();
  const a = lancar(s, {}, "Abastecimento", 10);
  const b = lancar(s, {}, "Alimentação", 12);
  const novo = (ds) => ({ emitente: "Ana", empresa: "GEMAPE", comprovantesPorPagina: 4, supervisor: "", diretor: "", despesas: ds });
  const d = (r) => ({ id: r.id, data: r.data, responsavel: "Roberto" });
  const rel = registrarRelatorio(novo([d(a), d(b)]), s, new Date(2026, 9, 14, 9, 0));
  assert.equal(rel.empregado, "Roberto");
  assert.equal(listarRelatorios(s).length, 1);
  const linhas = listaDoPeriodo([a, b], P, relatorioPorDespesa(listarRelatorios(s)));
  assert.ok(linhas.every((l) => l.status === "Finalizado" && l.relatorioId === rel.id));
  assert.throws(() => registrarRelatorio(novo([d(a)]), s), /já está finalizada/);
  assert.equal(listarRelatorios(s).length, 1);
});

test("o relatório exige despesas de um técnico só e não grava nada quando falha", () => {
  const s = memoria();
  const novo = (ds) => ({ emitente: "Ana", empresa: "GEMAPE", comprovantesPorPagina: 2, supervisor: "", diretor: "", despesas: ds });
  assert.throws(() => registrarRelatorio(novo([]), s), /pelo menos uma/);
  assert.throws(() => registrarRelatorio(novo([{ id: "1", data: "2026-10-01", responsavel: "A" }, { id: "2", data: "2026-10-02", responsavel: "B" }]), s), /técnico só/);
  assert.throws(() => registrarRelatorio(novo([{ id: "1", data: "2026-10-01", responsavel: null }]), s), /técnico só/);
  assert.equal(listarRelatorios(s).length, 0);
});

test("relatório salvo é remontado só com as despesas dele", () => {
  const s = memoria();
  const a = lancar(s, {}, "Abastecimento", 10);
  const b = lancar(s, {}, "Alimentação", 12);
  const linhas = linhasDasDespesas([a, b], [b.id]);
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].tipo, "Alimentação");
  assert.deepEqual(linhasDasDespesas([a], ["x"]), []);
});

test("extrato do técnico: despesas, quantidade e custo do mês, e navegação entre meses", async () => {
  const { extratoDoTecnico, deslocarMes } = await import("../src/lib/viagens-lista.ts");
  const s = memoria();
  const a = lancar(s, { "q-13": "Não conformidade – técnico monitorado não preencheu" }, "Abastecimento", 10);
  const b = lancar(s, { "q-13": "Não conformidade – técnico monitorado não preencheu", "q-11": "50,00" }, "Alimentação", 12);
  const outro = lancar(s, { "q-04": ["Maria (Oficina)"] }, "Hospedagem", 13);
  const gestor = lancar(s, { "q-04": ["Paula (PCM)"], "q-14": ["Roberto (Oficina)"], "q-13": "Não conformidade – técnico monitorado não preencheu" }, "Pedágio", 14);
  const lista = [a, b, outro, gestor];
  const e = extratoDoTecnico(lista, P, "Roberto", new Map());
  assert.equal(e.quantidade, 3);
  assert.equal(e.custoTotal, 250);
  assert.deepEqual(e.linhas.map((l) => l.conforme), [false, true, true]);
  assert.equal(extratoDoTecnico(lista, { ano: 2026, mes: 9 }, "Roberto", new Map()).quantidade, 0);
  assert.deepEqual(deslocarMes({ ano: 2026, mes: 1 }, -1), { ano: 2025, mes: 12 });
  assert.deepEqual(deslocarMes({ ano: 2026, mes: 12 }, 1), { ano: 2027, mes: 1 });
  assert.deepEqual(deslocarMes({ ano: 2026, mes: 5 }, 1), { ano: 2026, mes: 6 });
});

test("despesa finalizada em relatório não pode ser excluída; a em aberto pode", async () => {
  const { removerResposta, listarRespostas } = await import("../src/lib/respostas-despesas.ts");
  const s = memoria();
  const a = lancar(s, {}, "Abastecimento", 10);
  const b = lancar(s, {}, "Alimentação", 12);
  registrarRelatorio({ emitente: "Ana", empresa: "GEMAPE", comprovantesPorPagina: 4, supervisor: "", diretor: "", despesas: [{ id: a.id, data: a.data, responsavel: "Roberto" }] }, s);
  assert.throws(() => removerResposta(a.id, s), /Finalizada/);
  assert.equal(listarRespostas(s).length, 2);
  removerResposta(b.id, s);
  assert.deepEqual(listarRespostas(s).map((r) => r.id), [a.id]);
});

test("despesa lançada por gestor sem técnico responsável fica sem responsável e não vai para relatório", () => {
  const s = memoria();
  const completo = lancar(s, { "q-04": ["Paula (PCM)"], "q-14": ["Roberto (Oficina)"], "q-13": "Não conformidade – técnico monitorado não preencheu" }, "Pedágio", 14);
  // O formulário exige a pergunta 14 para o gestor; um registro antigo sem ela precisa continuar seguro.
  const r = { ...completo, itens: completo.itens.filter((i) => i.perguntaId !== "q-14") };
  const [linha] = listaDoPeriodo([r], P, new Map());
  assert.equal(linha.responsavel, null);
  assert.equal(linha.tecnico, "Paula");
  assert.throws(() => registrarRelatorio({ emitente: "Ana", empresa: "GEMAPE", comprovantesPorPagina: 4, supervisor: "", diretor: "", despesas: [{ id: r.id, data: r.data, responsavel: linha.responsavel }] }, s), /técnico só/);
});

test("dec 214: o botão Faixas de desempenho usa o ícone de gráfico de pizza", async () => {
  const { readFileSync } = await import("node:fs");
  const f = readFileSync(new URL("../src/components/modules/ViagensPainel.tsx", import.meta.url), "utf8");
  assert.match(f, /<PieChart className="mr-1 h-4 w-4" \/>Faixas de desempenho/);
  assert.doesNotMatch(f, /Palette/);
});

test("dec 213: o botão Gerar relatório fica abaixo da listagem", async () => {
  const { readFileSync } = await import("node:fs");
  const f = readFileSync(new URL("../src/components/modules/ViagensLista.tsx", import.meta.url), "utf8");
  assert.ok(f.indexOf("<TableBody>") < f.indexOf("<FileText className=\"mr-1 h-4 w-4\" />Gerar relatório"));
});
