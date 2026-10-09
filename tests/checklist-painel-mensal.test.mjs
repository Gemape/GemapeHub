import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

process.env.TZ = "America/Sao_Paulo";
const {
  periodosDoMes, sincronizarPrevisoes, lerPrevisoes, painelDoMes, mesesDisponiveis,
} = await import("../src/lib/checklist-painel.ts");

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const v = (veiculoId, periodicidade, extra = {}) => ({ veiculoId, veiculoRotulo: `Carro ${veiculoId}`, periodicidade, responsavelNome: "Ana", ...extra });

test("períodos do mês: diário, semanal (segunda a domingo, vale o domingo), quinzenal e mensal", () => {
  assert.equal(periodosDoMes("Diário", "2026-10").length, 31);
  assert.deepEqual(periodosDoMes("Diário", "2026-02")[27], { inicio: "2026-02-28", fim: "2026-02-28" });
  // Outubro de 2026 tem domingos nos dias 4, 11, 18 e 25: a primeira semana começa em 28/09.
  assert.deepEqual(periodosDoMes("Semanal", "2026-10"), [
    { inicio: "2026-09-28", fim: "2026-10-04" },
    { inicio: "2026-10-05", fim: "2026-10-11" },
    { inicio: "2026-10-12", fim: "2026-10-18" },
    { inicio: "2026-10-19", fim: "2026-10-25" },
  ]);
  assert.deepEqual(periodosDoMes("Quinzenal", "2026-10"), [
    { inicio: "2026-10-01", fim: "2026-10-15" },
    { inicio: "2026-10-16", fim: "2026-10-31" },
  ]);
  assert.deepEqual(periodosDoMes("Mensal", "2026-02"), [{ inicio: "2026-02-01", fim: "2026-02-28" }]);
});

test("a lista de meses vai do atual para trás, sem meses futuros", () => {
  assert.deepEqual(mesesDisponiveis("2026-10-07", 3), ["2026-10", "2026-09", "2026-08"]);
  assert.equal(mesesDisponiveis("2026-01-10", 3)[1], "2025-12");
});

test("a previsão começa no dia do cadastro: não cobra o que passou antes da associação", () => {
  const s = memoria();
  sincronizarPrevisoes({ veiculos: [v("a", "Semanal"), v("b", "Mensal")], hoje: "2026-10-07" }, s);
  const p = lerPrevisoes(s);
  // Semana de hoje (05 a 11/10) e as seguintes; nada de 28/09 a 04/10.
  assert.deepEqual(p.filter((x) => x.veiculoId === "a").map((x) => x.fim), ["2026-10-11", "2026-10-18", "2026-10-25"]);
  assert.deepEqual(p.filter((x) => x.veiculoId === "b").map((x) => [x.inicio, x.fim]), [["2026-10-01", "2026-10-31"]]);
});

test("sincronizar de novo não duplica, e o que já passou fica congelado mesmo se a associação mudar", () => {
  const s = memoria();
  sincronizarPrevisoes({ veiculos: [v("a", "Semanal")], hoje: "2026-10-07" }, s);
  sincronizarPrevisoes({ veiculos: [v("a", "Semanal")], hoje: "2026-10-07" }, s);
  assert.equal(lerPrevisoes(s).length, 3);
  // Dia 12: a semana 05 a 11/10 já passou; trocar para Mensal e sair o veículo não a apaga.
  sincronizarPrevisoes({ veiculos: [v("a", "Mensal", { responsavelNome: "Outro" })], hoje: "2026-10-12" }, s);
  const p = lerPrevisoes(s);
  assert.ok(p.some((x) => x.fim === "2026-10-11" && x.periodicidade === "Semanal" && x.responsavelNome === "Ana"));
  assert.equal(p.filter((x) => x.periodicidade === "Semanal" && x.fim >= "2026-10-12").length, 0);
  assert.ok(p.some((x) => x.periodicidade === "Mensal" && x.fim === "2026-10-31"));
  sincronizarPrevisoes({ veiculos: [], hoje: "2026-10-13" }, s);
  assert.deepEqual(lerPrevisoes(s).map((x) => x.fim), ["2026-10-11"]);
});

