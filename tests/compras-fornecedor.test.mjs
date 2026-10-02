import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  escolherFornecedorDaCompra,
  fornecedoresDaCategoria,
  nomeDoFornecedor,
  rotuloDoFornecedor,
} from "../src/lib/compras-fornecedor.ts";

const lista = [
  { id: "f1", codigo: "00001", razao_social: "Segurança Ltda", nome_fantasia: "Segura Mais", categorias: ["cat-epi", "cat-uniformes"] },
  { id: "f2", codigo: "00002", razao_social: "Tecidos SA", nome_fantasia: "", categorias: ["cat-uniformes"] },
  { id: "f3", codigo: "00003", razao_social: "Ferragens", nome_fantasia: "Ferro Forte", categorias: ["cat-ferramentas"] },
  { id: "f4", codigo: "00004", razao_social: "Sem categoria", nome_fantasia: "Sem Cat", categorias: [] },
];

test("o nome do fornecedor é o fantasia, ou a razão social quando não há fantasia", () => {
  assert.equal(nomeDoFornecedor(lista[0]), "Segura Mais");
  assert.equal(nomeDoFornecedor(lista[1]), "Tecidos SA");
  assert.equal(rotuloDoFornecedor(lista[0]), "00001 · Segura Mais");
});

test("a compra lista só os fornecedores da categoria do módulo, em ordem de nome", () => {
  assert.deepEqual(fornecedoresDaCategoria(lista, "cat-uniformes").map((f) => f.id), ["f1", "f2"]);
  assert.deepEqual(fornecedoresDaCategoria(lista, "cat-epi").map((f) => f.id), ["f1"]);
  assert.deepEqual(fornecedoresDaCategoria(lista, "cat-veiculos"), []);
});

test("escolher o fornecedor devolve id e nome para gravar", () => {
  assert.deepEqual(escolherFornecedorDaCompra(lista, "cat-epi", "f1"), { id: "f1", nome: "Segura Mais" });
});

test("fornecedor vazio, de outra categoria ou excluído é recusado", () => {
  assert.match(escolherFornecedorDaCompra(lista, "cat-epi", "").erro, /Selecione o fornecedor/);
  assert.match(escolherFornecedorDaCompra(lista, "cat-epi", "f3").erro, /não atende/);
  assert.match(escolherFornecedorDaCompra(lista, "cat-epi", "f9").erro, /não está mais cadastrado/);
});

test("as compras de EPI e Uniforme usam o fornecedor do cadastro no demo e gravam id e nome", () => {
  const ler = (a) => readFileSync(new URL(`../src/components/modules/${a}`, import.meta.url), "utf8");
  for (const [arq, cat] of [["EpiComprasModulo.tsx", "cat-epi"], ["UniformesComprasModulo.tsx", "cat-uniformes"]]) {
    const t = ler(arq);
    assert.match(t, /<SeletorFornecedorCompra/, arq);
    assert.match(t, new RegExp(`categoriaId="${cat}"`), arq);
    assert.match(t, /fornecedor_id/, arq);
    assert.match(t, /escolherFornecedorDaCompra\(/, arq);
  }
  const seletor = ler("SeletorFornecedorCompra.tsx");
  assert.match(seletor, /MODO_DEMO/);
  assert.match(seletor, /Cadastros &gt; Fornecedores/);
});

test("fornecedor sem nome no cadastro é recusado", () => {
  const vazio = [{ id: "fx", codigo: "00009", razao_social: "", nome_fantasia: "", categorias: ["cat-epi"] }];
  assert.match(escolherFornecedorDaCompra(vazio, "cat-epi", "fx").erro, /sem nome/);
});
