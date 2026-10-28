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
const pagina = existsSync(new URL("../src/routes/_authenticated/inicio.tsx", import.meta.url)) ? ler("routes/_authenticated/inicio.tsx") : "";
const AREAS = "Módulos";
const daSecao = (c, secao) => c.itens.filter((i) => i.secao === secao);
const titulos = (itens) => itens.map((i) => i.titulo);

test("a tela inicial tem os grupos: Visão geral, Módulos (um cartão por área, 3 por linha) e Cadastros (com Gerais)", () => {
  const g = gruposDoInicio(true);
  assert.deepEqual(g.map((x) => x.titulo), ["Visão geral", AREAS, "Cadastros"]);
  assert.deepEqual(titulos(g[0].cartoes), ["Dashboard"]);
  assert.deepEqual(titulos(g[1].cartoes), ["EPIs", "Uniformes", "Ferramentas", "Veículos", "Viagens", "Equipamentos"]);
  assert.deepEqual(titulos(g[2].cartoes), ["Gerais", "Empresas", "Empregados", "Fornecedores", "Clientes"]);
});

test("Gerais só aparece para o Administrador, como no menu lateral", () => {
  const todos = (admin) => gruposDoInicio(admin).flatMap((g) => titulos(g.cartoes));
  assert.ok(todos(true).includes("Gerais"));
  assert.ok(!todos(false).includes("Gerais"));
  assert.equal(todos(false).length, todos(true).length - 1);
});

test("cartões com submenus se abrem no próprio cartão; os sem submenu abrem a tela direto", () => {
  for (const [g, t] of [[AREAS, "EPIs"], [AREAS, "Uniformes"], [AREAS, "Ferramentas"], [AREAS, "Veículos"], [AREAS, "Viagens"], [AREAS, "Equipamentos"], ["Cadastros", "Gerais"]]) {
    const c = cartao(true, g, t);
    assert.ok(c.itens?.length > 1, t);
    assert.equal(c.url, undefined, t);
  }
  for (const [g, t] of [["Visão geral", "Dashboard"], ["Cadastros", "Empresas"], ["Cadastros", "Empregados"], ["Cadastros", "Fornecedores"], ["Cadastros", "Clientes"]]) {
    const c = cartao(true, g, t);
    assert.ok(c.url, `${g} > ${t}`);
    assert.equal(c.itens, undefined, `${g} > ${t}`);
  }
});

test("cada cartão junta o módulo e os parâmetros da área, separados por seção; Viagens só tem módulo e Gerais só tem parâmetros", () => {
  for (const t of ["EPIs", "Uniformes", "Ferramentas", "Veículos", "Equipamentos"]) {
    const c = cartao(true, AREAS, t);
    assert.ok(daSecao(c, "Módulo").length > 0 && daSecao(c, "Parâmetros").length > 0, t);
    // Os do módulo vêm primeiro, depois os dos parâmetros.
    assert.deepEqual(c.itens.map((i) => i.secao), [...daSecao(c, "Módulo"), ...daSecao(c, "Parâmetros")].map((i) => i.secao), t);
  }
  assert.equal(daSecao(cartao(true, AREAS, "Viagens"), "Parâmetros").length, 0);
  assert.equal(daSecao(cartao(true, "Cadastros", "Gerais"), "Módulo").length, 0);
  assert.equal(gruposDoInicio(true).flatMap((g) => g.cartoes).filter((c) => c.titulo === "Veículos").length, 1);
  assert.match(pagina, /SECOES/);
  assert.match(pagina, /aria-label=\{secao\}/);
});

test("os submenus de módulo são as abas do módulo, as mesmas do menu lateral, abrindo na aba certa", () => {
  const modulos = [["EPIs", "/epi", ABAS_EPI, "epi"], ["Uniformes", "/uniformes", ABAS_UNIFORME, "uniforme"], ["Ferramentas", "/ferramentas", ABAS_FERRAMENTA, "ferramenta"], ["Veículos", "/veiculos", ABAS_VEICULO, "veiculo"], ["Viagens", "/viagens", ABAS_VIAGEM, "viagem"]];
  for (const [nome, url, abas, chave] of modulos) {
    const itens = daSecao(cartao(true, AREAS, nome), "Módulo");
    assert.deepEqual(titulos(itens), titulos(abas), nome);
    for (const [i, a] of itens.entries()) {
      assert.equal(a.url, url);
      assert.deepEqual(a.search, { aba: abas[i].aba });
      assert.equal(abaDoModulo(chave, a.search.aba), abas[i].aba, `${nome}: ${a.titulo}`);
    }
  }
  const doEquipamento = daSecao(cartao(true, AREAS, "Equipamentos"), "Módulo");
  assert.deepEqual(doEquipamento.map((i) => i.titulo), ["Inventário dos Equipamentos", "Indicadores", "Abastecimento", "Manutenção", "Ocorrências", "Check list de Manutenção", "Check list de vistoria"]);
  assert.ok(doEquipamento.every((i) => i.url === "/equipamentos"));
  assert.deepEqual(doEquipamento.map((i) => abaDoModulo("equipamento", i.search.aba)), doEquipamento.map((i) => i.search.aba));
});

