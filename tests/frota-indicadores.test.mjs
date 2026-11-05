import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { custoPorKm, custoPorKmPorMes, indicadoresDaFrota, proporcaoPreventiva } from "../src/lib/frota-indicadores.ts";

const ler = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const HOJE = "2026-10-20";
const PRAZOS = { iniciar: 2, finalizar: 5 };

const linha = (id, responsavelNome, situacao, extra = {}) => ({
  id,
  veiculoId: id,
  veiculoRotulo: "ABC",
  periodicidade: "Semanal",
  inicio: "2026-10-01",
  fim: "2026-10-07",
  responsavelNome,
  situacao,
  checklistId: null,
  checklistCodigo: null,
  concluidoEm: null,
  ...extra,
});
const grupoDe = (nome) =>
  nome.startsWith("PCM") ? "PCM" : nome.startsWith("Tec") ? "Técnicos" : "Sem área";
const base = {
  statusPreventivas: [],
  ocorrencias: [],
  linhasDoChecklist: [],
  grupoDe,
  hoje: HOJE,
  prazos: PRAZOS,
};

test("manutenções: das preventivas com registro, a parte que não está vencida; faixa pelos limites 90% e 70%", () => {
  const i = indicadoresDaFrota({
    ...base,
    statusPreventivas: ["em_dia", "em_dia", "atencao", "vencida", "sem_registro"],
  });
  assert.equal(i.manutencoes.pct, 75);
  assert.equal(i.manutencoes.faixa, "amarelo");
  assert.match(i.manutencoes.detalhe, /3 de 4 preventivas em dia/);
  assert.equal(
    indicadoresDaFrota({ ...base, statusPreventivas: Array(9).fill("em_dia").concat("vencida") })
      .manutencoes.faixa,
    "verde",
  );
  assert.equal(
    indicadoresDaFrota({ ...base, statusPreventivas: ["vencida", "vencida", "em_dia"] }).manutencoes
      .faixa,
    "vermelho",
  );
  const vazio = indicadoresDaFrota({ ...base, statusPreventivas: ["sem_registro"] }).manutencoes;
  assert.deepEqual([vazio.pct, vazio.faixa], [null, null]);
});

test("ocorrências tratadas no prazo: tratativa iniciada até 2 dias e encerrada até 5 dias depois; aberta vencida sem tratativa conta como fora; aberta no prazo ainda não conta", () => {
  const trat = (ocorridoEm, registradaEm, status = "Em tratativa", encerradaEm = null) => ({ ocorridoEm, status, tratativa: { registradaEm }, encerradaEm });
  const i = indicadoresDaFrota({
    ...base,
    ocorrencias: [
      trat("2026-10-16T10:00", "2026-10-17T12:00:00-03:00"), // iniciou em 1 dia, ainda no prazo de finalizar: no prazo
      trat("2026-10-01T10:00", "2026-10-02T12:00:00-03:00", "Encerrada", "2026-10-04T12:00:00-03:00"), // no prazo
      trat("2026-10-01T10:00", "2026-10-08T12:00:00-03:00"), // iniciou em 7 dias: fora
      { ocorridoEm: "2026-10-01T10:00", status: "Aberta" }, // aberta vencida sem tratativa: fora
      { ocorridoEm: "2026-10-19T10:00", status: "Aberta" }, // aberta no prazo: ainda não conta
    ],
  });
  assert.equal(i.ocorrencias.pct, 50);
  assert.equal(i.ocorrencias.faixa, "vermelho");
  assert.match(i.ocorrencias.detalhe, /2 de 4 tratadas no prazo/);
  const encerradaTarde = indicadoresDaFrota({ ...base, ocorrencias: [trat("2026-10-01T10:00", "2026-10-02T12:00:00-03:00", "Encerrada", "2026-10-15T12:00:00-03:00")] });
  assert.equal(encerradaTarde.ocorrencias.pct, 0, "encerrada depois do prazo de finalizar: fora");
  assert.deepEqual([indicadoresDaFrota(base).ocorrencias.pct, indicadoresDaFrota(base).ocorrencias.faixa], [null, null]);
});

