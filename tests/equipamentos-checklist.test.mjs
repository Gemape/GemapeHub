import test from "node:test";
import assert from "node:assert/strict";

import {
  FINALIDADES, NAO_DEFINIDA, TODOS_OS_TIPOS, checklistsDaAssociacao, gruposAplicaveis, lerChecklistEquipamento, removerAssociacao,
  removerGrupoChecklist, salvarAssociacao, salvarGrupoChecklist,
} from "../src/lib/equipamentos-checklist.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const agora = new Date("2026-10-22T15:00:00Z");
const MUNCK = "tipo-munck";
const EMPILHADEIRA = "tipo-empilhadeiras";
const TIPOS = [MUNCK, EMPILHADEIRA, "tipo-ponte-rolante"];
const grupo = (nome = "Lança e cabos", extra = {}) => ({ nome, itens: ["lança", "cabos de aço", "estabilizadores"], tipos: [MUNCK], ...extra });
const novoGrupo = (s, finalidade = "manutencao", g = grupo()) => salvarGrupoChecklist(finalidade, g, s, TIPOS);
const ASSOC = (grupoId, extra = {}) => ({ grupoId, tipo: "periodico", periodicidade: "Mensal", ...extra });
const nova = (s, g, extra = {}) => salvarAssociacao("manutencao", { modo: "criar", equipamentoId: "eq-1", tipoId: MUNCK, responsavel: { id: "emp-1", nome: "Maria" }, itens: [ASSOC(g.id)], ...extra }, s, agora);

test("há dois check lists de equipamento: manutenção e vistoria", () => {
  assert.deepEqual(FINALIDADES.map((f) => [f.id, f.nome]), [["manutencao", "Manutenção"], ["vistoria", "Vistoria"]]);
  const c = lerChecklistEquipamento(memoria());
  assert.deepEqual(Object.keys(c).sort(), ["manutencao", "vistoria"]);
  assert.deepEqual(c.manutencao, { grupos: [], associacoes: [] });
});

test("os dois são independentes: grupo e associação de um não aparecem no outro", () => {
  const s = memoria();
  const g = novoGrupo(s, "manutencao");
  nova(s, g);
  const c = lerChecklistEquipamento(s);
  assert.equal(c.manutencao.grupos.length, 1);
  assert.equal(c.manutencao.associacoes.length, 1);
  assert.equal(c.vistoria.grupos.length, 0);
  assert.equal(c.vistoria.associacoes.length, 0);
  // o mesmo nome de grupo pode existir nos dois
  assert.doesNotThrow(() => novoGrupo(s, "vistoria"));
  assert.throws(() => salvarGrupoChecklist("outra", grupo(), s, TIPOS), /check list/i);
});

test("grupo: nome capitalizado, itens um por linha e tipo de equipamento", () => {
  const s = memoria();
  const g = novoGrupo(s, "manutencao", { nome: "  lança   e cabos ", itens: [" lança ", "Cabos de aço", ""], tipos: [MUNCK, EMPILHADEIRA] });
  assert.equal(g.nome, "Lança e cabos");
  assert.deepEqual(g.itens.map((i) => i.nome), ["Lança", "Cabos de aço"]);
  assert.ok(g.itens.every((i) => i.id));
  assert.deepEqual(g.tipos, [MUNCK, EMPILHADEIRA]);
});

test("grupo: nome e ao menos um item são obrigatórios; nome único na finalidade; itens sem repetir", () => {
  const s = memoria();
  assert.throws(() => novoGrupo(s, "manutencao", grupo(" ")), /nome do grupo/i);
  assert.throws(() => novoGrupo(s, "manutencao", grupo("X", { itens: ["", "  "] })), /ao menos um item/i);
  assert.throws(() => novoGrupo(s, "manutencao", grupo("X", { itens: ["Lança", "lança"] })), /repetido/i);
  novoGrupo(s);
  assert.throws(() => novoGrupo(s, "manutencao", grupo("LANÇA E CABOS")), /já existe/i);
  assert.equal(lerChecklistEquipamento(s).manutencao.grupos.length, 1);
});

