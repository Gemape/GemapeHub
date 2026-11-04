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

test("a compra lista todos os fornecedores, em ordem de nome, sem filtrar por categoria (decisão 55)", () => {
  // Ordem pelo nome: Ferro Forte, Segura Mais, Sem Cat, Tecidos SA; a categoria pedida não muda o resultado.
  assert.deepEqual(fornecedoresDaCategoria(lista, "cat-uniformes").map((f) => f.id), ["f3", "f1", "f4", "f2"]);
  assert.deepEqual(fornecedoresDaCategoria(lista, "cat-epi").map((f) => f.id), ["f3", "f1", "f4", "f2"]);
  assert.deepEqual(fornecedoresDaCategoria(lista, "cat-veiculos").map((f) => f.id), ["f3", "f1", "f4", "f2"]);
});

test("escolher o fornecedor devolve id e nome para gravar", () => {
  assert.deepEqual(escolherFornecedorDaCompra(lista, "cat-epi", "f1"), { id: "f1", nome: "Segura Mais" });
});

test("fornecedor vazio ou excluído é recusado; o de qualquer categoria é aceito", () => {
  assert.match(escolherFornecedorDaCompra(lista, "cat-epi", "").erro, /Selecione o fornecedor/);
  assert.deepEqual(escolherFornecedorDaCompra(lista, "cat-epi", "f3"), { id: "f3", nome: "Ferro Forte" });
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
  assert.match(seletor, /onClick=\{\(\) => \{ setCodigoPrevisto\(proximoCodigoFornecedor\(\)\); setCadastrando\(true\); \}\}>Cadastrar fornecedor/, "link para cadastrar o fornecedor que não existe (decisão 327)");
});

test("fornecedor sem nome no cadastro é recusado", () => {
  const vazio = [{ id: "fx", codigo: "00009", razao_social: "", nome_fantasia: "", categorias: ["cat-epi"] }];
  assert.match(escolherFornecedorDaCompra(vazio, "cat-epi", "fx").erro, /sem nome/);
});

test("fornecedor sem categoria pode ser escolhido em qualquer compra (decisão 55)", () => {
  assert.deepEqual(escolherFornecedorDaCompra(lista, "cat-epi", "f4"), { id: "f4", nome: "Sem Cat" });
  assert.deepEqual(escolherFornecedorDaCompra(lista, "cat-uniformes", "f4"), { id: "f4", nome: "Sem Cat" });
});

test("Cadastrar fornecedor na compra abre o cadastro por cima (vai e volta) e já escolhe o fornecedor novo (decisão 390)", async () => {
  const { readFileSync } = await import("node:fs");
  const ler = (c) => readFileSync(new URL(`../src/components/${c}`, import.meta.url), "utf8");
  const seletor = ler("modules/SeletorFornecedorCompra.tsx");
  assert.match(seletor, /<FornecedorDialog[\s\S]*onSalvo=\{\(novo\) => \{ setVersao\(\(v\) => v \+ 1\); setNovoId\(novo\.id\); \}\}/);
  assert.match(seletor, /fornecedores\.some\(\(f\) => f\.id === novoId\)\) \{\s*onChange\(novoId\)/);
  assert.doesNotMatch(seletor, /target="_blank"/);
  assert.match(ler("parametros/FornecedorDialog.tsx"), /evento\.stopPropagation\(\)/, "o envio não sobe até o formulário da compra");
});
