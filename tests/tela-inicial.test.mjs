import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { gruposDoInicio } from "../src/lib/inicio.ts";
import {
  ABAS_EPI, ABAS_FERRAMENTA, ABAS_UNIFORME, ABAS_VEICULO, ABAS_VIAGEM, MENU_EPI, MENU_EQUIPAMENTOS, MENU_FERRAMENTAS, MENU_GERAIS,
  MENU_UNIFORMES, MENU_VEICULOS, abaDoModulo,
} from "../src/lib/menu-parametros.ts";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const cartao = (admin, grupo, titulo) => gruposDoInicio(admin).find((g) => g.titulo === grupo).cartoes.find((c) => c.titulo === titulo);
const titulos = (itens) => itens.map((i) => i.titulo);

test("a tela inicial tem os grupos do menu: Visão geral, Módulos e Parâmetros", () => {
  const g = gruposDoInicio(true);
  assert.deepEqual(g.map((x) => x.titulo), ["Visão geral", "Módulos", "Parâmetros"]);
  assert.deepEqual(titulos(g[0].cartoes), ["Dashboard"]);
  assert.deepEqual(titulos(g[1].cartoes), ["EPIs", "Uniformes", "Ferramentas", "Veículos", "Viagens", "Equipamentos"]);
  assert.deepEqual(titulos(g[2].cartoes), ["Gerais", "EPI", "Uniformes", "Ferramentas", "Veículos", "Equipamentos", "Empresas", "Empregados", "Fornecedores", "Clientes"]);
});

test("Gerais só aparece para o Administrador, como no menu lateral", () => {
  const todos = (admin) => gruposDoInicio(admin).flatMap((g) => titulos(g.cartoes));
  assert.ok(todos(true).includes("Gerais"));
  assert.ok(!todos(false).includes("Gerais"));
  assert.equal(todos(false).length, todos(true).length - 1);
});

test("cartões com submenus se abrem no próprio cartão; os sem submenu abrem a tela direto", () => {
  for (const t of ["EPIs", "Uniformes", "Ferramentas", "Veículos", "Viagens"]) {
    const c = cartao(true, "Módulos", t);
    assert.ok(c.itens?.length > 1, t);
    assert.equal(c.url, undefined, t);
  }
  for (const t of ["Gerais", "EPI", "Uniformes", "Ferramentas", "Veículos"]) assert.ok(cartao(true, "Parâmetros", t).itens?.length > 1, t);
  for (const [g, t] of [["Visão geral", "Dashboard"], ["Módulos", "Equipamentos"], ["Parâmetros", "Equipamentos"], ["Parâmetros", "Empresas"], ["Parâmetros", "Empregados"], ["Parâmetros", "Fornecedores"], ["Parâmetros", "Clientes"]]) {
    const c = cartao(true, g, t);
    assert.ok(c.url, `${g} > ${t}`);
    assert.equal(c.itens, undefined, `${g} > ${t}`);
  }
});

test("os submenus dos Módulos são as abas do módulo, as mesmas do menu lateral, abrindo na aba certa", () => {
  const modulos = [["EPIs", "/epi", ABAS_EPI, "epi"], ["Uniformes", "/uniformes", ABAS_UNIFORME, "uniforme"], ["Ferramentas", "/ferramentas", ABAS_FERRAMENTA, "ferramenta"], ["Veículos", "/veiculos", ABAS_VEICULO, "veiculo"], ["Viagens", "/viagens", ABAS_VIAGEM, "viagem"]];
  for (const [nome, url, abas, chave] of modulos) {
    const itens = cartao(true, "Módulos", nome).itens;
    assert.deepEqual(titulos(itens), titulos(abas), nome);
    for (const [i, a] of itens.entries()) {
      assert.equal(a.url, url);
      assert.deepEqual(a.search, { aba: abas[i].aba });
      assert.equal(abaDoModulo(chave, a.search.aba), abas[i].aba, `${nome}: ${a.titulo}`);
    }
  }
});

