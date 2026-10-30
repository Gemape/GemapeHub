import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { encerradaNoPrazo, indicadoresDeOcorrencias } from "../src/lib/ocorrencias-indicadores.ts";
import { ocorrenciasNoPeriodo, periodoDeOcorrenciasInvalido } from "../src/lib/ocorrencias-veiculo.ts";
import {
  PRORROGACAO_PADRAO,
  lerProrrogacaoOcorrencias,
  salvarProrrogacaoOcorrencias,
} from "../src/lib/prazo-ocorrencias.ts";

const ler = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const PRAZOS = { iniciar: 2, finalizar: 5 };
const memoria = () => {
  const d = {};
  return {
    getItem: (k) => d[k] ?? null,
    setItem: (k, v) => {
      d[k] = v;
    },
  };
};
// Ocorrência encerrada: tratativa iniciada em 2026-10-01 (meio-dia) e encerrada no dia dado.
const encerrada = (dia, extra = {}) => ({
  ocorridoEm: "2026-09-30T10:00",
  status: "Encerrada",
  tratativa: { registradaEm: "2026-10-01T15:00:00.000Z" },
  encerradaEm: `${dia}T15:00:00.000Z`,
  ...extra,
});

test("encerrada no prazo: até o fim dos dias de finalização contados do início da tratativa; a renovação com data maior vale", () => {
  assert.equal(encerradaNoPrazo(encerrada("2026-10-06"), PRAZOS), true);
  assert.equal(encerradaNoPrazo(encerrada("2026-10-07"), PRAZOS), false);
  assert.equal(
    encerradaNoPrazo(
      encerrada("2026-10-09", {
        renovacoes: [{ em: "2026-10-05T12:00:00.000Z", passo: "finalizar", ate: "2026-10-10" }],
      }),
      PRAZOS,
    ),
    true,
  );
  assert.equal(
    encerradaNoPrazo(
      encerrada("2026-10-05", {
        renovacoes: [{ em: "2026-10-02T12:00:00.000Z", passo: "finalizar", ate: "2026-10-03" }],
      }),
      PRAZOS,
    ),
    false,
    "a data da renovação manda, como na ocorrência aberta",
  );
  assert.equal(
    encerradaNoPrazo(
      encerrada("2026-10-09", {
        renovacoes: [{ em: "2026-10-05T12:00:00.000Z", passo: "iniciar", ate: "2026-10-10" }],
      }),
      PRAZOS,
    ),
    false,
    "renovação do outro passo não vale",
  );
  assert.equal(
    encerradaNoPrazo({ ocorridoEm: "2026-10-01T10:00", status: "Aberta" }, PRAZOS),
    null,
  );
  // Prazo de início (2 dias): a tratativa começou em 2026-10-01, a ocorrência foi em 2026-09-20, então perdeu o prazo de início mesmo encerrando logo.
  assert.equal(
    encerradaNoPrazo(encerrada("2026-10-02", { ocorridoEm: "2026-09-20T10:00" }), PRAZOS),
    false,
  );
  assert.equal(
    encerradaNoPrazo(
      encerrada("2026-10-02", {
        ocorridoEm: "2026-09-20T10:00",
        renovacoes: [{ em: "2026-09-25T12:00:00.000Z", passo: "iniciar", ate: "2026-10-01" }],
      }),
      PRAZOS,
    ),
    true,
    "renovação do início vale",
  );
  assert.equal(
    encerradaNoPrazo(encerrada("2026-10-02", { ocorridoEm: "2026-09-30T10:00" }), PRAZOS),
    true,
    "começou no 2º dia: no prazo",
  );
});

test("indicadores: no prazo contra fora do prazo (encerrada atrasada ou aberta vencida); o que ainda está no prazo não conta", () => {
  const abertaVencida = { ocorridoEm: "2026-10-01T10:00", status: "Aberta" };
  const abertaNoPrazo = { ocorridoEm: "2026-10-19T10:00", status: "Aberta" };
  const i = indicadoresDeOcorrencias({
    ocorrencias: [
      encerrada("2026-10-03"),
      encerrada("2026-10-04"),
      encerrada("2026-10-20"),
      abertaVencida,
      abertaNoPrazo,
    ],
    hoje: "2026-10-20",
    prazos: PRAZOS,
  });
  assert.deepEqual([i.noPrazo.pct, i.naoRealizadas.pct], [50, 50]);
  assert.match(i.noPrazo.detalhe, /2 de 4 no prazo/);
  assert.equal(i.naoRealizadas.faixa, i.noPrazo.faixa);
  const vazio = indicadoresDeOcorrencias({
    ocorrencias: [abertaNoPrazo],
    hoje: "2026-10-20",
    prazos: PRAZOS,
  });
  assert.deepEqual(
    [vazio.noPrazo.pct, vazio.naoRealizadas.pct, vazio.noPrazo.faixa],
    [null, null, null],
  );
});

