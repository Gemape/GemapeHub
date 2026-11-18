import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lerTratativas, salvarTratativa, situacaoDaOcorrencia } from "../src/lib/tratativa-ocorrencia-ferramenta.ts";

const memoria = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const dados = (o = {}) => ({ responsavel: "Ana", descricao: "Procurada na obra", reposta: false, encerrar: false, ...o });

test("sem tratativa a ocorrência está Aberta; salvar põe Em tratativa e encerrar fecha", () => {
  const s = memoria();
  assert.equal(situacaoDaOcorrencia(lerTratativas(s)["o1"]), "Aberta");
  assert.equal(salvarTratativa("o1", dados(), "2026-11-18T10:00:00Z", false, s), null);
  assert.equal(situacaoDaOcorrencia(lerTratativas(s)["o1"]), "Em tratativa");
  assert.equal(salvarTratativa("o1", dados({ encerrar: true, reposta: true }), "2026-11-19T10:00:00Z", false, s), null);
  const t = lerTratativas(s)["o1"];
  assert.equal(t.situacao, "Encerrada");
  assert.equal(t.reposta, true);
  assert.equal(t.encerradaEm, "2026-11-19T10:00:00Z");
});

test("responsável e descrição são obrigatórios; encerrada só o administrador altera", () => {
  const s = memoria();
  assert.match(salvarTratativa("o1", dados({ responsavel: "  " }), "x", false, s), /responsável/);
  assert.match(salvarTratativa("o1", dados({ descricao: "" }), "x", false, s), /Descreva/);
  salvarTratativa("o1", dados({ encerrar: true }), "x", false, s);
  assert.match(salvarTratativa("o1", dados(), "y", false, s), /Administrador/);
  assert.equal(salvarTratativa("o1", dados({ descricao: "Corrigida" }), "y", true, s), null);
  assert.equal(lerTratativas(s)["o1"].descricao, "Corrigida");
  // corrigir o texto sem marcar encerrar não reabre a ocorrência nem apaga a data de encerramento
  assert.equal(lerTratativas(s)["o1"].situacao, "Encerrada");
  assert.equal(lerTratativas(s)["o1"].encerradaEm, "x");
});

test("armazenamento corrompido não derruba a tela", () => {
  assert.deepEqual(lerTratativas({ getItem: () => "{quebrado", setItem() {} }), {});
  assert.deepEqual(lerTratativas({ getItem: () => "[1]", setItem() {} }), {});
});

test("a tela de ocorrências só de Ferramentas mostra situação e tratativa", () => {
  const f = readFileSync(new URL("../src/components/modules/OcorrenciasModulo.tsx", import.meta.url), "utf8");
  assert.match(f, /const comTratativa = modulo === "ferramenta"/);
  assert.match(f, /salvarTratativa\(tratando\.id/);
  assert.match(f, /Encerrar tratativa/);
});