test("grupo: Todos os tipos vale sozinho; tipo que não existe é recusado", () => {
  const s = memoria();
  assert.deepEqual(novoGrupo(s, "manutencao", grupo("A", { tipos: [MUNCK, TODOS_OS_TIPOS] })).tipos, [TODOS_OS_TIPOS]);
  assert.throws(() => novoGrupo(s, "manutencao", grupo("B", { tipos: ["tipo-fantasma"] })), /tipo de equipamento/i);
  assert.deepEqual(novoGrupo(s, "manutencao", grupo("C", { tipos: [] })).tipos, [], "sem tipo: não aparece em nenhum equipamento");
});

test("editar o grupo mantém o id e os ids dos itens que continuam; o próprio nome não conta como repetido", () => {
  const s = memoria();
  const g = novoGrupo(s);
  const e = salvarGrupoChecklist("manutencao", { id: g.id, nome: "Lança e cabos", itens: ["Lança", "Cabos de aço", "Gancho"], tipos: [MUNCK] }, s, TIPOS);
  assert.equal(e.id, g.id);
  assert.equal(e.itens.find((i) => i.nome === "Lança").id, g.itens.find((i) => i.nome === "Lança").id);
  assert.equal(e.itens.length, 3);
  assert.throws(() => salvarGrupoChecklist("manutencao", { id: "inexistente", ...grupo("Z") }, s, TIPOS), /excluído/i);
});

test("grupo associado a um equipamento não se exclui; sem associação, sim", () => {
  const s = memoria();
  const g = novoGrupo(s);
  nova(s, g);
  assert.throws(() => removerGrupoChecklist("manutencao", g.id, s), /1 equipamento/);
  removerAssociacao("manutencao", "eq-1", s);
  removerGrupoChecklist("manutencao", g.id, s);
  assert.equal(lerChecklistEquipamento(s).manutencao.grupos.length, 0);
  assert.throws(() => removerGrupoChecklist("manutencao", g.id, s), /excluído/i);
});

test("grupos que valem para o tipo do equipamento: os do tipo e os de todos os tipos", () => {
  const s = memoria();
  const a = novoGrupo(s, "manutencao", grupo("Do munck", { tipos: [MUNCK] }));
  const b = novoGrupo(s, "manutencao", grupo("Da empilhadeira", { tipos: [EMPILHADEIRA] }));
  const c = novoGrupo(s, "manutencao", grupo("De todos", { tipos: [TODOS_OS_TIPOS] }));
  const todos = lerChecklistEquipamento(s).manutencao.grupos;
  assert.deepEqual(gruposAplicaveis(MUNCK, todos).map((g) => g.id), [a.id, c.id]);
  assert.deepEqual(gruposAplicaveis(EMPILHADEIRA, todos).map((g) => g.id), [b.id, c.id]);
  assert.deepEqual(gruposAplicaveis("", todos).map((g) => g.id), [c.id]);
});

test("associação: grava equipamento, responsável, grupos, periodicidade e a data, com periódico obrigatório", () => {
  const s = memoria();
  const g = novoGrupo(s);
  const a = nova(s, g);
  assert.equal(a.equipamentoId, "eq-1");
  assert.deepEqual(a.responsavel, { id: "emp-1", nome: "Maria" });
  assert.deepEqual(a.itens, [{ grupoId: g.id, tipo: "periodico", periodicidade: "Mensal", obrigatorio: true }]);
  assert.equal(a.atualizadoEm, agora.toISOString());
  assert.equal(lerChecklistEquipamento(s).manutencao.associacoes.length, 1);
});

test("associação avulsa não tem periodicidade e não é obrigatória; responsável pode ser Não definido", () => {
  const s = memoria();
  const g = novoGrupo(s);
  const a = nova(s, g, { responsavel: null, itens: [ASSOC(g.id, { tipo: "avulso", periodicidade: "Semanal" })] });
  assert.equal(a.responsavel, null);
  assert.deepEqual(a.itens[0], { grupoId: g.id, tipo: "avulso", periodicidade: NAO_DEFINIDA, obrigatorio: false });
});

test("associação: validações", () => {
  const s = memoria();
  const g = novoGrupo(s);
  const de = (extra) => () => nova(s, g, extra);
  assert.throws(de({ equipamentoId: "" }), /equipamento/i);
  assert.throws(de({ itens: [] }), /ao menos um grupo/i);
  assert.throws(de({ itens: [ASSOC("fantasma")] }), /não existe mais/i);
  assert.throws(de({ itens: [ASSOC(g.id), ASSOC(g.id)] }), /repetido/i);
  assert.throws(de({ itens: [ASSOC(g.id, { periodicidade: "A cada dia" })] }), /periodicidade/i);
  assert.throws(de({ itens: [ASSOC(g.id, { periodicidade: NAO_DEFINIDA })] }), /periodicidade/i);
  assert.throws(de({ responsavel: { id: "", nome: "x" } }), /responsável/i);
  assert.equal(lerChecklistEquipamento(s).manutencao.associacoes.length, 0);
});

