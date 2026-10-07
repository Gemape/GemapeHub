import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { MENU_EPI, MENU_FERRAMENTAS, MENU_GERAIS, MENU_UNIFORMES, URLS_GERAIS, itensApoio } from "../src/lib/menu-parametros.ts";

const sidebar = readFileSync(new URL("../src/components/layout/AppSidebar.tsx", import.meta.url), "utf8");

test("Tamanho e Medidas de Produto é um menu só, sem submenu: cadastro e associação numa tela (decisões 38 e 89)", () => {
  const item = itensApoio("epi").find((i) => i.titulo === "Tamanho e Medidas de Produto");
  assert.equal(item?.url, "/cadastros/gerais/tamanhos-unidades");
  assert.ok(item && !("filhos" in item));
  assert.ok(!MENU_GERAIS.some((i) => i.titulo.startsWith("Associar")));
  const raiz = new URL("../src/routes/_authenticated/cadastros/gerais/", import.meta.url);
  const pagina = readFileSync(new URL("tamanhos-unidades.tsx", raiz), "utf8");
  assert.equal(item.abas, undefined);
  assert.match(pagina, /<TamanhosMedidasUnificado de=\{de\} irParaAssociar=\{aba === "associar"\} \/>/);
  assert.doesNotMatch(pagina, /Tabs/);
  const unificado = readFileSync(new URL("../../../../components/parametros/TamanhosMedidasUnificado.tsx", raiz), "utf8");
  assert.match(unificado, /<TamanhosMedidasPainel aninhado \/>/);
  assert.match(unificado, /<AssociarTamanhosPainel key=\{de \?\? "todas"\} aninhado/); // trocar de menu começa a associação limpa
  assert.match(unificado, /id="associar-ao-produto"/); // o ?aba=associar antigo rola até aqui
  assert.match(unificado, /\{!emJanela && \(/); // na janela do cadastro o título é o da janela
  const antigo = readFileSync(new URL("associar-tamanhos.tsx", raiz), "utf8");
  assert.match(antigo, /redirect\(\{ to: "\/cadastros\/gerais\/tamanhos-unidades", search: \{ aba: "associar" \} \}\)/);
});

test("Tabelas de Apoio e Tamanho e Medidas saem de Gerais e ficam em EPI, Uniformes e Ferramentas (decisão 86)", () => {
  assert.deepEqual(MENU_GERAIS.map((i) => i.titulo), ["Código do Produto", "Código de Fábrica", "Endereçamento"]);
  assert.ok(!URLS_GERAIS.includes("/cadastros/gerais/categorias"));
  assert.ok(!URLS_GERAIS.includes("/cadastros/gerais/tamanhos-unidades"));
  for (const [de, menu] of [["epi", MENU_EPI], ["uniformes", MENU_UNIFORMES], ["ferramentas", MENU_FERRAMENTAS]]) {
    const apoio = menu.filter((i) => i.de === de);
    assert.deepEqual(apoio.map((i) => [i.titulo, i.url]), [
      ["Parâmetros Específicos", "/cadastros/gerais/categorias"],
      ["Tamanho e Medidas de Produto", "/cadastros/gerais/tamanhos-unidades"],
    ]);
    assert.equal(apoio[1].abas, undefined);
  }
  assert.match(sidebar, /prefixosDoGrupo\("epi"/);
  assert.match(sidebar, /prefixosDoGrupo\("uniformes"/);
  assert.match(sidebar, /prefixosDoGrupo\("ferramentas"/);
});

test("Código do Produto continua em Gerais, no mesmo endereço", () => {
  const item = MENU_GERAIS.find((i) => i.titulo === "Código do Produto");
  assert.equal(item?.url, "/cadastros/gerais/codigo-produto");
});

test("Caixas saiu de Gerais e fica em Parâmetros > Ferramentas, fora de Módulos", () => {
  assert.ok(!MENU_GERAIS.some((i) => i.titulo === "Caixas" || i.url === "/cadastros/gerais/caixas"));
  assert.deepEqual(
    MENU_FERRAMENTAS.filter((f) => !f.de).map((f) => [f.titulo, f.url]),
    [
      ["Cadastrar Caixa", "/caixas-ferramentas"],
      ["Cadastrar Ferramenta", "/cadastros/ferramentas"],
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
  assert.ok(URLS_GERAIS.includes("/cadastros/gerais/codigo-produto"));
});

test("Cadastrar Caixa é o primeiro de Ferramentas, abre direto em Habilitar caixas e é só do Administrador (decisão 54)", () => {
  const raiz = new URL("../src/routes/_authenticated/", import.meta.url);
  const [caixa] = MENU_FERRAMENTAS;
  assert.equal(caixa.titulo, "Cadastrar Caixa");
  assert.equal(caixa.soAdmin, true);
  assert.deepEqual(caixa.search, { aba: "habilitar" });
  assert.equal(caixa.abas, undefined);
  assert.match(sidebar, /MENU_FERRAMENTAS\.filter\(\(item\) => !item\.soAdmin \|\| isAdmin\)/);
  const pagina = readFileSync(new URL("caixas-ferramentas.tsx", raiz), "utf8");
  assert.doesNotMatch(pagina, /TabsTrigger|TabsList|TabsContent|FerramentasCaixasModulo|PortadoresCaixaModulo|CaixasFerramentasModulo/);
  assert.match(pagina, /isAdmin \? \(\s*<CaixasHabilitadasPainel \/>/);
  const antigo = readFileSync(new URL("cadastros/gerais/caixas.tsx", raiz), "utf8");
  assert.match(antigo, /redirect\(\{ to: "\/caixas-ferramentas", search: \{ aba: "habilitar" \} \}\)/);
});

test("o menu EPI é de Parâmetros: Cadastrar Ficha de EPI fica dentro de Cadastrar EPI", async () => {
  const { MENU_EPI } = await import("../src/lib/menu-parametros.ts");
  assert.deepEqual(MENU_EPI.filter((i) => !i.de).map((i) => i.titulo), ["Cadastrar EPI"]);
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

test("não há mais abas superiores em nenhuma tela: cada aba é submenu do menu lateral (decisão 43)", async () => {
  const { ABAS_EPI, ABAS_UNIFORME, ABAS_FERRAMENTA, ABAS_VEICULO, abaDoModulo } = await import("../src/lib/menu-parametros.ts");
  const { readdirSync, statSync } = await import("node:fs");
  const achar = (dir) =>
    readdirSync(dir).flatMap((n) => {
      const c = `${dir}/${n}`;
      return statSync(c).isDirectory() ? achar(c) : [c];
    });
  const raiz = new URL("../src/", import.meta.url).pathname;
  const comAbas = achar(raiz).filter((f) => f.endsWith(".tsx") && !f.includes("/components/ui/") && /<TabsTrigger|<TabsList/.test(readFileSync(f, "utf8")));
  assert.deepEqual(comAbas, []);
  assert.deepEqual(ABAS_VEICULO.map((a) => a.aba), ["frota", "abastecimento", "manutencao", "ocorrencias", "checklist"]);
  assert.equal(ABAS_EPI[0].aba, "dashboard");
  assert.equal(ABAS_UNIFORME.length, 9);
  assert.equal(ABAS_FERRAMENTA.length, 8);
  // Cada submenu aponta para uma aba que a tela realmente tem.
  const modulos = readFileSync(new URL("../src/components/modules/PaginaModulo.tsx", import.meta.url), "utf8");
  for (const a of [...ABAS_EPI, ...ABAS_UNIFORME, ...ABAS_FERRAMENTA]) assert.match(modulos, new RegExp(`value="${a.aba}"`));
  assert.equal(abaDoModulo("epi", "termo-baixa"), "dashboard");
  assert.equal(abaDoModulo("uniforme", "termo-baixa"), "termo-baixa");
  assert.equal(abaDoModulo("veiculo", undefined), "frota");
  assert.match(sidebar, /<ModuloComAbas /);
  assert.match(sidebar, /search=\{\{ aba: a\.aba \} as never\}/);
});

test("Gerais, com seus submenus, é o primeiro item de Parâmetros, antes de EPI e Ferramentas (decisão 44)", () => {
  const gerais = sidebar.indexOf('<MenuGerais pathname={pathname} />');
  const epi = sidebar.indexOf('<MenuEpi pathname={pathname} />');
  const ferramentas = sidebar.indexOf('<MenuFerramentas pathname={pathname} />');
  assert.ok(gerais > 0 && gerais < epi && epi < ferramentas);
  // Nada vem antes dele dentro de Parâmetros.
  const abertura = sidebar.indexOf('{grupo.titulo === "Parâmetros" && isAdmin');
  assert.ok(abertura > 0 && sidebar.slice(sidebar.indexOf("<SidebarMenu>\n                {/*"), abertura).indexOf("<MenuEpi") === -1);
});

test("o título de Tamanho e Medidas de Produto usa ícone e texto iguais aos dos outros menus (decisão 72)", () => {
  assert.doesNotMatch(sidebar, /text-sidebar-foreground\/70 hover:text-sidebar-foreground/);
});

test("todo submenu de Módulos e de Tamanho e Medidas tem ícone, e a barra lateral conhece cada um (decisão 73)", async () => {
  const m = await import("../src/lib/menu-parametros.ts");
  const abas = [...m.ABAS_EPI, ...m.ABAS_UNIFORME, ...m.ABAS_FERRAMENTA, ...m.ABAS_VEICULO];
  assert.ok(abas.length > 0);
  for (const a of abas) {
    assert.ok(a.icone, `${a.titulo} sem ícone`);
    assert.match(sidebar, new RegExp(`\\b${a.icone}\\b[^\\n]*,|\\b${a.icone},`), `${a.icone} não está em ICONES`);
  }
  // A mesma aba usa o mesmo ícone em todos os módulos (Dashboard, Estoque, Ocorrências...).
  const porAba = new Map();
  for (const a of abas) {
    const antes = porAba.get(a.aba);
    if (antes && ["dashboard", "estoque", "compras", "ocorrencias", "movimentacoes", "baixas"].includes(a.aba))
      assert.equal(a.icone, antes, `ícone de ${a.aba} difere entre módulos`);
    porAba.set(a.aba, a.icone);
  }
});

test("Tamanho e Medidas de Produto abre as duas rotinas juntas, com a categoria vinda do menu (decisão 89)", async () => {
  const unificado = readFileSync(new URL("../src/components/parametros/TamanhosMedidasUnificado.tsx", import.meta.url), "utf8");
  assert.match(unificado, /epi: "cat-epi", uniformes: "cat-uniformes", ferramentas: "cat-ferramentas"/);
  assert.match(unificado, /categoriaFixa: CATEGORIA_DO_MENU\[de\]/);
  const associar = readFileSync(new URL("../src/components/parametros/AssociarTamanhosPainel.tsx", import.meta.url), "utf8");
  assert.match(associar, /const categoriaId = categoriaFixa \?\? categoriaEscolhida/);
  assert.match(associar, /\{!categoriaFixa && \(/);
});
