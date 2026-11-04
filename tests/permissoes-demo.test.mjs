import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { dadosIniciais as base } from "../src/integrations/supabase/demo-client.ts";
import { pedirRestaurar, prepararDadosDeTeste } from "../src/lib/dados-teste/aplicar.ts";
import * as P from "../src/lib/permissoes-demo.ts";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const memoria = () => {
  const m = new Map();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
};
const usuario = (s, id) => P.lerPermissoes(s).usuarios.find((u) => u.id === id);

test("há quatro usuários de teste com acessos diferentes, e o Administrador é o ativo", () => {
  const s = memoria();
  const { usuarios } = P.lerPermissoes(s);
  assert.equal(usuarios.length, 4);
  assert.deepEqual(usuarios.map((u) => u.perfil), ["admin", "rh", "padrao", "padrao"]);
  assert.equal(P.usuarioAtivo(s).perfil, "admin");
  const total = (u) => P.TELAS.reduce((n, t) => n + P.ACOES.filter((a) => P.efetivas(u)[t.id][a]).length, 0);
  assert.equal(new Set(usuarios.map(total)).size, 4, "cada usuário tem um conjunto diferente de acessos");
  assert.ok(P.TELAS.every((t) => P.ACOES.every((a) => P.efetivas(usuarios[0])[t.id][a])), "Administrador tem tudo");
});

test("perfis: RH cuida de empregados, Padrão não vê cadastros administrativos, e o restrito só vê EPIs e Uniformes", () => {
  const s = memoria();
  const rh = P.efetivas(usuario(s, "teste-usuario-2"));
  assert.ok(P.ACOES.every((a) => rh.empregados[a]) && !rh.empresas.criar && rh.dashboard.ver && !rh.epi.excluir);
  const padrao = P.efetivas(usuario(s, "teste-usuario-3"));
  assert.ok(!padrao.empregados.ver && !padrao.clientes.ver && padrao.epi.criar && !padrao.epi.editar && !padrao.veiculos.criar);
  const restrito = P.efetivas(usuario(s, "teste-usuario-4"));
  const visiveis = P.TELAS.filter((t) => restrito[t.id].ver).map((t) => t.id);
  assert.deepEqual(visiveis, ["epi", "uniformes"]);
  assert.deepEqual(Object.keys(usuario(s, "teste-usuario-4").excecoes).sort(), ["dashboard", "ferramentas", "veiculos", "viagens", "equipamentos"].sort(), "só a diferença para o perfil é guardada");
});

test("marcar criar marca ver; desmarcar ver desmarca tudo; o Administrador não muda; só a exceção é guardada", () => {
  const s = memoria();
  let e = P.lerPermissoes(s);
  e = P.alternarAcao(e, "teste-usuario-3", "empresas", "excluir", true);
  const u = e.usuarios.find((x) => x.id === "teste-usuario-3");
  assert.ok(P.efetivas(u).empresas.ver && P.efetivas(u).empresas.excluir);
  e = P.alternarAcao(e, "teste-usuario-3", "empresas", "ver", false);
  assert.ok(P.ACOES.every((a) => !P.efetivas(e.usuarios.find((x) => x.id === "teste-usuario-3")).empresas[a]));
  assert.deepEqual(e.usuarios.find((x) => x.id === "teste-usuario-3").excecoes, {}, "voltou ao padrão do perfil: sem exceção");
  const antes = JSON.stringify(e.usuarios[0]);
  assert.equal(JSON.stringify(P.alternarAcao(e, "teste-usuario-1", "epi", "ver", false).usuarios[0]), antes);
  assert.deepEqual(P.voltarAoPerfil(P.alternarAcao(e, "teste-usuario-3", "epi", "criar", false), "teste-usuario-3").usuarios[2].excecoes, {});
});

