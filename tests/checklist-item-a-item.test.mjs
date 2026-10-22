import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { criarAssociacao, lerAssociacoes, checklistsDaAssociacao as checklistsVeiculo } from "../src/lib/checklist-associacao-veiculo.ts";
import { gruposAssociadosDoVeiculo } from "../src/lib/checklist-veiculo.ts";
import {
  checklistsDaAssociacao as checklistsEquip, lerChecklistEquipamento, removerAssociacao, salvarAssociacao, salvarGrupoChecklist,
} from "../src/lib/equipamentos-checklist.ts";

const memoria = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};
const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");

// ---------- veículos ----------
const grupoVeic = { id: "g1", nome: "Lança e cabos", tiposVeiculo: ["todos"], itens: [{ id: "i1", nome: "Lança" }, { id: "i2", nome: "Cabos" }, { id: "i3", nome: "Patolas" }] };
const periodico = (extra = {}) => ({ grupoId: "g1", tipo: "periodico", periodicidade: "Mensal", ...extra });

test("veículo: associação guarda só os itens escolhidos e o grupo vem do módulo só com eles", () => {
  const s = memoria();
  criarAssociacao("v1", null, [periodico({ itensIds: ["i1", "i3"] })], s);
  const a = lerAssociacoes(s)[0];
  assert.deepEqual(a.itens[0].itensIds, ["i1", "i3"]);
  const grupos = gruposAssociadosDoVeiculo(a, [grupoVeic]);
  assert.deepEqual(grupos[0].itens.map((i) => i.nome), ["Lança", "Patolas"]);
  assert.equal(grupoVeic.itens.length, 3, "o grupo original não muda");
  assert.deepEqual(checklistsVeiculo("ABC1234", a, [grupoVeic])[0].grupos[0].itensIds, ["i1", "i3"]);
});

test("veículo: sem itensIds o grupo vale inteiro (dados antigos); lista vazia de itens é recusada e nada é gravado", () => {
  const s = memoria();
  criarAssociacao("v1", null, [periodico()], s);
  assert.equal(lerAssociacoes(s)[0].itens[0].itensIds, undefined);
  assert.equal(gruposAssociadosDoVeiculo(lerAssociacoes(s)[0], [grupoVeic])[0].itens.length, 3);
  const s2 = memoria();
  assert.throws(() => criarAssociacao("v1", null, [periodico({ itensIds: [] })], s2), /ao menos um item/i);
  assert.equal(s2.getItem("gemape-demo-associacoes-checklist-veiculo"), null);
});

test("veículo: itens escolhidos que sumiram do grupo tiram o grupo do check list (sem item, sem grupo)", () => {
  const s = memoria();
  criarAssociacao("v1", null, [periodico({ itensIds: ["i9"] })], s);
  assert.deepEqual(gruposAssociadosDoVeiculo(lerAssociacoes(s)[0], [grupoVeic]), []);
});

test("veículo: a tela traz grupo → itens, com uma caixa por item, e só grava os itens marcados", () => {
  const tela = ler("components/parametros/AssociarChecklistVeiculo.tsx");
  assert.match(tela, /assoc-grupo-\$\{g\.id\}/);
  assert.match(tela, /assoc-item-\$\{i\.id\}/);
  assert.match(tela, /itensIds: ids/);
  assert.match(tela, /indeterminate/);
});

// ---------- equipamentos ----------
const grupoEq = (s) => salvarGrupoChecklist("manutencao", { nome: "Lança e cabos", itens: ["lança", "cabos", "patolas"], tipos: ["todos"] }, s);
const assocEq = (s, itensIds, extra = {}) => salvarAssociacao("manutencao", { modo: "criar", equipamentoId: "e1", tipoId: "tipo-munck", responsavel: null, itens: [{ grupoId: grupoEq(s).id, tipo: "periodico", periodicidade: "Mensal", ...(itensIds ? { itensIds } : {}), ...extra }] }, s, new Date());

test("equipamento: guarda só os itens escolhidos; com todos, o grupo vale inteiro", () => {
  const s = memoria();
  const g = grupoEq(s);
  const [a, b] = g.itens;
  const parcial = salvarAssociacao("manutencao", { modo: "criar", equipamentoId: "e1", tipoId: "tipo-munck", responsavel: null, itens: [{ grupoId: g.id, tipo: "periodico", periodicidade: "Mensal", itensIds: [a.id, b.id] }] }, s, new Date());
  assert.deepEqual(parcial.itens[0].itensIds, [a.id, b.id]);
  const parte = lerChecklistEquipamento(s).manutencao;
  assert.deepEqual(checklistsEquip("MUN-001", parte.associacoes[0], parte.grupos)[0].grupos[0].itensIds, [a.id, b.id]);
  const s2 = memoria();
  const g2 = grupoEq(s2);
  const todos = salvarAssociacao("manutencao", { modo: "criar", equipamentoId: "e1", tipoId: "tipo-munck", responsavel: null, itens: [{ grupoId: g2.id, tipo: "avulso", itensIds: g2.itens.map((i) => i.id) }] }, s2, new Date());
  assert.equal(todos.itens[0].itensIds, undefined);
});

