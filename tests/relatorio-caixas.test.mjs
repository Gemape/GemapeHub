import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { montarRelatorioCaixasHtml, SECOES_RELATORIO_CAIXAS } from "../src/lib/relatorio-caixas.ts";

const ferramenta = (extra = {}) => ({ codigo: "FER-0001", nome: "Alicate", marcaModelo: "Ferrotec / Universal", empresa: "Gemape", quantidade: 2, comEmpregado: 1, baixado: 0, disponivel: 1, estado: "Ativo", ...extra });
const caixas = [
  {
    codigo: "CX-0001", empresa: "Gemape", portador: "Ana",
    ferramentas: [ferramenta(), ferramenta({ codigo: "FER-0002", nome: "<b>Chave</b>", quantidade: 3, comEmpregado: 0, disponivel: 3 })],
    historico: [{ data: "01/11/2026", tipo: "Entrega", ferramenta: "FER-0001 Alicate", quantidade: 1, empregado: "Ana", observacao: "" }],
    ocorrencias: [{ data: "02/11/2026", hora: "09:30", ferramenta: "FER-0001 Alicate", empregado: "Ana", responsavel: "Bia", descricao: "Cabo quebrado" }],
  },
  { codigo: "CX-0002", empresa: "GMP", portador: "", ferramentas: [], historico: [], ocorrencias: [] },
];
const todas = SECOES_RELATORIO_CAIXAS.map((_, n) => n);

test("o relatório de caixas traz o resumo geral e as quatro seções, uma tabela por caixa", () => {
  const html = montarRelatorioCaixasHtml({ caixas, secoes: todas, empresa: "Todas as empresas" });
  assert.match(html, /Relatório de caixas de ferramentas/);
  assert.match(html, /2 caixas/);
  for (const t of ["Resumo das caixas", "Histórico de movimentações — CX-0001", "Histórico de movimentações — CX-0002", "Ocorrências — CX-0001", "Ocorrências — CX-0002", "CX-0001 — Gemape — Portador: Ana"]) assert.ok(html.includes(t), t);
  assert.match(html, /Caixa vazia\./);
  // Resumo: 5 na caixa (2 + 3), 1 com empregado, 4 disponíveis, 1 ocorrência.
  assert.match(html, /Ferramentas na caixa<\/span>\s*<span class="conteudo">5</);
  assert.match(html, /Com empregado<\/span>\s*<span class="conteudo">1</);
  assert.match(html, /Disponível<\/span>\s*<span class="conteudo">4</);
  assert.match(html, /Ocorrências<\/span>\s*<span class="conteudo">1</);
});

test("só as seções marcadas entram, e o texto informado é escapado", () => {
  const so = montarRelatorioCaixasHtml({ caixas, secoes: [1], empresa: "Gemape" });
  assert.ok(so.includes("CX-0001 — Gemape — Portador: Ana"));
  assert.ok(!so.includes("Resumo das caixas") && !so.includes("Histórico de movimentações —") && !so.includes("Ocorrências — CX"));
  assert.ok(so.includes("&lt;b&gt;Chave&lt;/b&gt;") && !so.includes("<b>Chave</b>"));
  const nenhuma = montarRelatorioCaixasHtml({ caixas, secoes: [], empresa: "Gemape" });
  assert.ok(!nenhuma.includes("<table"), "sem seção marcada não sai tabela");
});

test("Número da caixa tem o botão Relatório no alto, à direita, que abre a escolha das seções", () => {
  const modulo = readFileSync(new URL("../src/components/modules/FerramentasCaixasModulo.tsx", import.meta.url), "utf8");
  assert.match(modulo, /ml-auto[^>]*onClick=\{\(\) => setRelatorioAberto\(true\)\}>\s*Relatório\s*<\/Button>/);
  const dialogo = readFileSync(new URL("../src/components/modules/RelatorioCaixasDialog.tsx", import.meta.url), "utf8");
  assert.match(dialogo, /abrirDocumento\(/);
  assert.match(dialogo, /<Checkbox /);
  assert.match(dialogo, /aria-label="Caixas do relatório"/);
  assert.match(dialogo, /escolhidas\.map\(/);
});

test("com só algumas caixas o relatório não se diz de todas", () => {
  const parcial = montarRelatorioCaixasHtml({ caixas: [caixas[0]], secoes: [0], empresa: "Gemape", parcial: true });
  assert.match(parcial, /Caixas selecionadas/);
  assert.ok(!parcial.includes("Todas as caixas") && !parcial.includes("CX-0002"));
  assert.match(montarRelatorioCaixasHtml({ caixas, secoes: [0], empresa: "Gemape" }), /Todas as caixas/);
});
