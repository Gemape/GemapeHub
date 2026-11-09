import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const compra = readFileSync("src/components/modules/CompraFerramentaDialog.tsx", "utf8");
const itens = readFileSync("src/components/modules/ItensModulo.tsx", "utf8");

// Decisão 429: Cadastrar ferramenta abre por cima da compra e devolve o código da ferramenta salva.
test("compra de ferramenta abre o cadastro em janela, fora do <form>, e escolhe a ferramenta salva", () => {
  assert.match(compra, /<ItensModulo modulo="ferramenta" janela=\{/);
  assert.ok(compra.indexOf("</form>") < compra.indexOf("<ItensModulo"), "o cadastro deve ficar fora do form da compra");
  assert.match(compra, /itens\.find\(\(i\) => i\.codigo_sku === novoCodigo\)/);
  assert.doesNotMatch(compra, /target="_blank"/);
});

test("ItensModulo em modo janela só mostra o formulário e avisa ao salvar ou falhar ao abrir", () => {
  assert.match(itens, /\{!janela && <>/);
  assert.match(itens, /janela\.onSalvo\(String\(valores\["codigo_sku"\]/);
  assert.match(itens, /janela\?\.onAberto\(false\)/);
});
