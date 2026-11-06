import test from "node:test";
import assert from "node:assert/strict";
import { receptoresDeEntrega } from "../src/lib/empregados-habilitados.ts";

const todos = [{ id: "a", ativo: true }, { id: "b", ativo: false }, { id: "c", ativo: true }];
const ativo = (e) => e.ativo;
const so = (ids) => (l) => l.filter((e) => ids.includes(e.id));

test("com um habilitado ativo, desligados habilitados continuam (datas retroativas)", () => {
  assert.deepEqual(receptoresDeEntrega(todos, so(["a", "b"]), ativo).map((e) => e.id), ["a", "b"]);
});
test("se só há habilitados desligados, cai para os ativos", () => {
  const soH = (l) => { const r = l.filter((e) => e.id === "b"); return r.length ? r : l; };
  assert.deepEqual(receptoresDeEntrega(todos, soH, ativo).map((e) => e.id), ["a", "c"]);
});

import { montarCotacaoExcel, montarCotacaoHtml } from "../src/lib/sugestao-epi.ts";
const linha = { codigo: "U1", descricao: "Camisa", ca: "", empresa: "X", quantidade: 3, estoque: 1, status: "Ruptura" };
test("cotação de uniforme sai sem a coluna CA; a de EPI mantém", () => {
  assert.doesNotMatch(montarCotacaoExcel([linha], false), /<th>CA<\/th>/);
  assert.match(montarCotacaoExcel([linha]), /<th>CA<\/th>/);
  assert.doesNotMatch(montarCotacaoHtml({ linhas: [linha], criterio: "c", comCa: false }), />CA</);
  assert.match(montarCotacaoHtml({ linhas: [linha], criterio: "c" }), />CA</);
});
