import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const modulo = readFileSync(new URL("../src/components/modules/ChecklistVeiculoModulo.tsx", import.meta.url), "utf8");
const janela = readFileSync(new URL("../src/components/modules/DialogItensChecklist.tsx", import.meta.url), "utf8");

test("aviso do Novo check list avulso abre a tela Itens check list numa janela sem perder o preenchido (decisão 95)", () => {
  assert.match(janela, /ChecklistVeiculoLista/);
  assert.match(janela, /<Dialog open=\{aberto\} onOpenChange=\{onAbrirMudou\}/);
  assert.match(modulo, /<DialogItensChecklist aberto=\{itensAberto\} onAbrirMudou=\{setItensAberto\} \/>/);
  assert.match(modulo, /canWrite \? \(\s*<button[^>]*onClick=\{\(\) => setItensAberto\(true\)\}/);
  assert.match(modulo, /Não há itens de check list para o tipo deste veículo\. \{linkItens\}/);
  // A janela fica ao lado do diálogo do check list, nunca dentro.
  const ini = modulo.indexOf('<Dialog open={tela?.tipo === "novo"');
  const novo = modulo.slice(ini, modulo.indexOf("</Dialog>", ini));
  assert.doesNotMatch(novo, /<DialogItensChecklist/);
});
