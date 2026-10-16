import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { codigoDaCopia, montarCopiaDoProduto } from "../src/lib/clonar-produto-gemape.ts";

const regras = [
  { categoriaId: "cat-epi", sigla: "EPI", inicial: "0001" },
  { categoriaId: "cat-epi", sigla: "LUV", inicial: "0001" },
  { categoriaId: "cat-ferramentas", sigla: "FER", inicial: "0001" },
];

test("a cópia recebe o código seguinte da sequência, nunca o do original (dec 231)", () => {
  assert.equal(codigoDaCopia(regras, "epis", "EPI-0001", ["EPI-0001"]), "EPI-0002");
  assert.equal(codigoDaCopia(regras, "epis", "EPI-0001", ["EPI-0001", "EPI-0007", "LUV-0003"]), "EPI-0008");
  assert.equal(codigoDaCopia(regras, "ferramentas", "FER-0001", ["FER-0001"]), "FER-0002");
});

test("a cópia mantém a sigla do original quando a categoria tem mais de uma", () => {
  assert.equal(codigoDaCopia(regras, "epis", "LUV-0003", ["EPI-0001", "LUV-0003"]), "LUV-0004");
});

test("sem regra de código a cópia não é criada", () => {
  assert.throws(() => codigoDaCopia([], "epis", "EPI-0001", []), /regra do código/);
});

test("a cópia leva todas as informações, sem id, vínculo com catálogo nem saldo", () => {
  const origem = {
    id: "epi-demo", empresa_id: "e1", nome: "Capacete de segurança", codigo_sku: "EPI-0001", categoria: "Capacete",
    subcategoria_id: "sub-epi-capacete", ca: "12345", estoque_atual: 12, estoque_minimo: 5, status: "Ativo",
    preco_unitario: 85, created_at: "2026-01-01", catalogo_id: "c1",
  };
  const copia = montarCopiaDoProduto(origem, "EPI-0002");
  assert.equal(copia.codigo_sku, "EPI-0002");
  assert.equal(copia.nome, "Capacete de segurança");
  assert.equal(copia.ca, "12345");
  assert.equal(copia.preco_unitario, 85);
  assert.equal(copia.estoque_minimo, 5);
  assert.equal(copia.estoque_atual, 0);
  for (const campo of ["id", "created_at", "catalogo_id"]) assert.ok(!(campo in copia), campo);
  assert.equal(origem.codigo_sku, "EPI-0001");
});

test("Clonar de Código de fábrica cria o produto, desfaz a associação se falhar e fica na tela (dec 231)", () => {
  const tela = readFileSync(new URL("../src/routes/_authenticated/cadastros/gerais/codigo-fabrica.tsx", import.meta.url), "utf8");
  assert.match(tela, /enviarClone\(modelo\)/);
  assert.match(tela, /montarCopiaDoProduto\(produtoOrigem, codigo\)/);
  assert.match(tela, /removerCodigosFabricaPorIds\(\[salva\.id\]\)/);
  assert.match(tela, /Clonar código de fábrica/);
});
