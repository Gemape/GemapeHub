import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MESES_DA_PERIODICIDADE, cargaPorMes, lerMesesBase, mesesPrevistos, mesesSobrecarregados, rotuloMes, salvarMesBase } from "../src/lib/escalonamento-vistorias.ts";
import { ABAS_FERRAMENTA } from "../src/lib/menu-parametros.ts";

const le = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const memoria = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }; };
const rotulos = (l) => l.map(rotuloMes);

test("trimestral com março: mar, jun, set e dez, e segue pelo ano seguinte", () => {
  assert.deepEqual(rotulos(mesesPrevistos(3, "Trimestral", "2026-01-15", 24)).slice(0, 5), ["mar/2026", "jun/2026", "set/2026", "dez/2026", "mar/2027"]);
});

test("bimestral com maio: mai, jul, set e nov; o mês de hoje conta e o que já passou não", () => {
  assert.deepEqual(rotulos(mesesPrevistos(5, "Bimestral", "2026-05-20", 12)), ["mai/2026", "jul/2026", "set/2026", "nov/2026", "jan/2027", "mar/2027"]);
  assert.deepEqual(rotulos(mesesPrevistos(5, "Bimestral", "2026-06-01", 4)), ["jul/2026", "set/2026"]);
});

test("anual, semestral e quinzenal; o mês-base antes de hoje cai no ciclo certo", () => {
  assert.deepEqual(rotulos(mesesPrevistos(2, "Anual", "2026-11-18", 24)), ["fev/2027", "fev/2028"]);
  assert.deepEqual(rotulos(mesesPrevistos(11, "Semestral", "2026-11-18", 12)), ["nov/2026", "mai/2027"]);
  assert.equal(mesesPrevistos(7, "Quinzenal", "2026-01-01", 12).length, 12);
  assert.deepEqual(MESES_DA_PERIODICIDADE, { Quinzenal: 1, Mensal: 1, Bimestral: 2, Trimestral: 3, Semestral: 6, Anual: 12 });
});

test("a carga conta as caixas de cada mês e aponta a concentração; caixa sem mês-base não entra", () => {
  const carga = cargaPorMes([3, 3, 3, 3, 4, undefined], "Trimestral", "2026-01-10", 12);
  assert.equal(carga.length, 12);
  assert.equal(carga.find((c) => c.mes === 3 && c.ano === 2026).caixas, 4);
  assert.equal(carga.find((c) => c.mes === 4 && c.ano === 2026).caixas, 1);
  assert.equal(carga.find((c) => c.mes === 5 && c.ano === 2026).caixas, 0);
  assert.deepEqual(mesesSobrecarregados(carga).map((c) => c.mes), [3, 6, 9, 12]);
  assert.deepEqual(mesesSobrecarregados(cargaPorMes([], "Mensal", "2026-01-10")), []);
});

test("o mês-base é guardado por caixa, valor ruim é recusado ou ignorado e null retira a caixa", () => {
  const m = memoria();
  assert.deepEqual(lerMesesBase(m), {});
  salvarMesBase("a", 3, m);
  assert.deepEqual(salvarMesBase("b", 12, m), { a: 3, b: 12 });
  assert.throws(() => salvarMesBase("a", 13, m), /janeiro a dezembro/);
  assert.deepEqual(salvarMesBase("a", null, m), { b: 12 });
  m.setItem("gemape-demo-ferramentas-vistoria-mes-base", JSON.stringify({ x: 0, y: "3", z: 5 }));
  assert.deepEqual(lerMesesBase(m), { z: 5 });
});

test("a tela está no menu de Ferramentas e na página do módulo", () => {
  assert.ok(ABAS_FERRAMENTA.some((a) => a.aba === "escalonamento-vistorias" && a.titulo === "Escalonamento de Vistorias"));
  assert.match(le("src/components/modules/PaginaModulo.tsx"), /value="escalonamento-vistorias"[\s\S]*<FerramentasEscalonamentoVistorias \/>/);
  assert.match(le("src/lib/use-vistorias-caixas.ts"), /lerParametrosVistoria\(\)/);
});

test("quinzenal conta duas vistorias por mês e a marca {tabela} aparece uma vez só", async () => {
  const carga = cargaPorMes([1, 6], "Quinzenal", "2026-01-10", 3);
  assert.deepEqual(carga.map((c) => c.caixas), [4, 4, 4]);
  const { textoDoTermoValido, montarTextoDoTermo } = await import("../src/lib/termos-ferramentas-texto.ts");
  assert.equal(textoDoTermoValido("a {tabela} b {tabela}"), false);
  assert.equal(textoDoTermoValido("a {tabela} b"), true);
  assert.doesNotMatch(montarTextoDoTermo("Eu {empregado} **x**", { empregado: "A**B e C**D" }).antes, /<strong>A<strong>/);
  assert.match(montarTextoDoTermo("Eu {empregado}", { empregado: "A**B e C**D" }).antes, /<strong>A\*\*B e C\*\*D<\/strong>/);
});
