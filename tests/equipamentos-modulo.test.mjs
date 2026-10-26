import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { dadosIniciais as base } from "../src/integrations/supabase/demo-client.ts";
import { pedirLimpar, prepararDadosDeTeste } from "../src/lib/dados-teste/aplicar.ts";
import * as R from "../src/lib/registros-equipamento.ts";
import * as C from "../src/lib/checklist-equipamento-exec.ts";

const AGORA = new Date("2026-10-22T12:00:00-03:00");
const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const memoria = () => {
  const m = new Map();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
};
const json = (s, k) => JSON.parse(s.getItem(k) ?? "[]");
const aplicado = () => { const s = memoria(); assert.equal(prepararDadosDeTeste(s, base, AGORA), "aplicado"); return s; };

test("os dados de teste trazem registros de cada controle do módulo Equipamentos nos cinco equipamentos, ligados a equipamentos de teste", () => {
  const s = aplicado();
  const equipamentos = new Set(json(s, "gemape-demo-equipamentos").map((e) => e.id));
  for (const [chave, quantidade] of [[R.CHAVE_ABASTECIMENTOS_EQ, 8], [R.CHAVE_MANUTENCOES_EQ, 6], [C.CHAVE_CHECKLISTS_EQ, 75]]) {
    const lista = json(s, chave);
    assert.equal(lista.length, quantidade, chave);
    for (const r of lista) assert.ok(r.id.startsWith("teste-") && equipamentos.has(r.equipamentoId), `${chave}: registro solto`);
  }
  // Seis ocorrências lançadas (quatro abertas, duas resolvidas) e uma por item NOK dos check lists concluídos.
  const ocorrencias = json(s, R.CHAVE_OCORRENCIAS_EQ);
  const checklists = json(s, C.CHAVE_CHECKLISTS_EQ);
  const nok = checklists.flatMap((c) => c.itens).filter((i) => i.avaliacao === "NOK");
  assert.ok(nok.length > 10 && nok.length < checklists.length, "parte dos check lists tem NOK");
  assert.ok(nok.every((i) => i.ocorrenciaId), "cada NOK gerou a sua ocorrência");
  assert.equal(ocorrencias.filter((o) => o.tipoId === "checklist-nok").length, nok.length);
  assert.deepEqual([ocorrencias.filter((o) => o.status === "Aberta").length, ocorrencias.filter((o) => o.status === "Resolvida").length], [4 + nok.length, 2]);
  assert.equal(ocorrencias.length, 6 + nok.length);
  for (const r of ocorrencias) assert.ok(r.id.startsWith("teste-") && equipamentos.has(r.equipamentoId), "ocorrência solta");
  // Em cada equipamento, cinco periódicos de cada finalidade e cinco avulsos (sem periodicidade).
  for (const id of new Set(checklists.map((c) => c.equipamentoId))) {
    const dele = checklists.filter((c) => c.equipamentoId === id);
    assert.deepEqual([dele.filter((c) => c.periodicidade && c.finalidade === "manutencao").length, dele.filter((c) => c.periodicidade && c.finalidade === "vistoria").length, dele.filter((c) => !c.periodicidade).length], [5, 5, 5], id);
  }
  assert.ok(checklists.every((c) => c.status === "Concluído" && c.itens.every((i) => i.avaliacao !== null)));
  // O horímetro só cresce nos equipamentos com abastecimento, entre abastecimentos e manutenção.
  const todos = json(s, R.CHAVE_ABASTECIMENTOS_EQ);
  for (const id of new Set(todos.map((a) => a.equipamentoId))) {
    const ab = todos.filter((a) => a.equipamentoId === id).sort((a, b) => `${a.data}T${a.hora}`.localeCompare(`${b.data}T${b.hora}`));
    assert.deepEqual(ab.map((a) => a.horimetro), [...ab.map((a) => a.horimetro)].sort((a, b) => a - b), id);
  }
});

test("Limpar tira os registros do módulo junto com os equipamentos de teste, e o que é do usuário fica", () => {
  const s = aplicado();
  R.registrarOcorrenciaEq({ equipamentoId: "equipamento-do-usuario", tipoId: "t", tipoNome: "Falha", data: "2026-10-20", descricao: "Ocorrência do usuário" }, s, AGORA);
  R.registrarOcorrenciaEq({ equipamentoId: "teste-equipamento-1", tipoId: "t", tipoNome: "Falha", data: "2026-10-20", descricao: "Em cima de equipamento de teste" }, s, AGORA);
  pedirLimpar(s);
  assert.equal(prepararDadosDeTeste(s, base, AGORA), "limpo");
  assert.deepEqual(json(s, R.CHAVE_OCORRENCIAS_EQ).map((o) => o.descricao), ["Ocorrência do usuário"]);
  for (const chave of [R.CHAVE_ABASTECIMENTOS_EQ, R.CHAVE_MANUTENCOES_EQ, C.CHAVE_CHECKLISTS_EQ]) assert.equal(json(s, chave).length, 0, chave);
});

