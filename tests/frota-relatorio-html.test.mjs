import test from "node:test";
import assert from "node:assert/strict";

process.env.TZ = "America/Sao_Paulo";
const { montarFrotaHtml } = await import("../src/lib/frota-relatorio-html.ts");

const perigoso = "<img src=x onerror=alert(1)>";
const escapado = "&lt;img src=x onerror=alert(1)&gt;";

test("o relatório da Frota escapa todos os textos informados", () => {
  const html = montarFrotaHtml({
    empresa: `GEMAPE ${perigoso}`,
    geradoEm: "2026-10-07T13:00:00Z",
    busca: perigoso,
    linhas: [{ veiculo: `GEM-2026 ${perigoso}`, responsavel: `Ana ${perigoso}`, situacao: "Ativo", km: 25000, preventivas: null, ocorrencias: null, checklist: null }],
  });
  assert.equal(html.includes("<img"), false);
  assert.ok(html.includes(`GEMAPE ${escapado}`));
  assert.ok(html.includes(`GEM-2026 ${escapado}`));
  assert.ok(html.includes(`Ana ${escapado}`));
  assert.ok(html.includes(`Busca: ${escapado}`));
});

test("o relatório da Frota mostra totais por situação, km formatado e data de Brasília", () => {
  const html = montarFrotaHtml({
    empresa: "GEMAPE",
    // 01:30 UTC de 08/10 ainda é 22:30 de 07/10 em Brasília.
    geradoEm: "2026-10-08T01:30:00Z",
    busca: "",
    linhas: [
      { veiculo: "A", responsavel: "", situacao: "Ativo", km: 25000, preventivas: { situacao: "vencida", quantidade: 2 }, ocorrencias: { situacao: "proximo", quantidade: 1 }, checklist: { situacao: "em_dia", quantidade: 0 } },
      { veiculo: "B", responsavel: "João", situacao: "Em manutenção", km: 100, preventivas: null, ocorrencias: null, checklist: null },
      { veiculo: "C", responsavel: "", situacao: "Inativo", km: 0, preventivas: null, ocorrencias: null, checklist: null },
    ],
  });
  assert.ok(html.includes("07/10/2026 22:30"));
  assert.ok(html.includes("25.000"));
  assert.ok(html.includes("3 veículo(s)"));
  assert.ok(html.includes("1 ativo(s)") && html.includes("1 em manutenção") && html.includes("1 inativo(s)"));
  assert.ok(html.includes("Vencida (2)"));
  assert.ok(html.includes("Vencimento próximo (1)"));
  assert.ok(html.includes("Em dia"));
  assert.ok(html.includes("<th>Check list</th>"));
  assert.equal(html.includes("<strong>Busca:"), false);
});

test("o relatório da Frota sem veículos avisa que não há nada a listar", () => {
  const html = montarFrotaHtml({ empresa: "GEMAPE", geradoEm: "2026-10-07T13:00:00Z", busca: "", linhas: [] });
  assert.ok(html.includes("Nenhum veículo"));
  assert.ok(html.includes("0 veículo(s)"));
});
