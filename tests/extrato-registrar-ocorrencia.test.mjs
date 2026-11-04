import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const le = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");

test("o extrato do veículo tem o botão Registrar ocorrência na faixa das Ocorrências, com o veículo e o vai e volta", () => {
  const e = le("components/modules/ExtratoVeiculo.tsx");
  assert.match(e, /secaoDoExtrato\.titulo === "Ocorrências" && MODO_DEMO && <Button asChild variant="secondary" size="sm"><Link to="\/veiculos" search=\{\{ aba: "ocorrencias", veiculo: veiculo\.id, nova: "sim", voltar: veiculo\.id \}\}>Registrar ocorrência<\/Link><\/Button>/);
  // Fica ao lado das ações das outras seções (Registrar manutenção, Registrar abastecimento, Registrar check list avulso).
  for (const rotulo of ["Registrar manutenção", "Registrar abastecimento", "Registrar check list avulso"]) assert.ok(e.includes(rotulo), rotulo);
});

test("a rota de Veículos aceita o parâmetro nova, e a tela de Ocorrências abre a Nova ocorrência com o veículo e limpa o endereço", () => {
  assert.match(le("routes/_authenticated/veiculos.tsx"), /typeof search\["nova"\] === "string" \? \{ nova: search\["nova"\] \}/);
  const o = le("components/modules/OcorrenciasVeiculoModulo.tsx");
  assert.match(o, /veiculo: veiculoPedido, nova: novaPedida \} = useSearch/);
  assert.match(o, /if \(!novaPedida \|\| veiculos\.length === 0\) return;[\s\S]*?abrirNova\(\);/);
  assert.match(o, /veiculos\.some\(\(v\) => v\.id === veiculoPedido\)\) setVeiculoId\(veiculoPedido\)/);
  assert.match(o, /navegar\(\{ to: "\/veiculos", search: \{ aba: "ocorrencias" \}, replace: true \}\)/);
  // Ao salvar ou cancelar, a pessoa volta ao extrato do veículo (decisão 346).
  assert.match(o, /useVoltarAoExtrato\(tela !== null, voltar\)/);
});

test("aberto de dentro do extrato da própria tela de Ocorrências, o extrato fecha antes da Nova ocorrência", () => {
  const o = le("components/modules/OcorrenciasVeiculoModulo.tsx");
  assert.match(o, /if \(!novaPedida \|\| veiculos\.length === 0\) return;\s*\/\/[^\n]*\n\s*setExtrato\(null\);\s*abrirNova\(\);/);
});
