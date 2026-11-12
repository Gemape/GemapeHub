import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

import * as C from "../src/lib/configuracoes-demo.ts";
import * as P from "../src/lib/permissoes-demo.ts";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const memoria = () => {
  const m = new Map();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
};

test("sem nada guardado, a configuração abre no padrão, com registros de auditoria de exemplo", () => {
  const c = C.lerConfig(memoria());
  assert.equal(c.aparencia.tema, "claro");
  assert.equal(c.aparencia.corPrimaria, C.CORES_PADRAO.primaria);
  assert.equal(c.seguranca.senhaMin, 8);
  assert.equal(c.seguranca.bloquearAoDemitir && c.seguranca.encerrarSessoesAoBloquear, true, "offboarding vem ativado por padrão");
  assert.equal(c.seguranca.emailRecuperacao, "");
  assert.ok(c.auditoria.length >= 5);
  assert.ok(Object.keys(c.notificacoes.alertas).length === C.ALERTAS.length);
});

test("texto corrompido ou versão antiga volta ao padrão em vez de quebrar", () => {
  const s = memoria();
  s.setItem(C.CHAVE_CONFIG, "{não é json");
  assert.equal(C.lerConfig(s).aparencia.tema, "claro");
  s.setItem(C.CHAVE_CONFIG, JSON.stringify({ versao: 0, aparencia: { tema: "escuro" } }));
  assert.equal(C.lerConfig(s).aparencia.tema, "claro");
});

test("o que foi salvo volta igual, e campos novos entram pelo padrão", () => {
  const s = memoria();
  const c = C.configPadrao();
  c.aparencia.tema = "escuro";
  s.setItem(C.CHAVE_CONFIG, JSON.stringify({ ...c, aparencia: { tema: "escuro" } }));
  const lida = C.lerConfig(s);
  assert.equal(lida.aparencia.tema, "escuro");
  assert.equal(lida.aparencia.fonte, 100, "campo que faltava veio do padrão");
});

test("a auditoria guarda as mais novas primeiro e no máximo 300", () => {
  let c = C.configPadrao();
  for (let i = 0; i < 320; i++) c = C.comRegistro(c, "Fulano", "Ação", `n${i}`);
  assert.equal(c.auditoria.length, 300);
  assert.equal(c.auditoria[0].detalhe, "n319");
});

test("política de senha: tamanho, número e símbolo", () => {
  const r = { senhaMin: 12, exigeNumero: true, exigeSimbolo: true };
  assert.deepEqual(C.problemasDaSenha("Gemape!2026abc", r), []);
  assert.equal(C.problemasDaSenha("curta", r).length, 3);
  assert.deepEqual(C.problemasDaSenha("semnumero!!!!!", r), ["Pelo menos um número"]);
  assert.deepEqual(C.problemasDaSenha("semsimbolo12345", r), ["Pelo menos um símbolo"]);
  assert.deepEqual(C.problemasDaSenha("abcdefgh", { senhaMin: 8, exigeNumero: false, exigeSimbolo: false }), []);
});

test("cor hexadecimal e endereço de webhook são validados", () => {
  assert.ok(C.corValida("#0A007C") && !C.corValida("0A007C") && !C.corValida("#12345") && !C.corValida("azul"));
  assert.ok(C.urlDeWebhookValida("https://n8n.exemplo.com.br/hook"));
  assert.ok(!C.urlDeWebhookValida("http://inseguro.com") && !C.urlDeWebhookValida("javascript:alert(1)") && !C.urlDeWebhookValida("texto"));
});

test("a chave de API fictícia é única, tem prefixo de teste e só mostra o início depois", () => {
  const a = C.novaChave();
  const b = C.novaChave();
  assert.match(a.chave, /^gmp_demo_[0-9a-f]{40}$/);
  assert.notEqual(a.chave, b.chave);
  assert.ok(a.chave.startsWith(a.prefixo.replace("…", "")) && a.prefixo.length < a.chave.length);
});

test("a exportação da auditoria em CSV escapa aspas e usa ponto e vírgula", () => {
  const csv = C.auditoriaEmCsv([{ id: "1", quando: "2026-11-12T10:00:00Z", quem: "Ana", acao: "Excluiu", detalhe: 'Item "X"; teste', critica: true }]);
  const [cab, linha] = csv.split("\r\n");
  assert.equal(cab, "Data;Quem;Ação;Detalhe;Crítica");
  assert.equal(linha, '"2026-11-12T10:00:00Z";"Ana";"Excluiu";"Item ""X""; teste";"sim"');
});

