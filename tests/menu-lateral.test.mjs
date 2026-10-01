import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fonte = readFileSync(
  new URL("../src/components/layout/AppSidebar.tsx", import.meta.url),
  "utf8",
);

test("o grupo Cadastros do menu não tem o item Relatórios", () => {
  const inicio = fonte.indexOf('titulo: "Cadastros"');
  assert.ok(inicio > 0, "grupo Cadastros não encontrado");
  const fim = fonte.indexOf("] as const;", inicio);
  const cadastros = fonte.slice(inicio, fim);
  assert.ok(cadastros.includes('titulo: "Fornecedores"'));
  assert.ok(!cadastros.includes("Relatórios"));
  assert.ok(!cadastros.includes('"/relatorios"'));
});
