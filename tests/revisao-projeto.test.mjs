import test from "node:test";
import assert from "node:assert/strict";

import { formatarData } from "../src/lib/gemape.ts";
import { adicionarAcaoManutencaoVeiculo, itensCriadosAcoesManutencao, excluirItensCriadosAcoesManutencao, lerParametros } from "../src/lib/parametros-base.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};

test("formatarData: data pura não muda e timestamp UTC sai no dia de Brasília", () => {
  assert.equal(formatarData("2026-10-13"), "13/10/2026");
  assert.equal(formatarData("2026-10-14T01:30:00Z"), "13/10/2026");
  assert.equal(formatarData("2026-10-13T15:00:00+00:00"), "13/10/2026");
  assert.equal(formatarData(null), "—");
});

test("excluir item criado: grupo criado só com Outros também é removido", () => {
  const s = memoria();
  adicionarAcaoManutencaoVeiculo("Grupo vazio", [], s);
  const antes = lerParametros(s).acoesManutencaoVeiculo.length;
  const criado = itensCriadosAcoesManutencao(s).find((c) => c.nome === "Grupo vazio");
  assert.ok(criado);
  excluirItensCriadosAcoesManutencao([criado.id], s);
  assert.equal(lerParametros(s).acoesManutencaoVeiculo.length, antes - 1);
});

test("datas de hoje nas telas usam o fuso local, não UTC", async () => {
  const { readFileSync } = await import("node:fs");
  for (const f of ["EpiRelatorioBaixa", "UniformesRelatorioBaixa", "FerramentasTermoVistoria", "OcorrenciasModulo", "EpiComprasModulo", "UniformesComprasModulo"]) {
    assert.doesNotMatch(readFileSync(`src/components/modules/${f}.tsx`, "utf8"), /new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/, f);
  }
});