test("os submenus de Parâmetros são os itens do menu de cada grupo, com Cadastrar Ficha de EPI dentro de EPI", () => {
  assert.deepEqual(titulos(cartao(true, "Parâmetros", "Gerais").itens), titulos(MENU_GERAIS));
  assert.deepEqual(titulos(cartao(true, "Parâmetros", "EPI").itens), ["Cadastrar EPI", "Cadastrar Ficha de EPI", "Parâmetros Específicos", "Tamanho e Medidas de Produto"]);
  assert.deepEqual(titulos(cartao(true, "Parâmetros", "Uniformes").itens), titulos(MENU_UNIFORMES));
  assert.deepEqual(titulos(cartao(true, "Parâmetros", "Ferramentas").itens), titulos(MENU_FERRAMENTAS));
  assert.deepEqual(titulos(cartao(true, "Parâmetros", "Veículos").itens), titulos(MENU_VEICULOS));
  assert.equal(cartao(true, "Parâmetros", "Equipamentos").url, MENU_EQUIPAMENTOS[0].url);
  assert.deepEqual(MENU_EPI.flatMap((i) => i.filhos ?? []).map((f) => f.titulo), ["Cadastrar Ficha de EPI"]);
});

test("itens de tela repetida levam o ?de= do menu de origem, e Cadastrar Caixa só aparece para o Administrador", () => {
  const apoioEpi = cartao(true, "Parâmetros", "EPI").itens.find((i) => i.titulo === "Parâmetros Específicos");
  assert.deepEqual(apoioEpi.search, { de: "epi" });
  const ferramentas = (admin) => titulos(cartao(admin, "Parâmetros", "Ferramentas").itens);
  assert.ok(ferramentas(true).includes("Cadastrar Caixa"));
  assert.ok(!ferramentas(false).includes("Cadastrar Caixa"));
  const caixa = cartao(true, "Parâmetros", "Ferramentas").itens.find((i) => i.titulo === "Cadastrar Caixa");
  assert.deepEqual(caixa.search, { aba: "habilitar" });
});

test("todo atalho (cartão ou submenu) leva a uma tela que existe", () => {
  const rotas = ler("routeTree.gen.ts");
  const urls = gruposDoInicio(true).flatMap((g) => g.cartoes.flatMap((c) => (c.itens ? c.itens.map((i) => i.url) : [c.url])));
  assert.ok(urls.length > 30);
  for (const u of urls) assert.ok(rotas.includes(`'${u}'`) || rotas.includes(`"${u}"`), `${u} não é uma rota`);
});

test("o login leva para a tela inicial, e o Dashboard continua acessível pelo cartão", () => {
  for (const f of ["routes/auth.tsx", "routes/index.tsx"]) {
    const s = ler(f);
    assert.match(s, /to: "\/inicio"/, f);
    assert.doesNotMatch(s, /to: "\/dashboard"/, f);
  }
  assert.equal(cartao(true, "Visão geral", "Dashboard").url, "/dashboard");
});

const layout = ler("routes/_authenticated/route.tsx");

test("não há menu lateral em nenhuma tela: tudo se acessa pelos cartões da tela inicial", () => {
  assert.doesNotMatch(layout, /<AppSidebar/);
  assert.doesNotMatch(layout, /<SidebarTrigger/);
});

test("em toda tela a logomarca no topo leva à tela inicial, e fora dela há o botão Voltar ao início", () => {
  assert.match(layout, /<Link to="\/inicio"[^>]*aria-label="GEMAPE, tela inicial"/s);
  assert.match(layout, /\{!noInicio && \(?\s*<Button[^>]*asChild[^>]*>\s*<Link to="\/inicio">/s);
  assert.match(layout, /Voltar ao início/);
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

test("o cartão com submenus é um botão que abre e fecha a lista de atalhos dentro dele (acessível por teclado)", () => {
  assert.match(pagina, /aria-expanded=\{aberto\}/);
  assert.match(pagina, /aria-controls=/);
  assert.match(pagina, /<button[^>]*type="button"/);
  assert.match(pagina, /search=\{sub\.search/);
});
