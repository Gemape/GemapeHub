import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { mascararCep, mascararCnpj, mascararTelefone, mascaraDoCampo, reaplicarMascara } from "../src/lib/mascaras.ts";

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

test("telefone colado com DDI 55 ou zero inicial perde só o prefixo", () => {
  assert.equal(mascararTelefone("+55 11 99999-8888"), "(11)9.9999.8888");
  assert.equal(mascararTelefone("5511999998888"), "(11)9.9999.8888");
  assert.equal(mascararTelefone("551133334444"), "(11)3333.4444");
  assert.equal(mascararTelefone("011999998888"), "(11)9.9999.8888");
  // Com 11 dígitos ou menos nada é descartado: 55 pode ser o DDD de verdade.
  assert.equal(mascararTelefone("55999998888"), "(55)9.9999.8888");
});

test("CNPJ colado com texto em volta fica com os 14 dígitos", () => {
  assert.equal(mascararCnpj(" CNPJ: 12.345.678/0001-95 "), "12.345.678/0001-95");
});

test("o cursor continua depois do mesmo dígito ao editar no meio do campo", () => {
  // Digita um 6 no meio de 12.345.678/0001-95: o cursor fica depois dele, não vai ao fim.
  const r = reaplicarMascara(mascararCnpj, "12.3465.678/0001-95", 7, false);
  assert.equal(r.texto, "12.346.567/8000-19");
  assert.equal(r.cursor, 8);
  // Digitar no fim mantém o cursor no fim.
  const f = reaplicarMascara(mascararCnpj, "12.345", 6, false);
  assert.equal(f.texto, "12.345");
  assert.equal(f.cursor, 6);
  assert.deepEqual(reaplicarMascara(mascararCnpj, "", 0, false), { texto: "", cursor: 0 });
});

test("backspace sobre a pontuação apaga o dígito anterior em vez de ficar preso", () => {
  // Estava 12.345 e o ponto foi apagado (12345, cursor 2, mesmos 5 dígitos): sai o dígito 2.
  const r = reaplicarMascara(mascararCnpj, "12345", 2, true, "12.345");
  assert.equal(r.texto, "13.45");
  assert.equal(r.cursor, 1);
  // Apagar um dígito de verdade não remove mais nada.
  const d = reaplicarMascara(mascararCnpj, "12.35", 4, true, "12.345");
  assert.equal(d.texto, "12.35");
});

test("o CNPJ não limita o tamanho no navegador, para a colagem chegar inteira à máscara", () => {
  const raiz = new URL("../src/", import.meta.url);
  for (const arquivo of ["routes/_authenticated/empresas.tsx", "routes/_authenticated/cadastros/fornecedores.tsx"]) {
    assert.doesNotMatch(readFileSync(new URL(arquivo, raiz), "utf8"), /maxLength=\{18\}/, arquivo);
  }
});