test("associação: só grupos que valem para o tipo do equipamento", () => {
  const s = memoria();
  const doMunck = novoGrupo(s, "manutencao", grupo("Do munck", { tipos: [MUNCK] }));
  const daEmpilhadeira = novoGrupo(s, "manutencao", grupo("Da empilhadeira", { tipos: [EMPILHADEIRA] }));
  assert.throws(() => nova(s, doMunck, { itens: [ASSOC(daEmpilhadeira.id)] }), /não vale para o tipo/i);
  assert.doesNotThrow(() => nova(s, doMunck));
});

test("um equipamento tem uma associação por check list; criar de novo é recusado, editar troca tudo", () => {
  const s = memoria();
  const g = novoGrupo(s);
  const outro = novoGrupo(s, "manutencao", grupo("Outro", { tipos: [TODOS_OS_TIPOS] }));
  nova(s, g);
  assert.throws(() => nova(s, g), /já tem/i);
  const e = salvarAssociacao("manutencao", { modo: "editar", equipamentoId: "eq-1", tipoId: MUNCK, responsavel: null, itens: [ASSOC(outro.id, { periodicidade: "Diária" })] }, s, agora);
  assert.deepEqual(e.itens.map((i) => [i.grupoId, i.periodicidade]), [[outro.id, "Diária"]]);
  assert.equal(lerChecklistEquipamento(s).manutencao.associacoes.length, 1);
  assert.throws(() => salvarAssociacao("manutencao", { modo: "editar", equipamentoId: "nao-tem", tipoId: MUNCK, responsavel: null, itens: [ASSOC(g.id)] }, s, agora), /não encontrada/i);
  // o mesmo equipamento pode ter a sua vistoria, à parte
  const v = novoGrupo(s, "vistoria");
  assert.doesNotThrow(() => salvarAssociacao("vistoria", { modo: "criar", equipamentoId: "eq-1", tipoId: MUNCK, responsavel: null, itens: [ASSOC(v.id)] }, s, agora));
});

test("remover a associação tira só a dele", () => {
  const s = memoria();
  const g = novoGrupo(s);
  nova(s, g);
  nova(s, g, { equipamentoId: "eq-2" });
  removerAssociacao("manutencao", "eq-1", s);
  assert.deepEqual(lerChecklistEquipamento(s).manutencao.associacoes.map((a) => a.equipamentoId), ["eq-2"]);
});

test("cada periodicidade é um check list do equipamento, com o nome PATRIMÔNIO >> PERIODICIDADE >> RESPONSÁVEL", () => {
  const s = memoria();
  const g1 = novoGrupo(s, "manutencao", grupo("Lança", { tipos: [TODOS_OS_TIPOS] }));
  const g2 = novoGrupo(s, "manutencao", grupo("Freios", { tipos: [TODOS_OS_TIPOS] }));
  const g3 = novoGrupo(s, "manutencao", grupo("Pintura", { tipos: [TODOS_OS_TIPOS] }));
  const a = nova(s, g1, { itens: [ASSOC(g1.id), ASSOC(g2.id), ASSOC(g3.id, { tipo: "avulso" })] });
  const grupos = lerChecklistEquipamento(s).manutencao.grupos;
  const lista = checklistsDaAssociacao("MUN-001", a, grupos);
  assert.deepEqual(lista.map((c) => c.nome), ["MUN-001 >> Mensal >> Maria", "MUN-001 >> Não definida >> Maria"]);
  assert.deepEqual(lista.map((c) => c.tipo), ["Periódico", "Avulso"]);
  assert.deepEqual(lista.map((c) => c.obrigatorio), ["Sim", "Não"]);
  assert.deepEqual(lista[0].grupos.map((x) => x.nome), ["Lança", "Freios"]);
  const livre = checklistsDaAssociacao("MUN-001", { ...a, responsavel: null }, grupos);
  assert.equal(livre[1].tipo, "Livre");
  assert.equal(livre[1].nome, "MUN-001 >> Não definida >> Não definido");
});