test("as permissões sobrevivem a recarregar e voltam ao original ao restaurar", () => {
  const s = memoria();
  P.salvarPermissoes(s, P.alternarAcao(P.lerPermissoes(s), "teste-usuario-3", "viagens", "editar", true));
  P.definirUsuarioAtivo(s, "teste-usuario-3");
  assert.ok(P.efetivas(usuario(s, "teste-usuario-3")).viagens.editar, "lido de novo do armazenamento");
  assert.equal(P.usuarioAtivo(s).id, "teste-usuario-3");
  P.restaurarPermissoes(s);
  assert.ok(!P.efetivas(usuario(s, "teste-usuario-3")).viagens.editar);
  assert.equal(P.usuarioAtivo(s).perfil, "admin");
  s.setItem(P.CHAVE_PERMISSOES, "{ilegível");
  assert.equal(P.lerPermissoes(s).usuarios.length, 4, "dado ilegível volta ao original");
});

test("Restaurar dados de teste também restaura as permissões originais", () => {
  const s = memoria();
  prepararDadosDeTeste(s, base, new Date("2026-10-22T12:00:00-03:00"));
  P.salvarPermissoes(s, P.alternarAcao(P.lerPermissoes(s), "teste-usuario-3", "epi", "editar", true));
  pedirRestaurar(s);
  prepararDadosDeTeste(s, base, new Date("2026-10-22T12:00:00-03:00"));
  assert.ok(!P.efetivas(usuario(s, "teste-usuario-3")).epi.editar);
});

test("telas e tabelas ligam à matriz; rotinas administrativas são só do Administrador", () => {
  // Cada rota cai no menu dela (aba ou item de Parâmetros) ou, sem menu próprio, no módulo; o início da id é sempre o módulo.
  const modulo = (rota, busca) => P.telaDaRota(rota, busca)?.split("|")[0] ?? null;
  assert.equal(modulo("/epi"), "epi");
  assert.equal(modulo("/epi-ficha"), "epi");
  assert.equal(modulo("/cadastros/epi"), "epi");
  assert.equal(modulo("/cadastros/caixas-ferramentas"), "ferramentas");
  assert.equal(modulo("/cadastros/veiculos-checklist"), "veiculos");
  assert.equal(P.telaDaRota("/empresas"), "empresas");
  assert.equal(P.telaDaRota("/inicio"), null);
  assert.ok(P.rotaSoAdministrador("/cadastros/gerais/categorias") && !P.rotaSoAdministrador("/cadastros/epi"));
  assert.equal(P.telaDaTabela("epis_catalogo"), "epi");
  assert.equal(P.telaDaTabela("caixas_ferramentas"), "ferramentas");
});

test("a gravação é recusada sem permissão e liberada com ela", () => {
  const s = memoria();
  P.definirUsuarioAtivo(s, "teste-usuario-4");
  assert.match(P.recusaGravacao(s, "veiculos", "insert", [{}]), /Sem permissão/);
  assert.equal(P.recusaGravacao(s, "epis_catalogo", "insert", [{}]), null, "criar em EPIs vale para o restrito");
  assert.match(P.recusaGravacao(s, "epis_catalogo", "update", {}), /não pode editar em EPIs/);
  assert.match(P.recusaGravacao(s, "movimentacoes", "insert", [{ modulo: "ferramenta" }]), /Ferramentas/);
  assert.equal(P.recusaGravacao(s, "movimentacoes", "insert", [{ modulo: "epi" }]), null);
  assert.equal(P.recusaGravacao(s, "tabela_sem_tela", "delete", null), null);
  P.definirUsuarioAtivo(s, "teste-usuario-1");
  assert.equal(P.recusaGravacao(s, "veiculos", "delete", null), null);
});

