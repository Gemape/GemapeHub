import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { custoPorKm, indicadoresDaFrota } from "../src/lib/frota-indicadores.ts";

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

test("ocorrências: das abertas, as que estão no prazo da tratativa; sem aberta, 100%", () => {
  const aberta = (ocorridoEm) => ({ ocorridoEm, status: "Aberta" });
  const i = indicadoresDaFrota({
    ...base,
    ocorrencias: [
      aberta("2026-10-01T10:00"),
      aberta("2026-10-19T10:00"),
      aberta("2026-10-19T11:00"),
      { ocorridoEm: "2026-09-01T10:00", status: "Encerrada" },
    ],
  });
  assert.equal(i.ocorrencias.pct, 66.7);
  assert.equal(i.ocorrencias.faixa, "vermelho");
  assert.deepEqual(
    [indicadoresDaFrota(base).ocorrencias.pct, indicadoresDaFrota(base).ocorrencias.faixa],
    [100, "verde"],
  );
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
    ocorrencias: [{ ocorridoEm: "2026-10-19T10:00", status: "Aberta" }, { ocorridoEm: "2026-10-01T10:00", status: "Aberta" }], // 1 de 2
    linhasDoChecklist: [linha("1", "PCM Ana", "realizado"), linha("2", "Tec Bruno", "nao_realizado"), linha("3", "Fulano", "realizado"), linha("4", "Tec Bruno", "a_vencer")], // 2 de 3
  });
  assert.equal(i.conformidadeGeral.pct, 66.7); // 6 de 9
  assert.equal(i.conformidadeGeral.faixa, "vermelho");
  assert.match(i.conformidadeGeral.detalhe, /6 de 9 tarefas no prazo/);
  assert.deepEqual([indicadoresDaFrota(base).conformidadeGeral.pct, indicadoresDaFrota(base).conformidadeGeral.faixa], [null, null]);
});

test("CPK: (abastecimento + manutenção) ÷ km rodados; os gastos só entram dos veículos com km rodados", () => {
  const c = custoPorKm(
    ["a", "b", "c"],
    [
      { veiculoId: "a", km: 1000, valor: 300 },
      { veiculoId: "a", km: 1400, valor: 200 },
      { veiculoId: "b", km: 500, valor: 999 }, // um km só: sem rodados, não entra
      { veiculoId: "c", km: 0, valor: null },
    ],
    [{ veiculoId: "a", km: 1200, custo: 500 }],
  );
  assert.deepEqual(c, { valor: 2.5, abastecimento: 500, manutencao: 500, km: 400 });
  assert.equal(custoPorKm([], [], []).valor, null);
});

test("a Frota mostra os cards do PCM e dos técnicos com seta e cor por faixa, e a coluna de média km/L", () => {
  const cartoes = ler("components/modules/CartoesIndicadoresFrota.tsx");
  // Decisão 342: os seis indicadores sempre à vista; o título diz de quem é (PCM, Técnicos ou Geral da frota) e o subtítulo, como é calculado.
  for (const t of [
    "PCM · Preventivas em dia",
    "PCM · Check list no prazo",
    "PCM · Ocorrências no prazo",
    "Frota · Conformidade geral (SLA)",
    "Frota · Custo por km rodado (CPK)",
    "Técnicos · Check list no prazo",
    "Técnicos · Check list atrasado",
  ])
    assert.ok(cartoes.includes(t), t);
  assert.equal((cartoes.match(/subtitulo="/g) ?? []).length, 7, "cada cartão explica como é calculado");
  assert.ok(!cartoes.includes("aria-pressed"), "sem botões para alternar entre PCM e técnicos");
  assert.match(cartoes, /verde: \{[^}]*Icone: ArrowUp/);
  assert.match(cartoes, /amarelo: \{[^}]*Icone: ArrowLeftRight/);
  assert.match(cartoes, /vermelho: \{[^}]*Icone: ArrowDown/);
  assert.match(cartoes, /sm:grid-cols-2 lg:grid-cols-4/, "sete cartões estreitos, quatro por linha (dois no celular)");
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
  assert.match(frota, /nomeSubcategoria\(parametros, "cat-veiculos", v as never\) === subcategoria/, "o filtro compara com a subcategoria do veículo");
  const filtros = frota.slice(frota.indexOf("filtros={"), frota.indexOf("acoes={"));
  assert.ok(filtros.indexOf("<Select") < filtros.indexOf("<Input"), "a seleção fica ao lado da busca, antes dela");
});
