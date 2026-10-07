import test from "node:test";
import assert from "node:assert/strict";

process.env.TZ = "America/Sao_Paulo";
const { montarManutencaoHtml } = await import("../src/lib/manutencao-relatorio-html.ts");

const perigoso = "<img src=x onerror=alert(1)>";
const escapado = "&lt;img src=x onerror=alert(1)&gt;";
const item = (id, nome, observacao = "") => ({ subitemId: id, nome, observacao });
const manut = {
  id: "m1", veiculoId: "v1", data: "2026-10-07", km: 50000, tipo: "Preventiva", acaoId: "a1", descricao: "",
  itens: [], local: "terceiro", localNome: "Oficina do Zé", custoPecas: 2500, custoMaoDeObra: 500, custoTotal: 3000,
  criadoEm: "2026-10-07T13:00:00Z",
  grupos: [
    { acaoId: "a1", nome: "Freios", itens: [item("s1", "Pastilhas traseiras", "trocadas"), item("s2", "Disco")] },
    { acaoId: "a2", nome: "Motor", itens: [item("s3", "Troca de óleo")] },
  ],
};
const ctx = { empresa: "GEMAPE", veiculo: "ABC-1250 · Fiat · Strada", nomeGrupo: () => undefined };

test("o relatório separa os serviços por grupo, com as ações e observações de cada um", () => {
  const html = montarManutencaoHtml(manut, ctx);
  const freios = html.indexOf("Freios");
  const motor = html.indexOf("Motor");
  assert.ok(freios > 0 && motor > freios);
  assert.ok(html.indexOf("Pastilhas traseiras") > freios && html.indexOf("Pastilhas traseiras") < motor);
  assert.ok(html.indexOf("Troca de óleo") > motor);
  assert.ok(html.includes("trocadas"));
  assert.ok(html.includes("2 grupos de serviço"));
});

test("o relatório mostra data de Brasília, km, local e custos em reais", () => {
  const html = montarManutencaoHtml(manut, ctx);
  assert.ok(html.includes("07/10/2026"));
  assert.ok(html.includes("50.000"));
  assert.ok(html.includes("Terceiro: Oficina do Zé"));
  assert.ok(html.includes("R$ 2.500,00") && html.includes("R$ 500,00") && html.includes("R$ 3.000,00"));
});

test("a corretiva mostra o problema; a preventiva não", () => {
  const cor = montarManutencaoHtml({ ...manut, tipo: "Corretiva", descricao: "Barulho no freio" }, ctx);
  assert.ok(cor.includes("Corretiva") && cor.includes("Barulho no freio"));
  assert.equal(montarManutencaoHtml(manut, ctx).includes("Problema relatado"), false);
});

test("o relatório escapa todos os textos informados", () => {
  const html = montarManutencaoHtml(
    { ...manut, localNome: perigoso, descricao: perigoso, tipo: "Corretiva", grupos: [{ acaoId: "a1", nome: perigoso, itens: [item("s1", perigoso, perigoso)] }] },
    { ...ctx, empresa: perigoso, veiculo: perigoso },
  );
  assert.equal(html.includes("<img"), false);
  assert.ok(html.includes(escapado));
});

test("registro antigo (um grupo, sem custos) e grupo apagado de Parâmetros saem sem quebrar", () => {
  const antigo = { id: "x", veiculoId: "v1", data: "2026-01-01", km: 10, tipo: "Preventiva", acaoId: "a1", descricao: "", itens: [item("s1", "Pastilha")], criadoEm: "" };
  const html = montarManutencaoHtml(antigo, { ...ctx, nomeGrupo: () => "Freios" });
  assert.ok(html.includes("Freios") && html.includes("Pastilha"));
  assert.ok(html.includes("1 grupo de serviço"));
  const apagado = montarManutencaoHtml(manut, ctx);
  assert.ok(apagado.includes("Freios")); // vale o nome guardado
});