test("check list: o PCM e os técnicos separados pelo grupo do responsável; não realizados leva a cor dos realizados no prazo", () => {
  const linhasDoChecklist = [
    linha("1", "PCM Ana", "realizado"),
    linha("2", "PCM Ana", "realizado"),
    linha("3", "PCM Ana", "nao_realizado"),
    linha("4", "Tec Bruno", "realizado"),
    linha("5", "Tec Bruno", "realizado"),
    linha("6", "Tec Bruno", "realizado"),
    linha("7", "Tec Bruno", "realizado"),
    linha("8", "Tec Bruno", "realizado"),
    linha("9", "Tec Bruno", "realizado"),
    linha("10", "Tec Bruno", "realizado"),
    linha("11", "Tec Bruno", "realizado"),
    linha("12", "Tec Bruno", "realizado"),
    linha("13", "Tec Bruno", "nao_realizado"),
    linha("14", "Tec Bruno", "a_vencer"),
    linha("15", "Fulano", "nao_realizado"),
  ];
  const i = indicadoresDaFrota({ ...base, linhasDoChecklist });
  assert.deepEqual([i.checklistPcm.pct, i.checklistPcm.faixa], [66.7, "vermelho"]);
  assert.deepEqual([i.tecnicosNoPrazo.pct, i.tecnicosNoPrazo.faixa], [90, "verde"]);
  assert.equal(i.tecnicosNaoRealizados.pct, 10);
  assert.equal(i.tecnicosNaoRealizados.faixa, "verde", "poucos não realizados é verde");
  assert.match(i.tecnicosNaoRealizados.detalhe, /1 de 10 sem fazer no prazo/);
  const semDados = indicadoresDaFrota({
    ...base,
    linhasDoChecklist: [linha("1", "Tec Bruno", "a_vencer")],
  });
  assert.deepEqual(
    [semDados.checklistPcm.pct, semDados.checklistPcm.faixa, semDados.tecnicosNoPrazo.pct],
    [null, null, null],
  );
});

test("conformidade geral (SLA): tarefas concluídas no prazo ÷ tarefas atribuídas, preventivas, check lists e ocorrências juntos", () => {
  const i = indicadoresDaFrota({
    ...base,
    statusPreventivas: ["em_dia", "em_dia", "em_dia", "vencida"], // 3 de 4
    ocorrencias: [{ ocorridoEm: "2026-10-16T10:00", status: "Em tratativa", tratativa: { registradaEm: "2026-10-17T12:00:00-03:00" } }, { ocorridoEm: "2026-10-01T10:00", status: "Aberta" }], // 1 de 2
    linhasDoChecklist: [linha("1", "PCM Ana", "realizado"), linha("2", "Tec Bruno", "nao_realizado"), linha("3", "Fulano", "realizado"), linha("4", "Tec Bruno", "a_vencer")], // 2 de 3
  });
  assert.equal(i.conformidadeGeral.pct, 66.7); // 6 de 9
  assert.equal(i.conformidadeGeral.faixa, "vermelho");
  assert.match(i.conformidadeGeral.detalhe, /6 de 9 tarefas no prazo/);
  assert.deepEqual([indicadoresDaFrota(base).conformidadeGeral.pct, indicadoresDaFrota(base).conformidadeGeral.faixa], [null, null]);
});

test("CPK: (abastecimento + manutenção) ÷ km rodados; o abastecimento do km de partida e os veículos sem km rodados ficam de fora", () => {
  const c = custoPorKm(
    ["a", "b", "c"],
    [
      { veiculoId: "a", data: "2026-09-01", km: 1000, valor: 300 }, // km de partida: não entra
      { veiculoId: "a", data: "2026-09-20", km: 1400, valor: 200 },
      { veiculoId: "b", data: "2026-09-01", km: 500, valor: 999 }, // um km só: sem rodados, não entra
      { veiculoId: "c", data: "2026-09-01", km: 0, valor: null },
    ],
    [{ veiculoId: "a", data: "2026-09-10", km: 1200, tipo: "Corretiva", custo: 500 }],
  );
  assert.deepEqual(c, { valor: 1.75, abastecimento: 200, manutencao: 500, km: 400 });
  assert.equal(custoPorKm([], [], []).valor, null);
});

test("CPK mês a mês: km do mês a partir do maior km anterior; mês sem km rodados fica sem valor", () => {
  const meses = custoPorKmPorMes(
    ["a"],
    [
      { veiculoId: "a", data: "2026-08-10", km: 1000, valor: 100 },
      { veiculoId: "a", data: "2026-09-10", km: 1200, valor: 100 },
      { veiculoId: "a", data: "2026-10-05", km: 1500, valor: 150 },
    ],
    [{ veiculoId: "a", data: "2026-10-08", km: 1600, tipo: "Preventiva", custo: 250 }],
    "2026-10-20",
    3,
  );
  assert.deepEqual(meses.map((m) => [m.mes, m.cpk]), [["2026-08", null], ["2026-09", 0.5], ["2026-10", 1]]); // ago: um km só; set: 100/200; out: (150+250)/400
});

