import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { MENU_GERAIS, SUBMENU_FERRAMENTAS } from "../src/lib/menu-parametros.ts";

const sidebar = readFileSync(new URL("../src/components/layout/AppSidebar.tsx", import.meta.url), "utf8");

test("Gerais tem o grupo Tamanho e Medidas de Produto com Cadastro e Associar", () => {
  const grupo = MENU_GERAIS.find((i) => i.titulo === "Tamanho e Medidas de Produto");
  assert.ok(grupo && "filhos" in grupo, "grupo não encontrado");
  assert.deepEqual(
    grupo.filhos.map((f) => [f.titulo, f.url]),
    [
      ["Cadastro de Tamanhos e Medidas", "/cadastros/gerais/tamanhos-unidades"],
      ["Associar Tamanho e Medida ao Produto", "/cadastros/gerais/associar-tamanhos"],
    ],
  );
});

test("Código do Produto continua em Gerais, no mesmo endereço", () => {
  const item = MENU_GERAIS.find((i) => i.titulo === "Código do Produto");
  assert.equal(item?.url, "/cadastros/gerais/codigo-produto");
});

test("Caixas saiu de Gerais e virou submenu de Ferramentas", () => {
  assert.ok(!MENU_GERAIS.some((i) => i.titulo === "Caixas" || i.url === "/cadastros/gerais/caixas"));
  assert.deepEqual(
    SUBMENU_FERRAMENTAS.map((f) => [f.titulo, f.url]),
    [
      ["Cadastro de Ferramentas", "/cadastros/ferramentas"],
      ["Caixas", "/cadastros/gerais/caixas"],
    ],
  );
});

test("a tela operacional Caixas de Ferramentas continua nos Módulos", () => {
  assert.match(sidebar, /titulo: "Caixas de Ferramentas", url: "\/caixas-ferramentas"/);
});

test("o menu lateral usa os dados de menu-parametros e não lista mais Associar solto", () => {
  assert.match(sidebar, /MENU_GERAIS/);
  assert.match(sidebar, /SUBMENU_FERRAMENTAS/);
  assert.doesNotMatch(sidebar, /titulo: "Tamanhos e Unidades"/);
});
