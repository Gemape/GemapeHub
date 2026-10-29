import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const modulo = readFileSync(new URL("../src/components/modules/ChecklistVeiculoModulo.tsx", import.meta.url), "utf8");
const janela = readFileSync(new URL("../src/components/modules/DialogAssociarChecklist.tsx", import.meta.url), "utf8");

test("Novo check list abre a associação de itens numa janela sem perder o que foi preenchido (decisão 93)", () => {
  assert.match(janela, /AssociarChecklistVeiculo/);
  assert.match(janela, /<Dialog open=\{aberto\} onOpenChange=\{onAbrirMudou\}/);
  assert.match(modulo, /<DialogAssociarChecklist aberto=\{associarAberto\} onAbrirMudou=\{setAssociarAberto\} \/>/);
  // Os dois avisos (sem itens associados e periodicidade não definida) ganham o link, só para quem escreve.
  assert.match(modulo, /canWrite \? \(\s*<button[^>]*onClick=\{\(\) => setAssociarAberto\(true\)\}/);
  // Um atalho fixo logo abaixo do tipo de check list (decisão 322), em vez de repetir o link em cada aviso.
  assert.equal((modulo.match(/\{linkAssociar\}/g) ?? []).length, 1);
  assert.match(modulo, /<\/Select>\s*\{\/\*[^*]*\*\/\}\s*<p className="text-xs text-muted-foreground">\{linkAssociar\}<\/p>/);
  assert.match(modulo, /Este veículo não tem itens associados\./);
  assert.match(modulo, /não tem check list periódico associado\./);
  // A janela fica ao lado do diálogo do check list, nunca dentro.
  const ini = modulo.indexOf('<Dialog open={tela?.tipo === "novo"');
  const novo = modulo.slice(ini, modulo.indexOf("</Dialog>", ini));
  assert.doesNotMatch(novo, /<DialogAssociarChecklist/);
});
