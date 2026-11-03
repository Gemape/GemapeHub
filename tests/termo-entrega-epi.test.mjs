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

const { montarTermoEntregaEpiHtml: montarTermo } = await import("../src/lib/termo-entrega-epi-html.ts");
const baseTermo = { empresa: { razao_social: "Gemape Máquinas Ltda", cnpj: "1", nome_fantasia: "Gemape" }, empregado: { nome: "Ana Paula Souza", cpf: "1" }, data: "2026-10-01", linhas: [], textos: { termoDeclaracao: "d", termoCiencia: "c" } };

test("o termo sai com o nome completo de quem entrega e de quem recebe", () => {
  const html = montarTermo({ ...baseTermo, responsavel: { nome: "Carlos Eduardo Menezes" } });
  assert.match(html, /Entregue por:<\/strong> Carlos Eduardo Menezes/);
  assert.match(html, /Empregado:<\/strong> Ana Paula Souza/);
  // O nome de cada um aparece também sob a sua linha de assinatura.
  assert.match(html, /Assinatura do Empregado<br><strong>Ana Paula Souza<\/strong>/);
  assert.match(html, /Assinatura do Responsável<br><strong>Carlos Eduardo Menezes<\/strong>/);
});

test("o nome do responsável pela entrega é escapado", () => {
  const html = montarTermo({ ...baseTermo, responsavel: { nome: "<script>x</script> & Cia" } });
  assert.doesNotMatch(html, /<script>x/);
  assert.match(html, /&lt;script&gt;x&lt;\/script&gt; &amp; Cia/);
});

test("sem responsável informado (outras telas), o termo continua como antes, sem a linha Entregue por", () => {
  const html = montarTermo(baseTermo);
  assert.doesNotMatch(html, /Entregue por/);
  assert.match(html, /Assinatura do Responsável/);
});

test("a tela do Termo de Entrega pede o responsável, exige que seja outra pessoa e o leva ao termo", async () => {
  const { readFileSync } = await import("node:fs");
  const tela = readFileSync(new URL("../src/components/modules/EpiTermoEntrega.tsx", import.meta.url), "utf8");
  assert.match(tela, /Responsável pela entrega/);
  assert.match(tela, /Informe o responsável pela entrega/);
  assert.match(tela, /responsavel: \{ nome: responsavel\.nome \}/);
  assert.match(tela, /quem entrega não pode ser quem recebe/i);
});
