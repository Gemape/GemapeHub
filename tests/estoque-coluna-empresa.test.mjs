import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const tela = readFileSync(new URL("../src/components/modules/EstoqueModulo.tsx", import.meta.url), "utf8");

test("dec 238: Estoque mostra a empresa de cada linha, no CSV e no título de Configurar", () => {
  assert.match(tela, /<TableHead>Empresa<\/TableHead>/);
  assert.match(tela, /<TableCell>\{nomeDaEmpresa\(item\.empresa_id\)\}<\/TableCell>/);
  assert.match(tela, /Empresa: nomeDaEmpresa\(item\.empresa_id\)/);
  assert.match(tela, /Configurar estoque — \{itemEditado\?\.nome\}\{itemEditado \? ` \(\$\{nomeDaEmpresa/);
  // 7 colunas: o aviso de carregando e de lista vazia ocupam todas.
  assert.equal((tela.match(/colSpan=\{7\}/g) ?? []).length, 2);
  assert.doesNotMatch(tela, /colSpan=\{6\}/);
});
