import { test } from "node:test";
import assert from "node:assert/strict";

import { editarEpiCatalogo, excluirEpiCatalogo } from "../src/lib/epi-catalogo.ts";

const base = () => ({
  epis_catalogo: [
    { id: "c1", codigo_sku: "EPI-0001", nome: "Luva de raspa", tamanho_id: "t-p", estoque_minimo: 5 },
    { id: "c2", codigo_sku: "EPI-0002", nome: "Luva de raspa", tamanho_id: "t-m", estoque_minimo: 3 },
    { id: "c3", codigo_sku: "EPI-0003", nome: "Capacete", tamanho_id: null, estoque_minimo: 2 },
  ],
  epis: [
    { id: "e1", catalogo_id: "c1", empresa_id: "a", estoque_atual: 0, estoque_minimo: 5, nome: "Luva de raspa" },
    { id: "e2", catalogo_id: "c1", empresa_id: "b", estoque_atual: 0, estoque_minimo: 5, nome: "Luva de raspa" },
    { id: "e3", catalogo_id: "c3", empresa_id: "a", estoque_atual: 4, estoque_minimo: 2, nome: "Capacete" },
  ],
  movimentacoes: [],
  enderecamentos: [{ id: "n1", codigo_produto: "EPI-0001", empresa_id: "a" }],
});

test("editar muda o mínimo do tamanho e leva o novo mínimo ao estoque de todas as empresas", () => {
  const d = base();
  const r = editarEpiCatalogo(d, "c1", { nome: "Luva de raspa", estoque_minimo: "8" });
  assert.equal(r.erro, undefined);
  assert.equal(d.epis_catalogo[0].estoque_minimo, 8);
  assert.deepEqual(d.epis.filter((e) => e.catalogo_id === "c1").map((e) => e.estoque_minimo), [8, 8]);
  assert.equal(d.epis_catalogo[1].estoque_minimo, 3);
});

test("editar a descrição vale para todos os tamanhos do mesmo EPI", () => {
  const d = base();
  const r = editarEpiCatalogo(d, "c1", { nome: "  Luva  de vaqueta ", estoque_minimo: 5 });
  assert.equal(r.erro, undefined);
  assert.deepEqual(d.epis_catalogo.slice(0, 2).map((c) => c.nome), ["Luva de vaqueta", "Luva de vaqueta"]);
  assert.equal(d.epis_catalogo[2].nome, "Capacete");
  assert.deepEqual(d.epis.filter((e) => e.catalogo_id === "c1").map((e) => e.nome), ["Luva de vaqueta", "Luva de vaqueta"]);
});

test("editar recusa descrição de outro EPI, mínimo inválido e não grava nada", () => {
  const d = base();
  const antes = structuredClone(d);
  assert.match(editarEpiCatalogo(d, "c1", { nome: "capacete", estoque_minimo: 5 }).erro, /já existe/i);
  assert.match(editarEpiCatalogo(d, "c1", { nome: "Luva de raspa", estoque_minimo: "-1" }).erro, /estoque mínimo/i);
  assert.match(editarEpiCatalogo(d, "c1", { nome: "   ", estoque_minimo: 1 }).erro, /descrição/i);
  assert.match(editarEpiCatalogo(d, "nao-existe", { nome: "x", estoque_minimo: 1 }).erro, /não encontrado/i);
  assert.deepEqual(d, antes);
});

test("excluir remove o EPI do catálogo, o estoque zerado das empresas e os endereços dele", () => {
  const d = base();
  const r = excluirEpiCatalogo(d, "c1");
  assert.equal(r.erro, undefined);
  assert.deepEqual(d.epis_catalogo.map((c) => c.id), ["c2", "c3"]);
  assert.deepEqual(d.epis.map((e) => e.id), ["e3"]);
  assert.deepEqual(d.enderecamentos, []);
});

test("excluir é recusado com saldo em estoque ou com histórico, e não muda nada", () => {
  const d = base();
  const antes = structuredClone(d);
  assert.match(excluirEpiCatalogo(d, "c3").erro, /estoque/i);
  d.epis[0].estoque_atual = 0;
  d.movimentacoes.push({ id: "m1", item_id: "e2", modulo: "epi" });
  const depois = structuredClone(d);
  assert.match(excluirEpiCatalogo(d, "c1").erro, /histórico/i);
  assert.deepEqual(d, depois);
  assert.notDeepEqual(d, antes);
});