test("abastecimento: horímetro nunca menor que o anterior, hora não futura, sem repetir data e hora", () => {
  const s = memoria();
  const entrada = { equipamentoId: "e1", data: "2026-10-10", hora: "08:00", horimetro: "100", litros: "40,5", valor: "250,00" };
  R.registrarAbastecimentoEq(entrada, s, AGORA);
  assert.throws(() => R.registrarAbastecimentoEq({ ...entrada, data: "2026-10-12", horimetro: "90" }, s, AGORA), /horímetro não confere/);
  assert.throws(() => R.registrarAbastecimentoEq({ ...entrada, data: "2026-10-08", horimetro: "120" }, s, AGORA), /horímetro não confere/);
  assert.throws(() => R.registrarAbastecimentoEq(entrada, s, AGORA), /Já existe/);
  assert.throws(() => R.registrarAbastecimentoEq({ ...entrada, data: "2026-10-22", hora: "23:00", horimetro: "130" }, s, AGORA), /futura/);
  assert.throws(() => R.registrarAbastecimentoEq({ ...entrada, data: "2026-10-11", litros: "0" }, s, AGORA), /litros/);
  assert.throws(() => R.registrarAbastecimentoEq({ ...entrada, equipamentoId: "" }, s, AGORA), /Selecione/);
  assert.equal(R.lerAbastecimentosEq(s).length, 1);
  assert.equal(R.ultimoHorimetro("e1", s), 100);
});

test("manutenção: tipo, ao menos uma ação, terceiro com nome e custos válidos; o custo total soma peças e mão de obra", () => {
  const s = memoria();
  const entrada = { equipamentoId: "e1", tipo: "Preventiva", data: "2026-10-10", horimetro: "100", acoes: [{ acaoId: "a1", nome: "Troca de óleo", subitens: [] }], local: "empresa", localNome: "", custoPecas: "100,00", custoMaoDeObra: "50,50" };
  assert.throws(() => R.registrarManutencaoEq({ ...entrada, tipo: "Outra" }, s, AGORA), /preventiva ou corretiva/);
  assert.throws(() => R.registrarManutencaoEq({ ...entrada, acoes: [] }, s, AGORA), /ao menos uma ação/);
  assert.throws(() => R.registrarManutencaoEq({ ...entrada, local: "terceiro", localNome: " " }, s, AGORA), /nome do terceiro/);
  assert.throws(() => R.registrarManutencaoEq({ ...entrada, custoPecas: "abc" }, s, AGORA), /custo das peças/);
  const m = R.registrarManutencaoEq(entrada, s, AGORA);
  assert.equal(R.custoDaManutencaoEq(m), 150.5);
  assert.equal(m.localNome, "Empresa");
});

test("ocorrência: descrição e tipo obrigatórios; resolver exige a solução e fecha a ocorrência", () => {
  const s = memoria();
  const entrada = { equipamentoId: "e1", tipoId: "t1", tipoNome: "Falha mecânica", data: "2026-10-10", descricao: "Ruído forte no motor" };
  assert.throws(() => R.registrarOcorrenciaEq({ ...entrada, descricao: "ok" }, s, AGORA), /Descreva/);
  assert.throws(() => R.registrarOcorrenciaEq({ ...entrada, tipoId: "" }, s, AGORA), /tipo/);
  const o = R.registrarOcorrenciaEq(entrada, s, AGORA);
  assert.equal(o.status, "Aberta");
  assert.throws(() => R.resolverOcorrenciaEq(o.id, " ", s, AGORA), /resolvida/);
  R.resolverOcorrenciaEq(o.id, "Peça trocada", s, AGORA);
  assert.deepEqual([R.lerOcorrenciasEq(s)[0].status, R.lerOcorrenciasEq(s)[0].solucao], ["Resolvida", "Peça trocada"]);
});

