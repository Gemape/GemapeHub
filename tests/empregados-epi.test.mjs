import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  AREAS_EPI_PADRAO, MAX_AREAS_EPI, lerAreasEpi, salvarAreasEpi, lerEmpregadosDeEpi, salvarEmpregadosDeEpi, soEmpregadosDeEpi,
} from "../src/lib/empregados-epi.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const maria = { id: "e1", nome: "Maria Souza" };
const joao = { id: "e2", nome: "João Lima" };
const ana = { id: "e3", nome: "Ana Paula" };

test("as áreas padrão da oficina são as cinco pedidas, com a primeira letra maiúscula (dec 84)", () => {
  assert.deepEqual([...AREAS_EPI_PADRAO], ["Mecânico/montador", "Ajudante/lavador", "Pintor", "Serralheiro/soldador", "Auxiliar de serviços gerais"]);
  assert.deepEqual(lerAreasEpi(memoria()), [...AREAS_EPI_PADRAO]);
});

test("dá para acrescentar uma área; repetida (sem diferenciar maiúsculas) não entra", () => {
  const s = memoria();
  const salvas = salvarAreasEpi([...AREAS_EPI_PADRAO, "  Eletricista   automotivo ", "PINTOR"], s);
  assert.equal(salvas.length, AREAS_EPI_PADRAO.length + 1);
  assert.equal(salvas.at(-1), "Eletricista automotivo");
  assert.deepEqual(lerAreasEpi(s), salvas);
});

test("a lista de áreas não pode ficar vazia nem passar do limite", () => {
  assert.throws(() => salvarAreasEpi([], memoria()), /pelo menos uma/i);
  assert.throws(() => salvarAreasEpi(Array.from({ length: MAX_AREAS_EPI + 1 }, (_, i) => `Área ${i}`), memoria()), /no máximo/i);
});

test("dado ilegível de áreas volta ao padrão", () => {
  const s = memoria();
  s.setItem("gemape-demo-epi-areas", "{quebrado");
  assert.deepEqual(lerAreasEpi(s), [...AREAS_EPI_PADRAO]);
  s.setItem("gemape-demo-epi-areas", "[]");
  assert.deepEqual(lerAreasEpi(s), [...AREAS_EPI_PADRAO]);
});

test("não dá para tirar uma área que ainda tem empregado habilitado", () => {
  const s = memoria();
  salvarEmpregadosDeEpi([{ empregadoId: "e1", nome: "Maria Souza", area: "Pintor" }], s);
  assert.throws(() => salvarAreasEpi(AREAS_EPI_PADRAO.filter((a) => a !== "Pintor"), s), /Pintor/);
  assert.ok(salvarAreasEpi(AREAS_EPI_PADRAO.filter((a) => a !== "Ajudante/lavador"), s));
});

test("empregado habilitado só aceita área que existe na lista", () => {
  const s = memoria();
  assert.throws(() => salvarEmpregadosDeEpi([{ empregadoId: "e1", nome: "Maria Souza", area: "Astronauta" }], s), /área/i);
  assert.throws(() => salvarEmpregadosDeEpi([{ empregadoId: "e1", nome: "", area: "Pintor" }], s), /inválidos/i);
  salvarEmpregadosDeEpi([{ empregadoId: "e1", nome: "Maria Souza", area: "Pintor" }], s);
  assert.equal(lerEmpregadosDeEpi(s).length, 1);
});

test("lista ausente ou ilegível volta vazia", () => {
  const s = memoria();
  assert.deepEqual(lerEmpregadosDeEpi(s), []);
  s.setItem("gemape-demo-epi-empregados", "isso não é json");
  assert.deepEqual(lerEmpregadosDeEpi(s), []);
});

test("as rotinas de EPI só oferecem os habilitados; lista vazia oferece todos", () => {
  const s = memoria();
  assert.deepEqual(soEmpregadosDeEpi([maria, joao, ana], s), [maria, joao, ana]);
  salvarEmpregadosDeEpi([{ empregadoId: "e2", nome: "João Lima", area: "Pintor" }, { empregadoId: null, nome: "ana paula", area: "Pintor" }], s);
  assert.deepEqual(soEmpregadosDeEpi([maria, joao, ana], s), [joao, ana]);
});

test("a lista de EPI é independente da de Veículos e da de Viagens", () => {
  const s = memoria();
  salvarEmpregadosDeEpi([{ empregadoId: "e1", nome: "Maria Souza", area: "Pintor" }], s);
  assert.equal(s.getItem("gemape-demo-veiculos-empregados"), null);
});

test("as telas de EPI que informam o empregado usam o filtro, e os relatórios não", () => {
  const le = (f) => readFileSync(new URL(`../src/components/modules/${f}`, import.meta.url), "utf8");
  for (const f of ["EpiEntrega.tsx", "EpiTermoEntrega.tsx", "EpiFichaEpiAvulsa.tsx", "DevolucaoEpiDialog.tsx"]) {
    assert.match(le(f), /soEmpregadosDeEpi/, f);
  }
  for (const f of ["EpiRelatorioFuncionario.tsx", "EpiRelatorioBaixa.tsx"]) {
    assert.doesNotMatch(le(f), /soEmpregadosDeEpi/, f);
  }
});

test("Parâmetros > EPI > Parâmetros Específicos mostra a caixa dupla e o cadastro das áreas", () => {
  const le = (f) => readFileSync(new URL(`../src/components/parametros/${f}`, import.meta.url), "utf8");
  assert.match(le("ParametrosEpi.tsx"), /<HabilitarEmpregadosEpi/);
  assert.match(le("HabilitarEmpregadosEpi.tsx"), /CaixaDuplaEmpregados/);
});
