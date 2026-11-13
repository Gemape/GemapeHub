import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const tela = readFileSync(new URL("../src/components/modules/CadastroEpi.tsx", import.meta.url), "utf8");

test("lista de EPIs cadastrados: Descrição só com o texto do item e Unidade em coluna própria ao lado de Tamanho (decisão 97)", () => {
  const cab = tela.slice(tela.indexOf("<TableHeader>"), tela.indexOf("</TableHeader>"));
  const ordem = ["Código", "Descrição", "Tamanho", "Unidade", "Estoque mínimo", "Ações"].map((t) => cab.indexOf(t));
  assert.ok(ordem.every((p, i) => p >= 0 && (i === 0 || p > ordem[i - 1])), "colunas na ordem Código, Descrição, Tamanho, Unidade, Estoque mínimo, Ações");
  // A descrição é só o nome do item; a unidade vem de cada item, no mesmo padrão da coluna Tamanho.
  assert.match(tela, /<TableCell>\{grupo\.nome\}<\/TableCell>/);
  assert.match(tela, /<TableCell>\{item\.unidade_medida \|\| "Sem unidade"\}<\/TableCell>/);
  assert.doesNotMatch(tela, /descreverEpi|DescricaoEpi|<Badge/);
  // Seis colunas: o esqueleto de carregamento tem as seis e o aviso de vazio ocupa a linha toda.
  assert.equal((tela.match(/colSpan=\{6\}/g) ?? []).length, 1);
  assert.match(tela, /<LinhasEsqueleto colunas=\{6\} \/>/);
});