test("painel do mês: realizado no prazo, não realizado no prazo e a vencer, com os percentuais", () => {
  const s = memoria();
  sincronizarPrevisoes({ veiculos: [v("a", "Semanal")], hoje: "2026-10-05" }, s);
  const checklists = [
    { id: "c1", codigo: "CHK-0001", veiculoId: "a", periodicidade: "Semanal", status: "Concluído", data: "2026-10-07", concluidoEm: "2026-10-07T15:00:00Z", responsavelNome: "Beto" },
    // Em andamento não conta como realizado.
    { id: "c2", codigo: "CHK-0002", veiculoId: "a", periodicidade: "Semanal", status: "Em andamento", data: "2026-10-13", concluidoEm: null, responsavelNome: "Beto" },
  ];
  const painel = painelDoMes("2026-10", lerPrevisoes(s), checklists, "2026-10-20");
  assert.deepEqual(painel.linhas.map((l) => [l.fim, l.situacao]), [
    ["2026-10-11", "realizado"],
    ["2026-10-18", "nao_realizado"],
    ["2026-10-25", "a_vencer"],
  ]);
  assert.equal(painel.linhas[0].checklistId, "c1");
  assert.equal(painel.linhas[0].responsavelNome, "Beto");
  assert.equal(painel.linhas[1].checklistId, null);
  assert.equal(painel.linhas[1].responsavelNome, "Ana");
  assert.deepEqual(painel.resumo, { previstos: 3, opcionais: 0, realizados: 1, naoRealizados: 1, aVencer: 1, pctNoPrazo: 50, pctNaoNoPrazo: 50 });
});

test("a conclusão vale pelo dia de Brasília e check list fora do prazo não cobre o período", () => {
  const s = memoria();
  sincronizarPrevisoes({ veiculos: [v("a", "Diário")], hoje: "2026-10-30" }, s);
  const chk = (concluidoEm) => [{ id: "c", codigo: "CHK-1", veiculoId: "a", periodicidade: "Diário", status: "Concluído", data: "2026-10-30", concluidoEm, responsavelNome: "B" }];
  // 01:30Z de 31/10 ainda é 30/10 em Brasília.
  const a = painelDoMes("2026-10", lerPrevisoes(s), chk("2026-10-31T01:30:00Z"), "2026-10-31");
  assert.equal(a.linhas.find((l) => l.fim === "2026-10-30").situacao, "realizado");
  assert.equal(a.linhas.find((l) => l.fim === "2026-10-31").situacao, "a_vencer");
  const b = painelDoMes("2026-10", lerPrevisoes(s), [], "2026-11-02");
  assert.equal(b.resumo.naoRealizados, 2);
  assert.equal(b.resumo.pctNoPrazo, 0);
});

test("mês sem previsão: tudo zerado e percentuais nulos; outro mês não aparece", () => {
  const s = memoria();
  sincronizarPrevisoes({ veiculos: [v("a", "Mensal")], hoje: "2026-10-05" }, s);
  const p = painelDoMes("2026-09", lerPrevisoes(s), [], "2026-10-05");
  assert.deepEqual(p.linhas, []);
  assert.deepEqual(p.resumo, { previstos: 0, opcionais: 0, realizados: 0, naoRealizados: 0, aVencer: 0, pctNoPrazo: null, pctNaoNoPrazo: null });
  // Só a vencer: ainda não há base para percentual.
  const q = painelDoMes("2026-10", lerPrevisoes(s), [], "2026-10-05");
  assert.equal(q.resumo.aVencer, 1);
  assert.equal(q.resumo.pctNoPrazo, null);
});

test("dados ilegíveis não são sobrescritos ao sincronizar", () => {
  const dados = new Map([["gemape-demo-checklist-previsoes", "{quebrado"]]);
  const s = { getItem: (c) => dados.get(c) ?? null, setItem: (c, x) => dados.set(c, x) };
  assert.throws(() => sincronizarPrevisoes({ veiculos: [v("a", "Mensal")], hoje: "2026-10-05" }, s), /lid/i);
  assert.equal(dados.get("gemape-demo-checklist-previsoes"), "{quebrado");
});