test("equipamento: recusa lista vazia e item que não é do grupo, sem gravar nada", () => {
  const s = memoria();
  assert.throws(() => assocEq(s, []), /ao menos um item/i);
  const s2 = memoria();
  assert.throws(() => assocEq(s2, ["nao-existe"]), /não existe mais/i);
  assert.equal(lerChecklistEquipamento(s2).manutencao.associacoes.length, 0);
});

test("equipamento: a tela traz grupo → itens com caixas por item e mostra 'N de M itens' na tabela", () => {
  const tela = ler("components/parametros/ChecklistEquipamento.tsx");
  assert.match(tela, /Itens de \$\{g\.nome\}/);
  assert.match(tela, /alternarItem\(g, i\.id/);
  assert.match(tela, /itensIds: marcadosDe\(g\)/);
  assert.match(tela, /de \$\{total\} itens/);
});

// ---------- correções do code review ----------
test("veículo: item escolhido que não é do grupo é recusado quando a tela passa os itens de cada grupo", () => {
  const s = memoria();
  const itensDosGrupos = { g1: ["i1", "i2", "i3"] };
  assert.throws(() => criarAssociacao("v1", null, [periodico({ itensIds: ["i1", "fantasma"] })], s, new Date(), ["g1"], itensDosGrupos), /não existe mais no grupo/i);
  assert.equal(s.getItem("gemape-demo-associacoes-checklist-veiculo"), null);
  criarAssociacao("v1", null, [periodico({ itensIds: ["i1"] })], s, new Date(), ["g1"], itensDosGrupos);
  assert.deepEqual(lerAssociacoes(s)[0].itens[0].itensIds, ["i1"]);
});

test("equipamento: item renomeado (id novo) sai da conta e, sem nenhum item, o grupo sai do check list", () => {
  const s = memoria();
  const g = grupoEq(s);
  const [a, b] = g.itens;
  salvarAssociacao("manutencao", { modo: "criar", equipamentoId: "e1", tipoId: "tipo-munck", responsavel: null, itens: [{ grupoId: g.id, tipo: "avulso", itensIds: [a.id, b.id] }] }, s, new Date());
  salvarGrupoChecklist("manutencao", { id: g.id, nome: g.nome, itens: ["lança nova", b.nome, "patolas"], tipos: ["todos"] }, s);
  const parte = lerChecklistEquipamento(s).manutencao;
  assert.deepEqual(checklistsEquip("MUN-001", parte.associacoes[0], parte.grupos)[0].grupos[0].itensIds, [b.id]);
  salvarGrupoChecklist("manutencao", { id: g.id, nome: g.nome, itens: ["x", "y", "z"], tipos: ["todos"] }, s);
  const depois = lerChecklistEquipamento(s).manutencao;
  assert.deepEqual(checklistsEquip("MUN-001", depois.associacoes[0], depois.grupos), []);
});

test("equipamento: associação de equipamento que não existe mais não trava a edição do tipo do grupo; excluir duas vezes avisa", () => {
  const s = memoria();
  const g = salvarGrupoChecklist("manutencao", { nome: "Freios", itens: ["a"], tipos: ["tipo-munck", "tipo-empilhadeiras"] }, s);
  salvarAssociacao("manutencao", { modo: "criar", equipamentoId: "sumiu", tipoId: "tipo-munck", responsavel: null, itens: [{ grupoId: g.id, tipo: "avulso" }] }, s, new Date());
  const semTipo = () => undefined;
  salvarGrupoChecklist("manutencao", { id: g.id, nome: g.nome, itens: ["a"], tipos: ["tipo-empilhadeiras"] }, s, undefined, semTipo);
  removerAssociacao("manutencao", "sumiu", s);
  assert.throws(() => removerAssociacao("manutencao", "sumiu", s), /já foi excluída/i);
});

test("a tela de clonar acha o responsável do original, e o topo e o início não renderizam à toa", async () => {
  const { readFileSync } = await import("node:fs");
  const ler2 = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
  assert.match(ler2("components/parametros/ChecklistEquipamento.tsx"), /\(editando \?\? clonandoDe\)\)\?\.responsavel/);
  assert.match(ler2("components/parametros/ChecklistEquipamento.tsx"), /useVersaoArmazenamento/);
  assert.match(ler2("components/layout/MenuDaArea.tsx"), /useRouterState\(\{ select: \(s\) => s\.location\.pathname \}\)/);
  assert.match(ler2("routes/_authenticated/inicio.tsx"), /setAbertos\(\(a\) => \(a\.size \? new Set\(\) : a\)\)/);
});

