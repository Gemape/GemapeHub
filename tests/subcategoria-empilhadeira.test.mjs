import test from "node:test";
import assert from "node:assert/strict";
import { lerParametros, adicionarSubcategoria } from "../src/lib/parametros-base.ts";

const storage = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const veiculos = (d) => d.subcategorias.filter((s) => s.categoriaId === "cat-veiculos").map((s) => s.nome);

test("Veículos não tem mais a subcategoria Empilhadeira: ela é só do módulo Equipamentos", () => {
  assert.deepEqual(veiculos(lerParametros(storage())), ["Carro", "Moto", "Caminhão", "Utilitário", "Van"]);
});

test("quem já tinha a Empilhadeira (e os grupos de check list dela) em Veículos perde os dois, uma vez só", () => {
  const s = storage();
  s.setItem("gemape-demo-parametros-base", JSON.stringify({
    subcategorias: [
      { id: "sub-veiculos-carro", categoriaId: "cat-veiculos", nome: "Carro" },
      { id: "sub-veiculos-empilhadeira", categoriaId: "cat-veiculos", nome: "Empilhadeira" },
      { id: "sub-veiculos-empilhadeira-eletrica", categoriaId: "cat-veiculos", nome: "Empilhadeira elétrica" },
    ],
    itensChecklistVeiculo: [
      { id: "g1", nome: "Veículos leves · Mecânica", itens: [{ id: "i1", nome: "Freio" }], tiposVeiculo: ["*"] },
      { id: "g2", nome: "Empilhadeiras · Elevação e mastro", itens: [{ id: "i2", nome: "Mastro" }], tiposVeiculo: ["sub-veiculos-empilhadeira"] },
    ],
  }));
  const lido = lerParametros(s);
  assert.deepEqual(veiculos(lido), ["Carro"]);
  assert.deepEqual(lido.itensChecklistVeiculo.map((g) => g.nome), ["Veículos leves · Mecânica"]);
  // Qualquer gravação grava o marcador: quem criar a Empilhadeira de novo em Gerais a mantém.
  adicionarSubcategoria("cat-veiculos", "Empilhadeira", s);
  assert.ok(veiculos(lerParametros(s)).includes("Empilhadeira"));
});
