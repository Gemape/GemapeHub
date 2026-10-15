import test from "node:test";
import assert from "node:assert/strict";

import { filtrarAcoesManutencao } from "../src/lib/busca-acoes-manutencao.ts";

const GRUPOS = [
  { id: "a1", nome: "Freios", subitens: [{ id: "s1", nome: "Pastilha" }, { id: "s2", nome: "Disco" }] },
  { id: "a2", nome: "Suspensão", subitens: [{ id: "s3", nome: "Amortecedor" }, { id: "s4", nome: "Bucha" }] },
  { id: "a3", nome: "Lavagem", subitens: [] },
];
const ids = (r) => r.map((x) => `${x.grupo.id}:${x.subitens.map((s) => s.id).join(",")}`);

test("sem termo mostra todos os grupos com todas as ações", () => {
  assert.deepEqual(ids(filtrarAcoesManutencao(GRUPOS, "  ")), ["a1:s1,s2", "a2:s3,s4", "a3:"]);
});

test("ignora maiúsculas, minúsculas e acento", () => {
  assert.deepEqual(ids(filtrarAcoesManutencao(GRUPOS, "SUSPENSAO")), ["a2:s3,s4"]);
  assert.deepEqual(ids(filtrarAcoesManutencao(GRUPOS, "suspensão")), ["a2:s3,s4"]);
  assert.deepEqual(ids(filtrarAcoesManutencao(GRUPOS, "SuSpEnSãO")), ["a2:s3,s4"]);
});

test("aceita parte da palavra e mostra só as ações que combinam", () => {
  assert.deepEqual(ids(filtrarAcoesManutencao(GRUPOS, "past")), ["a1:s1"]);
  assert.deepEqual(ids(filtrarAcoesManutencao(GRUPOS, "amort")), ["a2:s3"]);
});

test("o grupo que combina traz todas as suas ações", () => {
  assert.deepEqual(ids(filtrarAcoesManutencao(GRUPOS, "frei")), ["a1:s1,s2"]);
});

test("palavras em qualquer ordem e grupo sem ação também é achado pelo nome", () => {
  assert.deepEqual(ids(filtrarAcoesManutencao(GRUPOS, "pastilha freios")), ["a1:s1"]);
  assert.deepEqual(ids(filtrarAcoesManutencao(GRUPOS, "lavag")), ["a3:"]);
});

test("sem resultado devolve lista vazia", () => {
  assert.deepEqual(filtrarAcoesManutencao(GRUPOS, "xyz"), []);
});
