import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { descricaoVeiculo, validarAquisicao } from "../src/lib/descricao-veiculo.ts";

test("a descrição segue placa, subcategoria, marca, modelo, ano, cor e combustível", () => {
  assert.equal(
    descricaoVeiculo({ placa: "abc1d23", subcategoria: "Utilitário", marca: "Fiat", modelo: "Strada", ano: 2022, cor: "Branca", combustivel: "Flex" }),
    "ABC1D23 · Utilitário · Fiat · Strada · 2022 · Branca · Flex",
  );
  assert.equal(descricaoVeiculo({ placa: "abc1234", subcategoria: "Carro", marca: "VW", modelo: "Gol" }), "ABC-1234 · Carro · VW · Gol");
  assert.equal(descricaoVeiculo({ placa: "ABC-1234", subcategoria: "  ", marca: "Fiat", modelo: " Strada  Cabine ", ano: null, cor: "", combustivel: undefined }), "ABC-1234 · Fiat · Strada Cabine");
});

test("aquisição: tudo opcional; o que vier precisa ser válido", () => {
  const hoje = "2026-10-05";
  assert.deepEqual(validarAquisicao({}, hoje), { data: null, custo: null, notaFiscal: null });
  assert.deepEqual(validarAquisicao({ data: "2026-10-05", custo: "85000,50", notaFiscal: " 12345 " }, hoje), { data: "2026-10-05", custo: 85000.5, notaFiscal: "12345" });
  assert.match(validarAquisicao({ data: "2026-10-06" }, hoje).erro, /futura/);
  assert.match(validarAquisicao({ data: "05/10/2026" }, hoje).erro, /inválida/);
  assert.match(validarAquisicao({ data: "2026-02-31" }, hoje).erro, /inválida/);
  assert.match(validarAquisicao({ custo: "-1" }, hoje).erro, /Custo inválido/);
  assert.match(validarAquisicao({ custo: "abc" }, hoje).erro, /Custo inválido/);
  assert.equal(validarAquisicao({ custo: "0" }, hoje).custo, 0);
  assert.match(validarAquisicao({ custo: "1e3" }, hoje).erro, /Custo inválido/);
  assert.match(validarAquisicao({ custo: "10.005" }, hoje).erro, /Custo inválido/);
});

test("o cadastro de veículo não tem o campo Descrição do item e grava a descrição montada", () => {
  const tela = readFileSync("src/components/modules/VeiculosCadastroModulo.tsx", "utf8");
  assert.doesNotMatch(tela, /Descrição do item/);
  assert.doesNotMatch(tela, /name="descricao"/);
  assert.doesNotMatch(tela, /Informe a descrição do item/);
  assert.match(tela, /descricaoVeiculo\(/);
  for (const campo of ['name="data_aquisicao"', 'name="custo"', 'name="numero_nota_fiscal"']) {
    assert.ok(tela.includes(campo), campo);
  }
  assert.match(tela, /validarAquisicao\(/);
  // Data, custo e nota fiscal ainda não existem no banco real: só vão no modo demonstração.
  assert.match(tela, /MODO_DEMO[\s\S]{0,200}data_aquisicao/);
});

test("a data de hoje vem de Brasília e o Endereçamento usa a mesma descrição automática", () => {
  const cad = readFileSync("src/components/modules/VeiculosCadastroModulo.tsx", "utf8");
  assert.match(cad, /dataBrasilia\(\)/);
  assert.doesNotMatch(cad, /hojeLocal/);
  const end = readFileSync("src/components/modules/EnderecamentoModulo.tsx", "utf8");
  assert.match(end, /descricaoVeiculo\(/);
});