test("os submenus de parâmetros são os itens do menu de cada grupo, com Cadastrar Ficha de EPI dentro de EPI", () => {
  const par = (t) => titulos(daSecao(cartao(true, AREAS, t), "Parâmetros"));
  assert.deepEqual(titulos(daSecao(cartao(true, "Cadastros", "Gerais"), "Parâmetros")), titulos(MENU_GERAIS));
  assert.deepEqual(par("EPIs"), ["Cadastrar EPI", "Cadastrar Ficha de EPI", "Parâmetros Específicos", "Tamanho e Medidas de Produto"]);
  assert.deepEqual(par("Uniformes"), titulos(MENU_UNIFORMES));
  assert.deepEqual(par("Ferramentas"), titulos(MENU_FERRAMENTAS));
  assert.deepEqual(par("Veículos"), titulos(MENU_VEICULOS));
  assert.deepEqual(par("Equipamentos"), titulos(MENU_EQUIPAMENTOS));
  assert.deepEqual(MENU_EPI.flatMap((i) => i.filhos ?? []).map((f) => f.titulo), ["Cadastrar Ficha de EPI"]);
});

test("itens de tela repetida levam o ?de= do menu de origem, e Cadastrar Caixa só aparece para o Administrador", () => {
  const apoioEpi = cartao(true, AREAS, "EPIs").itens.find((i) => i.titulo === "Parâmetros Específicos");
  assert.deepEqual(apoioEpi.search, { de: "epi" });
  const ferramentas = (admin) => titulos(cartao(admin, AREAS, "Ferramentas").itens);
  assert.ok(ferramentas(true).includes("Cadastrar Caixa"));
  assert.ok(!ferramentas(false).includes("Cadastrar Caixa"));
  const caixa = cartao(true, AREAS, "Ferramentas").itens.find((i) => i.titulo === "Cadastrar Caixa");
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


test("a tela mostra cartões com ícone, título e Clique para acessar, só os do perfil de quem entrou", () => {
  assert.ok(pagina, "rota /inicio");
  assert.match(pagina, /gruposDoInicio\(isAdmin, podeVerCaminho\)/);
  assert.match(pagina, /Clique para acessar/);
  assert.match(pagina, /focus-visible:ring/);
  assert.match(pagina, /lg:w-\[calc\(33\.333%/);
  assert.doesNotMatch(pagina, /dangerouslySetInnerHTML|innerHTML/);
});

test("o cartão com submenus é um botão que abre e fecha a lista de atalhos dentro dele (acessível por teclado)", () => {
  assert.match(pagina, /aria-expanded=\{aberto\}/);
  assert.match(pagina, /aria-controls=/);
  assert.match(pagina, /<button[^>]*type="button"/);
  assert.match(pagina, /search=\{sub\.search/);
});

test("a página pública usa vidro e a logo brilhante animada da tela dos módulos", () => {
  const pagina = ler("routes/index.tsx");
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.match(pagina, /<LogoEntrada grande \/>/);
  for (const c of ["fundo-vidro", "vidro-claro", "mancha-a", "mancha-b", "vidro-entra"]) assert.match(pagina, new RegExp(c), c);
  assert.match(pagina, /<Link to="\/auth">Acessar o sistema<\/Link>/);
  for (const c of ["fundo-vidro", "vidro-claro", "mancha-luz", "vidro-reflexo"]) assert.match(css, new RegExp(`@utility ${c} {`), c);
  assert.match(css, /@utility vidro-entra \{(?:(?!@utility)[\s\S])*?prefers-reduced-motion/);
});

test("os formulários de cadastro abrem em tela inteira", () => {
  assert.match(ler("components/ui/dialog.tsx"), /telaCheia && "[^"]*w-screen[^"]*h-\[100dvh\]|telaCheia && "[^"]*h-\[100dvh\][^"]*w-screen/);
  for (const f of [
    "components/modules/CadastroEpi.tsx", "components/modules/CadastroProduto.tsx", "components/modules/CadastroUniforme.tsx",
    "components/modules/EmpregadosCadastroModulo.tsx", "components/modules/VeiculosCadastroModulo.tsx",
    "components/parametros/ClienteDialog.tsx", "components/parametros/EquipamentoDialog.tsx", "components/parametros/FornecedorDialog.tsx",
    "routes/_authenticated/empresas.tsx",
  ]) assert.match(ler(f), /<DialogContent telaCheia /, f);
});

test("Cadastrar empregado, veículo e itens, de dentro da associação, abrem o formulário e voltam à associação sem fechá-la", () => {
  for (const [f, c] of [["components/modules/DialogCadastroEmpregados.tsx", "EmpregadosCadastroModulo"], ["components/modules/DialogCadastroVeiculos.tsx", "VeiculosCadastroModulo"]]) {
    assert.match(ler(f), new RegExp(`<${c} direto aoConcluir=`), f);
    assert.match(ler(`components/modules/${c}.tsx`), /useAbrirDireto\(direto, /, c);
  }
  assert.match(ler("lib/use-abrir-direto.ts"), /aoConcluir\?\.\(\)/);
  const eq = ler("components/parametros/ChecklistEquipamento.tsx");
  assert.doesNotMatch(eq, /irParaItens/);
  assert.match(eq, /linkCadastro\("Cadastrar itens de check list", \(\) => setItensAberto\(true\)\)/);
});

test("todo campo de arquivo mostra o botão Escolher arquivo(s) no lugar do campo nativo", () => {
  const campo = ler("components/ui/input.tsx");
  assert.match(campo, /if \(type === "file"\) return <CampoArquivo/);
  assert.match(campo, /Escolher arquivos/);
  assert.match(campo, /Nenhum arquivo escolhido/);
  assert.match(campo, /className="sr-only"/);
  // Todo <Input type="file"> do sistema passa por esse campo: nenhum <input type="file"> visível fora dos botões de câmera e anexo (hidden).
  for (const f of ["components/modules/ImportarNfeXml.tsx", "components/parametros/ImportarNfeCodigoFabrica.tsx", "components/parametros/QuestionarioFormulario.tsx"]) {
    assert.match(ler(f), /<Input[^>]*\n?\s*(ref=\{arquivo\}\s*)?type="file"/s, f);
  }
});
