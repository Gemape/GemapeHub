import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { agruparPorDia, contagemPorFiltro, eventosDoTempo, filtrarEventos } from "../src/lib/linha-do-tempo.ts";
import { cadastrosParecidos } from "../src/lib/semelhantes.ts";

const fonte = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

// ---------- linha do tempo ----------
const movs = [
  { id: "1", item_id: "f", tipo_movimentacao: "Saida", quantidade: 1, data_movimentacao: "2026-11-10", created_at: "2026-11-10T11:30:00Z", empregado_id: "e1" },
  { id: "2", item_id: "f", tipo_movimentacao: "Saida", quantidade: 1, data_movimentacao: "2026-11-10", created_at: "2026-11-10T17:15:00Z", empregado_id: "e1", sinalizar_ocorrencia: true, tipo_ocorrencia: "Cabo danificado", observacao: "Cabo descascado" },
  { id: "3", item_id: "f", tipo_movimentacao: "Devolucao", quantidade: 1, data_movimentacao: "2026-11-11", created_at: "2026-11-11T12:00:00Z", empregado_id: "e1" },
  { id: "4", item_id: "f", tipo_movimentacao: "Saida", quantidade: 2, motivo_baixa: "Quebra", data_movimentacao: "2026-11-09", empregado_id: "e1" },
  { id: "5", item_id: "f", tipo_movimentacao: "Entrada", quantidade: 5, data_movimentacao: "2026-11-01" },
];
const ctx = { nomeDoItem: () => "Furadeira Bosch", nomeDoEmpregado: (id) => (id === "e1" ? "Maria" : null), mostrarEmpregado: true };

test("linha do tempo: frases claras, categoria, hora de Brasília e ordem do mais novo para o mais antigo", () => {
  const e = eventosDoTempo(movs, ctx);
  assert.deepEqual(e.map((x) => x.chave), ["3", "2", "1", "4", "5"]);
  const porId = Object.fromEntries(e.map((x) => [x.chave, x]));
  assert.equal(porId["1"].titulo, "Retirou Furadeira Bosch · Maria");
  assert.equal(porId["1"].hora, "08:30", "11:30 UTC = 08:30 em Brasília");
  assert.equal(porId["1"].categoria, "entrega");
  assert.equal(porId["2"].categoria, "ocorrencia");
  assert.match(porId["2"].titulo, /Registrou ocorrência: Cabo danificado/);
  assert.equal(porId["2"].detalhe, "Cabo descascado");
  assert.equal(porId["3"].categoria, "devolucao");
  assert.match(porId["4"].titulo, /Baixa \(Quebra\) de 2 × Furadeira Bosch/);
  assert.equal(porId["4"].categoria, "outros");
  assert.equal(porId["4"].hora, null, "sem hora de registro, só o dia");
  assert.match(porId["5"].titulo, /Entrada no estoque de 5 × /);
});

test("filtros por Entregas, Devoluções e Ocorrências e contagem em cada um", () => {
  const e = eventosDoTempo(movs, ctx);
  assert.deepEqual(contagemPorFiltro(e), { todos: 5, entrega: 1, devolucao: 1, ocorrencia: 1, outros: 2 });
  assert.deepEqual(filtrarEventos(e, "ocorrencia").map((x) => x.chave), ["2"]);
  assert.equal(filtrarEventos(e, "todos").length, 5);
});

test("agrupa por dia e, na linha do tempo do próprio empregado, não repete o nome dele", () => {
  const e = eventosDoTempo(movs, ctx);
  assert.deepEqual(agruparPorDia(e).map((g) => [g.dia, g.eventos.length]), [["2026-11-11", 1], ["2026-11-10", 2], ["2026-11-09", 1], ["2026-11-01", 1]]);
  const meu = eventosDoTempo(movs, { ...ctx, mostrarEmpregado: false });
  assert.equal(meu.find((x) => x.chave === "1").titulo, "Retirou Furadeira Bosch");
});

// ---------- semelhança ----------
const cadastros = [
  { id: "1", nome: "Luva de Vaqueta Mista" },
  { id: "2", nome: "Luva Vaqueta G" },
  { id: "3", nome: "Luva Vaqueta Petroleira" },
  { id: "4", nome: "Luva Nitrílica" },
  { id: "5", nome: "Capacete ABS" },
];

test("acha Luva Vaqueta repetida, mesmo com ligações, tamanho e variação, e põe a mais parecida primeiro", () => {
  const r = cadastrosParecidos("Luva Vaqueta", cadastros, { max: 5 });
  assert.deepEqual(r.map((x) => x.item.id).sort(), ["1", "2", "3"]);
  assert.ok(r[0].pontos >= r[2].pontos);
  assert.equal(r.some((x) => x.item.id === "4" || x.item.id === "5"), false);
});

