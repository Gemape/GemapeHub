import test from "node:test";
import assert from "node:assert/strict";

import { responderConsulta, somarDias } from "../src/lib/consulta-rapida.ts";

const ctx = {
  hoje: "2026-11-12",
  ferramentas: [{ id: "f1", nome: "Furadeira de impacto 04", codigo_sku: "FER-004" }, { id: "f2", nome: "Furadeira de impacto 05" }],
  movimentosFerramenta: [
    { item_id: "f1", empregado_id: "e1", tipo_movimentacao: "Saida", quantidade: 1, data_movimentacao: "2026-11-01" },
    { item_id: "f2", empregado_id: "e1", tipo_movimentacao: "Saida", quantidade: 1, data_movimentacao: "2026-11-01" },
    { item_id: "f2", empregado_id: "e1", tipo_movimentacao: "Devolucao", quantidade: 1, data_movimentacao: "2026-11-02" },
  ],
  epis: [{ id: "a", nome: "Botina", ca_validade: "2026-11-15" }, { id: "b", nome: "Luva", ca_validade: "2026-10-01" }, { id: "c", nome: "Capacete", ca_validade: "2027-12-01" }],
  uniformes: [],
  empregados: [{ id: "e1", nome: "Maria Souza" }],
};

test("somar dias não depende do fuso e vira o mês", () => {
  assert.equal(somarDias("2026-11-28", 7), "2026-12-05");
  assert.equal(somarDias("2026-01-01", -1), "2025-12-31");
});

test("“quem está com a furadeira 04” acha o item pelo nome e diz quem está com ele", () => {
  const r = responderConsulta("Quem está com a furadeira 04?", ctx);
  assert.match(r.texto, /Furadeira de impacto 04 \(FER-004\): Maria Souza/);
  assert.doesNotMatch(r.texto, /05/);
  assert.equal(r.links[0].url, "/ferramentas");
});

test("ferramenta devolvida aparece como no estoque, e nome inexistente avisa", () => {
  assert.match(responderConsulta("quem está com a furadeira 05", ctx).texto, /ninguém, está no estoque/);
  assert.match(responderConsulta("quem está com a serra", ctx).texto, /Não encontrei/);
});

test("“EPIs que vencem essa semana” traz os vencidos e os dos próximos 7 dias, e deixa de fora os de longe", () => {
  const r = responderConsulta("Quais EPIs vencem essa semana?", ctx);
  assert.match(r.texto, /Botina/);
  assert.match(r.texto, /Luva/);
  assert.doesNotMatch(r.texto, /Capacete/);
  assert.equal(r.links[0].url, "/epi");
});

test("pergunta fora do que entende devolve null (a tela cai na busca de telas)", () => {
  assert.equal(responderConsulta("bom dia", ctx), null);
  assert.equal(responderConsulta("   ", ctx), null);
});

test("busca por prefixo/plural e períodos como “15 dias” e “amanhã” são entendidos", () => {
  assert.match(responderConsulta("quem está com a furad 04", ctx).texto, /Maria Souza/);
  assert.match(responderConsulta("quem está com as furadeiras 04", ctx).texto, /Maria Souza/);
  assert.match(responderConsulta("EPIs que vencem em 15 dias", ctx).texto, /próximos 15 dias/);
  assert.match(responderConsulta("EPIs que vencem amanhã", ctx).texto, /Luva/);
});