test("proporção preventiva: gasto preventivo ÷ gasto de manutenção, verde de 80%, amarelo de 70%, vermelho abaixo (modo reativo)", () => {
  const m = (tipo, custo) => ({ veiculoId: "a", data: "2026-10-01", km: 1, tipo, custo });
  const faixa = (prev, corr) => proporcaoPreventiva(["a"], [m("Preventiva", prev), m("Corretiva", corr)]);
  assert.deepEqual([faixa(80, 20).pct, faixa(80, 20).faixa], [80, "verde"]);
  assert.deepEqual([faixa(75, 25).pct, faixa(75, 25).faixa], [75, "amarelo"]);
  assert.deepEqual([faixa(69, 31).pct, faixa(69, 31).faixa], [69, "vermelho"]);
  assert.deepEqual([proporcaoPreventiva(["a"], []).pct, proporcaoPreventiva(["a"], []).faixa], [null, null]);
  assert.equal(proporcaoPreventiva(["outro"], [m("Corretiva", 10)]).pct, null, "só a frota listada");
});

test("a Frota mostra os cards do PCM e dos técnicos com seta e cor por faixa, e a coluna de média km/L", () => {
  const cartoes = ler("components/modules/CartoesIndicadoresFrota.tsx");
  // Decisão 342: os sete cartões sempre à vista; o título diz de quem é (PCM, Técnicos ou Geral da frota) e o subtítulo, como é calculado.
  for (const t of [
    "PCM · Índice de manutenções preventivas em dia",
    "PCM · Índice de check lists realizados no prazo",
    "PCM · Índice de ocorrências tratadas no prazo",
    "Frota · Conformidade geral (SLA)",
    "Frota · Custo por km rodado (CPK)",
    "Frota · Custo preventivo (meta 80%)",
    "Técnicos · Índice de check lists realizados no prazo",
    "Técnicos · Índice de check lists atrasados",
  ])
    assert.ok(cartoes.includes(t), t);
  assert.equal((cartoes.match(/subtitulo="/g) ?? []).length, 8, "cada cartão explica como é calculado");
  assert.ok(!cartoes.includes("aria-pressed"), "sem botões para alternar entre PCM e técnicos");
  assert.match(cartoes, /verde: \{[^}]*Icone: ArrowUp/);
  assert.match(cartoes, /amarelo: \{[^}]*Icone: ArrowLeftRight/);
  assert.match(cartoes, /vermelho: \{[^}]*Icone: ArrowDown/);
  assert.match(cartoes, /sm:grid-cols-2 lg:grid-cols-4/, "oito cartões estreitos, quatro por linha (dois no celular)");
  const frota = ler("components/modules/FrotaModulo.tsx");
  assert.match(frota, /<CartoesIndicadoresFrota\s+indicadores=\{indicadores\}/);
  assert.match(
    frota,
    /mediaKmPorLitro\(historicoAbastecimentos\(abastecimentos\.filter\(\(a\) => a\.veiculoId === id\)\)\)/,
  );
  assert.match(
    frota,
    /<TableHead className="w-\[8%\] whitespace-nowrap pr-6 text-right">Média km\/L<\/TableHead>/,
  );
  assert.match(ler("lib/frota-relatorio-html.ts"), /<th class="num">Média km\/L<\/th>/);
});

test("a Frota filtra a lista por subcategoria do veículo, ao lado da busca por palavra-chave (decisão 342)", () => {
  const frota = ler("components/modules/FrotaModulo.tsx");
  assert.match(frota, /aria-label="Filtrar por subcategoria do veículo"/);
  assert.match(frota, /subcategoriasAtivasDa\(parametros, "cat-veiculos"\)/, "as opções são as subcategorias ativas de veículos");
  assert.match(frota, /nomeSubcategoria\(parametros, "cat-veiculos", v as never\) === filtroSubcategoria/, "o filtro compara com a subcategoria do veículo");
  assert.match(frota, /nomesDeSubcategoria\.includes\(subcategoria\) \? subcategoria : TODAS_AS_SUBCATEGORIAS/, "subcategoria que sumiu volta a todas, sem esvaziar a lista");
  assert.match(frota, /\.\.\.veiculos\.map\(\(v\) => nomeSubcategoria/, "as subcategorias que os veículos ainda usam também são opções");
  const filtros = frota.slice(frota.indexOf("filtros={"), frota.indexOf("acoes={"));
  assert.ok(filtros.indexOf("<Select") < filtros.indexOf("<Input"), "a seleção fica ao lado da busca, antes dela");
});

test("meses abaixo de 70% de preventivo entram no alerta de modo reativo (regra 80/20)", async () => {
  const { mesesNoModoReativo } = await import("../src/lib/frota-indicadores.ts");
  const meses = [
    { rotulo: "jun/26", preventiva: 100, corretiva: 0 },
    { rotulo: "jul/26", preventiva: 75, corretiva: 25 },
    { rotulo: "ago/26", preventiva: 63.9, corretiva: 36.1 },
    { rotulo: "set/26", preventiva: 70, corretiva: 30 },
    { rotulo: "out/26", preventiva: 0, corretiva: 100 },
    { rotulo: "nov/26", preventiva: 0, corretiva: 0 },
  ];
  assert.deepEqual(mesesNoModoReativo(meses), ["ago/26", "out/26"], "70% exato não alerta e mês sem gasto não conta");
});
