import test from "node:test";
import assert from "node:assert/strict";

// Os termos são impressos no fuso do Brasil: a data não pode cair no dia anterior.
process.env.TZ = "America/Sao_Paulo";
const { montarTermoEntregaEpiHtml } = await import("../src/lib/termo-entrega-epi-html.ts");
const { montarFichaEpiAvulsaHtml } = await import("../src/lib/ficha-epi-avulsa-html.ts");
const { montarTermoEntregaUniformeHtml } =
  await import("../src/lib/termo-entrega-uniforme-html.ts");

const perigoso = "<img src=x onerror=alert(1)>";
const escapado = "&lt;img src=x onerror=alert(1)&gt;";
const empresa = {
  razao_social: `GEMAPE ${perigoso}`,
  cnpj: perigoso,
  nome_fantasia: `Fantasia ${perigoso}`,
};
const empregado = { nome: `Ana ${perigoso}`, cpf: perigoso, matricula: perigoso };

test("o Termo de Entrega de EPI escapa todos os textos informados", () => {
  const html = montarTermoEntregaEpiHtml({
    empresa,
    empregado,
    data: "2026-09-30",
    linhas: [{ nome: `Luva ${perigoso}`, ca: perigoso, quantidade: 2, estado: perigoso }],
  });
  assert.equal(html.includes("<img"), false);
  assert.ok(html.includes(`GEMAPE ${escapado}`));
  assert.ok(html.includes(`Ana ${escapado}`));
  assert.ok(html.includes(`Luva ${escapado}`));
  assert.ok(html.includes(`Fantasia ${escapado}`));
});

test("o Termo de Entrega de EPI imprime a data sem cair no dia anterior", () => {
  const html = montarTermoEntregaEpiHtml({
    empresa,
    empregado,
    data: "2026-09-30",
    linhas: [],
  });
  assert.ok(html.includes("30 de setembro de 2026"), "data impressa errada");
});

test("o Termo de Entrega de EPI formata CNPJ numérico sem perder escape", () => {
  const html = montarTermoEntregaEpiHtml({
    empresa: { razao_social: perigoso, nome_fantasia: "GEMAPE", cnpj: "12345678000190" },
    empregado: { nome: "Ana", cpf: "52998224725" },
    data: "2026-09-30",
    linhas: [],
  });
  assert.match(html, /12\.345\.678\/0001-90/);
  assert.equal(html.includes("<img"), false);
});

test("o Termo de Entrega de EPI não mostra undefined em campos vazios", () => {
  const html = montarTermoEntregaEpiHtml({
    empresa: { razao_social: "GEMAPE", cnpj: null, nome_fantasia: null },
    empregado: { nome: "Ana", cpf: null, matricula: null },
    data: "2026-09-30",
    linhas: [{ nome: null, ca: null, quantidade: 1, estado: "Novo" }],
  });
  assert.equal(html.includes("undefined"), false);
  assert.equal(html.includes("null"), false);
  assert.ok(html.includes("—"));
});

test("a Ficha de EPI Avulsa escapa todos os textos informados", () => {
  const html = montarFichaEpiAvulsaHtml({
    empresa,
    empregado: { ...empregado, data_admissao: "2026-01-02" },
    linhas: [
      { data: "2026-09-30", quantidade: 1, nome: `Luva ${perigoso}`, ca: perigoso, tipo: "Saida" },
    ],
  });
  assert.equal(html.includes("<img"), false);
  assert.ok(html.includes(`GEMAPE ${escapado}`));
  assert.ok(html.includes(`Ana ${escapado}`));
  assert.ok(html.includes(`Luva ${escapado}`));
  assert.ok(html.includes("30/09/2026"));
  assert.ok(html.includes("02/01/2026"));
  assert.ok(html.includes("ENTREGA"));
});

test("a Ficha de EPI Avulsa não mostra undefined em campos vazios", () => {
  const html = montarFichaEpiAvulsaHtml({
    empresa: { razao_social: "GEMAPE", cnpj: null },
    empregado: { nome: "Ana", cpf: null, matricula: null, data_admissao: null },
    linhas: [{ data: "2026-09-30", quantidade: 1, nome: null, ca: null, tipo: "Devolucao" }],
  });
  assert.equal(html.includes("undefined"), false);
  assert.equal(html.includes("null"), false);
  assert.ok(html.includes("DEVOLUÇÃO"));
});

test("o Termo de Entrega de Uniforme escapa empresa e empregado", () => {
  const html = montarTermoEntregaUniformeHtml({
    empresa,
    empregado,
    data: "2026-09-30",
    linhas: [
      {
        nome: `Camisa ${perigoso}`,
        marca: perigoso,
        modelo: perigoso,
        quantidade: 1,
        estado: "Novo",
      },
    ],
  });
  assert.equal(html.includes("<img"), false);
  assert.ok(html.includes(`GEMAPE ${escapado}`));
  assert.ok(html.includes(`Ana ${escapado}`));
  assert.ok(html.includes(`Fantasia ${escapado}`));
  assert.ok(html.includes(`Camisa ${escapado}`));
  assert.ok(html.includes("30/09/2026"));
});

test("o Termo de Entrega de Uniforme não mostra undefined em campos vazios", () => {
  const html = montarTermoEntregaUniformeHtml({
    empresa: undefined,
    empregado: undefined,
    data: "2026-09-30",
    linhas: [{ nome: null, marca: null, modelo: null, quantidade: 1, estado: "Novo" }],
  });
  assert.equal(html.includes("undefined"), false);
  assert.equal(html.includes("null"), false);
});

test("o Termo de Entrega de EPI mantém a declaração de recebimento e as divs equilibradas", () => {
  const html = montarTermoEntregaEpiHtml({ empresa, empregado, data: "2026-09-30", linhas: [] });
  assert.ok(html.includes("Declaro ter recebido da empresa"), "declaração removida do termo");
  assert.equal((html.match(/<div\b/g) ?? []).length, (html.match(/<\/div>/g) ?? []).length, "divs desequilibradas");
});