test("a cópia de backup leva só as chaves gemape-demo-* e deixa a própria configuração de fora", () => {
  const dados = { "gemape-demo-epis": '[{"a":1}]', "gemape-demo-config": "{}", outra: "x", "gemape-demo-texto": "solto" };
  const s = { length: 4, key: (i) => Object.keys(dados)[i], getItem: (k) => dados[k] ?? null };
  assert.deepEqual(C.copiaDosDadosDeTeste(s), { "gemape-demo-epis": [{ a: 1 }], "gemape-demo-texto": "solto" });
});

test("a aparência só troca a variável de cor quando difere da marca, e o tema escuro liga a classe dark", () => {
  const props = new Map();
  const classes = new Set();
  const raiz = {
    classList: { toggle: (n, v) => (v ? classes.add(n) : classes.delete(n)) },
    style: { setProperty: (n, v) => props.set(n, v), removeProperty: (n) => props.delete(n), fontSize: "" },
    setAttribute: () => {}, removeAttribute: () => {},
  };
  globalThis.document = { querySelector: () => null };
  const a = { ...C.configPadrao().aparencia, corPrimaria: "#B91C1C", tema: "escuro" };
  C.aplicarAparencia(a, raiz);
  assert.equal(props.get("--primary"), "#B91C1C");
  assert.ok(!props.has("--secondary") && !props.has("--sidebar"), "cores na marca não ganham variável");
  assert.ok(classes.has("dark"));
  C.aplicarAparencia({ ...a, corPrimaria: C.CORES_PADRAO.primaria, tema: "auto" }, raiz, false);
  assert.ok(!props.has("--primary") && !classes.has("dark"));
  C.aplicarAparencia({ ...a, tema: "auto" }, raiz, true);
  assert.ok(classes.has("dark"), "automático segue o sistema operacional");
  delete globalThis.document;
});

