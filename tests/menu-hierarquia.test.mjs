import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { MENU_FERRAMENTAS, MENU_GERAIS, URLS_GERAIS } from "../src/lib/menu-parametros.ts";

const sidebar = readFileSync(new URL("../src/components/layout/AppSidebar.tsx", import.meta.url), "utf8");

test("Tamanho e Medidas de Produto é um menu só em Gerais, com Associar como aba (decisão 38)", () => {
  const item = MENU_GERAIS.find((i) => i.titulo === "Tamanho e Medidas de Produto");
  assert.equal(item?.url, "/cadastros/gerais/tamanhos-unidades");
  assert.ok(item && !("filhos" in item));
  assert.ok(!MENU_GERAIS.some((i) => i.titulo.startsWith("Associar")));
  const raiz = new URL("../src/routes/_authenticated/cadastros/gerais/", import.meta.url);
  const pagina = readFileSync(new URL("tamanhos-unidades.tsx", raiz), "utf8");
  assert.match(pagina, /ABAS = \["cadastro", "associar"\]/);
  assert.match(pagina, /<TabsContent value="associar" forceMount[^>]*><AssociarTamanhosPainel/);
  const antigo = readFileSync(new URL("associar-tamanhos.tsx", raiz), "utf8");
  assert.match(antigo, /redirect\(\{ to: "\/cadastros\/gerais\/tamanhos-unidades", search: \{ aba: "associar" \} \}\)/);
});

test("Código do Produto continua em Gerais, no mesmo endereço", () => {
  const item = MENU_GERAIS.find((i) => i.titulo === "Código do Produto");
  assert.equal(item?.url, "/cadastros/gerais/codigo-produto");
});

test("Caixas saiu de Gerais e fica em Parâmetros > Ferramentas, fora de Módulos", () => {
  assert.ok(!MENU_GERAIS.some((i) => i.titulo === "Caixas" || i.url === "/cadastros/gerais/caixas"));
  assert.deepEqual(
    MENU_FERRAMENTAS.map((f) => [f.titulo, f.url]),
    [
      ["Cadastro de Ferramentas", "/cadastros/ferramentas"],
      ["Caixas", "/caixas-ferramentas"],
    ],
  );
  const inicio = sidebar.indexOf('titulo: "Parâmetros"');
  const modulos = sidebar.slice(sidebar.indexOf('titulo: "Módulos"'), inicio);
  assert.match(modulos, /titulo: "Ferramentas", url: "\/ferramentas"/);
  assert.ok(!modulos.includes("/caixas-ferramentas"));
  assert.match(sidebar, /grupo\.titulo === "Parâmetros" && \(\s*<>[\s\S]*<MenuFerramentas pathname/);
});

test("o menu lateral usa os dados de menu-parametros e não lista mais Associar solto", () => {
  assert.match(sidebar, /MENU_GERAIS/);
  assert.match(sidebar, /MENU_FERRAMENTAS/);
  assert.doesNotMatch(sidebar, /titulo: "Tamanhos e Unidades"/);
});

test("o destaque de Gerais não inclui Caixas", () => {
  assert.ok(!URLS_GERAIS.includes("/cadastros/gerais/caixas"));
  assert.ok(URLS_GERAIS.includes("/cadastros/gerais/tamanhos-unidades"));
});

test("Habilitar caixas é aba da tela Caixas de Ferramentas, só do Administrador, e o endereço antigo redireciona", () => {
  const raiz = new URL("../src/routes/_authenticated/", import.meta.url);
  const pagina = readFileSync(new URL("caixas-ferramentas.tsx", raiz), "utf8");
  assert.match(pagina, /isAdmin && <TabsTrigger value="habilitar"/);
  assert.match(pagina, /isAdmin && <TabsContent value="habilitar"[^>]*><CaixasHabilitadasPainel/);
  assert.match(pagina, /pedida !== "habilitar" \|\| isAdmin/);
  const antigo = readFileSync(new URL("cadastros/gerais/caixas.tsx", raiz), "utf8");
  assert.match(antigo, /redirect\(\{ to: "\/caixas-ferramentas", search: \{ aba: "habilitar" \} \}\)/);
});

test("o menu EPI é de Parâmetros: Cadastrar Ficha de EPI fica dentro de Cadastrar EPI", async () => {
  const { MENU_EPI } = await import("../src/lib/menu-parametros.ts");
  assert.deepEqual(MENU_EPI.map((i) => i.titulo), ["Cadastrar EPI"]);
  const cadastrar = MENU_EPI[0];
  assert.equal(cadastrar.url, "/epi-cadastrar");
  assert.deepEqual(cadastrar.filhos?.map((f) => [f.titulo, f.url]), [["Cadastrar Ficha de EPI", "/epi-ficha"]]);
});

test("Em Módulos, EPIs é um item simples; o menu EPI fica em Parâmetros", () => {
  const inicio = sidebar.indexOf('titulo: "Parâmetros"');
  const modulos = sidebar.slice(sidebar.indexOf('titulo: "Módulos"'), inicio);
  assert.match(modulos, /titulo: "EPIs", url: "\/epi"/);
  assert.ok(!modulos.includes("epi-cadastrar") && !modulos.includes("epi-ficha"));
  assert.match(sidebar, /grupo\.titulo === "Parâmetros" && \(\s*<>\s*<MenuEpi pathname=\{pathname\}/);
  assert.doesNotMatch(sidebar, /grupo\.titulo === "Módulos" && <MenuEpi/);
});

test("os endereços antigos de Cadastrar EPI e da Ficha redirecionam para as telas novas", () => {
  const raiz = new URL("../src/routes/_authenticated/", import.meta.url);
  const epi = readFileSync(new URL("cadastros/epi.tsx", raiz), "utf8");
  const ficha = readFileSync(new URL("cadastros/epi-ficha.tsx", raiz), "utf8");
  assert.match(epi, /redirect\(\{ to: "\/epi-cadastrar" \}\)/);
  assert.match(ficha, /redirect\(\{ to: "\/epi-ficha", search \}\)/);
  assert.match(readFileSync(new URL("epi-cadastrar.tsx", raiz), "utf8"), /<CadastroEpi \/>/);
});
