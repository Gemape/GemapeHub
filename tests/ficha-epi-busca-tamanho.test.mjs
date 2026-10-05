import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { tamanhoDoEpi, rotuloEpiFicha } from "../src/lib/ficha-epi-rotulo.ts";

const parametros = { tamanhos: [{ id: "t-m", nome: "M" }, { id: "t-42", nome: "42" }] };

test("o tamanho do EPI vem do primeiro tamanho selecionado", () => {
  assert.equal(tamanhoDoEpi({ tamanhos_selecionados: ["t-m"] }, parametros), "M");
  assert.equal(tamanhoDoEpi({ tamanhos_selecionados: ["t-42", "t-m"] }, parametros), "42");
  assert.equal(tamanhoDoEpi({ tamanhos_selecionados: [] }, parametros), null);
  assert.equal(tamanhoDoEpi({}, parametros), null);
  assert.equal(tamanhoDoEpi({ tamanhos_selecionados: ["sem-tamanho"] }, parametros), null);
  assert.equal(tamanhoDoEpi({ tamanhos_selecionados: ["apagado"] }, parametros), null);
  // O primeiro tamanho que ainda existe vale; o texto antigo `tamanho` é o último recurso.
  assert.equal(tamanhoDoEpi({ tamanhos_selecionados: ["apagado", "t-42"] }, parametros), "42");
  assert.equal(tamanhoDoEpi({ tamanho: " m " }, parametros), "M");
  assert.equal(tamanhoDoEpi({ tamanho: "XYZ" }, parametros), null);
});

test("o rótulo do EPI traz código, descrição e TAM X", () => {
  const epi = { codigo_sku: "EPI-0001", nome: "Luva de raspa", tamanhos_selecionados: ["t-m"] };
  assert.equal(rotuloEpiFicha(epi, parametros), "EPI-0001 · Luva de raspa · TAM M");
  assert.equal(rotuloEpiFicha({ ...epi, tamanhos_selecionados: [] }, parametros), "EPI-0001 · Luva de raspa · Sem tamanho");
});

test("a Ficha de EPI usa o rótulo com tamanho e abre o cadastro de tamanho na mesma tela", () => {
  const tela = readFileSync("src/routes/_authenticated/epi-ficha.tsx", "utf8");
  assert.match(tela, /rotuloEpiFicha\(/);
  assert.match(tela, /Cadastrar tamanho/);
  assert.match(tela, /<NovoTamanhoRapido \/>/);
  // O diálogo do tamanho é irmão do da ficha, nunca aninhado nele.
  const dialogos = tela.match(/<Dialog open=/g) ?? [];
  assert.equal(dialogos.length, 2);
  assert.match(tela, /<\/Dialog>\s*<Dialog open=\{tamanhoAberto\}/);
});

test("o Clonar da ficha segue copiando o texto e pedindo um EPI novo", () => {
  const tela = readFileSync("src/routes/_authenticated/epi-ficha.tsx", "utf8");
  assert.match(tela, /conteudoCopiado\[campo\.chave\] = ficha\[campo\.chave\]/);
  assert.match(tela, /setEpiSel\(""\)/);
});
