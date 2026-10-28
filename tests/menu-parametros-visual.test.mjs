import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const raiz = new URL("../src/", import.meta.url);
const sidebar = readFileSync(new URL("components/layout/AppSidebar.tsx", raiz), "utf8");
const menuDados = readFileSync(new URL("lib/menu-parametros.ts", raiz), "utf8");
const estilos = readFileSync(new URL("styles.css", raiz), "utf8");
const telaCategorias = readFileSync(new URL("routes/_authenticated/cadastros/gerais/categorias.tsx", raiz), "utf8");

test("Parâmetros Específicos abre na categoria do menu de origem (decisão 91)", () => {
  assert.match(menuDados, /titulo: "Parâmetros Específicos", url: URLS_APOIO\[0\]!/);
  assert.match(telaCategorias, /titulo="Parâmetros Específicos"/);
  assert.match(telaCategorias, /de \? CATEGORIA_DO_MENU\[de\] : escolhidaLivre/);
  assert.match(menuDados, /itemEspecificos\("veiculos"\)/);
  assert.match(telaCategorias, /!escolhida && <div/);
  assert.match(telaCategorias, /escolhida && categoria \? \(/);
  assert.match(telaCategorias, /Voltar às categorias/);
  for (const rotulo of ["Não usa", "Opcional", "Obrigatório"]) {
    assert.ok(telaCategorias.includes(rotulo));
  }
});

test("menu lateral se chama Parâmetros e mantém as rotas de cadastro", () => {
  assert.match(sidebar, /titulo: "Parâmetros"/);
  assert.match(menuDados, /url: "\/cadastros\/veiculos"/);
  assert.match(menuDados, /"\/cadastros\/gerais\/categorias"/);
});

test("a cor solicitada é exclusiva do token de sidebar", () => {
  assert.equal((estilos.match(/--sidebar: #0A007C;/g) ?? []).length, 2);
  assert.doesNotMatch(estilos, /--primary: #0A007C;/);
  assert.doesNotMatch(estilos, /--glass-[\w-]+: #0A007C;/);
});

test("Parâmetros > EPI põe todos os submenus na mesma coluna de ícones, sem recuo extra (dec 139)", async () => {
  const { readFileSync } = await import("node:fs");
  const fonte = readFileSync(new URL("../src/components/layout/AppSidebar.tsx", import.meta.url), "utf8");
  const trecho = fonte.slice(fonte.indexOf("function MenuEpi"), fonte.indexOf("function MenuFerramentas"));
  assert.match(trecho, /MENU_EPI\.flatMap\(\(item\) => \[item, \.\.\.\(item\.filhos \?\? \[\]\)\]\)/);
  assert.doesNotMatch(trecho, /mx-0 border-l-0 px-0|mx-0 ml-2 px-1\.5/);
});

test("o Questionário de Despesas saiu de Parâmetros > Veículos e está em Parâmetros > Viagens, com os Parâmetros Específicos (decisão 299)", () => {
  const veiculos = menuDados.slice(menuDados.indexOf("export const MENU_VEICULOS"));
  assert.ok(veiculos.slice(0, veiculos.indexOf("];")).indexOf('itemEspecificos("veiculos")') > 0);
  assert.doesNotMatch(veiculos.slice(0, veiculos.indexOf("];")), /Questionário de Despesas/);
  const viagens = menuDados.slice(menuDados.indexOf("export const MENU_VIAGENS"));
  const lista = viagens.slice(0, viagens.indexOf("];"));
  assert.ok(lista.indexOf("Questionário de Despesas") > 0 && lista.indexOf("Parâmetros Específicos") > lista.indexOf("Questionário de Despesas"));
});
