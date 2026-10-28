import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { painelDoMes, resultadosPorResponsavel } from "../src/lib/checklist-painel.ts";

const ler = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");

const previsao = (id, fim, responsavelNome, extra = {}) => ({ id, veiculoId: id, veiculoRotulo: "ABC1D23", periodicidade: "Semanal", inicio: fim, fim, responsavelNome, ...extra });

test("os resultados por responsável contam só os obrigatórios e dão o percentual do que já tem desfecho", () => {
  const hoje = "2026-10-20";
  const previsoes = [
    previsao("a", "2026-10-04", "Ana"), previsao("b", "2026-10-11", "Ana"), previsao("c", "2026-10-25", "Ana"),
    previsao("d", "2026-10-04", "Bruno"), previsao("e", "2026-10-11", "Bruno", { obrigatorio: false }),
    previsao("f", "2026-10-25", ""),
  ];
  const feitos = [{ id: "k1", codigo: "CHK-1", veiculoId: "a", periodicidade: "Semanal", status: "Concluído", data: "2026-10-04", concluidoEm: "2026-10-04T15:00:00Z", responsavelNome: "Ana" }];
  const { linhas } = painelDoMes(null, previsoes, feitos, hoje);
  const r = resultadosPorResponsavel(linhas);
  assert.deepEqual(r.map((x) => x.nome), ["Ana", "Bruno", "Não definido"]);
  const ana = r.find((x) => x.nome === "Ana");
  assert.deepEqual([ana.previstos, ana.realizados, ana.naoRealizados, ana.aVencer, ana.pctNoPrazo], [3, 1, 1, 1, 50]);
  const bruno = r.find((x) => x.nome === "Bruno");
  assert.equal(bruno.previstos, 1, "o opcional não conta");
  assert.equal(bruno.pctNoPrazo, 0);
  assert.equal(r.find((x) => x.nome === "Não definido").pctNoPrazo, null, "sem desfecho não há percentual");
});

test("a tela principal do check list de veículos tem indicadores no topo, resultados dos responsáveis e botões separados para periódico e avulso", () => {
  const modulo = ler("components/modules/ChecklistVeiculoModulo.tsx");
  assert.match(modulo, /<ChecklistResultadosPainel/);
  assert.match(modulo, /setAba\("periodicos"\)/);
  assert.match(modulo, /setAba\("avulsos"\)/);
  assert.match(modulo, /Check list periódico/);
  assert.match(modulo, /Check list avulso/);
  assert.doesNotMatch(modulo, /Situação por veículo/);
  const painel = ler("components/modules/ChecklistResultadosPainel.tsx");
  assert.ok(painel.indexOf("Indicadores gerais de check list") < painel.indexOf("Resultados dos responsáveis"));
});

test("as listas do periódico e do avulso têm as mesmas colunas, na mesma ordem, e as ações de cada situação", () => {
  const listas = ler("components/modules/ChecklistListasVeiculo.tsx");
  assert.match(listas, /const CABECALHO = \["Prazo", "Veículo", "Periodicidade", "Responsável", "Situação", "Pendências", ""\];/);
  assert.equal(listas.split("CABECALHO.map").length - 1, 2, "as duas listas usam o mesmo cabeçalho");
  // a vencer: Realizar (ou Continuar); realizado: Ver check list; não realizado no prazo: sem ação.
  assert.match(listas, /l\.situacao === "realizado" && l\.checklistId/);
  assert.match(listas, />Ver check list</);
  assert.match(listas, />Realizar</);
  assert.match(listas, /const aberto = l\.situacao === "a_vencer" \|\| \(l\.situacao === "opcional" && l\.fim >= hoje\)/);
  assert.match(listas, /<span className="text-muted-foreground">—<\/span>\}/);
});