test("antes do prazo a previsão acompanha a associação: responsável e rótulo novos substituem os antigos", () => {
  const s = memoria();
  sincronizarPrevisoes({ veiculos: [v("a", "Mensal")], hoje: "2026-10-05" }, s);
  sincronizarPrevisoes({ veiculos: [v("a", "Mensal", { responsavelNome: "Novo", veiculoRotulo: "Placa nova" })], hoje: "2026-10-06" }, s);
  const p = lerPrevisoes(s);
  assert.equal(p.length, 1);
  assert.equal(p[0].responsavelNome, "Novo");
  assert.equal(p[0].veiculoRotulo, "Placa nova");
  // Depois do prazo, congela com o que valia.
  sincronizarPrevisoes({ veiculos: [v("a", "Mensal", { responsavelNome: "Outro" })], hoje: "2026-11-02" }, s);
  assert.equal(lerPrevisoes(s).find((x) => x.fim === "2026-10-31").responsavelNome, "Novo");
});

test("a previsão vale desde o dia da associação, mesmo que o módulo só abra depois", () => {
  const s = memoria();
  // Associação diária de 01/10, módulo aberto só em 20/10: os dias 01 a 19 entram e ficam como não realizados.
  sincronizarPrevisoes({ veiculos: [v("a", "Diário", { desde: "2026-10-01" })], hoje: "2026-10-20" }, s);
  const p = lerPrevisoes(s);
  assert.equal(p.filter((x) => x.fim <= "2026-10-31").length, 31);
  const painel = painelDoMes("2026-10", p, [], "2026-10-20");
  assert.equal(painel.resumo.naoRealizados, 19);
  assert.equal(painel.resumo.aVencer, 12);
  // Mês inteiro sem abrir o módulo: setembro também é preenchido, desde a associação.
  const t = memoria();
  sincronizarPrevisoes({ veiculos: [v("a", "Mensal", { desde: "2026-09-10" })], hoje: "2026-10-05" }, t);
  assert.deepEqual(lerPrevisoes(t).map((x) => x.fim), ["2026-09-30", "2026-10-31"]);
  // Sem `desde`, vale hoje (não volta no tempo).
  const u = memoria();
  sincronizarPrevisoes({ veiculos: [v("a", "Diário")], hoje: "2026-10-20" }, u);
  assert.equal(lerPrevisoes(u).length, 12);
});

test("os percentuais somam sempre 100%, mesmo com arredondamento", () => {
  const s = memoria();
  sincronizarPrevisoes({ veiculos: [v("a", "Diário", { desde: "2026-10-01" })], hoje: "2026-10-17" }, s);
  // 16 dias vencidos (01 a 16): 1 realizado e 15 não.
  const chk = [{ id: "c", codigo: "CHK-1", veiculoId: "a", periodicidade: "Diário", status: "Concluído", data: "2026-10-01", concluidoEm: "2026-10-01T15:00:00Z", responsavelNome: "B" }];
  const r = painelDoMes("2026-10", lerPrevisoes(s), chk, "2026-10-17").resumo;
  assert.equal(r.realizados + r.naoRealizados, 16);
  assert.equal(Math.round((r.pctNoPrazo + r.pctNaoNoPrazo) * 10), 1000);
});

test("com duas periodicidades no veículo, cada previsão só é cumprida por check list da própria periodicidade (dec 124)", () => {
  const s = memoria();
  sincronizarPrevisoes({ veiculos: [v("a", "Semanal"), v("a", "Mensal")], hoje: "2026-10-05" }, s);
  const semanal = { id: "c1", codigo: "CHK-0001", veiculoId: "a", periodicidade: "Semanal", status: "Concluído", data: "2026-10-07", concluidoEm: "2026-10-07T15:00:00Z", responsavelNome: "Beto" };
  const painel = painelDoMes("2026-10", lerPrevisoes(s), [semanal], "2026-11-02");
  const mensal = painel.linhas.filter((l) => l.periodicidade === "Mensal");
  assert.equal(mensal.length, 1);
  assert.equal(mensal[0].situacao, "nao_realizado"); // o semanal não cobre o mensal
  assert.equal(painel.linhas.filter((l) => l.periodicidade === "Semanal" && l.situacao === "realizado").length, 1);
  const mensalFeito = { ...semanal, id: "c2", codigo: "CHK-0002", periodicidade: "Mensal" };
  const depois = painelDoMes("2026-10", lerPrevisoes(s), [semanal, mensalFeito], "2026-11-02");
  assert.equal(depois.linhas.find((l) => l.periodicidade === "Mensal").situacao, "realizado");
});

