import test from "node:test";
import assert from "node:assert/strict";

// Os termos são impressos no fuso do Brasil: a data não pode cair no dia anterior.
process.env.TZ = "America/Sao_Paulo";
const { montarTermoBaixaUniformeHtml } = await import("../src/lib/termo-baixa-uniforme-html.ts");
const { montarTermoVistoriaHtml } = await import("../src/lib/termo-vistoria-html.ts");

const perigoso = "<img src=x onerror=alert(1)>";
const escapado = "&lt;img src=x onerror=alert(1)&gt;";

test("o Termo de Baixa de Uniforme escapa todos os textos informados", () => {
  const html = montarTermoBaixaUniformeHtml({
    empresa: { razao_social: `GEMAPE ${perigoso}`, cnpj: perigoso, nome_fantasia: perigoso },
    empregado: { nome: `Ana ${perigoso}` },
    data: "2026-09-30",
    motivo: perigoso,
    onus: perigoso,
    linhas: [{ nome: `Camisa ${perigoso}`, quantidade: 2, estado: perigoso }],
  });
  assert.equal(html.includes("<img"), false);
  assert.ok(html.includes(`GEMAPE ${escapado}`));
  assert.ok(html.includes(`Ana ${escapado}`));
  assert.ok(html.includes(`Camisa ${escapado}`));
  assert.ok(html.includes("30/09/2026"));
});

test("o Termo de Baixa de Uniforme sem empregado mostra N/A e a linha de assinatura", () => {
  const html = montarTermoBaixaUniformeHtml({
    empresa: { razao_social: "GEMAPE", cnpj: "1", nome_fantasia: "GEMAPE" },
    empregado: undefined,
    data: "2026-09-30",
    motivo: "Quebra",
    onus: "Da Empresa",
    linhas: [{ nome: "Camisa", quantidade: 1, estado: "Usado" }],
  });
  assert.ok(html.includes("<strong>N/A</strong>"));
  assert.ok(html.includes("___________________"));
  assert.equal(html.includes("undefined"), false);
});

const vistoria = {
  empresa: { razao_social: `GEMAPE ${perigoso}`, cnpj: perigoso },
  caixa: { codigo: `CX-01 ${perigoso}`, nome: perigoso },
  responsavel: `Ana ${perigoso}`,
  data: "2026-09-30",
  linhas: [
    {
      codigo: "FER-0001",
      nome: `Furadeira ${perigoso}`,
      conformidade: "Não Conforme",
      estado: perigoso,
      observacao: `Cabo solto ${perigoso}`,
    },
  ],
};

test("o Termo de Vistoria escapa todos os textos, inclusive a observação digitada", () => {
  const html = montarTermoVistoriaHtml(vistoria);
  assert.equal(html.includes("<img"), false);
  assert.ok(html.includes(`Cabo solto ${escapado}`));
  assert.ok(html.includes(`Furadeira ${escapado}`));
  assert.ok(html.includes(`CX-01 ${escapado}`));
  assert.ok(html.includes(`Ana ${escapado}`));
  assert.ok(html.includes("FER-0001"));
});

test("o Termo de Vistoria imprime a data da vistoria, sem cair no dia anterior", () => {
  assert.ok(
    montarTermoVistoriaHtml(vistoria).includes("30 de setembro de 2026"),
    "data impressa errada",
  );
});

test("o Termo de Vistoria sem caixa nem responsável mantém os textos padrão", () => {
  const html = montarTermoVistoriaHtml({
    ...vistoria,
    caixa: undefined,
    responsavel: undefined,
    linhas: [
      { codigo: null, nome: null, conformidade: "Conforme", estado: "Usado", observacao: "" },
    ],
  });
  assert.ok(html.includes("N/A"));
  assert.ok(html.includes("NÃO ATRIBUÍDO"));
  assert.ok(html.includes("—"));
});
