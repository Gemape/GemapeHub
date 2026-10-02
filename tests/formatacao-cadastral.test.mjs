import { test } from "node:test";
import assert from "node:assert/strict";
import {
  somenteDigitos,
  formatarCnpj,
  formatarTelefone,
  formatarCep,
  capitalizarCadastro,
  validarCnpj,
  validarTelefone,
  validarCep,
} from "../src/lib/formatacao-cadastral.ts";

test("CNPJ usa máscara única e comparação por dígitos", () => {
  assert.equal(formatarCnpj("12345678000190"), "12.345.678/0001-90");
  assert.equal(formatarCnpj("12.345.678/0001-90"), "12.345.678/0001-90");
  assert.equal(somenteDigitos("12.345.678/0001-90"), somenteDigitos("12345678000190"));
  assert.equal(formatarCnpj("123"), "123");
  assert.equal(validarCnpj("12345678000190"), true);
  assert.equal(validarCnpj("123"), false);
});

test("telefones fixos e celulares usam formatos distintos", () => {
  assert.equal(formatarTelefone("1134567890"), "(11)3456.7890");
  assert.equal(formatarTelefone("11987654321"), "(11)9.8765.4321");
  assert.equal(formatarTelefone("123"), "123");
  assert.equal(validarTelefone("1134567890"), true);
  assert.equal(validarTelefone("11987654321"), true);
  assert.equal(validarTelefone("123"), false);
});

test("CEP usa máscara e preserva dado antigo incompleto", () => {
  assert.equal(formatarCep("12345678"), "12.345-678");
  assert.equal(formatarCep("12.345-678"), "12.345-678");
  assert.equal(formatarCep("123"), "123");
  assert.equal(validarCep("12345678"), true);
  assert.equal(validarCep("123"), false);
});

test("texto cadastral tem iniciais maiúsculas sem perder siglas ou códigos", () => {
  assert.equal(capitalizarCadastro("  JOÃO DA SILVA  "), "João da Silva");
  assert.equal(capitalizarCadastro("epi GEMAPE ca sku EPI-0001"), "EPI GEMAPE CA SKU EPI-0001");
  assert.equal(capitalizarCadastro("rua são josé"), "Rua São José");
  assert.equal(capitalizarCadastro("__sem_marca__"), "__sem_marca__");
});
