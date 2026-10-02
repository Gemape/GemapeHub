import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const raiz = new URL("../src/", import.meta.url);
const sidebar = readFileSync(new URL("components/layout/AppSidebar.tsx", raiz), "utf8");
const menuDados = readFileSync(new URL("lib/menu-parametros.ts", raiz), "utf8");
const estilos = readFileSync(new URL("styles.css", raiz), "utf8");
const telaCategorias = readFileSync(new URL("routes/_authenticated/cadastros/gerais/categorias.tsx", raiz), "utf8");

test("Tabelas de Apoio abre em categorias e revela detalhes após seleção", () => {
  assert.match(menuDados, /titulo: "Tabelas de Apoio", url: "\/cadastros\/gerais\/categorias"/);
  assert.match(telaCategorias, /titulo="Tabelas de Apoio"/);
  assert.match(telaCategorias, /!escolhida && <div/);
  assert.match(telaCategorias, /escolhida && categoria \? \(/);
  assert.match(telaCategorias, /Voltar às categorias/);
  for (const rotulo of ["Não usa", "Opcional", "Obrigatório"]) {
    assert.ok(telaCategorias.includes(rotulo));
  }
});

test("menu lateral se chama Parâmetros e mantém as rotas de cadastro", () => {
  assert.match(sidebar, /titulo: "Parâmetros"/);
  assert.match(sidebar, /url: "\/cadastros\/epi"/);
  assert.match(menuDados, /url: "\/cadastros\/gerais\/categorias"/);
});

test("a cor solicitada é exclusiva do token de sidebar", () => {
  assert.equal((estilos.match(/--sidebar: #0A007C;/g) ?? []).length, 2);
  assert.doesNotMatch(estilos, /--primary: #0A007C;/);
  assert.doesNotMatch(estilos, /--glass-[\w-]+: #0A007C;/);
});