test("cadastro de grupo: itens do padrão para marcar, lista editável dos selecionados e item próprio (veículos e equipamentos)", () => {
  const editor = ler("components/parametros/EditorItensChecklist.tsx");
  assert.match(editor, /Itens padrão \(marque para incluir no grupo\)/);
  assert.match(editor, /selecionados/);
  assert.match(editor, /Novo item do grupo/);
  assert.match(editor, /aria-label=\{`Remover \$\{l\}`\}/);
  assert.doesNotMatch(editor, /dangerouslySetInnerHTML|innerHTML|document\./);
  const veic = ler("components/parametros/VeiculosListasParametros.tsx");
  assert.match(veic, /<EditorItensChecklist id="veiculo-lista-descricao"/);
  assert.match(veic, /catalogoItens=\{CHECKLIST_VEICULOS_PADRAO/);
  const equip = ler("components/parametros/ChecklistEquipamento.tsx");
  assert.match(equip, /<EditorItensChecklist id="grupo-equip-itens"/);
  assert.match(equip, /GRUPOS_PADRAO_VISTORIA : GRUPOS_PADRAO_MANUTENCAO/);
});

test("associação: personalizar itens (padrão + próprios) vira um grupo só do veículo/equipamento e não deixa grupo sobrando se a associação falhar", () => {
  const veic = ler("components/parametros/AssociarChecklistVeiculo.tsx");
  assert.match(veic, /data-testid="itens-personalizados"/);
  assert.match(veic, /Personalizado · \$\{placa\}/);
  assert.match(veic, /adicionarGrupoChecklistVeiculo\(nome, proprios/);
  assert.match(veic, /removerGrupoChecklistVeiculo\(novoId\)/);
  const equip = ler("components/parametros/ChecklistEquipamento.tsx");
  assert.match(equip, /data-testid="itens-personalizados"/);
  assert.match(equip, /Personalizado · \$\{escolhido\.patrimonio\}/);
  assert.match(equip, /salvarGrupoChecklist\(finalidade, \{ nome, itens: proprios, tipos: \[escolhido\.tipoId\] \}\)/);
  assert.match(equip, /removerGrupoChecklist\(finalidade, novoGrupoId\)/);
});

test("opções do Novo check list têm o nome da tabela de associação: Placa >> Periodicidade >> Responsável (avulso: Não definida)", async () => {
  const { nomeDoChecklistAssociado, checklistsDaAssociacao: nomesDaTabela } = await import("../src/lib/checklist-associacao-veiculo.ts");
  const maria = { id: "m", nome: "Maria da Silva" };
  const diaria = { responsavel: maria, itens: [{ grupoId: "g1", tipo: "periodico", periodicidade: "Diária", obrigatorio: true }] };
  assert.equal(nomeDoChecklistAssociado("ABC-1599", diaria, "Diário"), "ABC-1599 >> Diária >> Maria da Silva");
  // é o mesmo texto que a tabela de associação mostra
  assert.equal(nomesDaTabela("ABC-1599", { veiculoId: "v", atualizadoEm: "", ...diaria }, [{ id: "g1", nome: "G" }])[0].nome, nomeDoChecklistAssociado("ABC-1599", diaria, "Diário"));
  // avulso sem grupos avulsos na associação: responsável não definido; com grupos avulsos, o da associação
  assert.equal(nomeDoChecklistAssociado("ABC-1599", diaria, "avulso"), "ABC-1599 >> Não definida >> Não definido");
  const avulsa = { responsavel: maria, itens: [{ grupoId: "g2", tipo: "avulso", periodicidade: "Não definida", obrigatorio: false }] };
  assert.equal(nomeDoChecklistAssociado("ABC-1599", avulsa, "avulso"), "ABC-1599 >> Não definida >> Maria da Silva");
  assert.equal(nomeDoChecklistAssociado("ABC-1599", null, "avulso"), "ABC-1599 >> Não definida >> Não definido");
  assert.equal(nomeDoChecklistAssociado("ABC-1599", { responsavel: null, itens: [{ grupoId: "g", tipo: "periodico", periodicidade: "Mensal", obrigatorio: true }] }, "Mensal"), "ABC-1599 >> Mensal >> Não definido");
});
