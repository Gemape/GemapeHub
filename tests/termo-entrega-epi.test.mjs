import test from "node:test";
import assert from "node:assert/strict";

// A entrega é registrada no fuso do Brasil: no fim da noite, o UTC já é o dia seguinte.
process.env.TZ = "America/Sao_Paulo";
const { observacaoEntregaEpi } = await import("../src/lib/termo-entrega-epi-html.ts");

test("a observação da entrega de EPI usa a data local, não a de UTC", () => {
  const agora = new Date("2026-09-30T23:30:00-03:00");
  assert.equal(observacaoEntregaEpi(agora), "Entrega de EPI - Termo Gerado em 30/09/2026");
});

test("a observação da entrega de EPI usa o dia corrente pela manhã", () => {
  const agora = new Date("2026-10-01T00:10:00-03:00");
  assert.equal(observacaoEntregaEpi(agora), "Entrega de EPI - Termo Gerado em 01/10/2026");
});
