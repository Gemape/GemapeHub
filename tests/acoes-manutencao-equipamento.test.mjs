import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { ACOES_PADRAO_EQUIPAMENTO } from "../src/lib/equipamentos-manutencao-padrao.ts";
import * as M from "../src/lib/equipamentos-manutencao.ts";
import * as R from "../src/lib/registros-equipamento.ts";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const memoria = () => {
  const m = new Map();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)) };
};
const acoes = (s) => M.lerManutencaoEquipamento(s).acoes;
const acao = (s, nome) => acoes(s).find((a) => a.nome === nome);
const EMP_LUB = "Empilhadeiras (2,5 ton e Clark C70D) · Revisão do sistema de lubrificação e filtros";

test("o padrão inicial tem as 12 famílias da lista, sem nome repetido e sem Outros nos dados", () => {
  assert.equal(ACOES_PADRAO_EQUIPAMENTO.length, 36);
  assert.equal(new Set(ACOES_PADRAO_EQUIPAMENTO.map((a) => a.nome.toLowerCase())).size, 36);
  const familias = new Set(ACOES_PADRAO_EQUIPAMENTO.map((a) => a.nome.split(" · ")[0]));
  assert.equal(familias.size, 12);
  for (const a of ACOES_PADRAO_EQUIPAMENTO) {
    assert.ok(a.subitens.length > 0, a.nome);
    assert.ok(!a.subitens.some((s) => s.toLowerCase() === "outros"), `${a.nome}: o Outros entra ao gravar`);
  }
  const lub = ACOES_PADRAO_EQUIPAMENTO.find((a) => a.nome === EMP_LUB);
  assert.deepEqual(lub.subitens, ["Troca de óleo do motor", "Filtro de óleo", "Filtro de ar", "Filtro de combustível"]);
});

test("cadastrar o padrão grava todas as ações, com Outros por último em cada uma, sem repetir e sem mexer no que existe", () => {
  const s = memoria();
  M.salvarAcao({ nome: "Minha ação", subitens: ["A"] }, s);
  assert.deepEqual(M.cadastrarPadraoAcoes(s), { criadas: 36 });
  assert.equal(acoes(s).length, 37);
  for (const a of acoes(s)) assert.equal(a.subitens.at(-1).nome, "Outros", a.nome);
  assert.deepEqual(M.cadastrarPadraoAcoes(s), { criadas: 0 });
  assert.ok(acao(s, "Geradores (todas as potências) · Outros serviços").subitens.some((x) => x.nome.includes("QTA")), "siglas entram como foram escritas");
});

test("as ações do padrão entram sozinhas uma vez só; o que for excluído depois não volta sozinho", () => {
  const s = memoria();
  assert.equal(M.aplicarAcoesPadraoUmaVez(s), true);
  assert.equal(acoes(s).length, 36);
  M.removerAcao(acao(s, EMP_LUB).id, s);
  assert.equal(M.aplicarAcoesPadraoUmaVez(s), false);
  assert.equal(acoes(s).length, 35);
});

test("quem já tinha as 35 ações do padrão recebe só as novas, uma vez, sem trazer de volta o que excluiu", () => {
  const s = memoria();
  M.cadastrarPadraoAcoes(s, 0);
  M.removerAcao(acao(s, EMP_LUB).id, s);
  M.removerAcao(acao(s, "Extintores de incêndio · Manutenção e inspeção de extintores de incêndio").id, s);
  s.setItem("gemape-demo-equipamentos-acoes-padrao", "1"); // marcador da primeira versão
  assert.equal(M.aplicarAcoesPadraoUmaVez(s), true);
  assert.ok(acao(s, "Extintores de incêndio · Manutenção e inspeção de extintores de incêndio"), "a ação nova entrou");
  assert.equal(acao(s, EMP_LUB), undefined, "o que foi excluído não voltou");
  assert.equal(M.aplicarAcoesPadraoUmaVez(s), false);
});

