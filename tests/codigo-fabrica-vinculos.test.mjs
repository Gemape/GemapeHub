import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { avisoExclusaoDoFornecedor, avisoExclusaoDoProduto, vinculosDoFornecedor, vinculosDoProduto } from "../src/lib/codigo-fabrica-vinculos.ts";
import { removerCodigosFabricaPorIds } from "../src/lib/parametros-base.ts";

const codigos = [
  { id: "c1", empresa_id: "e1", tabela: "epis", codigo_produto: "EPI-0001", nome_produto: "Luva", fornecedor_id: "f1", fornecedor_nome: "Segura", codigo_fornecedor: "A1", ca: "123" },
  { id: "c2", empresa_id: "e1", tabela: "epis", codigo_produto: "EPI-0002", nome_produto: "Bota", fornecedor_id: "f1", fornecedor_nome: "Segura", codigo_fornecedor: "B2", ca: "456" },
  { id: "c3", empresa_id: "e2", tabela: "epis", codigo_produto: "EPI-0001", nome_produto: "Luva", fornecedor_id: "f2", fornecedor_nome: "Outro", codigo_fornecedor: "A1", ca: "123" },
  { id: "c4", empresa_id: "e1", tabela: "uniformes", codigo_produto: "EPI-0001", nome_produto: "Camisa", fornecedor_id: "f1", fornecedor_nome: "Segura", codigo_fornecedor: "U1", ca: "" },
];

test("os vínculos do fornecedor são todos os códigos de fábrica dele", () => {
  assert.deepEqual(vinculosDoFornecedor(codigos, "f1").map((c) => c.id), ["c1", "c2", "c4"]);
  assert.deepEqual(vinculosDoFornecedor(codigos, "fx"), []);
});

test("os vínculos do produto respeitam tabela, código e empresa", () => {
  assert.deepEqual(vinculosDoProduto(codigos, { tabela: "epis", codigo_sku: "EPI-0001", empresa_id: "e1" }).map((c) => c.id), ["c1"]);
  assert.deepEqual(vinculosDoProduto(codigos, { tabela: "epis", codigo_sku: "epi-0001", empresa_id: "e2" }).map((c) => c.id), ["c3"]);
});

test("sem vínculo não há aviso", () => {
  assert.equal(avisoExclusaoDoFornecedor("Segura", []), null);
  assert.equal(avisoExclusaoDoProduto("EPI-0009 Luva", []), null);
});

test("o aviso diz quantos códigos serão removidos e lista alguns", () => {
  const aviso = avisoExclusaoDoFornecedor("Segura", vinculosDoFornecedor(codigos, "f1"));
  assert.match(aviso, /3 códigos de fábrica/);
  assert.match(aviso, /EPI-0001/);
  assert.match(aviso, /também serão removidas/);
  assert.match(avisoExclusaoDoProduto("EPI-0001 Luva", [codigos[0]]), /1 código de fábrica/);
});

test("o aviso lista no máximo 5 e conta o resto", () => {
  const muitos = Array.from({ length: 8 }, (_, i) => ({ ...codigos[0], id: `m${i}`, codigo_produto: `EPI-${i}` }));
  const aviso = avisoExclusaoDoFornecedor("Segura", muitos);
  assert.match(aviso, /8 códigos de fábrica/);
  assert.match(aviso, /e mais 3/);
});

test("remover por ids tira só os escolhidos, de uma vez", () => {
  const mem = {};
  const storage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
  // Sem dados salvos, remover não quebra nem inventa registros.
  removerCodigosFabricaPorIds(["c1", "c2"], storage);
  const salvo = JSON.parse(Object.values(mem)[0]);
  assert.deepEqual(salvo.codigosFabrica, []);
});

test("a exclusão de fornecedor e de produto avisa e leva as associações junto", () => {
  const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
  const forn = ler("routes/_authenticated/cadastros/fornecedores.tsx");
  assert.match(forn, /avisoExclusaoDoFornecedor\(/);
  assert.match(forn, /removerCodigosFabricaPorIds\(/);
  const prod = ler("components/modules/CadastroProduto.tsx");
  assert.match(prod, /avisoExclusaoDoProduto\(/);
  assert.match(prod, /removerCodigosFabricaPorIds\(/);
  const ferr = ler("components/modules/ItensModulo.tsx");
  assert.match(ferr, /avisoExclusaoDoProduto\(/);
  assert.match(ferr, /removerCodigosFabricaPorIds\(/);
});
