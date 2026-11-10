import test from "node:test";
import assert from "node:assert/strict";

import { dadosIniciais as base } from "../src/integrations/supabase/demo-client.ts";
import { pedirLimpar, prepararDadosDeTeste } from "../src/lib/dados-teste/aplicar.ts";
import { EPIS } from "../src/lib/dados-teste/conjunto.ts";
import { ORDENS_DE_TESTE } from "../src/lib/dados-teste/ordens-fichas-epi.ts";
import { CAMPOS_FICHA } from "../src/lib/fichas-epi.ts";
import { CAMPOS_OS, lerOrdens, salvarOrdem } from "../src/lib/ordens-servico-epi.ts";

const AGORA = new Date("2026-10-22T12:00:00-03:00");
const memoria = () => {
  const m = new Map();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
};
const json = (s, k) => JSON.parse(s.getItem(k) ?? "null");
const prontos = () => {
  const s = memoria();
  assert.equal(prepararDadosDeTeste(s, base, AGORA), "aplicado");
  return s;
};

test("os dados de teste trazem cinco ordens de serviço, uma por função da oficina, completas e na lista da tela", () => {
  const s = prontos();
  const ordens = lerOrdens(s);
  assert.equal(ordens.length, 5);
  assert.deepEqual(ordens.map((o) => o.funcao), ["Mecânico / montador", "Ajudante / lavador", "Pintor", "Serralheiro / soldador", "Auxiliar de serviços gerais"]);
  assert.ok(ordens.every((o) => o.id.startsWith("teste-")));
  // Cada ordem tem os nove tópicos preenchidos e a dupla função + setor não se repete.
  for (const o of ordens) for (const c of CAMPOS_OS) assert.ok(String(o[c.chave]).trim().length > 0, `${o.funcao}: ${c.rotulo}`);
  assert.equal(new Set(ordens.map((o) => `${o.funcao}|${o.setor}`)).size, 5);
  // A primeira é o modelo enviado pelo responsável.
  assert.equal(ordens[0].setor, "Oficina mecânica");
  assert.match(ordens[0].objetivo, /^Orientar o colaborador sobre os riscos inerentes à sua função/);
  assert.match(ordens[0].procedimentos, /FISPQ/);
});

test("as ordens de teste passam pelas mesmas regras da tela (todos os tópicos e os limites de tamanho)", () => {
  const vazia = memoria();
  for (const o of ORDENS_DE_TESTE) assert.ok(salvarOrdem({ ...o }, {}, vazia));
  assert.equal(lerOrdens(vazia).length, 5);
});

test("os dados de teste trazem oito fichas de EPI, uma por modelo do catálogo, ligadas a EPIs de teste", () => {
  const s = prontos();
  const fichas = json(s, "gemape-demo-fichas-epi");
  assert.equal(fichas.length, 8);
  const epis = json(s, "gemape-demo-dados").epis;
  const nomes = fichas.map((f) => epis.find((e) => e.id === f.epiId).nome);
  assert.deepEqual(nomes, EPIS.map((e) => e.nome));
  assert.equal(new Set(fichas.map((f) => f.epiId)).size, 8, "uma ficha por EPI");
  for (const f of fichas) {
    assert.ok(f.epiId.startsWith("teste-"));
    for (const c of CAMPOS_FICHA) assert.ok(String(f[c.chave]).trim().length > 0, `${f.epiId}: ${c.rotulo}`);
  }
});

test("o Limpar tira as ordens e as fichas de teste e deixa as que a pessoa cadastrou", () => {
  const s = prontos();
  salvarOrdem({ ...ORDENS_DE_TESTE[0], funcao: "Eletricista", setor: "Elétrica" }, {}, s);
  const fichas = json(s, "gemape-demo-fichas-epi");
  s.setItem("gemape-demo-fichas-epi", JSON.stringify([...fichas, { ...fichas[0], epiId: "epi-do-usuario" }]));
  assert.equal(lerOrdens(s).length, 6);
  pedirLimpar(s);
  assert.equal(prepararDadosDeTeste(s, base, AGORA), "limpo");
  const restantes = lerOrdens(s);
  assert.deepEqual(restantes.map((o) => o.funcao), ["Eletricista"]);
  assert.deepEqual(json(s, "gemape-demo-fichas-epi").map((f) => f.epiId), ["epi-do-usuario"]);
});

test("aplicar de novo não duplica as ordens nem as fichas", () => {
  const s = prontos();
  s.setItem("gemape-demo-dados-teste", JSON.stringify({ ...json(s, "gemape-demo-dados-teste"), versao: 1 }));
  assert.equal(prepararDadosDeTeste(s, base, AGORA), "aplicado");
  assert.equal(lerOrdens(s).length, 5);
  assert.equal(json(s, "gemape-demo-fichas-epi").length, 8);
});
