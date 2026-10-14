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
