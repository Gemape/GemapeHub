import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const tela = readFileSync(new URL("../src/components/modules/EstoqueModulo.tsx", import.meta.url), "utf8");

test("dec 238: Estoque mostra a empresa de cada linha, e no CSV", () => {
  assert.match(tela, /<TableHead>Empresa<\/TableHead>/);
  assert.match(tela, /<TableCell>\{nomeDaEmpresa\(item\.empresa_id\)\}<\/TableCell>/);
  assert.match(tela, /Empresa: nomeDaEmpresa\(item\.empresa_id\)/);
  // 6 colunas (10 em Ferramentas, com a posição por caixa; entradas e baixas ficam no relatório Entradas e saídas): o esqueleto de carregando e o aviso de lista vazia ocupam todas.
  assert.equal((tela.match(/colSpan=\{ferr \? 10 : 6\}/g) ?? []).length, 1);
  assert.match(tela, /<LinhasEsqueleto colunas=\{ferr \? 10 : 6\} \/>/);
  assert.doesNotMatch(tela, /colSpan=\{6\}/);
});

test("Estoque das ferramentas edita o mínimo no campo, sem botão Configurar nem janela", () => {
  assert.match(tela, /<MinimoEditavel /);
  assert.doesNotMatch(tela, /Configurar|<Dialog/);
});
