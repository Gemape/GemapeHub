import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { agruparEstoquePorGrupo, SEM_GRUPO } from "../src/lib/estoque-por-grupo.ts";

const item = (id, nome, grupo, minimo = 0) => ({ id, codigo_sku: `FER-${id}`, nome, empresa_id: "e1", grupo_ferramenta: grupo, estoque_minimo: minimo });
const pos = (saldo, guardada = 0, comEmpregado = 0, semCaixa = saldo - guardada) => ({ saldo, guardada, comEmpregado, semCaixa });

test("agrupa pelo grupo do cadastro, soma os saldos e deixa Sem grupo por último", () => {
  const itens = [item("1", "Chave L 8mm", "Chave L", 5), item("2", "Chave L 10mm", "chave l", 3), item("3", "Fenda 6mm", "Chave de fenda"), item("4", "Martelo", null), item("5", "Alicate", "Alicate")];
  const posicoes = new Map([["1", pos(4, 2, 1)], ["2", pos(6, 3)], ["3", pos(2)], ["4", pos(1)], ["5", pos(7)]]);
  const g = agruparEstoquePorGrupo(itens, posicoes, new Set(["1"]));
  assert.deepEqual(g.map((x) => x.grupo), ["Alicate", "Chave de fenda", "Chave L", SEM_GRUPO]);
  const chaveL = g.find((x) => x.grupo === "Chave L");
  assert.equal(chaveL.itens.length, 2);
  assert.equal(chaveL.saldo, 10);
  assert.equal(chaveL.guardada, 5);
  assert.equal(chaveL.comEmpregado, 1);
  assert.equal(chaveL.minimo, 8);
  assert.equal(chaveL.abaixoDoMinimo, 1);
});

test("o alerta do grupo conta os itens em alerta pela regra da lista, e um grupo chamado sem grupo entra no balde padrão", () => {
  const itens = [item("1", "A", "G", 5), item("2", "B", "G", 1), item("3", "C", "sem grupo"), item("4", "D", null)];
  const posicoes = new Map(itens.map((i) => [i.id, pos(1)]));
  const g = agruparEstoquePorGrupo(itens, posicoes, new Set(["2"]));
  assert.equal(g.find((x) => x.grupo === "G").abaixoDoMinimo, 1);
  assert.deepEqual(g.map((x) => x.grupo), ["G", SEM_GRUPO]);
  assert.equal(g.at(-1).itens.length, 2);
});

test("o estoque de ferramentas oferece a visão por grupo, com os itens do grupo sob demanda", () => {
  const f = readFileSync(new URL("../src/components/modules/EstoqueModulo.tsx", import.meta.url), "utf8");
  assert.match(f, />Estoque por grupo<\/Button>/);
  assert.match(f, /<EstoquePorGrupo grupos=\{grupos\}/);
  assert.match(f, /agruparEstoquePorGrupo\(linhas\.map/);
  assert.match(f, /'Ver itens'/);
  assert.match(f, /exportarCsv\('estoque-ferramenta-por-grupo'/);
});
