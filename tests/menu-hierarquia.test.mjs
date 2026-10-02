import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { MENU_GERAIS, SUBMENU_FERRAMENTAS, URLS_GERAIS } from "../src/lib/menu-parametros.ts";

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

test("só o Administrador vê Caixas; o destaque de Gerais não inclui Caixas", () => {
  const caixas = SUBMENU_FERRAMENTAS.find((i) => i.titulo === "Caixas");
  assert.equal(caixas?.soAdmin, true);
  assert.ok(!SUBMENU_FERRAMENTAS.find((i) => i.titulo === "Cadastro de Ferramentas")?.soAdmin);
  assert.ok(!URLS_GERAIS.includes("/cadastros/gerais/caixas"));
  assert.ok(URLS_GERAIS.includes("/cadastros/gerais/associar-tamanhos"));
  assert.match(sidebar, /isAdmin \|\| !i\.soAdmin/);
});

test("o menu EPI é do módulo: Cadastrar Ficha de EPI fica dentro de Cadastrar EPI", async () => {
  const { MENU_EPI } = await import("../src/lib/menu-parametros.ts");
  const cadastrar = MENU_EPI.find((i) => i.titulo === "Cadastrar EPI");
  assert.equal(cadastrar?.url, "/epi-cadastrar");
  assert.deepEqual(cadastrar?.filhos?.map((f) => [f.titulo, f.url]), [["Cadastrar Ficha de EPI", "/epi-ficha"]]);
  assert.ok(!MENU_EPI.some((i) => i.titulo === "Cadastrar Ficha de EPI"));
});

test("Parâmetros não tem mais EPIs nem Ficha de EPI, e o módulo tem o menu EPI", () => {
  const inicio = sidebar.indexOf('titulo: "Parâmetros"');
  const parametros = sidebar.slice(inicio, sidebar.indexOf("] as const;", inicio));
  assert.ok(!parametros.includes("/cadastros/epi"));
  assert.ok(!parametros.includes("Ficha de EPI"));
  assert.match(sidebar, /<MenuEpi pathname=\{pathname\}/);
});

test("os endereços antigos de Cadastrar EPI e da Ficha redirecionam para o módulo", () => {
  const raiz = new URL("../src/routes/_authenticated/", import.meta.url);
  const epi = readFileSync(new URL("cadastros/epi.tsx", raiz), "utf8");
  const ficha = readFileSync(new URL("cadastros/epi-ficha.tsx", raiz), "utf8");
  assert.match(epi, /redirect\(\{ to: "\/epi-cadastrar" \}\)/);
  assert.match(ficha, /redirect\(\{ to: "\/epi-ficha", search \}\)/);
  assert.match(readFileSync(new URL("epi-cadastrar.tsx", raiz), "utf8"), /<CadastroEpi \/>/);
});
