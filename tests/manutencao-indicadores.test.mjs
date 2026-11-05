import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { indicadoresDaManutencao } from "../src/lib/manutencao-indicadores.ts";

const ler = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");

test("preventivas e corretivas: quantidade e parte do total registrado", () => {
  const i = indicadoresDaManutencao({
    tipos: ["Preventiva", "Preventiva", "Preventiva", "Corretiva"],
    statusRevisoes: [],
  });
  assert.deepEqual(
    [i.preventivas.qtd, i.preventivas.indicador.pct, i.corretivas.qtd, i.corretivas.indicador.pct],
    [3, 75, 1, 25],
  );
  assert.equal(
    indicadoresDaManutencao({ tipos: [], statusRevisoes: [] }).preventivas.indicador.pct,
    null,
  );
});

test("revisões do plano: no prazo é o que não está vencido; não realizadas é o complemento e leva a cor do no prazo; sem registro não conta", () => {
  const i = indicadoresDaManutencao({
    tipos: [],
    statusRevisoes: ["em_dia", "em_dia", "atencao", "vencida", "sem_registro"],
  });
  assert.deepEqual(
    [i.noPrazo.pct, i.noPrazo.faixa, i.naoRealizadas.pct, i.naoRealizadas.faixa],
    [75, "amarelo", 25, "amarelo"],
  );
  assert.match(i.noPrazo.detalhe, /3 de 4 revisões no prazo/);
  const ok = indicadoresDaManutencao({
    tipos: [],
    statusRevisoes: Array(9).fill("em_dia").concat("vencida"),
  });
  assert.deepEqual(
    [ok.noPrazo.faixa, ok.naoRealizadas.pct, ok.naoRealizadas.faixa],
    ["verde", 10, "verde"],
  );
  assert.deepEqual([i.previstas.qtd, i.previstas.indicador.pct], [5, 80]);
  const vazio = indicadoresDaManutencao({ tipos: [], statusRevisoes: ["sem_registro"] });
  assert.deepEqual(
    [vazio.noPrazo.pct, vazio.naoRealizadas.pct, vazio.noPrazo.faixa],
    [null, null, null],
  );
});

test("a tela de Manutenção traz os cards e a lista de revisões com serviço, periodicidade, última, próxima e os links para sugeridas e realizadas", () => {
  const modulo = ler("components/modules/ManutencaoVeiculoModulo.tsx");
  assert.match(modulo, /<CartoesManutencao indicadores=\{indicadores\} graficos=\{/);
  assert.match(modulo, /<ManutencaoRevisoes revisoes=\{revisoesDaBusca\}/);
  assert.match(
    modulo,
    /aria-pressed=\{tipo === "Preventiva"\}/,
    "na lista das realizadas, os registros preventivos (editar, relatório, excluir) têm o filtro Preventivas",
  );
  assert.match(
    modulo,
    /aria-pressed=\{tipo === "Corretiva"\}/,
    "e os corretivos, o filtro Corretivas",
  );
  // Mesmo padrão do Check list: dois botões azuis no alto abrem as listas, cada uma com o botão de voltar ao painel.
  assert.match(modulo, /setAba\("planejadas"\)[\s\S]*Manutenções planejadas/);
  assert.match(modulo, /setAba\("realizadas"\)[\s\S]*Manutenções realizadas/);
  assert.match(modulo, /Voltar ao painel/);
  const lista = ler("components/modules/ManutencaoRevisoes.tsx");
  for (const t of [
    "Veículo",
    "Serviço",
    "Periodicidade",
    "Última realizada",
    "Próxima revisão",
    "Situação",
  ])
    assert.ok(lista.includes(t), t);
  assert.ok(
    !lista.includes("Sugeridas") && !lista.includes("Realizadas"),
    "sem a coluna Manutenções com os links",
  );
  const cartoes = ler("components/modules/CartoesManutencao.tsx");
  assert.ok(
    !cartoes.includes("aria-pressed"),
    "os cards são só os indicadores; Preventivas e Corretivas são botões da lista",
  );
  for (const t of ["Revisões previstas", "Revisões realizadas no prazo", "Revisões não realizadas no prazo"])
    assert.ok(cartoes.includes(t), t);
  // Padrão da Frota (decisão 404): fórmula abaixo do título de cada card e gráficos ao lado dos cards.
  assert.equal((cartoes.match(/subtitulo=/g) ?? []).length, 3, "cada card explica a fórmula");
  assert.match(cartoes, /xl:grid-cols-\[minmax\(0,5fr\)_minmax\(0,7fr\)\]/);
});
