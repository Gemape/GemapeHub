import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { GRUPOS_PADRAO_MANUTENCAO } from "../src/lib/equipamentos-manutencao-padrao.ts";
import { GRUPOS_PADRAO_VISTORIA } from "../src/lib/equipamentos-vistoria-padrao.ts";
import * as C from "../src/lib/equipamentos-checklist.ts";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const memoria = () => {
  const m = new Map();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)) };
};
const grupos = (s, f) => C.lerChecklistEquipamento(s)[f].grupos;
const PADROES = { manutencao: GRUPOS_PADRAO_MANUTENCAO, vistoria: GRUPOS_PADRAO_VISTORIA };

for (const finalidade of ["manutencao", "vistoria"]) {
  test(`${finalidade}: situação do padrão inicial: igual, alterado ou não cadastrado`, () => {
    const s = memoria();
    assert.ok(C.situacaoPadraoChecklist(finalidade, s).every((p) => p.situacao === "ausente"), "sem nada cadastrado");
    C.cadastrarPadraoChecklist(finalidade, s);
    const situacao = () => C.situacaoPadraoChecklist(finalidade, s);
    assert.equal(situacao().length, PADROES[finalidade].length);
    assert.ok(situacao().every((p) => p.situacao === "igual"));
    const g = grupos(s, finalidade)[0];
    C.salvarGrupoChecklist(finalidade, { id: g.id, nome: g.nome, itens: [g.itens[0].nome, "Item meu"], tipos: g.tipos }, s);
    assert.equal(situacao()[0].situacao, "alterado");
    C.removerGrupoChecklist(finalidade, g.id, s);
    assert.equal(situacao()[0].situacao, "ausente");
  });

  test(`${finalidade}: restaurar configurações iniciais traz de volta só o marcado, mantém o id e recria o excluído`, () => {
    const s = memoria();
    C.cadastrarPadraoChecklist(finalidade, s);
    const [a, b] = grupos(s, finalidade);
    // a: itens e tipo alterados; b: excluído.
    C.salvarGrupoChecklist(finalidade, { id: a.id, nome: a.nome, itens: ["Só este item"], tipos: [C.TODOS_OS_TIPOS] }, s);
    C.removerGrupoChecklist(finalidade, b.id, s);
    const r = C.restaurarPadroesChecklist(finalidade, [a.nome, b.nome], s);
    assert.deepEqual(r, { restaurados: 1, criados: 1, semTipo: 0 });
    const padraoA = PADROES[finalidade].find((p) => p.nome === a.nome);
    const depoisA = grupos(s, finalidade).find((g) => g.nome === a.nome);
    assert.equal(depoisA.id, a.id, "o id fica");
    assert.deepEqual(depoisA.itens.map((i) => i.nome), [...padraoA.itens]);
    assert.deepEqual(depoisA.tipos, [padraoA.tipoId]);
    assert.ok(grupos(s, finalidade).some((g) => g.nome === b.nome), "o excluído foi cadastrado de novo");
    assert.ok(C.situacaoPadraoChecklist(finalidade, s).every((p) => p.situacao === "igual"));
    assert.throws(() => C.restaurarPadroesChecklist(finalidade, [], s), /Marque ao menos um padrão/);
    assert.throws(() => C.restaurarPadroesChecklist(finalidade, ["Grupo inventado"], s), /não faz parte do padrão inicial/);
  });
}

test("restaurar não mexe nos grupos que a pessoa criou nem nas associações", () => {
  const s = memoria();
  C.cadastrarPadraoChecklist("vistoria", s);
  const meu = C.salvarGrupoChecklist("vistoria", { nome: "Meu grupo", itens: ["X"], tipos: [C.TODOS_OS_TIPOS] }, s);
  const padrao = grupos(s, "vistoria").find((g) => g.nome !== "Meu grupo");
  C.restaurarPadroesChecklist("vistoria", [padrao.nome], s);
  assert.ok(grupos(s, "vistoria").some((g) => g.id === meu.id && g.itens[0].nome === "X"));
  // O padrão de manutenção não aparece no de vistoria e vice-versa.
  assert.throws(() => C.restaurarPadroesChecklist("vistoria", [GRUPOS_PADRAO_MANUTENCAO[0].nome], s), /não faz parte do padrão inicial/);
});

