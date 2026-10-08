import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const gemape = readFileSync(new URL("../src/lib/gemape.ts", import.meta.url), "utf8");

test("combustíveis do cadastro de veículo incluem GLP, mantendo a ordem anterior (decisão 94)", () => {
  const lista = gemape.match(/COMBUSTIVEIS_VEICULO = \[([\s\S]*?)\] as const/)?.[1] ?? "";
  const itens = [...lista.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(itens, ["Gasolina", "Etanol", "Diesel", "Flex", "Elétrico", "Híbrido", "GLP"]);
});
