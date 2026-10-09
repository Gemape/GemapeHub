import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ler = (c) => readFileSync(new URL(`../${c}`, import.meta.url), "utf8");

test("dec 149: Salvar valida antes de abrir o alerta nas Ações de manutenção", () => {
  const fonte = ler("src/components/parametros/VeiculosListasParametros.tsx");
  assert.match(fonte, /validarAntes\(\(storage\) => onValidar\(/);
  assert.ok(fonte.indexOf("validarAntes((storage) => onValidar(") < fonte.indexOf("setConfirmando(true)"));
});

test("dec 149: Salvar valida antes de abrir o alerta no Plano de manutenções", () => {
  const fonte = ler("src/components/parametros/PlanoManutencaoVeiculo.tsx");
  assert.ok(fonte.indexOf("validarAntes(") < fonte.indexOf("setConfirmando(true)"));
});

test("dec 149: o ensaio usa cópia em memória e não grava no armazenamento real", () => {
  const fonte = ler("src/lib/use-parametros-base.ts");
  assert.match(fonte, /setItem: \(chave: string, valor: string\) => void copia\.set/);
});

test("excluir criados + restaurar é ensaiado junto antes de gravar (atômico)", () => {
  const fonte = ler("src/components/parametros/VeiculosListasParametros.tsx");
  assert.match(fonte, /totalCriados > 0 && totalPais > 0 && !validarAntes\(/);
  assert.ok(fonte.indexOf("totalCriados > 0 && totalPais > 0 && !validarAntes(") < fonte.indexOf("const ok = executar(() => {\n      if (totalCriados > 0)"));
});

test("a mensagem de veículo já associado não manda mais usar Editar", () => {
  assert.doesNotMatch(ler("src/lib/checklist-associacao-veiculo.ts"), /associados\. Use Editar/);
});
