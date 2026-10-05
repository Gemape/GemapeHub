import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  lerPlanos, criarPlano, editarPlano, removerPlano, itensDoPlano,
} from "../src/lib/plano-manutencao.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const itens = [{ acaoId: "a1", km: "10000", meses: "6" }, { acaoId: "a2", km: "5.000", meses: "3" }];

test("criar plano guarda km e meses por grupo, um plano por veículo", () => {
  const s = memoria();
  const p = criarPlano("v1", itens, s, new Date("2026-10-05T12:00:00Z"));
  assert.deepEqual(p.itens, [{ acaoId: "a1", km: 10000, meses: 6 }, { acaoId: "a2", km: 5000, meses: 3 }]);
  assert.equal(lerPlanos(s).length, 1);
  assert.throws(() => criarPlano("v1", itens, s), /já tem plano/i);
});

test("validações: veículo, ao menos um grupo, km e meses inteiros maiores que zero, sem grupo repetido", () => {
  const s = memoria();
  assert.throws(() => criarPlano("", itens, s), /veículo/i);
  assert.throws(() => criarPlano("v1", [], s), /ao menos um grupo/i);
  assert.throws(() => criarPlano("v1", [{ acaoId: "a1", km: "", meses: "6" }], s), /km/i);
  assert.throws(() => criarPlano("v1", [{ acaoId: "a1", km: "0", meses: "6" }], s), /km/i);
  assert.throws(() => criarPlano("v1", [{ acaoId: "a1", km: "1000", meses: "abc" }], s), /meses/i);
  assert.throws(() => criarPlano("v1", [{ acaoId: "a1", km: "1000", meses: "6" }, { acaoId: "a1", km: "2000", meses: "3" }], s), /repetido/i);
  assert.equal(lerPlanos(s).length, 0);
});

test("editar troca os grupos e pode mudar o veículo, sem tomar o de outro plano; tudo ou nada", () => {
  const s = memoria();
  criarPlano("v1", itens, s);
  criarPlano("v2", [{ acaoId: "a1", km: "1000", meses: "1" }], s);
  assert.throws(() => editarPlano("v1", { veiculoId: "v2", itens }, s), /já tem plano/i);
  assert.throws(() => editarPlano("v1", { veiculoId: "v1", itens: [{ acaoId: "a1", km: "x", meses: "1" }] }, s), /km/i);
  assert.equal(lerPlanos(s).find((p) => p.veiculoId === "v1").itens.length, 2);
  editarPlano("v1", { veiculoId: "v3", itens: [{ acaoId: "a3", km: "20000", meses: "12" }] }, s);
  const ids = lerPlanos(s).map((p) => p.veiculoId).sort();
  assert.deepEqual(ids, ["v2", "v3"]);
  assert.throws(() => editarPlano("nao", { veiculoId: "nao", itens }, s), /não encontrad/i);
});

test("remover plano e ler grupos que ainda existem em Parâmetros", () => {
  const s = memoria();
  const p = criarPlano("v1", itens, s);
  assert.deepEqual(itensDoPlano(p, [{ id: "a2", nome: "Freios" }]).map((i) => i.nome), ["Freios"]);
  removerPlano("v1", s);
  assert.deepEqual(lerPlanos(s), []);
});

test("dados ilegíveis não são sobrescritos", () => {
  const s = memoria();
  s.setItem("gemape-demo-planos-manutencao", "{quebrado");
  assert.throws(() => criarPlano("v1", itens, s), /não puderam ser lidos/i);
  assert.equal(s.getItem("gemape-demo-planos-manutencao"), "{quebrado");
});

test("a tela fica em Parâmetros > Veículos, com duas caixas, Clonar/Editar/Excluir e sem Supabase", () => {
  const menu = readFileSync("src/lib/menu-parametros.ts", "utf8");
  assert.match(menu, /url: "\/cadastros\/veiculos-plano-manutencao"/);
  const tela = readFileSync("src/components/parametros/PlanoManutencaoVeiculo.tsx", "utf8");
  assert.match(tela, /Grupos de ação/);
  assert.match(tela, /Ações habilitadas/);
  assert.match(tela, /<AcoesLinha/);
  assert.match(tela, /onClonar=/);
  assert.match(tela, /salvando\.current/);
  assert.doesNotMatch(tela, /supabase\.(from|rpc)/);
  assert.doesNotMatch(readFileSync("src/lib/plano-manutencao.ts", "utf8"), /supabase/i);
});

test("a data da lista é mostrada no horário de Brasília", () => {
  assert.match(readFileSync("src/components/parametros/PlanoManutencaoVeiculo.tsx", "utf8"), /timeZone: "America\/Sao_Paulo"/);
});

test("limites aceitam só inteiros (ponto só de milhar) e grupos inexistentes são recusados", () => {
  const s = memoria();
  for (const ruim of ["1.5", "1.0", "1..0", "1.2.3", "0x10", "1e3", 10000.5, "99999999999999999999"]) {
    assert.throws(() => criarPlano("v1", [{ acaoId: "a1", km: ruim, meses: "6" }], s), /km/i, String(ruim));
  }
  assert.equal(criarPlano("v1", [{ acaoId: "a1", km: "10.000", meses: 6 }], s).itens[0].km, 10000);
  assert.throws(() => criarPlano("v2", [{ acaoId: "x", km: "1000", meses: "6" }], s, new Date(), ["a1"]), /não existe mais/i);
  assert.equal(lerPlanos(s).length, 1);
});
