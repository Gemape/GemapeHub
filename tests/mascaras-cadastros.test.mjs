import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { mascararCep, mascararCnpj, mascararTelefone, mascaraDoCampo } from "../src/lib/mascaras.ts";

test("CNPJ ganha a máscara enquanto se digita e só aceita 14 dígitos", () => {
  assert.equal(mascararCnpj(""), "");
  assert.equal(mascararCnpj("1"), "1");
  assert.equal(mascararCnpj("123"), "12.3");
  assert.equal(mascararCnpj("12345"), "12.345");
  assert.equal(mascararCnpj("123456789"), "12.345.678/9");
  assert.equal(mascararCnpj("123456780001"), "12.345.678/0001");
  assert.equal(mascararCnpj("12345678000190"), "12.345.678/0001-90");
  assert.equal(mascararCnpj("12.345.678/0001-90"), "12.345.678/0001-90");
  assert.equal(mascararCnpj("1234567800019099"), "12.345.678/0001-90");
  assert.equal(mascararCnpj("ab12x"), "12");
});

test("CEP ganha a máscara enquanto se digita e só aceita 8 dígitos", () => {
  assert.equal(mascararCep("01"), "01");
  assert.equal(mascararCep("010"), "01.0");
  assert.equal(mascararCep("01000"), "01.000");
  assert.equal(mascararCep("010000"), "01.000-0");
  assert.equal(mascararCep("01000000"), "01.000-000");
  assert.equal(mascararCep("010000009999"), "01.000-000");
});

test("telefone: fixo com 10 dígitos e celular com 11, na máscara do responsável", () => {
  assert.equal(mascararTelefone("1"), "(1");
  assert.equal(mascararTelefone("11"), "(11");
  assert.equal(mascararTelefone("119"), "(11)9");
  assert.equal(mascararTelefone("1198765"), "(11)9876.5");
  assert.equal(mascararTelefone("1133334444"), "(11)3333.4444");
  assert.equal(mascararTelefone("11987654321"), "(11)9.8765.4321");
  assert.equal(mascararTelefone("(11)9.8765.4321"), "(11)9.8765.4321");
  assert.equal(mascararTelefone("119876543219999"), "(11)9.8765.4321");
});

test("apagar volta sem deixar pontuação sobrando", () => {
  assert.equal(mascararCnpj("12."), "12");
  assert.equal(mascararCep("01."), "01");
  assert.equal(mascararTelefone("(11)"), "(11");
  assert.equal(mascararTelefone("("), "");
});

test("cada campo usa a máscara certa e os demais ficam sem máscara", () => {
  assert.equal(mascaraDoCampo("cnpj"), mascararCnpj);
  assert.equal(mascaraDoCampo("cep"), mascararCep);
  assert.equal(mascaraDoCampo("telefone"), mascararTelefone);
  assert.equal(mascaraDoCampo("rua"), undefined);
});

test("as telas de Empresas e Fornecedores aplicam a máscara ao digitar", () => {
  const raiz = new URL("../src/", import.meta.url);
  for (const arquivo of ["routes/_authenticated/empresas.tsx", "routes/_authenticated/cadastros/fornecedores.tsx"]) {
    const fonte = readFileSync(new URL(arquivo, raiz), "utf8");
    assert.match(fonte, /aoDigitarMascarado/, arquivo);
  }
  const fornecedores = readFileSync(new URL("routes/_authenticated/cadastros/fornecedores.tsx", raiz), "utf8");
  assert.match(fornecedores, /aoDigitarMascarado\("telefone"\)|aoDigitarMascarado\(campo\.nome\)/);
});