test("o módulo prevê uma vez por periodicidade do veículo (dec 124)", () => {
  const tela = readFileSync(new URL("../src/components/modules/ChecklistVeiculoModulo.tsx", import.meta.url), "utf8");
  assert.match(tela, /periodicidadesDaAssociacao\(associacao\)\.map\(\(periodicidade\) => \(\{/);
});

test("só o obrigatório entra nos percentuais; o opcional aparece como Opcional (dec 125)", () => {
  const s = memoria();
  sincronizarPrevisoes({ veiculos: [v("a", "Semanal", { obrigatorio: true }), v("a", "Mensal", { obrigatorio: false })], hoje: "2026-10-05" }, s);
  const semanal = { id: "c1", codigo: "CHK-0001", veiculoId: "a", periodicidade: "Semanal", status: "Concluído", data: "2026-10-07", concluidoEm: "2026-10-07T15:00:00Z", responsavelNome: "Beto" };
  const painel = painelDoMes("2026-10", lerPrevisoes(s), [semanal], "2026-11-02");
  const mensal = painel.linhas.find((l) => l.periodicidade === "Mensal");
  assert.equal(mensal.situacao, "opcional"); // prazo vencido e não feito, mas é opcional: não é "não realizado"
  assert.equal(painel.resumo.opcionais, 1);
  assert.equal(painel.resumo.previstos, 3); // só os 3 semanais
  assert.equal(painel.resumo.realizados, 1);
  assert.equal(painel.resumo.naoRealizados, 2);
  assert.equal(painel.resumo.pctNoPrazo, 33.3);
  // o opcional feito aparece como Realizado, mas continua fora dos percentuais
  const mensalFeito = { ...semanal, id: "c2", codigo: "CHK-0002", periodicidade: "Mensal" };
  const depois = painelDoMes("2026-10", lerPrevisoes(s), [semanal, mensalFeito], "2026-11-02");
  assert.equal(depois.linhas.find((l) => l.periodicidade === "Mensal").situacao, "realizado");
  assert.equal(depois.resumo.realizados, 1);
});

test("previsão antiga, sem o campo obrigatório, continua valendo como obrigatória (dec 125)", () => {
  const s = memoria();
  sincronizarPrevisoes({ veiculos: [v("a", "Semanal")], hoje: "2026-10-05" }, s);
  assert.ok(lerPrevisoes(s).every((p) => p.obrigatorio === true));
  const antigas = lerPrevisoes(s).map(({ obrigatorio, ...resto }) => resto);
  const painel = painelDoMes("2026-10", antigas, [], "2026-11-02");
  assert.equal(painel.resumo.naoRealizados, painel.resumo.previstos);
  assert.equal(painel.resumo.opcionais, 0);
});

test("a periodicidade é obrigatória se algum grupo periódico dela está marcado (dec 125)", async () => {
  const { periodicidadeObrigatoria } = await import("../src/lib/checklist-veiculo.ts");
  const assoc = { itens: [
    { grupoId: "g1", tipo: "periodico", periodicidade: "Semanal", obrigatorio: true },
    { grupoId: "g2", tipo: "periodico", periodicidade: "Mensal", obrigatorio: false },
    { grupoId: "g3", tipo: "periodico", periodicidade: "Diária", obrigatorio: true },
  ] };
  assert.equal(periodicidadeObrigatoria(assoc, "Semanal"), true);
  assert.equal(periodicidadeObrigatoria(assoc, "Mensal"), false);
  assert.equal(periodicidadeObrigatoria(assoc, "Diário"), true);
  assert.equal(periodicidadeObrigatoria(undefined, "Semanal"), false);
  const tela = readFileSync(new URL("../src/components/modules/ChecklistVeiculoModulo.tsx", import.meta.url), "utf8");
  assert.match(tela, /obrigatorio: periodicidadeObrigatoria\(associacao, periodicidade\)/);
});