test("as configurações são só do modo demonstração: nada de Supabase e a aparência só é carregada fora da produção", () => {
  const arquivos = ["lib/configuracoes-demo.ts", "components/layout/ConfiguracoesAcessos.tsx", ...readdirSync(new URL("../src/components/configuracoes/", import.meta.url)).map((f) => `components/configuracoes/${f}`)];
  for (const arq of arquivos) assert.doesNotMatch(ler(arq), /supabase|fetch\(|(?<!Array)\.from\(/, arq);
  const rota = ler("routes/_authenticated/route.tsx");
  assert.match(rota, /VITE_DEMO_MODE === "false"\) return;[\s\S]*?import\("@\/lib\/configuracoes-demo"\)/);
});

test("Configurações tem os sete submenus pedidos", () => {
  const f = ler("components/layout/ConfiguracoesAcessos.tsx");
  for (const nome of ["Aparência e personalização", "Usuários, perfis e permissões", "Segurança e sessão", "Notificações e comunicação", "Integrações e API", "Backup e manutenção", "Logs de auditoria"]) assert.ok(f.includes(`"${nome}"`), nome);
});

test("o tamanho mínimo da senha só pode ser 4, 6 ou 8; valor antigo fora dessas opções volta a 8", () => {
  assert.deepEqual([...C.OPCOES_SENHA_MIN], [4, 6, 8]);
  const s = memoria();
  const c = C.configPadrao();
  s.setItem(C.CHAVE_CONFIG, JSON.stringify({ ...c, seguranca: { ...c.seguranca, senhaMin: 12 } }));
  assert.equal(C.lerConfig(s).seguranca.senhaMin, 8);
  s.setItem(C.CHAVE_CONFIG, JSON.stringify({ ...c, seguranca: { ...c.seguranca, senhaMin: 4 } }));
  assert.equal(C.lerConfig(s).seguranca.senhaMin, 4);
});

test("e-mail de recuperação: aceita endereço comum e recusa texto solto", () => {
  assert.ok(C.emailValido("seguranca@gemape.com.br"));
  assert.ok(!C.emailValido("sem-arroba") && !C.emailValido("a@b") && !C.emailValido("a b@c.com") && !C.emailValido(""));
});

test("perfil próprio: nasce como cópia da base, aceita ajustes e vale para o usuário que o recebe", () => {
  let estado = { versao: P.VERSAO_PERMISSOES, usuarios: P.usuariosOriginais() };
  estado = P.criarPerfil(estado, "Gestor de frota", "padrao");
  const perfil = estado.perfis[0];
  assert.equal(perfil.nome, "Gestor de frota");
  assert.deepEqual(perfil.matriz.veiculos, P.PADRAO_DO_PERFIL.padrao.veiculos, "começa igual à base");
  assert.notStrictEqual(perfil.matriz.veiculos, P.PADRAO_DO_PERFIL.padrao.veiculos, "é cópia: mexer nele não muda o perfil de origem");
  estado = P.alterarAcaoDoPerfil(estado, perfil.id, "veiculos", "editar", true);
  assert.deepEqual(estado.perfis[0].matriz.veiculos, { ver: true, editar: true }, "marcar editar marca ver");
  assert.equal(!!P.PADRAO_DO_PERFIL.padrao.veiculos.editar, false, "o perfil de origem não mudou");
  estado = P.mudarPerfil(estado, "teste-usuario-3", perfil.id);
  const salvo = memoria();
  P.salvarPermissoes(salvo, estado);
  const lido = P.lerPermissoes(salvo);
  const u = lido.usuarios.find((x) => x.id === "teste-usuario-3");
  assert.equal(P.efetivas(u).veiculos.editar, true, "o usuário passa a ter o que o perfil próprio libera");
  assert.equal(P.efetivas(u).veiculos.excluir, false);
  assert.equal(P.nomeDoPerfil(lido, perfil.id), "Gestor de frota");
  assert.deepEqual(P.perfisDoEstado(lido).map((p) => p.nome), ["Administrador", "RH", "Padrão", "Gestor de frota"]);
  // desmarcar "ver" desmarca as demais ações
  const sem = P.alterarAcaoDoPerfil(lido, perfil.id, "veiculos", "ver", false);
  assert.deepEqual(sem.perfis[0].matriz.veiculos, { ver: false, editar: false, criar: false, excluir: false });
});

test("excluir o perfil próprio devolve os usuários dele ao Padrão, sem exceções", () => {
  let estado = { versao: P.VERSAO_PERMISSOES, usuarios: P.usuariosOriginais() };
  estado = P.criarPerfil(estado, "Temporário", "rh");
  const id = estado.perfis[0].id;
  estado = P.mudarPerfil(estado, "teste-usuario-3", id);
  estado = P.excluirPerfil(estado, id);
  assert.equal(estado.perfis.length, 0);
  assert.equal(estado.usuarios.find((u) => u.id === "teste-usuario-3").perfil, "padrao");
  P.salvarPermissoes(memoria(), estado);
  assert.equal(P.padraoDe(id), P.PADRAO_DO_PERFIL.padrao, "perfil que não existe mais cai no Padrão");
});

test("destino dos alertas: WhatsApp com DDD e Slack por webhook ou canal; o padrão abre sem destinos", () => {
  assert.deepEqual(C.configPadrao().notificacoes.destinos, { email: [], whatsapp: [], slack: [] });
  for (const ok of ["(11) 91234-5678", "11912345678", "+55 11 91234-5678"]) assert.ok(C.whatsappValido(ok), ok);
  for (const ruim of ["12345", "abc", "(11) 9123-45x8", ""]) assert.ok(!C.whatsappValido(ruim), ruim);
  for (const ok of ["#alertas-patrimonio", "https://hooks.slack.com/services/T000/B000/XXXX"]) assert.ok(C.slackValido(ok), ok);
  for (const ruim of ["alertas", "http://hooks.slack.com/x", "https://evil.example.com/hooks.slack.com/x", "#", "# espaco"]) assert.ok(!C.slackValido(ruim), ruim);
  // configuração guardada antes dos destinos existirem ganha os destinos vazios
  const s = memoria();
  const c = C.configPadrao();
  const { destinos, ...semDestinos } = c.notificacoes;
  s.setItem(C.CHAVE_CONFIG, JSON.stringify({ ...c, notificacoes: semDestinos }));
  assert.deepEqual(C.lerConfig(s).notificacoes.destinos, destinos);
  // formato antigo (um texto por canal) vira lista; repetidos e vazios saem
  assert.deepEqual(C.destinosLidos({ email: "a@x.com", whatsapp: ["11912345678", "11912345678", " "], slack: 5 }), { email: ["a@x.com"], whatsapp: ["11912345678"], slack: [] });
  s.setItem(C.CHAVE_CONFIG, JSON.stringify({ ...c, notificacoes: { ...semDestinos, destinos: { email: "ti@x.com" } } }));
  assert.deepEqual(C.lerConfig(s).notificacoes.destinos.email, ["ti@x.com"]);
});

test("escopo por empresa: lista de empresas ou todas, e a tela lê as empresas do cadastro", () => {
  const c = C.configPadrao();
  assert.deepEqual(c.usuarios.escopo, {});
  const tela = readFileSync(new URL("../src/components/configuracoes/UsuariosPermissoes.tsx", import.meta.url), "utf8");
  assert.match(tela, /useEmpresasQuery\(\)/);
  assert.match(tela, /e\.nome_fantasia/);
});

test("desligamento: registra a demissão e só bloqueia e derruba sessões se a configuração mandar", () => {
  const base = C.configPadrao();
  const d = { nome: "Ana Souza", motivo: "Pedido de demissão", data: "2026-11-12", pendentes: 2 };
  const a = C.comDesligamento(base, "Admin", d);
  assert.deepEqual(a.config.auditoria.slice(0, 4).map((r) => r.acao).reverse(), ["Empregado desligado", "Acesso bloqueado", "Sessões encerradas", "Alerta ao almoxarifado"]);
  assert.match(a.config.auditoria[3].detalhe, /Ana Souza: Pedido de demissão, em 12\/11\/2026/);
  assert.equal(a.efeitos.length, 3);
  const sem = { ...base, seguranca: { ...base.seguranca, bloquearAoDemitir: false } };
  const b = C.comDesligamento(sem, "Admin", { ...d, pendentes: 0 });
  assert.equal(b.config.auditoria.length, base.auditoria.length + 1);
  assert.equal(b.config.auditoria[0].acao, "Empregado desligado");
  assert.deepEqual(b.efeitos, []);
});

test("bloqueio manual vai e volta e respeita o encerramento de sessões", () => {
  const base = C.configPadrao();
  const u = { id: "u-1", nome: "Carlos Lima" };
  const b = C.comBloqueio(base, "Admin", u, true);
  assert.ok(b.usuarios.inativos.includes("u-1"));
  assert.deepEqual(b.auditoria.slice(0, 2).map((r) => r.acao), ["Sessões encerradas", "Usuário bloqueado"]);
  const v = C.comBloqueio(b, "Admin", u, false);
  assert.ok(!v.usuarios.inativos.includes("u-1"));
  assert.equal(v.auditoria[0].acao, "Usuário desbloqueado");
  const sem = { ...base, seguranca: { ...base.seguranca, encerrarSessoesAoBloquear: false } };
  assert.equal(C.comBloqueio(sem, "Admin", u, true).auditoria[0].acao, "Usuário bloqueado");
  assert.equal(C.comBloqueio(b, "Admin", u, true).usuarios.inativos.filter((x) => x === "u-1").length, 1, "não duplica");
});

test("posição do menu: três opções, padrão em cima, valor antigo volta para em cima e vira atributo no documento", () => {
  assert.deepEqual(C.POSICOES_MENU.map((p) => p.id), ["cima", "esquerda", "direita"]);
  assert.equal(C.configPadrao().aparencia.menu, "cima");
  const s = memoria();
  const c = C.configPadrao();
  s.setItem(C.CHAVE_CONFIG, JSON.stringify({ ...c, aparencia: { ...c.aparencia, menu: "baixo" } }));
  assert.equal(C.lerConfig(s).aparencia.menu, "cima");
  const attrs = new Map();
  const raiz = { classList: { toggle() {} }, style: { removeProperty() {}, setProperty() {} }, setAttribute: (k, v) => attrs.set(k, v), removeAttribute: (k) => attrs.delete(k) };
  globalThis.document = { querySelector: () => null };
  C.aplicarAparencia({ ...c.aparencia, menu: "direita" }, raiz, false);
  assert.equal(attrs.get("data-menu"), "direita");
  C.aplicarAparencia({ ...c.aparencia, menu: "cima" }, raiz, false);
  assert.ok(!attrs.has("data-menu"));
});

test("planilha de auditoria neutraliza fórmulas; leitura mantém alertas novos e é guardada", () => {
  const csv = C.auditoriaEmCsv([{ id: "1", quando: "x", quem: "Ana", acao: "Chave", detalhe: "=HYPERLINK(\"http://x\")", critica: false }]);
  assert.match(csv, /"'=HYPERLINK\(""http:\/\/x""\)"/);
  const s = memoria();
  const c = C.configPadrao();
  const { [Object.keys(c.notificacoes.alertas)[0]]: _fora, ...resto } = c.notificacoes.alertas;
  s.setItem(C.CHAVE_CONFIG, JSON.stringify({ ...c, notificacoes: { ...c.notificacoes, alertas: resto } }));
  assert.deepEqual(C.lerConfig(s).notificacoes.alertas, c.notificacoes.alertas);
  assert.equal(C.lerConfig(s), C.lerConfig(s), "mesmo texto gravado devolve o mesmo objeto");
  const cheio = { getItem: () => null, setItem: () => { throw new Error("cota"); }, removeItem() {} };
  assert.equal(C.salvarConfig(cheio, c), false);
  assert.equal(C.salvarConfig(memoria(), c), true);
});