test("só no modo demonstração: nada de permissões em produção e nada no Supabase", () => {
  const acesso = ler("lib/access-context.tsx");
  // Os ganchos das permissões de teste ficam num hook só do modo demonstração, escolhido na compilação; o hook de produção não usa nenhuma permissão de teste.
  assert.match(acesso, /function useAccessDemo\(\) \{[\s\S]*?useRouterState[\s\S]*?useSyncExternalStore[\s\S]*?\n\}\n\nfunction useAccessProducao/);
  assert.match(acesso, /export const useAccess: typeof useAccessDemo = import\.meta\.env\.VITE_DEMO_MODE !== "false" \? useAccessDemo : useAccessProducao;/);
  const producao = acesso.slice(acesso.indexOf("function useAccessProducao"), acesso.indexOf("export const useAccess"));
  assert.doesNotMatch(producao, /usuarioAtivo|fotografiaPermissoes|useRouterState|localStorage/, "produção não lê permissões de teste");
  assert.match(ler("routes/_authenticated/route.tsx"), /const ConfiguracoesDemo = import\.meta\.env\.VITE_DEMO_MODE !== "false"\s*\n\s*\? lazy\(/);
  assert.match(ler("integrations/supabase/demo-client.ts"), /this\.acao && typeof window !== "undefined" && import\.meta\.env\?\.VITE_DEMO_MODE !== "false"\) \{\s*\n\s*const recusa = recusaGravacao/);
  for (const arq of ["lib/permissoes-demo.ts", "components/layout/ConfiguracoesDemo.tsx", "components/layout/ConfiguracoesAcessos.tsx"]) assert.doesNotMatch(ler(arq), /supabase|fetch\(|\.from\(/, arq);
});

test("cada menu do sistema (aba do módulo e item de Parâmetros) é uma tela da matriz e herda o que o módulo tem", async () => {
  const { GRUPOS_INICIO } = await import("../src/lib/inicio.ts");
  const itens = GRUPOS_INICIO.flatMap((g) => g.cartoes).filter((c) => c.itens && !c.soAdmin).flatMap((c) => c.itens.filter((i) => !i.soAdmin));
  assert.ok(P.SUBTELAS.length >= itens.length - 3 && P.SUBTELAS.length > 60, `um menu por aba e por item de Parâmetros (${P.SUBTELAS.length})`);
  assert.equal(new Set(P.SUBTELAS.map((s) => s.id)).size, P.SUBTELAS.length, "ids únicos");
  const s = memoria();
  const padrao = P.lerPermissoes(s).usuarios.find((u) => u.id === "teste-usuario-3");
  const menu = P.SUBTELAS.find((m) => m.pai === "epi" && m.secao === "Módulo");
  const ef = P.efetivas(padrao);
  assert.deepEqual(ef[menu.id], ef.epi, "sem exceção, herda o módulo");
  // Tirar só um menu: o resto do módulo continua, e a rota daquele menu fica sem acesso.
  let e = P.alternarAcao(P.lerPermissoes(s), "teste-usuario-3", menu.id, "ver", false);
  const u = e.usuarios.find((x) => x.id === "teste-usuario-3");
  assert.ok(!P.pode(u, menu.id, "ver") && P.pode(u, "epi", "ver"));
  assert.deepEqual(Object.keys(u.excecoes), [menu.id], "só a exceção do menu é guardada");
  const rota = P.telaDaRota(menu.url, menu.search ?? {});
  assert.equal(rota, menu.id);
  assert.ok(!P.pode(u, rota, "ver"));
  const outro = P.SUBTELAS.find((m) => m.pai === "epi" && m.id !== menu.id && m.secao === "Módulo");
  assert.ok(P.pode(u, P.telaDaRota(outro.url, outro.search ?? {}), "ver"), "outro menu do módulo segue liberado");
  // Mexer no módulo não apaga a exceção do menu; tirar "ver" do módulo esconde todos os menus.
  e = P.alternarAcao(e, "teste-usuario-3", "epi", "ver", false);
  const sem = e.usuarios.find((x) => x.id === "teste-usuario-3");
  assert.ok(P.SUBTELAS.filter((m) => m.pai === "epi").every((m) => !P.pode(sem, m.id, "ver")));
  assert.ok(sem.excecoes[menu.id], "a exceção do menu continua guardada");
  // Liberar criar só num menu, sem liberar no módulo.
  const so = P.alternarAcao(P.lerPermissoes(s), "teste-usuario-3", outro.id, "editar", true).usuarios.find((x) => x.id === "teste-usuario-3");
  assert.ok(P.pode(so, outro.id, "editar") && !P.pode(so, "epi", "editar"));
});
