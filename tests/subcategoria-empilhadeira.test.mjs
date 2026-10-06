import test from "node:test";
import assert from "node:assert/strict";
import { lerParametros, adicionarSubcategoria, removerSubcategoria } from "../src/lib/parametros-base.ts";

const storage = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const veiculos = (d) => d.subcategorias.filter((s) => s.categoriaId === "cat-veiculos").map((s) => s.nome);

test("Gerais já traz a subcategoria Empilhadeira em Veículos, antes de Outros", () => {
  assert.deepEqual(veiculos(lerParametros(storage())), ["Carro", "Moto", "Caminhão", "Utilitário", "Van", "Empilhadeira"]);
});

test("quem já tinha cadastros salvos sem Empilhadeira passa a tê-la, uma vez só", () => {
  const s = storage();
  s.setItem("gemape-demo-parametros-base", JSON.stringify({
    subcategorias: [{ id: "sub-veiculos-carro", categoriaId: "cat-veiculos", nome: "Carro" }],
  }));
  assert.deepEqual(veiculos(lerParametros(s)), ["Carro", "Empilhadeira"]);
  // Qualquer gravação grava o marcador: se o responsável excluir a Empilhadeira, ela não volta.
  const emp = lerParametros(s).subcategorias.find((x) => x.nome === "Empilhadeira");
  adicionarSubcategoria("cat-veiculos", "Triciclo", s);
  removerSubcategoria(emp.id, s);
  assert.deepEqual(veiculos(lerParametros(s)), ["Carro", "Triciclo"]);
});

test("subcategoria de empilhadeira já existente (outro nome) não é duplicada", () => {
  const s = storage();
  s.setItem("gemape-demo-parametros-base", JSON.stringify({
    subcategorias: [{ id: "x1", categoriaId: "cat-veiculos", nome: "Empilhadeira elétrica" }],
  }));
  assert.deepEqual(veiculos(lerParametros(s)), ["Empilhadeira elétrica"]);
});