test("extintores: a ação traz os quatro itens de manutenção e inspeção, com Outros por último", () => {
  const s = memoria();
  M.cadastrarPadraoAcoes(s);
  const a = acao(s, "Extintores de incêndio · Manutenção e inspeção de extintores de incêndio");
  assert.deepEqual(a.subitens.map((x) => x.nome.split(":")[0]), ["Inspeção visual mensal", "Verificação da sinalização e suporte", "Manutenção de 1º nível (recarga e revisão anual)", "Teste hidrostático (manutenção de 3º nível)", "Outros"]);
  assert.match(a.subitens[3].nome, /a cada 5 anos.*CO2/);
});

test("situação do padrão: igual, alterado ou não cadastrado, com a situação de cada subitem", () => {
  const s = memoria();
  M.cadastrarPadraoAcoes(s);
  const situacao = (nome) => M.situacaoPadraoAcoes(s).find((a) => a.nome === nome);
  assert.ok(M.situacaoPadraoAcoes(s).every((a) => a.situacao === "igual"));
  assert.equal(situacao(EMP_LUB).filhos.at(-1).nome, "Outros");
  const a = acao(s, EMP_LUB);
  M.salvarAcao({ id: a.id, nome: a.nome, subitens: ["Troca de óleo do motor", "Meu item"], literal: true }, s);
  assert.equal(situacao(EMP_LUB).situacao, "alterado");
  assert.deepEqual(situacao(EMP_LUB).filhos.filter((f) => !f.existe).map((f) => f.nome), ["Filtro de óleo", "Filtro de ar", "Filtro de combustível"]);
  M.removerAcao(a.id, s);
  assert.equal(situacao(EMP_LUB).situacao, "ausente");
});

test("restaurar configurações iniciais: só o marcado volta, o excluído é cadastrado de novo e o que você criou fica", () => {
  const s = memoria();
  M.cadastrarPadraoAcoes(s);
  const a = acao(s, EMP_LUB);
  M.salvarAcao({ id: a.id, nome: a.nome, subitens: ["Troca de óleo do motor", "Item criado por mim"], literal: true }, s);
  // Pai marcado com um filho só: só esse filho é recolocado, o não marcado continua faltando, o criado fica no fim (antes do Outros).
  const r = M.restaurarAcoesEscolhidas([{ nome: EMP_LUB, filhos: ["Filtro de óleo"] }], s);
  assert.deepEqual(r, { restaurados: 1, criados: 0, filhos: 1 });
  const depois = acao(s, EMP_LUB);
  assert.equal(depois.id, a.id, "o id fica");
  assert.deepEqual(depois.subitens.map((x) => x.nome), ["Troca de óleo do motor", "Filtro de óleo", "Item criado por mim", "Outros"]);
  // Ação excluída volta, só com os filhos marcados.
  M.removerAcao(depois.id, s);
  const r2 = M.restaurarAcoesEscolhidas([{ nome: EMP_LUB, filhos: ["Filtro de ar", "Filtro de combustível"] }], s);
  assert.deepEqual(r2, { restaurados: 0, criados: 1, filhos: 2 });
  assert.deepEqual(acao(s, EMP_LUB).subitens.map((x) => x.nome), ["Filtro de ar", "Filtro de combustível", "Outros"]);
  assert.throws(() => M.restaurarAcoesEscolhidas([], s), /Marque ao menos uma ação/);
  assert.throws(() => M.restaurarAcoesEscolhidas([{ nome: "Ação inventada", filhos: [] }], s), /não faz parte do padrão/);
  assert.throws(() => M.restaurarAcoesEscolhidas([{ nome: EMP_LUB, filhos: ["Subitem inventado"] }], s), /não faz parte do padrão inicial/);
});

