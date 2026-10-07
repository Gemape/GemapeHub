import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  PERIODICIDADES_ASSOCIACAO, lerAssociacoes, criarAssociacao, editarAssociacao, removerAssociacao, gruposDaAssociacao,
} from "../src/lib/checklist-associacao-veiculo.ts";
import { MENU_VEICULOS } from "../src/lib/menu-parametros.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const resp = { id: "e1", nome: "Maria Souza" };
const grupos = [{ grupoId: "g1", periodicidade: "Diária" }, { grupoId: "g2", periodicidade: "Mensal" }];

test("as periodicidades são Diária, Semanal, Quinzenal e Mensal", () => {
  assert.deepEqual([...PERIODICIDADES_ASSOCIACAO], ["Diária", "Semanal", "Quinzenal", "Mensal"]);
});

test("criar associação guarda grupos com periodicidade e o responsável, uma por veículo", () => {
  const s = memoria();
  const a = criarAssociacao("v1", resp, grupos, s, new Date("2026-10-07T12:00:00Z"));
  assert.deepEqual(a.itens, grupos);
  assert.deepEqual(a.responsavel, resp);
  assert.equal(lerAssociacoes(s).length, 1);
  assert.throws(() => criarAssociacao("v1", resp, grupos, s), /já tem/i);
});

test("validações: veículo, responsável, ao menos um grupo, periodicidade válida, sem grupo repetido ou removido", () => {
  const s = memoria();
  assert.throws(() => criarAssociacao("", resp, grupos, s), /veículo/i);
  assert.throws(() => criarAssociacao("v1", null, grupos, s), /respons/i);
  assert.throws(() => criarAssociacao("v1", { id: "", nome: "" }, grupos, s), /respons/i);
  assert.throws(() => criarAssociacao("v1", resp, [], s), /ao menos um/i);
  assert.throws(() => criarAssociacao("v1", resp, [{ grupoId: "g1", periodicidade: "" }], s), /periodicidade/i);
  assert.throws(() => criarAssociacao("v1", resp, [{ grupoId: "g1", periodicidade: "Anual" }], s), /periodicidade/i);
  assert.throws(() => criarAssociacao("v1", resp, [grupos[0], grupos[0]], s), /repetido/i);
  assert.throws(() => criarAssociacao("v1", resp, grupos, s, new Date(), ["g1"]), /não existe mais/i);
  assert.equal(lerAssociacoes(s).length, 0);
});

test("editar troca grupos, periodicidade, responsável e veículo (tudo ou nada); excluir remove", () => {
  const s = memoria();
  criarAssociacao("v1", resp, grupos, s);
  criarAssociacao("v2", resp, [grupos[0]], s);
  assert.throws(() => editarAssociacao("v1", { veiculoId: "v2", responsavel: resp, itens: grupos }, s), /já tem/i);
  assert.deepEqual(lerAssociacoes(s).find((a) => a.veiculoId === "v1").itens, grupos);
  const nova = editarAssociacao("v1", { veiculoId: "v3", responsavel: { id: "e2", nome: "João" }, itens: [{ grupoId: "g2", periodicidade: "Quinzenal" }] }, s);
  assert.equal(nova.veiculoId, "v3");
  assert.equal(lerAssociacoes(s).some((a) => a.veiculoId === "v1"), false);
  removerAssociacao("v3", s);
  assert.deepEqual(lerAssociacoes(s).map((a) => a.veiculoId), ["v2"]);
});

test("dados ilegíveis não são sobrescritos", () => {
  const s = memoria();
  s.setItem("gemape-demo-associacoes-checklist-veiculo", "{quebrado");
  assert.throws(() => criarAssociacao("v1", resp, grupos, s), /não puderam ser lidas/i);
  assert.equal(s.getItem("gemape-demo-associacoes-checklist-veiculo"), "{quebrado");
});

test("gruposDaAssociacao ignora grupo que já não existe em Itens check list", () => {
  const s = memoria();
  const a = criarAssociacao("v1", resp, grupos, s);
  assert.deepEqual(
    gruposDaAssociacao(a, [{ id: "g2", nome: "Pesados · Pneus" }]).map((g) => [g.nome, g.periodicidade]),
    [["Pesados · Pneus", "Mensal"]],
  );
});

test("menu: Itens check list com chave de boca e novo item Associar itens de check list a um veículo com lista com check", () => {
  const itensCheck = MENU_VEICULOS.find((i) => i.url === "/cadastros/veiculos-checklist");
  assert.equal(itensCheck.icone, "Wrench");
  const assoc = MENU_VEICULOS.find((i) => i.url === "/cadastros/veiculos-checklist-associar");
  assert.equal(assoc.titulo, "Associar itens de check list a um veículo");
  assert.equal(assoc.icone, "ListChecks");
});

test("a tela existe e usa os grupos de Itens check list, periodicidade e responsável", () => {
  const tela = readFileSync(new URL("../src/components/parametros/AssociarChecklistVeiculo.tsx", import.meta.url), "utf8");
  assert.match(tela, /itensChecklistVeiculo/);
  assert.match(tela, /PERIODICIDADES_ASSOCIACAO/);
  assert.match(tela, /Responsável/);
  const rota = readFileSync(new URL("../src/routes/_authenticated/cadastros/veiculos-checklist-associar.tsx", import.meta.url), "utf8");
  assert.match(rota, /cadastros\/veiculos-checklist-associar/);
});
