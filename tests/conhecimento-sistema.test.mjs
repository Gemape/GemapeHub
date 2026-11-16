import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import test from "node:test";

import { CONHECIMENTO, responderSobreSistema } from "../src/lib/conhecimento-sistema.ts";
import { responderConsulta } from "../src/lib/consulta-rapida.ts";

const ctx = { hoje: "2026-11-16", ferramentas: [], movimentosFerramenta: [], epis: [], uniformes: [], empregados: [] };
const id = (p) => CONHECIMENTO.find((v) => v.resposta === responderSobreSistema(p)?.texto)?.id;

test("conhecimento: perguntas sobre o funcionamento caem no verbete certo", () => {
  assert.equal(id("como entregar EPI para um empregado?"), "epi-entrega");
  assert.equal(id("como dar entrada de nota fiscal no estoque?"), "epi-estoque");
  assert.equal(id("o que é estoque mínimo"), "estoque-minimo");
  assert.equal(id("como cadastrar uma ferramenta"), "ferramentas-cadastro");
  assert.equal(id("o que acontece quando eu demito um empregado"), "empregados");
  assert.equal(id("quais alertas aparecem no início?"), "atencao-hoje");
  assert.equal(id("como funciona a caixa de ferramentas"), "ferramentas-caixas");
  assert.equal(id("onde ficam salvos os dados da demonstração"), "modo-demonstracao");
  assert.equal(id("como lançar despesa de viagem"), "viagens");
});

test("conhecimento: pergunta sem relação não inventa resposta e as regras de dados continuam valendo", () => {
  assert.equal(responderSobreSistema("qual a previsão do tempo amanhã"), null);
  assert.equal(responderSobreSistema("   "), null);
  assert.match(responderConsulta("quem está com a furadeira 04", ctx).texto, /furadeira/i);
  assert.match(responderConsulta("quais EPIs vencem essa semana", ctx).texto, /EPIs/);
  assert.match(responderConsulta("como entregar EPI", ctx).texto, /Entrega EPI/);
});

test("conhecimento: ids únicos, todo verbete responde e os links apontam para telas que existem", () => {
  assert.equal(new Set(CONHECIMENTO.map((v) => v.id)).size, CONHECIMENTO.length);
  const rotas = readdirSync(new URL("../src/routes/_authenticated", import.meta.url), { recursive: true }).map(String).filter((f) => f.endsWith(".tsx")).map((f) => f.slice(0, -4).split(String.fromCharCode(92)).join("/"));
  const existe = (url) => url === "/inicio" || rotas.some((r) => `/${r}` === url || `/${r.split(".").join("/")}` === url);
  for (const v of CONHECIMENTO) {
    assert.ok(v.resposta.length > 40 && v.chaves.length > 0, v.id);
    for (const l of v.links) assert.ok(existe(l.url), `${v.id}: rota ${l.url} não existe`);
  }
  assert.ok(existsSync(new URL("../src/lib/conhecimento-sistema.ts", import.meta.url)) && readFileSync(new URL("../src/lib/consulta-rapida.ts", import.meta.url), "utf8").includes("responderSobreSistema"));
});
