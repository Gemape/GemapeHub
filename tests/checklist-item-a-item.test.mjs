import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { criarAssociacao, lerAssociacoes, checklistsDaAssociacao as checklistsVeiculo } from "../src/lib/checklist-associacao-veiculo.ts";
import { gruposAssociadosDoVeiculo } from "../src/lib/checklist-veiculo.ts";
import {
  checklistsDaAssociacao as checklistsEquip, lerChecklistEquipamento, salvarAssociacao, salvarGrupoChecklist,
} from "../src/lib/equipamentos-checklist.ts";

const memoria = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};
const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");

// ---------- veículos ----------
const grupoVeic = { id: "g1", nome: "Lança e cabos", tiposVeiculo: ["todos"], itens: [{ id: "i1", nome: "Lança" }, { id: "i2", nome: "Cabos" }, { id: "i3", nome: "Patolas" }] };
const periodico = (extra = {}) => ({ grupoId: "g1", tipo: "periodico", periodicidade: "Mensal", ...extra });

test("veículo: associação guarda só os itens escolhidos e o grupo vem do módulo só com eles", () => {
  const s = memoria();
  criarAssociacao("v1", null, [periodico({ itensIds: ["i1", "i3"] })], s);
  const a = lerAssociacoes(s)[0];
  assert.deepEqual(a.itens[0].itensIds, ["i1", "i3"]);
  const grupos = gruposAssociadosDoVeiculo(a, [grupoVeic]);
  assert.deepEqual(grupos[0].itens.map((i) => i.nome), ["Lança", "Patolas"]);
  assert.equal(grupoVeic.itens.length, 3, "o grupo original não muda");
  assert.deepEqual(checklistsVeiculo("ABC1234", a, [grupoVeic])[0].grupos[0].itensIds, ["i1", "i3"]);
});

test("veículo: sem itensIds o grupo vale inteiro (dados antigos); lista vazia de itens é recusada e nada é gravado", () => {
  const s = memoria();
  criarAssociacao("v1", null, [periodico()], s);
  assert.equal(lerAssociacoes(s)[0].itens[0].itensIds, undefined);
  assert.equal(gruposAssociadosDoVeiculo(lerAssociacoes(s)[0], [grupoVeic])[0].itens.length, 3);
  const s2 = memoria();
  assert.throws(() => criarAssociacao("v1", null, [periodico({ itensIds: [] })], s2), /ao menos um item/i);
  assert.equal(s2.getItem("gemape-demo-associacoes-checklist-veiculo"), null);
});

test("veículo: itens escolhidos que sumiram do grupo tiram o grupo do check list (sem item, sem grupo)", () => {
  const s = memoria();
  criarAssociacao("v1", null, [periodico({ itensIds: ["i9"] })], s);
  assert.deepEqual(gruposAssociadosDoVeiculo(lerAssociacoes(s)[0], [grupoVeic]), []);
});

test("veículo: a tela traz grupo → itens, com uma caixa por item, e só grava os itens marcados", () => {
  const tela = ler("components/parametros/AssociarChecklistVeiculo.tsx");
  assert.match(tela, /assoc-grupo-\$\{g\.id\}/);
  assert.match(tela, /assoc-item-\$\{i\.id\}/);
  assert.match(tela, /itensIds: ids/);
  assert.match(tela, /indeterminate/);
});

// ---------- equipamentos ----------
const grupoEq = (s) => salvarGrupoChecklist("manutencao", { nome: "Lança e cabos", itens: ["lança", "cabos", "patolas"], tipos: ["todos"] }, s);
const assocEq = (s, itensIds, extra = {}) => salvarAssociacao("manutencao", { modo: "criar", equipamentoId: "e1", tipoId: "tipo-munck", responsavel: null, itens: [{ grupoId: grupoEq(s).id, tipo: "periodico", periodicidade: "Mensal", ...(itensIds ? { itensIds } : {}), ...extra }] }, s, new Date());

test("equipamento: guarda só os itens escolhidos; com todos, o grupo vale inteiro", () => {
  const s = memoria();
  const g = grupoEq(s);
  const [a, b] = g.itens;
  const parcial = salvarAssociacao("manutencao", { modo: "criar", equipamentoId: "e1", tipoId: "tipo-munck", responsavel: null, itens: [{ grupoId: g.id, tipo: "periodico", periodicidade: "Mensal", itensIds: [a.id, b.id] }] }, s, new Date());
  assert.deepEqual(parcial.itens[0].itensIds, [a.id, b.id]);
  const parte = lerChecklistEquipamento(s).manutencao;
  assert.deepEqual(checklistsEquip("MUN-001", parte.associacoes[0], parte.grupos)[0].grupos[0].itensIds, [a.id, b.id]);
  const s2 = memoria();
  const g2 = grupoEq(s2);
  const todos = salvarAssociacao("manutencao", { modo: "criar", equipamentoId: "e1", tipoId: "tipo-munck", responsavel: null, itens: [{ grupoId: g2.id, tipo: "avulso", itensIds: g2.itens.map((i) => i.id) }] }, s2, new Date());
  assert.equal(todos.itens[0].itensIds, undefined);
});

test("equipamento: recusa lista vazia e item que não é do grupo, sem gravar nada", () => {
  const s = memoria();
  assert.throws(() => assocEq(s, []), /ao menos um item/i);
  const s2 = memoria();
  assert.throws(() => assocEq(s2, ["nao-existe"]), /não existe mais/i);
  assert.equal(lerChecklistEquipamento(s2).manutencao.associacoes.length, 0);
});

test("equipamento: a tela traz grupo → itens com caixas por item e mostra 'N de M itens' na tabela", () => {
  const tela = ler("components/parametros/ChecklistEquipamento.tsx");
  assert.match(tela, /Itens de \$\{g\.nome\}/);
  assert.match(tela, /alternarItem\(g, i\.id/);
  assert.match(tela, /itensIds: marcadosDe\(g\)/);
  assert.match(tela, /de \$\{total\} itens/);
});