test("prorrogação: padrão permitida com 2 dias, guarda e recusa valor inválido", () => {
  const s = memoria();
  assert.deepEqual(lerProrrogacaoOcorrencias(s), PRORROGACAO_PADRAO);
  salvarProrrogacaoOcorrencias({ permitir: false, dias: 7 }, s);
  assert.deepEqual(lerProrrogacaoOcorrencias(s), { permitir: false, dias: 7 });
  assert.throws(() => salvarProrrogacaoOcorrencias({ permitir: true, dias: -1 }, s), /inteiros/);
  assert.deepEqual(
    lerProrrogacaoOcorrencias({ getItem: () => "{ruim", setItem() {} }),
    PRORROGACAO_PADRAO,
  );
});

test("a tela traz os cards por botões, filtra pelo card, e Parâmetros Específicos tem a prorrogação que liga o botão Renovar prazo", () => {
  const cartoes = ler("components/modules/CartoesOcorrencias.tsx");
  for (const t of ["Tratadas no prazo", "Não tratadas"])
    assert.ok(cartoes.includes(t), t);
  assert.ok(
    !cartoes.includes("aria-pressed"),
    "os cards são só os indicadores; as situações são botões da lista",
  );
  const modulo = ler("components/modules/OcorrenciasVeiculoModulo.tsx");
  assert.match(modulo, /<CartoesOcorrencias indicadores=\{indicadores\} \/>/);
  assert.match(
    modulo,
    /onClick=\{\(\) => \{ setFiltro\(f\); setBusca\(""\); setInicio\(""\); setFim\(""\); setVerLista\(true\); \}\}/,
    "botões Todas, Abertas, Em tratativa e Encerradas abrem a lista da situação em outra tela do módulo",
  );
  assert.match(modulo, /setVerLista\(false\)[\s\S]*Voltar ao painel/, "e a lista tem o botão de voltar ao painel");
  for (const t of ["Abertas", "Em tratativa", "Encerradas", "Todas"])
    assert.ok(modulo.includes(`rotulo: "${t}"`), t);
  assert.match(modulo, /lerProrrogacaoOcorrencias\(\)\.permitir/);
  assert.match(
    ler("components/modules/RenovarPrazoOcorrencia.tsx"),
    /\{ dias, permitir \} = lerProrrogacaoOcorrencias\(\)/,
  );
  const param = ler("components/parametros/PrazosOcorrenciasVeiculo.tsx");
  for (const t of [
    "Nº de dias para iniciar a tratativa",
    "Nº de dias para finalizar a tratativa",
    "Prorrogar a tratativa",
    "Permitir prorrogar a tratativa",
  ])
    assert.ok(param.includes(t), t);
});

test("período da lista de ocorrências: as duas pontas valem, ponta vazia não limita e início depois do fim não vale", () => {
  const lista = [
    { id: "a", ocorridoEm: "2026-10-01T08:00" },
    { id: "b", ocorridoEm: "2026-10-15T23:59" },
    { id: "c", ocorridoEm: "2026-10-31T00:00" },
  ];
  const ids = (l) => l.map((o) => o.id);
  assert.deepEqual(ids(ocorrenciasNoPeriodo(lista, "", "")), ["a", "b", "c"]);
  assert.deepEqual(ids(ocorrenciasNoPeriodo(lista, "2026-10-15", "2026-10-31")), ["b", "c"], "início e fim valem, com qualquer hora do dia");
  assert.deepEqual(ids(ocorrenciasNoPeriodo(lista, "2026-10-02", "")), ["b", "c"], "sem fim, não há limite do lado do fim");
  assert.deepEqual(ids(ocorrenciasNoPeriodo(lista, "", "2026-10-01")), ["a"], "o dia do fim entra inteiro");
  assert.equal(periodoDeOcorrenciasInvalido("2026-10-20", "2026-10-10"), true);
  assert.deepEqual(ocorrenciasNoPeriodo(lista, "2026-10-20", "2026-10-10"), [], "início depois do fim deixa a lista vazia, e a tela avisa");
});
