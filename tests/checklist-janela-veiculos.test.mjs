import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const modulo = readFileSync(new URL("../src/components/modules/ChecklistVeiculoModulo.tsx", import.meta.url), "utf8");
const janela = readFileSync(new URL("../src/components/modules/DialogCadastroVeiculos.tsx", import.meta.url), "utf8");

test("Novo check list abre o cadastro de veículos numa janela sem perder o que foi preenchido (decisão 92)", () => {
  assert.match(janela, /VeiculosCadastroModulo/);
  assert.match(janela, /<Dialog open=\{aberto\} onOpenChange=\{onAbrirMudou\}/);
  assert.match(modulo, /<DialogCadastroVeiculos aberto=\{veiculosAberto\} onAbrirMudou=\{setVeiculosAberto\}/);
  assert.match(modulo, /onClick=\{\(\) => setVeiculosAberto\(true\)\}/);
  assert.match(modulo, /Cadastrar veículo/);
  // A janela fica ao lado do diálogo do check list, nunca dentro: os campos continuam montados.
  const novo = modulo.slice(modulo.indexOf('<Dialog open={tela?.tipo === "novo"'), modulo.indexOf("</Dialog>", modulo.indexOf('<Dialog open={tela?.tipo === "novo"')));
  assert.doesNotMatch(novo, /DialogCadastroVeiculos aberto/);
});