test("tolera acento, caixa, erro de uma letra e começo de palavra", () => {
  assert.equal(cadastrosParecidos("LUVA VAQUETA", cadastros).length, 3);
  assert.ok(cadastrosParecidos("luva vaquta", cadastros).length >= 1, "uma letra faltando");
  assert.ok(cadastrosParecidos("luva vaq", cadastros).length >= 1, "começo da palavra");
  assert.deepEqual(cadastrosParecidos("capacete abs", cadastros).map((x) => x.item.id), ["5"]);
});

test("tamanho ou número diferentes são itens diferentes; palavra solta só vale inteira", () => {
  const botas = [{ id: "a", nome: "Bota 42" }, { id: "b", nome: "Bota 38" }];
  assert.deepEqual(cadastrosParecidos("Bota 42", botas).map((x) => x.item.id), ["a"]);
  assert.equal(cadastrosParecidos("lu", cadastros).length, 0, "curto demais");
  assert.equal(cadastrosParecidos("luv", cadastros).length, 0, "começo de uma palavra só não basta");
  assert.ok(cadastrosParecidos("luva", cadastros).length > 0, "palavra inteira aparece");
});

test("ao editar, o próprio cadastro não é apontado como parecido; sem nada parecido, sem aviso", () => {
  assert.equal(cadastrosParecidos("Luva Vaqueta G", cadastros, { ignorarId: "2" }).some((x) => x.item.id === "2"), false);
  assert.deepEqual(cadastrosParecidos("Colete refletivo", cadastros), []);
  assert.deepEqual(cadastrosParecidos("", cadastros), []);
});

test("nomes de empregados: exige quase todas as palavras", () => {
  const pessoas = [{ id: "p1", nome: "Maria da Silva Souza" }, { id: "p2", nome: "Maria Oliveira" }];
  assert.deepEqual(cadastrosParecidos("Maria Silva", pessoas, { minimo: 0.75 }).map((x) => x.item.id), ["p1"]);
});

// ---------- ligações nas telas ----------
test("telas ligadas: linha do tempo no extrato e nas gavetas; aviso de semelhança nos cadastros; termo de baixa sem movimento", () => {
  assert.match(fonte("src/components/modules/ExtratoFerramenta.tsx"), /LinhaDoTempo/);
  const g = fonte("src/components/modules/GavetasDeResumo.tsx");
  assert.match(g, /DialogoLinhaDoTempo/);
  assert.match(g, /\.limit\(500\)/);
  for (const a of ["CadastroEpi", "CadastroUniforme", "CadastroProduto", "EmpregadosCadastroModulo", "ItensModulo"]) assert.match(fonte(`src/components/modules/${a}.tsx`), /<AvisoSemelhantes/, a);
  assert.match(fonte("src/components/AvisoSemelhantes.tsx"), /Itens parecidos já cadastrados/);
  assert.match(fonte("src/components/AvisoSemelhantes.tsx"), /Saldo: \$\{saldo\}/);
  assert.match(fonte("src/components/LinhaDoTempo.tsx"), /aria-pressed/);
});

test("ordem do mesmo dia: pela hora do registro em qualquer formato de fuso; sem hora, depois dos que têm", () => {
  const e = eventosDoTempo([
    { id: "a", item_id: "f", tipo_movimentacao: "Saida", data_movimentacao: "2026-11-10" },
    { id: "b", item_id: "f", tipo_movimentacao: "Saida", data_movimentacao: "2026-11-10", created_at: "2026-11-10T13:00:00+00:00" },
    { id: "c", item_id: "f", tipo_movimentacao: "Saida", data_movimentacao: "2026-11-10", created_at: "2026-11-10T15:00:00Z" },
  ], ctx);
  assert.deepEqual(e.map((x) => x.chave), ["c", "b", "a"]);
});

test("nomes de pessoas só casam palavra inteira igual (sem prefixo nem erro de letra)", () => {
  const pessoas = [{ id: "p1", nome: "Mariana Souza" }];
  assert.equal(cadastrosParecidos("Maria Souza", pessoas, { minimo: 0.75, exata: true }).length, 0);
  assert.equal(cadastrosParecidos("Mariana Souza", pessoas, { minimo: 0.75, exata: true }).length, 1);
});

test("aviso de semelhança só consulta o cadastro depois de digitar e escuta input, change e blur", () => {
  const a = fonte("src/components/AvisoSemelhantes.tsx");
  assert.match(a, /texto\.trim\(\)\.length >= 4/);
  assert.match(a, /\["input", "change", "blur"\]/);
  assert.doesNotMatch(a, /as never/);
});
