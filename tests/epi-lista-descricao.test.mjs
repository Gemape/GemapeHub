import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const tela = readFileSync(new URL("../src/components/modules/CadastroEpi.tsx", import.meta.url), "utf8");

test("lista de EPIs cadastrados tem a coluna Descrição com nome, categoria e unidade (decisão 96)", () => {
  assert.match(tela, /<TableHead>Descrição<\/TableHead>/);
  const cab = tela.slice(tela.indexOf("<TableHeader>"), tela.indexOf("</TableHeader>"));
  const ordem = ["Código", "Descrição", "Tamanho", "Estoque mínimo", "Ações"].map((t) => cab.indexOf(t));
  assert.ok(ordem.every((p, i) => p >= 0 && (i === 0 || p > ordem[i - 1])), "colunas na ordem Código, Descrição, Tamanho, Estoque mínimo, Ações");
  // A descrição é um texto corrido na fonte padrão da tabela (decisão 97): sem etiquetas nem negrito.
  assert.match(tela, /<TableCell>\{descreverEpi\(\{ nome: grupo\.nome, categoria: item\.categoria, unidade_medida: item\.unidade_medida \}\)\}<\/TableCell>/);
  assert.doesNotMatch(tela, /DescricaoEpi|<Badge/);
  // A linha de cabeçalho do grupo some: a descrição passa a ser uma coluna e a tabela tem 5 colunas.
  assert.doesNotMatch(tela, /bg-muted\/40/);
  assert.equal((tela.match(/colSpan=\{5\}/g) ?? []).length, 2);
});
