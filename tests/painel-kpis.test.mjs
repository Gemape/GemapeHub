import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { kpisDeEmpregados, kpisDeItens, kpisDeValor, kpisDeVeiculos } from "../src/lib/painel-kpis.ts";

const empresas = [{ id: "a", nome: "Alfa" }, { id: "b", nome: "Beta" }];
const itens = [
  { id: "1", empresa_id: "a", nome: "Capacete", modulo: "epi", estoque_atual: 10, estoque_minimo: 12, preco_unitario: 20 },
  { id: "2", empresa_id: "a", nome: "Bota", modulo: "epi", estoque_atual: 0, estoque_minimo: 5, preco_unitario: 100 },
  { id: "3", empresa_id: "b", nome: "Furadeira", modulo: "ferramenta", estoque_atual: 4, estoque_minimo: 1, preco_unitario: 500 },
  { id: "4", empresa_id: "b", nome: "Camisa", modulo: "uniforme", estoque_atual: 30, estoque_minimo: 10, preco_unitario: 0 },
];

test("itens: alerta, sem saldo e distribuição", () => {
  const k = kpisDeItens(itens, new Set(["1", "2"]), empresas);
  assert.deepEqual([k.total, k.unidades, k.semEstoque, k.abaixoMinimo, k.pctAbaixoMinimo], [4, 44, 1, 2, 50]);
  assert.deepEqual(k.porModulo.find((m) => m.modulo === "epi"), { modulo: "epi", itens: 2, unidades: 10, abaixoMinimo: 2 });
  assert.deepEqual(k.porEmpresa.map((e) => [e.itens, e.abaixoMinimo]), [[2, 2], [2, 0]]);
  assert.equal(kpisDeItens([], new Set(), empresas).pctAbaixoMinimo, null);
});

test("valor: total, categorias, maiores itens e concentração", () => {
  const k = kpisDeValor(itens, empresas);
  assert.equal(k.total, 2200);
  assert.equal(k.valorMedioPorUnidade, 50);
  assert.deepEqual(k.maiores.map((i) => i.nome), ["Furadeira", "Capacete"]);
  assert.equal(k.maiores[0].pct, 90.9);
  assert.equal(k.pctDosCincoMaiores, 100);
  assert.deepEqual(k.porEmpresa.map((e) => e.valor), [200, 2000]);
  assert.equal(kpisDeValor([], empresas).valorMedioPorUnidade, 0);
});

test("veículos: ativos, situação e ocorrências ainda pendentes só dos veículos do painel", () => {
  const veiculos = [{ id: "v1", empresa_id: "a", status: "Ativo" }, { id: "v2", empresa_id: "a", status: "Em manutenção" }, { id: "v3", empresa_id: "b", status: "Ativo" }];
  const ocorrencias = [{ veiculoId: "v1", status: "Aberta" }, { veiculoId: "v2", status: "Em tratativa" }, { veiculoId: "v3", status: "Encerrada" }, { veiculoId: "fora", status: "Aberta" }];
  const k = kpisDeVeiculos(veiculos, ocorrencias, empresas);
  assert.deepEqual([k.total, k.ativos, k.pctAtivos, k.ocorrenciasAbertas, k.ocorrenciasEmTratativa], [3, 2, 66.7, 1, 1]);
  assert.deepEqual(k.porEmpresa.map((e) => [e.total, e.ativos]), [[2, 1], [1, 1]]);
  assert.equal(kpisDeVeiculos([], [], empresas).pctAtivos, null);
});

test("empregados: por empresa e vestuário por empregado", () => {
  const k = kpisDeEmpregados([{ empresa_id: "a" }, { empresa_id: "a" }, { empresa_id: "b" }], itens, empresas);
  assert.equal(k.ativos, 3);
  assert.equal(k.unidadesDeVestuarioPorEmpregado, 13.3);
  assert.deepEqual(k.porEmpresa.map((e) => [e.ativos, e.pct, e.unidadesPorEmpregado]), [[2, 66.7, 5], [1, 33.3, 30]]);
  assert.equal(kpisDeEmpregados([], itens, empresas).unidadesDeVestuarioPorEmpregado, null);
});

test("o dashboard abre os KPIs ao clicar em cada um dos quatro cards", () => {
  const tela = readFileSync(new URL("../src/routes/_authenticated/dashboard.tsx", import.meta.url), "utf8");
  for (const c of ["itens", "valor", "veiculos", "empregados"]) assert.ok(tela.includes(`setCardAberto("${c}")`), c);
  assert.match(tela, /<PainelKpisDialog card=\{cardAberto\}/);
});
