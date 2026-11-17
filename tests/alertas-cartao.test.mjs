import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { alertasDosCartoes, cartaoTemAlerta, resumoDeVeiculos } from "../src/lib/alertas-cartao.ts";
import { maisUsados, registrarUso } from "../src/lib/atalhos-usuario.ts";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const grupo = (id, n, url = "/epi") => ({ id, titulo: id, prioridade: "alta", vazio: "", itens: Array.from({ length: n }, (_, i) => ({ chave: `${id}-${i}`, texto: "x", detalhe: "", acao: { rotulo: "a", url, search: { aba: "compras" } } })) });

test("alertas por cartão: soma os grupos do cartão e dá 0 (Tudo em dia) quando nada pende", () => {
  const mapa = alertasDosCartoes([grupo("epi-vencido", 2), grupo("minimo-epi", 1), grupo("epi-com-desligado", 0), grupo("minimo-uniforme", 0)], null);
  assert.equal(mapa.get("EPIs").total, 3);
  assert.deepEqual(mapa.get("EPIs").linhas.map((l) => l.chave), ["epi-vencido", "minimo-epi"]);
  assert.equal(mapa.get("Uniformes").total, 0);
  assert.deepEqual(mapa.get("Uniformes").linhas, []);
});

test("cartão sem dado lido fica fora do mapa (nada de Tudo em dia sem ter lido)", () => {
  const mapa = alertasDosCartoes([grupo("minimo-epi", 0)], null);
  assert.equal(mapa.has("Equipamentos"), false);
  assert.equal(mapa.has("Viagens"), false);
  assert.equal(mapa.has("Veículos"), false);
  assert.equal(alertasDosCartoes(null, null).size, 0);
});

test("ferramentas juntam estoque no mínimo e devolução atrasada; veículos usam a Frota", () => {
  const mapa = alertasDosCartoes([grupo("minimo-ferramenta", 1, "/ferramentas"), grupo("devolucao-atrasada", 2, "/ferramentas")], { checklistVencido: 1, manutencaoVencida: 0, ocorrenciasAbertas: 4 });
  assert.equal(mapa.get("Ferramentas").total, 3);
  assert.equal(mapa.get("Veículos").total, 5);
  assert.deepEqual(mapa.get("Veículos").linhas.map((l) => l.search.aba), ["checklist", "ocorrencias"]);
});

test("veículos: ocorrência aberta conta, encerrada e de veículo inativo não", () => {
  const base = { previsoes: [], checklists: [], planos: [], acoes: [], manutencoes: [], abastecimentos: [], hoje: "2026-11-17" };
  const r = resumoDeVeiculos({
    ...base,
    veiculos: [{ id: "a", status: "Ativo" }, { id: "b", status: "Inativo" }],
    ocorrencias: [
      { veiculoId: "a", status: "Aberta", ocorridoEm: "2026-11-10" },
      { veiculoId: "a", status: "Encerrada", ocorridoEm: "2026-11-01" },
      { veiculoId: "b", status: "Aberta", ocorridoEm: "2026-11-10" },
    ],
  });
  assert.deepEqual(r, { checklistVencido: 0, manutencaoVencida: 0, ocorrenciasAbertas: 1 });
});

test("mais usados: conta por atalho, só do cartão, os 3 maiores; sem armazenamento não quebra", () => {
  const dados = new Map();
  globalThis.localStorage = { getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => dados.set(k, v) };
  try {
    const a = (titulo, cartao = "EPIs") => ({ titulo, cartao, secao: "Módulo", url: "/epi", search: { aba: titulo } });
    for (const [t, n] of [["A", 1], ["B", 5], ["C", 3], ["D", 2]]) for (let i = 0; i < n; i++) registrarUso("u1", a(t), 1000 + i);
    registrarUso("u1", a("Z", "Veículos"));
    assert.deepEqual(maisUsados("u1", "EPIs").map((x) => x.titulo), ["B", "C", "D"]);
    assert.deepEqual(maisUsados("u1", "Veículos").map((x) => x.titulo), ["Z"]);
    assert.deepEqual(maisUsados("outro", "EPIs"), []);
  } finally {
    delete globalThis.localStorage;
  }
  assert.deepEqual(maisUsados("u1", "EPIs"), []);
});

test("a tela inicial troca 'N atalhos' pelo alerta do cartão, com Tudo em dia e os mais usados", () => {
  const inicio = ler("routes/_authenticated/inicio.tsx");
  assert.doesNotMatch(inicio, /c\.itens\.length\} atalhos/);
  assert.match(inicio, /Tudo em dia/);
  assert.match(inicio, /<IndicadorDoCartao alerta=\{pendencias\.alertas\.get\(c\.titulo\)\}/);
  assert.match(inicio, /<MaisUsadosDoCartao/);
  assert.match(inicio, /<AtencaoHoje pendencias=\{pendencias\} \/>/);
  assert.doesNotMatch(ler("components/inicio/AtencaoHoje.tsx"), /useEmpregados|useItens/, "a leitura é de usePendencias");
});

test("o mapa de usos tem teto e dado guardado malformado é ignorado", () => {
  const dados = new Map();
  globalThis.localStorage = { getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => dados.set(k, v) };
  try {
    for (let i = 0; i < 80; i++) registrarUso("u2", { titulo: `T${i}`, cartao: "EPIs", secao: "Módulo", url: "/epi", search: { id: String(i) } }, i);
    assert.ok(Object.keys(JSON.parse(dados.get("gemape-inicio-uso:u2"))).length <= 60);
    dados.set("gemape-inicio-uso:u3", JSON.stringify({ a: { atalho: null, vezes: 1 }, b: { atalho: "x", vezes: 1 }, c: { atalho: { titulo: "ok", cartao: "EPIs", url: "/epi", search: "ruim" }, vezes: 1 } }));
    assert.deepEqual(maisUsados("u3", "EPIs"), []);
  } finally {
    delete globalThis.localStorage;
  }
});

test("só os cartões com fonte de alerta esperam por ela; os outros seguem com 'N atalhos'", () => {
  assert.equal(cartaoTemAlerta("EPIs"), true);
  assert.equal(cartaoTemAlerta("Veículos"), true);
  assert.equal(cartaoTemAlerta("Gerais"), false);
  assert.match(ler("routes/_authenticated/inicio.tsx"), /\{atalhos\} atalhos/);
});
