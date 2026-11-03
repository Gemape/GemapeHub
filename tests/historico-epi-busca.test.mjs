import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { filtrarHistoricoPorBuscaEPeriodo, periodoInvalido } from "../src/lib/historico-busca.ts";

const linhas = [
  { id: 1, data_movimentacao: "2026-09-01", texto: "Luva de raspa Tamanho G Saida Em posse" },
  { id: 2, data_movimentacao: "2026-09-15", texto: "Botina de segurança 42 Saida Em posse Troca por desgaste" },
  { id: 3, data_movimentacao: "2026-10-02", texto: "Luva de raspa Tamanho G Devolucao Devolvido" },
  { id: 4, data_movimentacao: "2026-10-20T14:30:00", texto: "Óculos de proteção Saida Em posse" },
];
const ids = (r) => r.map((l) => l.id);
const sem = { palavra: "", dataInicio: "", dataFim: "" };

test("sem busca e sem período devolve tudo, na mesma ordem", () => {
  assert.deepEqual(ids(filtrarHistoricoPorBuscaEPeriodo(linhas, sem)), [1, 2, 3, 4]);
});

test("a palavra ignora maiúsculas e acentos, e todas as palavras precisam aparecer em qualquer ordem", () => {
  assert.deepEqual(ids(filtrarHistoricoPorBuscaEPeriodo(linhas, { ...sem, palavra: "OCULOS" })), [4]);
  assert.deepEqual(ids(filtrarHistoricoPorBuscaEPeriodo(linhas, { ...sem, palavra: "devolvido luva" })), [3]);
  assert.deepEqual(ids(filtrarHistoricoPorBuscaEPeriodo(linhas, { ...sem, palavra: "luva botina" })), []);
  assert.deepEqual(ids(filtrarHistoricoPorBuscaEPeriodo(linhas, { ...sem, palavra: "   " })), [1, 2, 3, 4]);
});

test("o período inclui o primeiro e o último dia", () => {
  assert.deepEqual(ids(filtrarHistoricoPorBuscaEPeriodo(linhas, { ...sem, dataInicio: "2026-09-15", dataFim: "2026-10-02" })), [2, 3]);
});

test("só início ou só fim também filtram, e a data com hora conta pelo dia", () => {
  assert.deepEqual(ids(filtrarHistoricoPorBuscaEPeriodo(linhas, { ...sem, dataInicio: "2026-10-01" })), [3, 4]);
  assert.deepEqual(ids(filtrarHistoricoPorBuscaEPeriodo(linhas, { ...sem, dataFim: "2026-10-20" })), [1, 2, 3, 4]);
  assert.deepEqual(ids(filtrarHistoricoPorBuscaEPeriodo(linhas, { ...sem, dataFim: "2026-10-19" })), [1, 2, 3]);
});

test("palavra e período se combinam", () => {
  assert.deepEqual(ids(filtrarHistoricoPorBuscaEPeriodo(linhas, { palavra: "luva", dataInicio: "2026-10-01", dataFim: "" })), [3]);
});

test("início depois do fim é período inválido e não devolve linhas", () => {
  assert.equal(periodoInvalido("2026-10-02", "2026-09-01"), true);
  assert.equal(periodoInvalido("2026-09-01", "2026-09-01"), false);
  assert.equal(periodoInvalido("", "2026-09-01"), false);
  assert.deepEqual(filtrarHistoricoPorBuscaEPeriodo(linhas, { ...sem, dataInicio: "2026-10-02", dataFim: "2026-09-01" }), []);
});

test("o Histórico do empregado de EPI tem busca, início e fim e usa o filtro na tela, no CSV e no PDF", () => {
  const tela = readFileSync(new URL("../src/components/modules/EpiRelatorioFuncionario.tsx", import.meta.url), "utf8");
  assert.match(tela, /filtrarHistoricoPorBuscaEPeriodo/);
  assert.match(tela, /aria-label="Buscar no histórico"/);
  assert.match(tela, /id="hist-inicio"/);
  assert.match(tela, /id="hist-fim"/);
  assert.match(tela, /visiveis\.map/);
  assert.equal((tela.match(/visiveis\.map/g) ?? []).length, 3); // PDF, CSV e tabela
});