test("criados por você: aparecem, saem por marcação e nunca apagam o padrão", () => {
  const s = memoria();
  M.cadastrarPadraoAcoes(s);
  assert.deepEqual(M.itensCriadosAcoes(s), []);
  const propria = M.salvarAcao({ nome: "Ação própria", subitens: ["Passo 1", "Passo 2"] }, s);
  const a = acao(s, EMP_LUB);
  M.salvarAcao({ id: a.id, nome: a.nome, subitens: [...a.subitens.map((x) => x.nome), "Extra meu"], literal: true }, s);
  const criados = M.itensCriadosAcoes(s);
  assert.deepEqual(criados.map((c) => [c.nome, c.doPadrao, c.filhos.map((f) => f.nome)]), [[EMP_LUB, true, ["Extra meu"]], ["Ação própria", false, ["Passo 1", "Passo 2"]]]);
  const extra = criados[0].filhos[0];
  assert.deepEqual(M.excluirItensCriadosAcoes([extra.id, propria.id], s), { acoes: 1, subitens: 3 });
  assert.equal(acao(s, "Ação própria"), undefined);
  assert.ok(!acao(s, EMP_LUB).subitens.some((x) => x.nome === "Extra meu"));
  assert.throws(() => M.excluirItensCriadosAcoes([acao(s, EMP_LUB).id], s), /Marque ao menos um item criado/, "o padrão em si não se apaga por aqui");
  // Ação criada que está num plano não se exclui.
  const emPlano = M.salvarAcao({ nome: "Ação do plano", subitens: ["X"] }, s);
  M.salvarPlano({ modo: "criar", equipamentoId: "e1", itens: [{ acaoId: emPlano.id, horas: 100, meses: 3 }] }, s);
  assert.throws(() => M.excluirItensCriadosAcoes([emPlano.id], s), /está em 1 plano/);
});

test("horímetro com decimal (1480,5 ou 1480.5) vale como decimal; 1.480 é milhar; manutenção e abastecimento no mesmo dia não se bloqueiam", () => {
  const s = memoria();
  const AGORA = new Date("2026-10-22T15:00:00-03:00");
  const abast = (extra) => ({ equipamentoId: "e1", data: "2026-10-10", hora: "08:00", horimetro: "1480.5", litros: "40", valor: "200", ...extra });
  R.registrarAbastecimentoEq(abast(), s, AGORA);
  assert.equal(R.ultimoHorimetro("e1", s), 1480.5);
  R.registrarAbastecimentoEq(abast({ hora: "09:00", horimetro: "1481,5" }), s, AGORA);
  assert.equal(R.ultimoHorimetro("e1", s), 1481.5);
  R.registrarAbastecimentoEq(abast({ data: "2026-10-11", horimetro: "1.490" }), s, AGORA);
  assert.equal(R.ultimoHorimetro("e1", s), 1490);
  // Manutenção no dia 11 com horímetro menor que o abastecimento do mesmo dia: a ordem não se sabe, então vale.
  const manut = { equipamentoId: "e1", tipo: "Preventiva", data: "2026-10-11", horimetro: "1485", acoes: [{ acaoId: "a", nome: "A", subitens: [] }], local: "empresa", localNome: "" };
  assert.doesNotThrow(() => R.registrarManutencaoEq(manut, s, AGORA));
  // Em outro dia continua valendo a regra: não pode ser menor que um anterior.
  assert.throws(() => R.registrarManutencaoEq({ ...manut, data: "2026-10-12", horimetro: "1400" }, s, AGORA), /horímetro não confere/);
  // Abastecimento no mesmo dia da manutenção, depois dela, com horímetro maior: vale.
  assert.doesNotThrow(() => R.registrarAbastecimentoEq(abast({ data: "2026-10-11", hora: "15:00", horimetro: "1495" }), s, AGORA));
});

test("a lista de ações de Parâmetros tem o Restaurar configurações iniciais e o padrão automático", () => {
  const tela = ler("components/parametros/ManutencaoEquipamento.tsx");
  assert.match(tela, /<RestaurarAcoesEquipamento aoCadastrar=\{cadastrar\}/);
  assert.match(tela, /aplicarAcoesPadraoUmaVez\(\)/);
  assert.match(tela, /alertaPainel/);
  const dialogo = ler("components/parametros/RestaurarAcoesEquipamento.tsx");
  assert.match(dialogo, /Restaurar configurações iniciais/);
  assert.match(dialogo, /Criados por você/);
  assert.doesNotMatch(dialogo + ler("lib/equipamentos-manutencao.ts"), /supabase|fetch\(|\.from\(/);
});