test("as telas de Check list de manutenção e de vistoria têm o botão Restaurar configurações iniciais, igual ao de Veículos", () => {
  const tela = ler("components/parametros/ChecklistEquipamento.tsx");
  assert.match(tela, /<RestaurarPadraoInicial[\s\S]*?situacoes=\{\(\) => situacaoPadraoChecklist\(finalidade\)\}[\s\S]*?restaurarPadroesChecklist\(finalidade, nomes\)/);
  assert.doesNotMatch(tela, /Cadastrar padrão/, "o botão antigo saiu: o padrão já vem cadastrado e o Restaurar o devolve");
  const veiculos = ler("components/parametros/VeiculosListasParametros.tsx");
  assert.match(veiculos, /export function RestaurarPadraoInicial/);
  assert.match(veiculos, /rotulo = "Restaurar configurações iniciais"/);
  assert.doesNotMatch(ler("lib/equipamentos-checklist.ts"), /supabase|fetch\(|\.from\(/);
});

test("o Novo check list de equipamento abre, ao lado dele, as janelas de Associar itens, Itens check list e Cadastrar equipamento, como em Veículos", () => {
  const modulo = ler("components/modules/equipamento/ChecklistEquipamentoModulo.tsx");
  assert.match(modulo, /<DialogAssociarChecklistEquipamento aberto=\{associarAberto\}/);
  assert.match(modulo, /<DialogItensChecklistEquipamento aberto=\{itensAberto\}/);
  assert.match(modulo, /<EquipamentoDialog\s+aberto=\{equipamentosAberto\}/);
  assert.match(modulo, /Associar itens de check list a um equipamento/);
  assert.match(modulo, /Cadastrar itens de check list/);
  assert.match(modulo, /Equipamento não está na lista\?/);
  assert.doesNotMatch(modulo, /linkParametros|@tanstack\/react-router/, "nada de levar para outra tela e perder o que já foi escolhido");
  const dialogos = ler("components/modules/equipamento/DialogosChecklistEquipamento.tsx");
  assert.match(dialogos, /<AssociarEquipamento finalidade=\{finalidade\}/);
  assert.match(dialogos, /<ListaGrupos finalidade=\{finalidade\}/);
  assert.match(dialogos, /EVENTO_REGISTROS_EQUIPAMENTO/);
});

test("a janela de Associar itens, aberta do Novo check list, já abre o formulário com o equipamento escolhido", () => {
  const dialogos = ler("components/modules/equipamento/DialogosChecklistEquipamento.tsx");
  assert.match(dialogos, /abrirDireto=\{\{ equipamentoId \}\}/);
  assert.match(ler("components/modules/equipamento/ChecklistEquipamentoModulo.tsx"), /DialogAssociarChecklistEquipamento[^>]*equipamentoId=\{equipamentoId\}/);
  const tela = ler("components/parametros/ChecklistEquipamento.tsx");
  assert.match(tela, /abrirDireto\?: \{ equipamentoId: string \}/);
  assert.match(tela, /if \(existente\) abrir\(existente\);\s*\n\s*else if \(abrirDireto\.equipamentoId\) \{ abrir\(null\); setEquipamentoId\(abrirDireto\.equipamentoId\); \}/);
});

test("check list avulso: um grupo \"Avulso · tipo\" por tipo de equipamento em cada padrão, e só o avulso os traz", async () => {
  const { gruposAplicaveis, cadastrarPadraoChecklist, lerChecklistEquipamento: ler2 } = C;
  const { TIPOS_PADRAO } = await import("../src/lib/equipamentos-parametros.ts");
  const { ehGrupoAvulsoEq } = await import("../src/lib/equipamentos-manutencao-padrao.ts");
  for (const f of ["manutencao", "vistoria"]) {
    const avulsos = PADROES[f].filter((g) => ehGrupoAvulsoEq(g.nome));
    assert.equal(avulsos.length, 8, f);
    assert.deepEqual(avulsos.map((g) => g.tipoId).sort(), TIPOS_PADRAO.map((t) => t.id).sort(), `${f}: um por tipo`);
    assert.ok(avulsos.every((g) => g.nome.startsWith("Avulso · ") && g.itens.length >= 4 && new Set(g.itens).size === g.itens.length), f);
    const s = memoria();
    cadastrarPadraoChecklist(f, s);
    const grupos = ler2(s)[f].grupos;
    const doTipo = (avulso) => gruposAplicaveis("tipo-empilhadeiras", grupos, avulso).map((g) => g.nome);
    assert.deepEqual(doTipo(true), ["Avulso · Empilhadeiras"]);
    assert.ok(doTipo(false).length === 2 && doTipo(false).every((n) => !n.startsWith("Avulso")), `${f}: o periódico não traz o avulso`);
    assert.equal(doTipo(undefined).length, 3);
  }
});

test("quem já tinha os 16 grupos de cada padrão recebe só os avulsos, uma vez, sem trazer de volta o que excluiu", () => {
  const s = memoria();
  for (const f of ["manutencao", "vistoria"]) C.cadastrarPadraoChecklist(f, s, 0);
  // Estado de quem já tinha só os 16 primeiros: sem os avulsos, com um grupo do periódico excluído e o marcador antigo.
  for (const f of ["manutencao", "vistoria"]) {
    const avulsos = grupos(s, f).filter((g) => g.nome.startsWith("Avulso ·"));
    for (const g of avulsos) C.removerGrupoChecklist(f, g.id, s);
  }
  const excluido = grupos(s, "vistoria")[0];
  C.removerGrupoChecklist("vistoria", excluido.id, s);
  s.setItem("gemape-demo-equipamentos-checklist-padrao", "1");
  assert.equal(C.aplicarPadraoUmaVez(s), true);
  for (const f of ["manutencao", "vistoria"]) assert.equal(grupos(s, f).filter((g) => g.nome.startsWith("Avulso ·")).length, 8, f);
  assert.ok(!grupos(s, "vistoria").some((g) => g.nome === excluido.nome), "o excluído não voltou");
  assert.equal(C.aplicarPadraoUmaVez(s), false);
});

test("na janela de associação, Periódico traz os grupos do periódico e Avulso só os grupos avulsos", () => {
  const tela = ler("components/parametros/ChecklistEquipamento.tsx");
  assert.match(tela, /gruposAplicaveis\(escolhido\.tipoId, grupos, avulso\)/);
});

test("na janela de associação o Equipamento fica habilitado ao editar e lista todos, com os que já têm itens desabilitados; trocar de equipamento move a associação", () => {
  const tela = ler("components/parametros/ChecklistEquipamento.tsx");
  assert.doesNotMatch(tela, /disabled=\{!!editando\}/);
  assert.match(tela, /disabled=\{!livres\.includes\(e\)\}/);
  assert.match(tela, /já tem itens associados/);
  assert.match(tela, /modo: editando && escolhido\.id === editando \? "editar" : "criar"/);
  assert.match(tela, /removerAssociacao\(finalidade, editando\)/);
});

test("ocorrência de equipamento guarda até 6 fotos (só imagens) e permite anexar e remover", async () => {
  const R = await import("../src/lib/registros-equipamento.ts");
  const s = memoria();
  const img = "data:image/jpeg;base64,AAAA";
  const o = R.registrarOcorrenciaEq({ equipamentoId: "e1", tipoId: "t", tipoNome: "T", data: "2026-01-01", descricao: "Vazamento de óleo", fotos: [img] }, s);
  R.adicionarFotosOcorrenciaEq(o.id, [img, img], s);
  assert.equal(R.lerOcorrenciasEq(s)[0].fotos.length, 3);
  assert.throws(() => R.adicionarFotosOcorrenciaEq(o.id, Array(4).fill(img), s), /No máximo 6/);
  assert.throws(() => R.adicionarFotosOcorrenciaEq(o.id, ["http://x/a.png"], s), /não é uma imagem/);
  R.removerFotoOcorrenciaEq(o.id, 0, s);
  assert.equal(R.lerOcorrenciasEq(s)[0].fotos.length, 2);
});
