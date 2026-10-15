import test from "node:test";
import assert from "node:assert/strict";

import { filtrarPaisEFilhos } from "../src/lib/busca-acoes-manutencao.ts";

const PAIS = [
  { nome: "Manutenção do sistema de freios", filhos: [{ nome: "Pastilhas dianteiras" }, { nome: "Discos de freio traseiros" }, { nome: "Outros" }] },
  { nome: "Revisão de suspensão e direção", filhos: [{ nome: "Amortecedores" }, { nome: "Bucha da bandeja" }] },
  { nome: "Lavagem", filhos: [] },
];
const nomes = (r) => r.map((x) => `${x.pai.nome.split(" ")[0]}:${x.filhos.map((f) => f.nome).join("|")}`);

test("sem termo mostra todos os pais com todos os filhos", () => {
  assert.equal(filtrarPaisEFilhos(PAIS, "  ").length, 3);
  assert.equal(filtrarPaisEFilhos(PAIS, "")[0].filhos.length, 3);
});

test("ignora maiúsculas e acento e aceita parte da palavra", () => {
  assert.deepEqual(nomes(filtrarPaisEFilhos(PAIS, "SUSPENSAO")), ["Revisão:Amortecedores|Bucha da bandeja"]);
  assert.deepEqual(nomes(filtrarPaisEFilhos(PAIS, "manutencao")), ["Manutenção:Pastilhas dianteiras|Discos de freio traseiros|Outros"]);
  assert.deepEqual(nomes(filtrarPaisEFilhos(PAIS, "pastil")), ["Manutenção:Pastilhas dianteiras"]);
});

test("filho que combina traz só os filhos que combinam", () => {
  assert.deepEqual(nomes(filtrarPaisEFilhos(PAIS, "amort")), ["Revisão:Amortecedores"]);
  assert.deepEqual(nomes(filtrarPaisEFilhos(PAIS, "traseiros disco")), ["Manutenção:Discos de freio traseiros"]);
});

test("pai sem filhos é achado pelo nome; sem resultado devolve vazio", () => {
  assert.deepEqual(nomes(filtrarPaisEFilhos(PAIS, "lavag")), ["Lavagem:"]);
  assert.deepEqual(filtrarPaisEFilhos(PAIS, "xyz"), []);
});
