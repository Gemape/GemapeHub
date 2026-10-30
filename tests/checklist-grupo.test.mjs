import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  iniciarChecklist,
  iniciarChecklistAvulso,
  lerChecklists,
} from "../src/lib/checklist-veiculo.ts";
import { painelDoMes } from "../src/lib/checklist-painel.ts";
import { grupoDaLinha } from "../src/lib/area-responsaveis.ts";
import { indicadoresDaFrota } from "../src/lib/frota-indicadores.ts";

const ler = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const memoria = () => {
  const d = {};
  return {
    getItem: (k) => d[k] ?? null,
    setItem: (k, v) => {
      d[k] = v;
    },
    removeItem: (k) => {
      delete d[k];
    },
  };
};
const grupos = [{ id: "g1", nome: "Freios", itens: [{ id: "i1", nome: "Pastilhas" }] }];
const base = {
  veiculoId: "v1",
  veiculoRotulo: "ABC",
  tipoVeiculo: "Carro",
  periodicidade: "Semanal",
  responsavelId: "e1",
  responsavelNome: "Ana",
  grupos,
};

test("o check list guarda de quem é (Técnicos ou PCM); sem o campo, segue a área do responsável; valor inválido é recusado", () => {
  const s = memoria();
  const pcm = iniciarChecklist(
    { ...base, grupoChecklist: "PCM" },
    s,
    new Date("2026-10-05T12:00:00Z"),
  );
  assert.equal(pcm.grupo, "PCM");
  assert.equal(lerChecklists(s)[0].grupo, "PCM");
  assert.equal(
    iniciarChecklist({ ...base, veiculoId: "v2" }, s, new Date("2026-10-05T12:00:00Z")).grupo,
    undefined,
  );
  assert.throws(
    () => iniciarChecklist({ ...base, veiculoId: "v3", grupoChecklist: "Outro" }, s),
    /Técnicos ou PCM/,
  );
  assert.equal(
    iniciarChecklistAvulso(
      {
        veiculoId: "v4",
        veiculoRotulo: "D",
        tipoVeiculo: "Carro",
        grupos,
        grupoChecklist: "Técnicos",
      },
      s,
    ).grupo,
    "Técnicos",
  );
});

test("o painel usa o grupo do check list feito e, nas linhas ainda sem check list, o do último do veículo; o indicador separa por esse grupo e não pela área do responsável", () => {
  const previsoes = [
    {
      id: "a",
      veiculoId: "v1",
      veiculoRotulo: "ABC",
      periodicidade: "Semanal",
      inicio: "2026-10-05",
      fim: "2026-10-11",
      responsavelNome: "Ana",
    },
    {
      id: "b",
      veiculoId: "v1",
      veiculoRotulo: "ABC",
      periodicidade: "Semanal",
      inicio: "2026-10-12",
      fim: "2026-10-18",
      responsavelNome: "Ana",
    },
    {
      id: "c",
      veiculoId: "v2",
      veiculoRotulo: "XYZ",
      periodicidade: "Semanal",
      inicio: "2026-10-05",
      fim: "2026-10-11",
      responsavelNome: "Bia",
    },
  ];
  const feitos = [
    {
      id: "k1",
      codigo: "CHK-1",
      veiculoId: "v1",
      periodicidade: "Semanal",
      status: "Concluído",
      data: "2026-10-06",
      concluidoEm: "2026-10-06T15:00:00.000Z",
      responsavelNome: "Ana",
      grupo: "PCM",
    },
  ];
  const { linhas } = painelDoMes(null, previsoes, feitos, "2026-10-20");
  assert.deepEqual(
    linhas.map((l) => [l.id, l.grupo]),
    [
      ["a", "PCM"],
      ["c", undefined],
      ["b", "PCM"],
    ],
  );
  // "Ana" é da área Oficina (Técnicos), mas o check list é de PCM: vale o campo.
  const grupoDe = (nome) => (nome === "Ana" ? "Técnicos" : "Sem área");
  assert.equal(grupoDaLinha(linhas[0], grupoDe), "PCM");
  assert.equal(
    grupoDaLinha(linhas[1], grupoDe),
    "Sem área",
    "sem campo, segue a área do responsável",
  );
  const i = indicadoresDaFrota({
    statusPreventivas: [],
    ocorrencias: [],
    linhasDoChecklist: linhas,
    grupoDe,
    hoje: "2026-10-20",
    prazos: { iniciar: 2, finalizar: 5 },
  });
  assert.equal(i.checklistPcm.pct, 50, "PCM: 1 feito e 1 não realizado");
  assert.equal(
    i.tecnicosNoPrazo.pct,
    null,
    "Técnicos: nenhum, porque o check list de Ana é do PCM",
  );
});

test("o Novo check list tem o campo Check list de, com padrão pelo último check list ou pela área do responsável, e o painel lê o grupo da linha", () => {
  const modulo = ler("components/modules/ChecklistVeiculoModulo.tsx");
  assert.match(modulo, /<Label htmlFor="ck_grupo">Check list de<\/Label>/);
  assert.match(modulo, /GRUPOS_CHECKLIST\.map/);
  assert.match(modulo, /grupoChecklist: grupoDoChecklist \|\| undefined/);
  assert.match(
    ler("components/modules/ChecklistResultadosPainel.tsx"),
    /grupoDaLinha\(l, grupoDe\) === g/,
  );
  assert.match(ler("lib/frota-indicadores.ts"), /grupoDaLinha\(l, entrada\.grupoDe\) === g/);
});

test("o título grande da página acompanha a lista aberta do Check list (periódico ou avulso) e volta ao nome da aba no painel", () => {
  assert.match(
    ler("components/modules/ChecklistVeiculoModulo.tsx"),
    /definirTituloDaPagina\(aba === "periodicos" \? "Check list periódico" : aba === "avulsos" \? "Check list avulso" : null\)/,
  );
  assert.match(
    ler("routes/_authenticated/veiculos.tsx"),
    /\{tituloTrocado \?\? tituloDaAba\("veiculo", aba\)\}/,
  );
});
