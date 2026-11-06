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