test("dado salvo ilegível não é sobrescrito: a leitura vem vazia e gravar recusa", () => {
  const s = memoria();
  s.setItem("gemape-demo-equipamentos-checklist", "{quebrado");
  assert.deepEqual(lerChecklistEquipamento(s).manutencao, { grupos: [], associacoes: [] });
  assert.throws(() => novoGrupo(s), /ilegíveis/i);
  assert.equal(s.getItem("gemape-demo-equipamentos-checklist"), "{quebrado");
});

test("erro de validação não grava nada (tudo ou nada)", () => {
  const s = memoria();
  assert.throws(() => novoGrupo(s, "manutencao", grupo(" ")));
  assert.equal(s.getItem("gemape-demo-equipamentos-checklist"), null);
});

test("a tela do check list: itens no alto, associação embaixo, dois check lists por ?aba=", async () => {
  const { readFileSync } = await import("node:fs");
  const tela = readFileSync(new URL("../src/components/parametros/ChecklistEquipamento.tsx", import.meta.url), "utf8");
  const rota = readFileSync(new URL("../src/routes/_authenticated/cadastros/equipamentos-checklist.tsx", import.meta.url), "utf8");
  assert.ok(tela.indexOf("<ListaGrupos") < tela.indexOf("<AssociarEquipamento"));
  assert.match(tela, /Cadastrar grupo do check list/);
  assert.match(tela, /Associar itens de check list a um equipamento/);
  assert.match(tela, /Patrimônio &gt;&gt; Periodicidade &gt;&gt; Responsável/);
  assert.match(rota, /ehFinalidade\(busca\["aba"\]\)/);
  const { MENU_EQUIPAMENTOS } = await import("../src/lib/menu-parametros.ts");
  assert.deepEqual(MENU_EQUIPAMENTOS.filter((i) => i.url.endsWith("equipamentos-checklist")).map((i) => i.search.aba), ["manutencao", "vistoria"]);
});

test("padrão de manutenção: um grupo por rotina, só no tipo certo, sem duplicar ao repetir", async () => {
  const { cadastrarPadraoManutencao } = await import("../src/lib/equipamentos-checklist.ts");
  const { GRUPOS_PADRAO_MANUTENCAO } = await import("../src/lib/equipamentos-manutencao-padrao.ts");
  const { TIPOS_PADRAO } = await import("../src/lib/equipamentos-parametros.ts");
  assert.ok(GRUPOS_PADRAO_MANUTENCAO.length === 16);
  assert.ok(GRUPOS_PADRAO_MANUTENCAO.every((g) => TIPOS_PADRAO.some((t) => t.id === g.tipoId) && g.itens.length > 0));
  const s = memoria();
  assert.equal(cadastrarPadraoManutencao(s).criados, GRUPOS_PADRAO_MANUTENCAO.length);
  assert.equal(lerChecklistEquipamento(s).manutencao.grupos.length, GRUPOS_PADRAO_MANUTENCAO.length);
  assert.equal(lerChecklistEquipamento(s).vistoria.grupos.length, 0);
  assert.equal(cadastrarPadraoManutencao(s).criados, 0);
  const g = lerChecklistEquipamento(s).manutencao.grupos.find((x) => x.tipos.includes("tipo-munck"));
  assert.deepEqual(g.tipos, ["tipo-munck"]);
});

test("padrão de vistoria: um grupo por rotina no tipo certo, só na vistoria, sem duplicar ao repetir", async () => {
  const { cadastrarPadraoVistoria } = await import("../src/lib/equipamentos-checklist.ts");
  const { GRUPOS_PADRAO_VISTORIA } = await import("../src/lib/equipamentos-vistoria-padrao.ts");
  const { TIPOS_PADRAO } = await import("../src/lib/equipamentos-parametros.ts");
  assert.equal(GRUPOS_PADRAO_VISTORIA.length, 16);
  assert.ok(GRUPOS_PADRAO_VISTORIA.every((g) => TIPOS_PADRAO.some((t) => t.id === g.tipoId) && g.itens.length > 0));
  const s = memoria();
  assert.equal(cadastrarPadraoVistoria(s).criados, 16);
  assert.equal(lerChecklistEquipamento(s).vistoria.grupos.length, 16);
  assert.equal(lerChecklistEquipamento(s).manutencao.grupos.length, 0);
  assert.equal(cadastrarPadraoVistoria(s).criados, 0);
});
