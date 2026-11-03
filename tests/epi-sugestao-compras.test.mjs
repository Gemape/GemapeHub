import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { condicaoDoStatus, PARAMETROS_COMPRA_PADRAO, textoDoPontoDePedido } from "../src/lib/epi-parametros.ts";


test("o status de criticidade tem legenda sempre visível e balão ao passar o mouse (decisão 354)", () => {
  const tela = readFileSync(new URL("../src/components/modules/SugestaoComprasEpi.tsx", import.meta.url), "utf8");
  assert.match(tela, /<LegendaStatusCompra parametros=\{parametrosCompra\} \/>/, "a legenda fica acima da tabela");
  assert.equal((tela.match(/<EtiquetaStatusCompra status=\{l\.status\} parametros=\{parametrosCompra\} \/>/g) ?? []).length, 2, "a tabela e a lista do relatório usam a etiqueta com balão");
  const legenda = readFileSync(new URL("../src/components/modules/LegendaStatusCompra.tsx", import.meta.url), "utf8");
  assert.match(legenda, /TooltipContent/);
  assert.match(legenda, /STATUS_CRITICIDADE\[n\]\.significado/, "a legenda usa o significado de Parâmetros Específicos");
  assert.match(legenda, /Sem consumo registrado/);
});

test("a condição lógica de cada status muda com o método: tempo de cobertura ou estoque mínimo (decisão 355)", () => {
  const cob = { ...PARAMETROS_COMPRA_PADRAO, metodo: "cobertura", prazoReposicao: 30, diasSeguranca: 15, diasPlanejamento: 30, limiteExcesso: 90 };
  assert.equal(condicaoDoStatus("ruptura", cob).formula, "TC < TR");
  assert.equal(condicaoDoStatus("ruptura", cob).calculo, "TC < 30 dias");
  assert.equal(condicaoDoStatus("comprar_ja", cob).calculo, "TC ≥ 30 e TC ≤ 45 dias");
  assert.equal(condicaoDoStatus("planejar", cob).calculo, "TC > 45 e TC ≤ 60 dias");
  assert.equal(condicaoDoStatus("estavel", cob).calculo, "TC > 60 e TC ≤ 90 dias");
  assert.equal(condicaoDoStatus("excesso", cob).calculo, "TC > 90 dias");
  assert.match(textoDoPontoDePedido(cob), /TR \(prazo de reposição, 30 dias\) \+ 15 dias de segurança = 45 dias/);
  const min = { ...cob, metodo: "minimo" };
  assert.equal(condicaoDoStatus("ruptura", min).formula, "Estoque total = 0");
  assert.equal(condicaoDoStatus("comprar_ja", min).formula, "0 < Estoque total < Mínimo");
  assert.equal(condicaoDoStatus("planejar", min).formula, "Estoque total = Mínimo (Mínimo > 0)");
  assert.match(condicaoDoStatus("excesso", min).formula, /Estoque total > Mínimo e TC > 90/);
  assert.match(textoDoPontoDePedido(min), /estoque mínimo/);
});

test("Parâmetros Específicos de EPI: tabela com a condição lógica ao lado da tag e vai e volta com a Sugestão de Compras (decisão 355)", () => {
  const tela = readFileSync(new URL("../src/components/parametros/ParametrosEpi.tsx", import.meta.url), "utf8");
  assert.match(tela, /Condição lógica \(gatilho\)/);
  assert.match(tela, /condicaoDoStatus\(st, emUso\)/, "a tabela segue o método e os dias que estão na tela");
  assert.match(tela, /Voltar para Sugestão de Compras/);
  assert.match(tela, /if \(voltarParaSugestao\) voltar\(\)/, "salvar os parâmetros da sugestão volta a ela");
  assert.match(readFileSync(new URL("../src/components/modules/SugestaoComprasEpi.tsx", import.meta.url), "utf8"), /search=\{\{ de: "epi", voltar: "sugestao-compras" \}\}/);
});
