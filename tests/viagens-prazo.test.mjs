import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { estadoPadrao } from "../src/lib/questionario-despesas.ts";
import { registrarResposta } from "../src/lib/respostas-despesas.ts";
import { PRAZO_PADRAO_DIAS, PRAZOS_PADRAO, lerPrazos, salvarPrazos } from "../src/lib/prazo-viagens.ts";
import { diasEntre, indicadoresGlobais, lancadaNoPrazo, resultadosTecnicos } from "../src/lib/viagens.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const base = {
  "q-01": ["Dinheiro"], "q-03": ["Abastecimento"], "q-04": ["Roberto (Oficina)"], "q-05": "Minas Gerais - MG", "q-06": "Belo Horizonte",
  "q-07": "00001 - Cliente Teste", "q-09": "Almoço", "q-10": "10,50", "q-11": "100,00", "q-12": ["a.jpg"], "q-13": "Avulso – técnico não monitorado",
};
// Despesa em `dia` de outubro, registrada em `registro` de outubro.
const lancar = (s, dia, registro, extra = {}) =>
  registrarResposta(estadoPadrao(), { ...base, "q-08": `2026-10-${String(dia).padStart(2, "0")}`, ...extra }, s, new Date(2026, 9, registro, 9, 0));
const P = { ano: 2026, mes: 10 };

test("dias entre datas conta dias de calendário, inclusive na virada de mês", () => {
  assert.equal(diasEntre("2026-10-10", "2026-10-13"), 3);
  assert.equal(diasEntre("2026-09-30", "2026-10-01"), 1);
  assert.equal(diasEntre("2026-10-10", "2026-10-10"), 0);
});

test("lançada no prazo: até N dias depois da despesa; depois disso, ou com data futura, fora do prazo", () => {
  const s = memoria();
  assert.equal(lancadaNoPrazo(lancar(s, 10, 10), 3), true);
  assert.equal(lancadaNoPrazo(lancar(s, 10, 13), 3), true);
  assert.equal(lancadaNoPrazo(lancar(s, 10, 14), 3), false);
  assert.equal(lancadaNoPrazo(lancar(s, 14, 10), 3), false);
  assert.equal(lancadaNoPrazo(lancar(s, 10, 11), 0), false);
  assert.equal(lancadaNoPrazo(lancar(s, 10, 10), 0), true);
});

test("índice global e por técnico: no prazo ÷ total lançadas no período × 100", () => {
  const s = memoria();
  const lista = [lancar(s, 10, 11), lancar(s, 10, 12), lancar(s, 10, 20), lancar(s, 5, 20, { "q-04": ["Maria (Oficina)"] })];
  const g = indicadoresGlobais(lista, P, 3);
  assert.equal(g.quantidade, 4);
  assert.equal(g.noPrazo, 2);
  assert.equal(g.prazo, 50);
  const r = resultadosTecnicos(lista, P, ["Roberto", "Maria", "Sem lançamento"], 3);
  assert.equal(r[0].prazo, (2 / 3) * 100);
  assert.equal(r[1].prazo, 0);
  assert.equal(r[2].prazo, null);
  assert.equal(indicadoresGlobais([], P, 3).prazo, null);
  // Mudar o prazo muda o índice.
  assert.equal(indicadoresGlobais(lista, P, 30).prazo, 100);
});

