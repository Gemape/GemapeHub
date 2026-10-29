import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { indicadoresDaManutencao } from "../src/lib/manutencao-indicadores.ts";

const ler = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");

test("preventivas e corretivas: quantidade e parte do total registrado", () => {
  const i = indicadoresDaManutencao({ tipos: ["Preventiva", "Preventiva", "Preventiva", "Corretiva"], statusRevisoes: [] });
  assert.deepEqual([i.preventivas.qtd, i.preventivas.indicador.pct, i.corretivas.qtd, i.corretivas.indicador.pct], [3, 75, 1, 25]);
  assert.equal(indicadoresDaManutencao({ tipos: [], statusRevisoes: [] }).preventivas.indicador.pct, null);
});

test("revisões do plano: no prazo é o que não está vencido; não realizadas é o complemento e leva a cor do no prazo; sem registro não conta", () => {
  const i = indicadoresDaManutencao({ tipos: [], statusRevisoes: ["em_dia", "em_dia", "atencao", "vencida", "sem_registro"] });
  assert.deepEqual([i.noPrazo.pct, i.noPrazo.faixa, i.naoRealizadas.pct, i.naoRealizadas.faixa], [75, "amarelo", 25, "amarelo"]);
  assert.match(i.noPrazo.detalhe, /3 de 4 revisões no prazo/);
  const ok = indicadoresDaManutencao({ tipos: [], statusRevisoes: Array(9).fill("em_dia").concat("vencida") });
  assert.deepEqual([ok.noPrazo.faixa, ok.naoRealizadas.pct, ok.naoRealizadas.faixa], ["verde", 10, "verde"]);
  assert.deepEqual([i.previstas.qtd, i.previstas.indicador.pct], [5, 80]);
  const vazio = indicadoresDaManutencao({ tipos: [], statusRevisoes: ["sem_registro"] });
  assert.deepEqual([vazio.noPrazo.pct, vazio.naoRealizadas.pct, vazio.noPrazo.faixa], [null, null, null]);
});

test("a tela de Manutenção traz os cards e a lista de revisões com serviço, periodicidade, última, próxima e os links para sugeridas e realizadas", () => {
  const modulo = ler("components/modules/ManutencaoVeiculoModulo.tsx");
  assert.match(modulo, /<CartoesManutencao indicadores=\{indicadores\} \/>/);
  assert.match(modulo, /<ManutencaoRevisoes revisoes=\{revisoesDaBusca\}/);
  assert.match(modulo, /aria-pressed=\{visao === "registros"\}/, "os registros (editar, relatório, excluir) continuam numa visão da lista");
  const lista = ler("components/modules/ManutencaoRevisoes.tsx");
  for (const t of ["Veículo", "Serviço", "Periodicidade", "Última realizada", "Próxima revisão", "Situação", "Sugeridas", "Realizadas"]) assert.ok(lista.includes(t), t);
  assert.match(lista, /aoAbrir\(veiculoId, "sugeridas"\)/);
  assert.match(lista, /aoAbrir\(veiculoId, "realizadas"\)/);
  const cartoes = ler("components/modules/CartoesManutencao.tsx");
  assert.match(cartoes, /aria-pressed=\{grupo === g\.id\}/, "dois botões separam os cards de manutenção dos indicadores");
  for (const t of ["Previstas", "Preventivas", "Corretivas", "Realizadas no prazo", "Não realizadas no prazo"]) assert.ok(cartoes.includes(t), t);
});
