import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { ABAS_EPI, ABAS_EPI_RELATORIOS, abaDoModulo, tituloDaAba } from "../src/lib/menu-parametros.ts";

const le = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");

test("EPI > Relatórios traz cópias de Sugestão de Compras, Histórico do empregado e Baixar Definitivas", () => {
  assert.deepEqual(ABAS_EPI_RELATORIOS.map((a) => a.titulo), ["Sugestão de Compras", "Histórico do empregado", "Baixar Definitivas"]);
  assert.equal(new Set(ABAS_EPI_RELATORIOS.map((a) => a.aba)).size, 3);
});

test("as três rotinas continuam na lista principal do EPI (clonar, não mover)", () => {
  const abas = ABAS_EPI.map((a) => a.aba);
  for (const a of ["sugestao-compras", "historico", "baixas"]) assert.ok(abas.includes(a), a);
  for (const r of ABAS_EPI_RELATORIOS) assert.ok(!abas.includes(r.aba), `${r.aba} não pode repetir a aba da lista principal`);
});

test("cada cópia usa o mesmo ícone da rotina original e abre uma aba válida do EPI", () => {
  const original = { "relatorio-sugestao-compras": "sugestao-compras", "relatorio-historico": "historico", "relatorio-baixas": "baixas" };
  for (const r of ABAS_EPI_RELATORIOS) {
    const o = ABAS_EPI.find((a) => a.aba === original[r.aba]);
    assert.equal(r.icone, o.icone, r.aba);
    assert.equal(r.titulo, o.titulo, r.aba);
    assert.equal(abaDoModulo("epi", r.aba), r.aba);
    assert.equal(tituloDaAba("epi", r.aba), o.titulo);
  }
});

test("a página do módulo mostra a mesma tela nas cópias", () => {
  const p = le("components/modules/PaginaModulo.tsx");
  for (const [aba, tela] of [["relatorio-sugestao-compras", "SugestaoComprasEpi aba=\"relatorio-sugestao-compras\""], ["relatorio-historico", "EpiRelatorioFuncionario"], ["relatorio-baixas", "EpiRelatorioBaixa"]]) {
    assert.match(p, new RegExp(`value="${aba}"[^>]*>\\s*<${tela} />`), aba);
  }
});

test("o cartão EPIs do menu do topo e da tela Início traz a seção Relatórios entre Módulo e Parâmetros", async () => {
  const { GRUPOS_INICIO, areaDaRota } = await import("../src/lib/inicio.ts");
  const epi = GRUPOS_INICIO.flatMap((g) => g.cartoes).find((c) => c.titulo === "EPIs");
  const rel = epi.itens.filter((i) => i.secao === "Relatórios");
  assert.deepEqual(rel.map((i) => i.titulo), ["Sugestão de Compras", "Histórico do empregado", "Baixar Definitivas"]);
  assert.deepEqual(rel.map((i) => i.search.aba), ["relatorio-sugestao-compras", "relatorio-historico", "relatorio-baixas"]);
  // As três rotinas continuam também na seção Módulo.
  const modulo = epi.itens.filter((i) => i.secao === "Módulo").map((i) => i.titulo);
  for (const t of ["Sugestão de Compras", "Histórico do empregado", "Baixar Definitivas"]) assert.ok(modulo.includes(t), t);
  // Cada cópia é a tela atual da sua aba, e a da lista principal continua a dela.
  const a = areaDaRota("/epi", { aba: "relatorio-historico" }, true);
  assert.equal(a.atual.secao, "Relatórios");
  assert.equal(areaDaRota("/epi", { aba: "historico" }, true).atual.secao, "Módulo");
  for (const f of ["components/layout/MenuDaArea.tsx", "routes/_authenticated/inicio.tsx"]) assert.match(le(f), /\["Módulo", "Relatórios", "Parâmetros"\]/, f);
});

test("vai e volta: o link dos Parâmetros Específicos volta para a aba de onde a pessoa saiu, na lista principal ou em Relatórios", () => {
  const sugestao = le("components/modules/SugestaoComprasEpi.tsx");
  assert.match(sugestao, /voltar: aba/);
  assert.match(sugestao, /aba = "sugestao-compras"/);
  assert.match(le("components/modules/PaginaModulo.tsx"), /<SugestaoComprasEpi aba="relatorio-sugestao-compras" \/>/);
  const rota = le("routes/_authenticated/cadastros/gerais/categorias.tsx");
  assert.match(rota, /search\["voltar"\] === "relatorio-sugestao-compras"/);
  assert.match(rota, /abaDeVolta: voltar/);
  const parametros = le("components/parametros/ParametrosEpi.tsx");
  assert.match(parametros, /search: \{ aba: abaDeVolta \}/);
  assert.match(parametros, /if \(voltarParaSugestao\) voltar\(\)/);
});