const grupo = { id: "g1", nome: "Motor", itens: [{ id: "i1", nome: "Nível de óleo" }, { id: "i2", nome: "Correia" }], tipos: ["todos"] };
const entradaCheck = (extra = {}) => ({ equipamentoId: "e1", equipamentoRotulo: "PAT-1 · Empilhadeira", tipoEquipamento: "Empilhadeiras", finalidade: "vistoria", periodicidade: "Semanal", responsavelId: "r1", responsavelNome: "Ana", grupos: [grupo], ...extra });

test("check list: periodicidade e responsável obrigatórios; código sequencial; um periódico em andamento por periodicidade e finalidade", () => {
  const s = memoria();
  assert.throws(() => C.iniciarChecklistEq(entradaCheck({ periodicidade: "" }), s, AGORA), /não tem periodicidade/);
  assert.throws(() => C.iniciarChecklistEq(entradaCheck({ responsavelId: "" }), s, AGORA), /responsável/);
  assert.throws(() => C.iniciarChecklistEq(entradaCheck({ grupos: [] }), s, AGORA), /Não há itens/);
  const a = C.iniciarChecklistEq(entradaCheck(), s, AGORA);
  assert.equal(a.codigo, "CHE-0001");
  assert.equal(a.itens.length, 2);
  assert.throws(() => C.iniciarChecklistEq(entradaCheck(), s, AGORA), /já tem um check list semanal em andamento/);
  C.iniciarChecklistEq(entradaCheck({ finalidade: "manutencao" }), s, AGORA); // outra finalidade não bloqueia
  const avulso = C.iniciarChecklistAvulsoEq({ equipamentoId: "e1", equipamentoRotulo: "x", tipoEquipamento: "y", finalidade: "vistoria", grupos: [grupo] }, s, AGORA);
  assert.deepEqual([avulso.periodicidade, avulso.responsavelNome, C.checklistVisivelNaListaEq(avulso)], ["", "", false]);
});

test("check list: concluir exige tudo avaliado e o problema de cada NOK; cada NOK vira ocorrência e pendência, resolvida depois", () => {
  const s = memoria();
  const c = C.iniciarChecklistEq(entradaCheck(), s, AGORA);
  assert.throws(() => C.concluirChecklistEq(c.id, s, AGORA), /faltam 2/);
  C.avaliarItemEq(c.id, c.itens[0].id, { avaliacao: "OK", observacao: "" }, s);
  C.avaliarItemEq(c.id, c.itens[1].id, { avaliacao: "NOK", observacao: "" }, s);
  assert.throws(() => C.concluirChecklistEq(c.id, s, AGORA), /Descreva o problema/);
  assert.throws(() => C.avaliarItemEq(c.id, c.itens[1].id, { avaliacao: "TALVEZ", observacao: "" }, s), /OK, NOK ou N\.A\./);
  C.avaliarItemEq(c.id, c.itens[1].id, { avaliacao: "NOK", observacao: "Correia gasta" }, s);
  const concluido = C.concluirChecklistEq(c.id, s, AGORA);
  assert.equal(concluido.status, "Concluído");
  const ocorrencias = R.lerOcorrenciasEq(s);
  assert.equal(ocorrencias.length, 1);
  assert.match(ocorrencias[0].descricao, /CHE-0001.*Correia/);
  assert.equal(C.pendenciasAbertasEq(C.lerChecklistsEq(s)).length, 1);
  assert.throws(() => C.avaliarItemEq(c.id, c.itens[0].id, { avaliacao: "NOK", observacao: "x" }, s), /já foi concluído/);
  assert.throws(() => C.resolverPendenciaEq(c.id, c.itens[0].id, "feito", s, AGORA), /Só itens reprovados/);
  assert.throws(() => C.resolverPendenciaEq(c.id, c.itens[1].id, " ", s, AGORA), /Descreva/);
  C.resolverPendenciaEq(c.id, c.itens[1].id, "Correia trocada", s, AGORA);
  assert.equal(C.pendenciasAbertasEq(C.lerChecklistsEq(s)).length, 0);
  assert.throws(() => C.resolverPendenciaEq(c.id, c.itens[1].id, "de novo", s, AGORA), /já foi resolvida/);
});

test("check list: fotos limitadas a três por item e só imagens; descartar só em andamento", () => {
  const s = memoria();
  const c = C.iniciarChecklistEq(entradaCheck(), s, AGORA);
  const foto = "data:image/png;base64,AAAA";
  C.adicionarFotosItemEq(c.id, c.itens[0].id, [foto, foto, foto], s);
  assert.throws(() => C.adicionarFotosItemEq(c.id, c.itens[0].id, [foto], s), /No máximo 3 fotos/);
  assert.throws(() => C.adicionarFotosItemEq(c.id, c.itens[1].id, ["texto"], s), /não é uma imagem/);
  C.removerFotoItemEq(c.id, c.itens[0].id, 0, s);
  assert.equal(C.lerChecklistsEq(s)[0].itens[0].fotos.length, 2);
  C.excluirChecklistEmAndamentoEq(c.id, s);
  assert.equal(C.lerChecklistsEq(s).length, 0);
});

