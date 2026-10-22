import test from "node:test";
import assert from "node:assert/strict";

import {
  itensDoPlano, lerManutencaoEquipamento, removerAcao, removerPlano, removerTipoOcorrencia, salvarAcao, salvarPlano, salvarTipoOcorrencia,
} from "../src/lib/equipamentos-manutencao.ts";

const CHAVE = "gemape-demo-equipamentos-manutencao";
const memoria = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};
const agora = new Date("2026-10-22T12:00:00Z");

test("ação de manutenção: nome capitalizado e único, subitens sem repetir e Outros sempre por último", () => {
  const s = memoria();
  const a = salvarAcao({ nome: "troca de óleo", subitens: ["óleo do motor", "filtro de óleo", ""] }, s);
  assert.equal(a.nome, "Troca de óleo");
  assert.deepEqual(a.subitens.map((i) => i.nome), ["Óleo do motor", "Filtro de óleo", "Outros"]);
  assert.throws(() => salvarAcao({ nome: "TROCA DE OLEO", subitens: [] }, s), /já existe/i);
  assert.throws(() => salvarAcao({ nome: "Outra", subitens: ["a", "A"] }, s), /repetido/i);
  assert.throws(() => salvarAcao({ nome: " ", subitens: [] }, s), /nome/i);
  assert.deepEqual(salvarAcao({ nome: "Só Outros", subitens: ["outros"] }, s).subitens.map((i) => i.nome), ["Outros"]);
});

test("ação de manutenção: editar mantém os ids dos subitens que continuam", () => {
  const s = memoria();
  const a = salvarAcao({ nome: "Freios", subitens: ["pastilhas", "discos"] }, s);
  const b = salvarAcao({ id: a.id, nome: "Freios", subitens: ["pastilhas", "fluido"] }, s);
  assert.equal(b.subitens[0].id, a.subitens[0].id);
  assert.notEqual(b.subitens[1].id, a.subitens[1].id);
  assert.throws(() => salvarAcao({ id: "x", nome: "Fantasma", subitens: [] }, s), /excluída/i);
});

test("tipo de ocorrência: nome único e descrição capitalizada; excluir já excluído avisa", () => {
  const s = memoria();
  const t = salvarTipoOcorrencia({ nome: "tombamento", descricao: "equipamento tombou" }, s);
  assert.equal(t.nome, "Tombamento");
  assert.throws(() => salvarTipoOcorrencia({ nome: "TOMBAMENTO", descricao: "" }, s), /já existe/i);
  removerTipoOcorrencia(t.id, s);
  assert.deepEqual(lerManutencaoEquipamento(s).tiposOcorrencia, []);
  assert.throws(() => removerTipoOcorrencia(t.id, s), /já foi excluído/i);
});

test("plano: horas e meses inteiros positivos, uma ação por vez, um plano por equipamento", () => {
  const s = memoria();
  const a = salvarAcao({ nome: "Hidráulica", subitens: [] }, s);
  const base = { modo: "criar", equipamentoId: "e1", itens: [{ acaoId: a.id, horas: "1.000", meses: "6" }] };
  const p = salvarPlano(base, s, agora);
  assert.deepEqual(p.itens, [{ acaoId: a.id, horas: 1000, meses: 6 }]);
  assert.equal(p.atualizadoEm, agora.toISOString());
  assert.throws(() => salvarPlano(base, s, agora), /já tem plano/i);
  for (const ruim of [{ horas: "0", meses: "6" }, { horas: "1.5", meses: "6" }, { horas: "10", meses: "" }]) {
    assert.throws(() => salvarPlano({ ...base, equipamentoId: "e2", itens: [{ acaoId: a.id, ...ruim }] }, s, agora), /inteiro maior que zero/i);
  }
  assert.throws(() => salvarPlano({ ...base, equipamentoId: "e2", itens: [] }, s, agora), /ao menos uma ação/i);
  assert.throws(() => salvarPlano({ ...base, equipamentoId: "e2", itens: [{ acaoId: "x", horas: 1, meses: 1 }] }, s, agora), /não existe mais/i);
  assert.throws(() => salvarPlano({ ...base, equipamentoId: "e2", itens: [base.itens[0], base.itens[0]] }, s, agora), /repetida/i);
  assert.throws(() => salvarPlano({ ...base, modo: "editar", equipamentoId: "e9" }, s, agora), /não encontrado/i);
  assert.equal(lerManutencaoEquipamento(s).planos.length, 1);
});

test("plano: editar troca os limites; ação usada em plano não se exclui até sair do plano", () => {
  const s = memoria();
  const a = salvarAcao({ nome: "Elétrica", subitens: [] }, s);
  salvarPlano({ modo: "criar", equipamentoId: "e1", itens: [{ acaoId: a.id, horas: 500, meses: 3 }] }, s, agora);
  salvarPlano({ modo: "editar", equipamentoId: "e1", itens: [{ acaoId: a.id, horas: 800, meses: 4 }] }, s, agora);
  const plano = lerManutencaoEquipamento(s).planos[0];
  assert.deepEqual(itensDoPlano(plano, lerManutencaoEquipamento(s).acoes), [{ acaoId: a.id, horas: 800, meses: 4, nome: "Elétrica" }]);
  assert.throws(() => removerAcao(a.id, s), /1 plano/);
  removerPlano("e1", s);
  removerAcao(a.id, s);
  assert.deepEqual(lerManutencaoEquipamento(s).acoes, []);
});

test("dado salvo ilegível ou quebrado não é sobrescrito; erro de validação não grava nada", () => {
  for (const ruim of ["{quebrado", JSON.stringify({ acoes: [null], tiposOcorrencia: [], planos: [] }), JSON.stringify({ acoes: [], tiposOcorrencia: [], planos: [{ equipamentoId: "x" }] })]) {
    const s = memoria();
    s.setItem(CHAVE, ruim);
    assert.deepEqual(lerManutencaoEquipamento(s), { acoes: [], tiposOcorrencia: [], planos: [] });
    assert.throws(() => salvarAcao({ nome: "X", subitens: [] }, s), /ilegíveis/i);
    assert.equal(s.getItem(CHAVE), ruim);
  }
  const s = memoria();
  assert.throws(() => salvarAcao({ nome: "", subitens: [] }, s));
  assert.equal(s.getItem(CHAVE), null);
});

test("as telas de Manutenção e Tipos de ocorrência de equipamentos reaproveitam as de Veículos, e o plano e a associação clonam", async () => {
  const { readFileSync } = await import("node:fs");
  const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
  const tela = ler("components/parametros/ManutencaoEquipamento.tsx");
  assert.match(tela, /<ListaVeiculos[\s\S]*?eyebrow=\{CAMINHO\}/);
  assert.match(tela, /Cadastrar Plano de Manutenções/);
  assert.match(tela, /onClonar=\{\(\) => abrir\(p, true\)\}/);
  assert.match(tela, /A cada \(horas de uso\)/);
  assert.match(ler("components/parametros/ChecklistEquipamento.tsx"), /onClonar=\{\(\) => abrir\(a, true\)\}/);
  assert.match(ler("components/parametros/VeiculosListasParametros.tsx"), /export function ListaVeiculos/);
  for (const r of ["equipamentos-manutencao", "equipamentos-tipos-ocorrencia"]) assert.match(ler("routeTree.gen.ts"), new RegExp(`/cadastros/${r}`));
});
