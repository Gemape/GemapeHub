import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { estadoGravado, linhasDeAlertaEstoque } from "../src/lib/alertas-estoque.ts";
import { pendenciasDeHoje } from "../src/lib/atencao-hoje.ts";

const itens = [
  { id: "a", nome: "Bota", empresa_id: "e1" },
  { id: "b", nome: "Capacete", empresa_id: "e1" },
  { id: "c", nome: "Luva", empresa_id: "e2", status: "Inativo" },
];
const estado = (i) => ({
  a: { saldo: 9, minimo: 0, alerta: true, alertas: [{ nome: "40", saldo: 3, minimo: 5 }, { nome: "42", saldo: 5, minimo: 5 }, { nome: "44", saldo: 2, minimo: 5 }] },
  b: { saldo: 6, minimo: 5, alerta: true },
  c: { saldo: 0, minimo: 5, alerta: true },
}[i.id]);

test("uma linha por item e tamanho, separadas em abaixo e no mínimo, sem item inativo", () => {
  const l = linhasDeAlertaEstoque(itens, "epi", estado);
  assert.equal(l.length, 3, "Bota 40 e 44 abaixo, Bota 42 no mínimo; Capacete 6 > 5 não alerta e Luva é inativa");
  assert.deepEqual(l.map((x) => x.nivel).sort(), ["abaixo", "abaixo", "minimo"]);
  assert.equal(l.find((x) => x.nivel === "minimo").tamanho, "42");
});
test("estado gravado exige mínimo definido", () => {
  assert.equal(estadoGravado({ estoque_atual: 0, estoque_minimo: 0 }).alerta, false);
  assert.equal(estadoGravado({ estoque_atual: 2, estoque_minimo: 2 }).alerta, true);
});
test("tela inicial separa por tipo e nível com a mesma contagem", () => {
  const g = pendenciasDeHoje({ hoje: "2026-11-17", empregados: [], epis: itens, uniformes: [], ferramentas: [], movsEpi: [], movsFerramenta: [], estado: (_m, i) => estado(i) });
  const por = Object.fromEntries(g.map((x) => [x.id, x.itens.length]));
  assert.equal(por["abaixo-epi"], 2);
  assert.equal(por["minimo-epi"], 1);
  assert.equal(por["abaixo-uniforme"], 0);
});
test("Dashboard usa a mesma função de contagem", () => {
  const src = readFileSync(new URL("../src/routes/_authenticated/dashboard.tsx", import.meta.url), "utf8");
  assert.match(src, /linhasDeAlertaEstoque/);
  assert.match(src, /alerta\(s\)/);
});
