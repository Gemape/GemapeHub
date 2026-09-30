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

const { validarSaidaDeEpis } = await import("../src/lib/termos-atomicos.ts");
const epis = [{ id: "capacete", nome: "Capacete", estoque_atual: 2 }];

test("a entrega de EPI exige EPI escolhido e quantidade inteira em cada linha", () => {
  assert.match(validarSaidaDeEpis([], epis), /pelo menos um EPI/);
  assert.match(validarSaidaDeEpis([{ item_id: "", quantidade: 1 }], epis), /Selecione o EPI/);
  assert.match(validarSaidaDeEpis([{ item_id: "capacete", quantidade: 0 }], epis), /quantidade/i);
});

test("a entrega de EPI não passa do estoque disponível", () => {
  assert.equal(validarSaidaDeEpis([{ item_id: "capacete", quantidade: 2 }], epis), null);
  assert.equal(
    validarSaidaDeEpis(
      [
        { item_id: "capacete", quantidade: 2 },
        { item_id: "capacete", quantidade: 1 },
      ],
      epis,
    ),
    "A entrega de 3 unidade(s) de Capacete passa do estoque disponível (2).",
  );
});
