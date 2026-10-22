import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { areaDaRota } from "../src/lib/inicio.ts";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const titulos = (itens) => itens.map((i) => i.titulo);

test("a rota de um módulo acha o cartão da área e marca a aba atual", () => {
  const r = areaDaRota("/veiculos", { aba: "abastecimento" }, true);
  assert.equal(r.cartao.titulo, "Veículos");
  assert.equal(r.atual.titulo, "Abastecimento");
  assert.ok(titulos(r.cartao.itens).includes("Cadastro de Veículos"));
});

test("rotas de parâmetros acham o cartão da área, com ?aba= quando o item depende dela", () => {
  assert.equal(areaDaRota("/cadastros/equipamentos", {}, true).cartao.titulo, "Equipamentos");
  const v = areaDaRota("/cadastros/equipamentos-checklist", { aba: "vistoria" }, true);
  assert.equal(v.cartao.titulo, "Equipamentos");
  assert.equal(v.atual.titulo, "Check list de vistoria");
  assert.equal(areaDaRota("/cadastros/equipamentos-checklist", { aba: "manutencao" }, true).atual.titulo, "Check list de manutenção");
});

test("tela compartilhada por mais de uma área usa ?de= para escolher o cartão", () => {
  const url = "/cadastros/gerais/categorias";
  assert.equal(areaDaRota(url, { de: "epi" }, true).cartao.titulo, "EPIs");
  assert.equal(areaDaRota(url, { de: "uniformes" }, true).cartao.titulo, "Uniformes");
  assert.equal(areaDaRota(url, { de: "ferramentas" }, true).cartao.titulo, "Ferramentas");
});

test("telas fora dos cartões com submenu (Dashboard, Empresas...) e o início não têm menu de área; Gerais só para o administrador", () => {
  for (const u of ["/dashboard", "/empresas", "/empregados", "/inicio", "/cadastros/fornecedores"]) assert.equal(areaDaRota(u, {}, true), null, u);
  assert.equal(areaDaRota("/cadastros/gerais/codigo-produto", {}, true).cartao.titulo, "Gerais");
  assert.equal(areaDaRota("/cadastros/gerais/codigo-produto", {}, false), null);
});

test("barra final e subrotas ainda acham a área", () => {
  assert.equal(areaDaRota("/veiculos/", { aba: "frota" }, true).cartao.titulo, "Veículos");
  assert.equal(areaDaRota("/epi/qualquer-coisa", {}, true).cartao.titulo, "EPIs");
});

test("o topo mostra o menu da área ao lado do Voltar ao início, só fora da tela inicial", () => {
  const rota = ler("routes/_authenticated/route.tsx");
  assert.match(rota, /<MenuDaArea \/>/);
  const menu = ler("components/layout/MenuDaArea.tsx");
  assert.match(menu, /areaDaRota\(/);
  assert.match(menu, /DropdownMenu/);
  assert.match(menu, /aria-current/);
  assert.match(menu, /search=\{/);
  assert.doesNotMatch(menu, /dangerouslySetInnerHTML|innerHTML/);
});

test("na tela inicial, clicar fora dos cartões (ou Esc) recolhe os menus abertos", () => {
  const inicio = ler("routes/_authenticated/inicio.tsx");
  assert.match(inicio, /addEventListener\("pointerdown"/);
  assert.match(inicio, /closest\("\[data-cartao\]"\)/);
  assert.match(inicio, /data-cartao/);
  assert.match(inicio, /Escape/);
  assert.match(inicio, /removeEventListener\("pointerdown"/);
});