test("check list: periodicidades e grupos vêm da associação do equipamento, item a item, e o avulso traz só os grupos avulsos", () => {
  const associacao = { equipamentoId: "e1", responsavel: null, atualizadoEm: "", itens: [
    { grupoId: "g1", tipo: "periodico", periodicidade: "Diária", obrigatorio: true, itensIds: ["i2"] },
    { grupoId: "g2", tipo: "periodico", periodicidade: "Mensal", obrigatorio: false },
    { grupoId: "g3", tipo: "avulso", periodicidade: "Não definida", obrigatorio: false },
  ] };
  const grupos = [grupo, { id: "g2", nome: "Hidráulica", itens: [{ id: "h1", nome: "Mangueiras" }], tipos: ["todos"] }, { id: "g3", nome: "Avulso · Simples", itens: [{ id: "s1", nome: "Limpeza" }], tipos: ["todos"] }];
  assert.deepEqual(C.periodicidadesDaAssociacaoEq(associacao), ["Diário", "Mensal"]);
  assert.equal(C.periodicidadeObrigatoriaEq(associacao, "Diário"), true);
  assert.equal(C.periodicidadeObrigatoriaEq(associacao, "Mensal"), false);
  assert.deepEqual(C.gruposDoChecklistEq(associacao, grupos, "Diário").map((g) => [g.nome, g.itens.map((i) => i.nome)]), [["Motor", ["Correia"]]]);
  assert.deepEqual(C.gruposDoChecklistEq(associacao, grupos, "avulso").map((g) => g.nome), ["Avulso · Simples"]);
  assert.deepEqual(C.gruposDoTipoEq(grupos, "qualquer").map((g) => g.nome), ["Avulso · Simples"]);
  assert.equal(C.nomeDoChecklistEq({ patrimonio: "pat-1", periodicidade: "", responsavelNome: "" }), "PAT-1 >> Não definida >> Não definido");
});

test("o módulo tem as sete abas, só aparece no demo e não toca o Supabase", () => {
  const rota = ler("routes/_authenticated/equipamentos.tsx");
  assert.match(rota, /MODO_DEMO \? \(/);
  const menu = ler("lib/menu-parametros.ts");
  for (const titulo of ["Inventário dos Equipamentos", "Indicadores", "Abastecimento", "Manutenção", "Ocorrências", "Check list de Manutenção", "Check list de vistoria"]) assert.match(menu, new RegExp(`titulo: "${titulo}"`));
  for (const arq of ["lib/registros-equipamento.ts", "lib/dados-teste/equipamentos-modulo.ts", "components/modules/equipamento/InventarioEquipamentoModulo.tsx", "components/modules/equipamento/ChecklistEquipamentoModulo.tsx"]) assert.doesNotMatch(ler(arq), /supabase|fetch\(|\.from\(/, arq);
});

test("iniciar, avaliar e concluir um check list avisam as telas de Equipamentos (a tela abre o check list recém-criado)", () => {
  const avisos = [];
  globalThis.window = { dispatchEvent: (e) => void avisos.push(e.type) };
  try {
    const s = memoria();
    const base = { equipamentoId: "e1", equipamentoRotulo: "PAT-1 · Empilhadeira", tipoEquipamento: "Empilhadeiras", finalidade: "vistoria", periodicidade: "Semanal", responsavelId: "r1", responsavelNome: "Ana", grupos: [{ id: "g", nome: "Motor", itens: [{ id: "i", nome: "Óleo" }], tipos: ["todos"] }] };
    const c = C.iniciarChecklistEq(base, s, AGORA);
    assert.ok(avisos.includes("gemape-registros-equipamento"), "iniciar avisa");
    avisos.length = 0;
    C.avaliarItemEq(c.id, c.itens[0].id, { avaliacao: "OK", observacao: "" }, s);
    C.concluirChecklistEq(c.id, s, AGORA);
    assert.ok(avisos.includes("gemape-registros-equipamento"), "avaliar e concluir avisam");
    assert.ok(!avisos.includes("gemape-registros-veiculo") || avisos.includes("gemape-registros-equipamento"));
  } finally {
    delete globalThis.window;
  }
});
