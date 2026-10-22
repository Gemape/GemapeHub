import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { gruposDoInicio } from "../src/lib/inicio.ts";
import { MENU_EPI, MENU_EQUIPAMENTOS, MENU_FERRAMENTAS, MENU_GERAIS, MENU_UNIFORMES, MENU_VEICULOS } from "../src/lib/menu-parametros.ts";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const urlsDoMenu = new Set([
  ...[...MENU_GERAIS, ...MENU_EPI, ...MENU_UNIFORMES, ...MENU_FERRAMENTAS, ...MENU_VEICULOS, ...MENU_EQUIPAMENTOS].flatMap((i) => ("filhos" in i && i.filhos ? [i.url, ...i.filhos.map((f) => f.url)] : [i.url])),
  ...[...ler("components/layout/AppSidebar.tsx").matchAll(/url: "(\/[^"]*)"/g)].map((m) => m[1]),
]);

test("a tela inicial tem os grupos do menu: Visão geral, Módulos e Parâmetros", () => {
  const g = gruposDoInicio(true);
  assert.deepEqual(g.map((x) => x.titulo), ["Visão geral", "Módulos", "Parâmetros"]);
  assert.deepEqual(g[0].cartoes.map((c) => c.titulo), ["Dashboard"]);
  assert.deepEqual(g[1].cartoes.map((c) => c.titulo), ["EPIs", "Uniformes", "Ferramentas", "Veículos", "Viagens", "Equipamentos"]);
  assert.deepEqual(g[2].cartoes.map((c) => c.titulo), ["Gerais", "EPI", "Uniformes", "Ferramentas", "Veículos", "Equipamentos", "Empresas", "Empregados", "Fornecedores", "Clientes"]);
});

test("Gerais só aparece para o Administrador, como no menu lateral", () => {
  const titulos = (admin) => gruposDoInicio(admin).flatMap((g) => g.cartoes.map((c) => c.titulo));
  assert.ok(titulos(true).includes("Gerais"));
  assert.ok(!titulos(false).includes("Gerais"));
  assert.equal(titulos(false).length, titulos(true).length - 1);
});

test("todo cartão leva a uma tela que existe e que o menu lateral também usa", () => {
  const rotas = ler("routeTree.gen.ts");
  for (const g of gruposDoInicio(true)) {
    for (const c of g.cartoes) {
      assert.ok(urlsDoMenu.has(c.url), `${c.titulo}: ${c.url} não está no menu`);
      assert.ok(rotas.includes(`'${c.url}'`) || rotas.includes(`"${c.url}"`), `${c.titulo}: ${c.url} não é uma rota`);
    }
  }
});

test("o login leva para a tela inicial, e o Dashboard continua no menu", () => {
  for (const f of ["routes/auth.tsx", "routes/index.tsx"]) {
    const s = ler(f);
    assert.match(s, /to: "\/inicio"/, f);
    assert.doesNotMatch(s, /to: "\/dashboard"/, f);
  }
  const menu = ler("components/layout/AppSidebar.tsx");
  assert.match(menu, /\{ titulo: "Início", url: "\/inicio"/);
  assert.match(menu, /\{ titulo: "Dashboard", url: "\/dashboard"/);
});

const pagina = existsSync(new URL("../src/routes/_authenticated/inicio.tsx", import.meta.url)) ? ler("routes/_authenticated/inicio.tsx") : "";

test("a tela mostra cartões com ícone, título e Clique para acessar, só os do perfil de quem entrou", () => {
  assert.ok(pagina, "rota /inicio");
  assert.match(pagina, /gruposDoInicio\(isAdmin\)/);
  assert.match(pagina, /Clique para acessar/);
  assert.match(pagina, /focus-visible:ring/);
  assert.match(pagina, /lg:grid-cols-3/);
  assert.doesNotMatch(pagina, /dangerouslySetInnerHTML|innerHTML/);
});