test("prazos configuráveis: padrão 3 e 3, grava os dois e recusa valor inválido sem alterar o que já estava salvo", () => {
  const s = memoria();
  assert.equal(PRAZO_PADRAO_DIAS, 3);
  assert.deepEqual(lerPrazos(s), { mecanico: 3, pcm: 3 });
  salvarPrazos({ mecanico: 5, pcm: 0 }, s);
  assert.deepEqual(lerPrazos(s), { mecanico: 5, pcm: 0 });
  for (const ruim of [-1, 1.5, 366, Number.NaN]) {
    assert.throws(() => salvarPrazos({ mecanico: 2, pcm: ruim }, s), /inteiros/);
    assert.throws(() => salvarPrazos({ mecanico: ruim, pcm: 2 }, s), /inteiros/);
  }
  assert.deepEqual(lerPrazos(s), { mecanico: 5, pcm: 0 });
  for (const ruim of ["abc", "", "{", "null", "[]", '{"mecanico":"0x3","pcm":1000}', '{"mecanico":1.5,"pcm":-2}']) assert.deepEqual(lerPrazos({ getItem: () => ruim, setItem: () => {} }), PRAZOS_PADRAO);
  const bloqueado = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("bloqueado"); } };
  assert.deepEqual(lerPrazos(bloqueado), PRAZOS_PADRAO);
  assert.throws(() => salvarPrazos({ mecanico: 4, pcm: 4 }, bloqueado), /Não foi possível guardar/);
});

test("o prazo único antigo vira o valor inicial dos dois; o salvo novo prevalece; campo faltando usa o antigo", () => {
  const dados = new Map([["gemape-demo-viagens-prazo", "7"]]);
  const s = { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
  assert.deepEqual(lerPrazos(s), { mecanico: 7, pcm: 7 });
  dados.set("gemape-demo-viagens-prazos", '{"mecanico":2}');
  assert.deepEqual(lerPrazos(s), { mecanico: 2, pcm: 7 });
  salvarPrazos({ mecanico: 1, pcm: 4 }, s);
  assert.deepEqual(lerPrazos(s), { mecanico: 1, pcm: 4 });
});

test("cada despesa usa o prazo de quem lançou: Oficina, o do mecânico; PCM e Administrativo, o do PCM", () => {
  const s = memoria();
  const prazos = { mecanico: 1, pcm: 5 };
  const oficina = lancar(s, 10, 13);
  const pcm = lancar(s, 10, 13, { "q-04": ["Ana (PCM)"], "q-14": ["Roberto (Oficina)"], "q-13": "Não conformidade – técnico monitorado não preencheu" });
  const adm = lancar(s, 10, 13, { "q-04": ["Rui (Administrativo)"], "q-14": ["Roberto (Oficina)"], "q-13": "Não conformidade – técnico monitorado não preencheu" });
  assert.equal(lancadaNoPrazo(oficina, prazos), false);
  assert.equal(lancadaNoPrazo(pcm, prazos), true);
  assert.equal(lancadaNoPrazo(adm, prazos), true);
  assert.equal(lancadaNoPrazo(oficina, { mecanico: 3, pcm: 0 }), true);
  assert.equal(lancadaNoPrazo(pcm, { mecanico: 3, pcm: 0 }), false);
  // Um número só vale para os dois.
  assert.equal(lancadaNoPrazo(pcm, 3), true);
  const g = indicadoresGlobais([oficina, pcm, adm], P, prazos);
  assert.equal(g.noPrazo, 2);
  assert.equal(g.prazo, (2 / 3) * 100);
});

test("a tela de Parâmetros > Viagens existe e o painel mostra o índice no prazo em roxo", () => {
  const menu = readFileSync("src/components/layout/AppSidebar.tsx", "utf8");
  assert.ok(menu.indexOf('url: "/cadastros/viagens"') > menu.indexOf('url: "/cadastros/clientes"'));
  const painel = readFileSync("src/components/modules/ViagensPainel.tsx", "utf8");
  assert.match(painel, /Índice de lançamento no prazo/);
  assert.match(painel, /purple-/);
});

test("Parâmetros > Viagens tem os dois campos de prazo e o questionário continua em Veículos", () => {
  const tela = readFileSync("src/routes/_authenticated/cadastros/viagens.tsx", "utf8");
  assert.match(tela, /prazo-mecanico/);
  assert.match(tela, /prazo-pcm/);
  assert.match(tela, /Técnico mecânico/);
  assert.match(tela, /PCM \(dias\)/);
  assert.match(readFileSync("src/lib/menu-parametros.ts", "utf8"), /Questionário de Despesas/);
});
