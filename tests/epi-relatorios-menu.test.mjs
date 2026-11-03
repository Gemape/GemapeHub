import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { ABAS_EPI, ABAS_EPI_RELATORIOS, abaDoModulo, tituloDaAba } from "../src/lib/menu-parametros.ts";

const le = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");

test("EPI > Relatórios traz Sugestão de Compras, Histórico do empregado e Baixar Definitivas (decisão 359)", () => {
  assert.deepEqual(ABAS_EPI_RELATORIOS.map((a) => a.titulo), ["Sugestão de Compras", "Histórico do empregado", "Baixar Definitivas"]);
});

test("as três rotinas foram movidas: saem da lista do Módulo e não se repetem", () => {
  const modulo = ABAS_EPI.map((a) => a.aba);
  for (const a of ["sugestao-compras", "historico", "baixas"]) assert.ok(!modulo.includes(a), `${a} não pode mais estar no Módulo`);
  const titulos = ABAS_EPI.map((a) => a.titulo);
  for (const t of ["Sugestão de Compras", "Histórico do empregado", "Baixar Definitivas"]) assert.ok(!titulos.includes(t), t);
  assert.equal(new Set([...modulo, ...ABAS_EPI_RELATORIOS.map((a) => a.aba)]).size, modulo.length + 3);
});

test("os endereços de sempre continuam abrindo as mesmas telas, agora pela seção Relatórios", () => {
  for (const a of ["sugestao-compras", "historico", "baixas"]) {
    assert.equal(abaDoModulo("epi", a), a);
  }
  assert.equal(tituloDaAba("epi", "historico"), "Histórico do empregado");
  const p = le("components/modules/PaginaModulo.tsx");
  for (const [aba, tela] of [["sugestao-compras", "SugestaoComprasEpi"], ["historico", "EpiRelatorioFuncionario"], ["baixas", "EpiRelatorioBaixa"]]) {
    assert.match(p, new RegExp(`value="${aba}"[^>]*>\\s*<${tela} />`), aba);
  }
  assert.doesNotMatch(p, /relatorio-(sugestao|historico|baixas)/, "não sobra aba de cópia");
});

test("o cartão EPIs do menu do topo e da tela Início traz a seção Relatórios entre Módulo e Parâmetros, sem repetir no Módulo", async () => {
  const { GRUPOS_INICIO, areaDaRota } = await import("../src/lib/inicio.ts");
  const epi = GRUPOS_INICIO.flatMap((g) => g.cartoes).find((c) => c.titulo === "EPIs");
  const rel = epi.itens.filter((i) => i.secao === "Relatórios");
  assert.deepEqual(rel.map((i) => i.titulo), ["Sugestão de Compras", "Histórico do empregado", "Baixar Definitivas"]);
  assert.deepEqual(rel.map((i) => i.search.aba), ["sugestao-compras", "historico", "baixas"]);
  const modulo = epi.itens.filter((i) => i.secao === "Módulo").map((i) => i.titulo);
  for (const t of ["Sugestão de Compras", "Histórico do empregado", "Baixar Definitivas"]) assert.ok(!modulo.includes(t), t);
  assert.equal(areaDaRota("/epi", { aba: "historico" }, true).atual.secao, "Relatórios");
  assert.equal(areaDaRota("/epi", { aba: "entrega" }, true).atual.secao, "Módulo");
  for (const f of ["components/layout/MenuDaArea.tsx", "routes/_authenticated/inicio.tsx"]) assert.match(le(f), /\["Módulo", "Relatórios", "Parâmetros"\]/, f);
});

test("o vai e volta dos Parâmetros Específicos continua levando à Sugestão de Compras, agora em Relatórios", () => {
  assert.match(le("components/modules/SugestaoComprasEpi.tsx"), /voltar: "sugestao-compras"/);
  assert.match(le("components/parametros/ParametrosEpi.tsx"), /search: \{ aba: "sugestao-compras" \}/);
});
