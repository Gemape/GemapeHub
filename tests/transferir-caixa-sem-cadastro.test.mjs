import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const modulo = readFileSync(new URL("../src/components/modules/FerramentasCaixasModulo.tsx", import.meta.url), "utf8");
const dialogo = readFileSync(new URL("../src/components/modules/CaixaGestaoDialogs.tsx", import.meta.url), "utf8");

test("Transferir fica habilitado quando existe outra caixa cadastrada ou habilitada sem cadastro", () => {
  assert.match(modulo, /destinos\.filter\(\(d\) => d\.id !== caixa\.id\)\.length \+ novas\.length === 0/);
  assert.doesNotMatch(modulo, /destinos\.length < 2/);
  assert.match(modulo, /novas=\{semCadastro\}/);
});

test("a janela oferece as caixas sem cadastro e cria a caixa já com a ferramenta, registrando a transferência no destino", () => {
  assert.match(dialogo, /novas\.map\(\(n\) =>/);
  assert.match(dialogo, /\(ainda sem ferramentas\)/);
  assert.match(dialogo, /destinoReal = await salvar\.mutateAsync/);
  assert.match(dialogo, /caixa_id: destinoReal/);
  assert.match(dialogo, /tipo_movimentacao: "Transferencia"/);
});
