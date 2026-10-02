import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fonte = readFileSync(
  new URL("../src/components/layout/AppSidebar.tsx", import.meta.url),
  "utf8",
);

test("o grupo Parâmetros do menu não tem o item Relatórios", () => {
  const inicio = fonte.indexOf('titulo: "Parâmetros"');
  assert.ok(inicio > 0, "grupo Parâmetros não encontrado");
  const fim = fonte.indexOf("] as const;", inicio);
  const parametros = fonte.slice(inicio, fim);
  assert.ok(parametros.includes('titulo: "Fornecedores"'));
  assert.ok(!parametros.includes("Relatórios"));
  assert.ok(!parametros.includes('"/relatorios"'));
});
