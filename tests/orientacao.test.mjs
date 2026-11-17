import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { destinoPaiDaTrilha, trilhaDaRota } from "../src/lib/trilha.ts";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const rotulos = (n) => n.map((x) => x.rotulo);

test("Início e Dashboard são a raiz: sem trilha", () => {
  assert.equal(trilhaDaRota("/inicio", {}, true), null);
  assert.equal(trilhaDaRota("/dashboard", {}, true), null);
});

test("telas de um cartão com submenu: Início › cartão › seção › tela", () => {
  const n = trilhaDaRota("/veiculos", { aba: "abastecimento" }, true);
  assert.deepEqual(rotulos(n).slice(0, 2), ["Início", "Veículos"]);
  assert.equal(n.at(-1).rotulo, "Abastecimento");
  assert.equal(n[0].url, "/inicio");
});

test("cartões sem submenu e telas avulsas também têm trilha", () => {
  assert.deepEqual(rotulos(trilhaDaRota("/empresas", {}, true)), ["Início", "Cadastros", "Empresas"]);
  assert.deepEqual(rotulos(trilhaDaRota("/empregados", {}, true)), ["Início", "Cadastros", "Empregados"]);
  assert.deepEqual(rotulos(trilhaDaRota("/cadastros/fornecedores", {}, true)), ["Início", "Cadastros", "Fornecedores"]);
  assert.deepEqual(rotulos(trilhaDaRota("/cadastros/clientes", {}, true)), ["Início", "Cadastros", "Clientes"]);
  assert.deepEqual(rotulos(trilhaDaRota("/relatorios", {}, true)), ["Início", "Relatórios"]);
  assert.deepEqual(rotulos(trilhaDaRota("/ocorrencias", {}, true)), ["Início", "Ocorrências"]);
  assert.deepEqual(rotulos(trilhaDaRota("/usuarios", {}, true)), ["Início", "Configurações", "Usuários"]);
});

test("o Voltar sem tela anterior sobe um nível da trilha (ou vai ao Início)", () => {
  const pai = destinoPaiDaTrilha(trilhaDaRota("/veiculos", { aba: "abastecimento" }, true));
  assert.equal(pai.rotulo, "Veículos");
  assert.equal(pai.url, "/veiculos");
  assert.equal(destinoPaiDaTrilha(trilhaDaRota("/empresas", {}, true)).url, "/inicio");
  assert.equal(destinoPaiDaTrilha(null).url, "/inicio");
});

test("um único Voltar, com o mesmo rótulo, e a empresa ativa em destaque no cabeçalho", () => {
  const rota = ler("routes/_authenticated/route.tsx");
  const ctx = ler("components/layout/NavegacaoContextual.tsx");
  assert.doesNotMatch(rota, /Voltar ao início/);
  assert.doesNotMatch(ctx, /Voltar para \{anterior\.rotulo\}/);
  assert.match(ctx, /<ArrowLeft[^>]*\/>\s*Voltar\s*<\/Button>/);
  assert.match(rota, /aria-label="Empresa ativa"/);
  assert.match(rota, /data-\[state=checked\]:bg-primary\/10/);
});

test("subrotas de uma tela mantêm a trilha", () => {
  assert.deepEqual(rotulos(trilhaDaRota("/empresas/123", {}, true)), ["Início", "Cadastros", "Empresas"]);
  assert.deepEqual(rotulos(trilhaDaRota("/relatorios/x", {}, true)), ["Início", "Relatórios"]);
});
