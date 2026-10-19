import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

process.env.TZ = "America/Sao_Paulo";
const { montarManutencaoHtml } = await import("../src/lib/manutencao-relatorio-html.ts");

const manut = {
  id: "m1", veiculoId: "v1", data: "2026-10-07", km: 50000, tipo: "Preventiva", acaoId: "a1", descricao: "",
  itens: [], local: "terceiro", localNome: "Oficina do Zé", custoPecas: 2500, custoMaoDeObra: 500, custoTotal: 3000,
  criadoEm: "2026-10-07T13:00:00Z",
  grupos: [{ acaoId: "a1", nome: "Freios", itens: [{ subitemId: "s1", nome: "Pastilhas", observacao: "" }] }],
};
const ctx = { empresa: "GEMAPE", veiculo: "ABC-1250 · Fiat · Strada", nomeGrupo: () => undefined };

test("o relatório de manutenção mostra a logomarca no topo, antes do título", () => {
  const html = montarManutencaoHtml(manut, { ...ctx, logoUrl: "http://x/logo.png" });
  assert.match(html, /<img class="logo" src="http:\/\/x\/logo\.png" alt="Logomarca"/);
  const topo = html.indexOf('class="topo"');
  const logo = html.indexOf('class="logo"');
  const titulo = html.indexOf("Relatório de manutenção</div>");
  assert.ok(topo > 0 && logo > topo && titulo > logo, "logo dentro do topo e antes do título");
});

test("a logo tem tamanho limitado e imprime junto com o relatório", () => {
  const html = montarManutencaoHtml(manut, { ...ctx, logoUrl: "http://x/logo.png" });
  assert.match(html, /\.logo \{[^}]*max-width: 46mm[^}]*max-height: 26mm[^}]*\}/);
});

test("o endereço da logo é escapado", () => {
  const html = montarManutencaoHtml(manut, { ...ctx, logoUrl: 'http://x/"><script>alert(1)</script>.png' });
  assert.doesNotMatch(html, /<script>alert\(1\)/);
  assert.match(html, /&lt;script&gt;/);
});

test("sem logoUrl o relatório sai como antes, sem imagem", () => {
  const html = montarManutencaoHtml(manut, ctx);
  assert.doesNotMatch(html, /<img /);
  assert.match(html, /Relatório de manutenção/);
});

test("a tela de Manutenção passa a mesma logomarca do relatório de Viagens", () => {
  const modulo = readFileSync(new URL("../src/components/modules/ManutencaoVeiculoModulo.tsx", import.meta.url), "utf8");
  assert.match(modulo, /logoUrl: `\$\{window\.location\.origin\}\$\{import\.meta\.env\["BASE_URL"\] \?\? "\/"\}logo-relatorio-viagens\.png`/);
});
