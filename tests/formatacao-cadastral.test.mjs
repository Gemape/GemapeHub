import { test } from "node:test";
import assert from "node:assert/strict";
import {
  somenteDigitos,
  formatarCnpj,
  formatarTelefone,
  formatarCep,
  capitalizarCadastro,
  capitalizarNomePessoa,
  capitalizarTexto,
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

test("texto comum: só a primeira letra em maiúscula, o resto em minúscula (decisão 84)", () => {
  assert.equal(capitalizarTexto("casa do trabalhador"), "Casa do trabalhador");
  assert.equal(capitalizarTexto("CASA DO TRABALHADOR"), "Casa do trabalhador");
  assert.equal(capitalizarTexto("gemape equipamentos ltda"), "Gemape equipamentos ltda");
  assert.equal(capitalizarTexto("rua são josé, 12 - centro"), "Rua são josé, 12 - centro");
  assert.equal(capitalizarTexto("guarda-chuva Grande"), "Guarda-chuva grande");
  assert.equal(capitalizarTexto("ÁGUA e Óleo"), "Água e óleo");
});

test("texto comum: siglas e códigos ficam como digitados", () => {
  assert.equal(capitalizarTexto("EPI"), "EPI");
  assert.equal(capitalizarTexto("epi"), "EPI");
  assert.equal(capitalizarTexto("EPI-0001"), "EPI-0001");
  assert.equal(capitalizarTexto("UNI-0001"), "UNI-0001");
  assert.equal(capitalizarTexto("luva CA 12345 de EPI"), "Luva CA 12345 de EPI");
  assert.equal(capitalizarTexto("CNPJ da empresa"), "CNPJ da empresa");
  assert.equal(capitalizarTexto("Furadeira 12V"), "Furadeira 12V");
  assert.equal(capitalizarTexto("__sem_marca__"), "__sem_marca__");
  assert.equal(capitalizarTexto("freio abs bmw"), "Freio ABS BMW");
});

test("texto comum: vazio e espaços extras não quebram", () => {
  assert.equal(capitalizarTexto(""), "");
  assert.equal(capitalizarTexto("    "), "");
  assert.equal(capitalizarTexto("  casa   do   trabalhador  "), "Casa do trabalhador");
  assert.equal(capitalizarTexto(undefined), "");
  assert.equal(capitalizarTexto(null), "");
});

test("texto comum: observação com várias linhas mantém as quebras de linha", () => {
  assert.equal(capitalizarTexto("troca do filtro  \nCOMPRADO na loja\n\n\n\nok"), "Troca do filtro\ncomprado na loja\n\nok");
});

test("nome de pessoa: capitalização por palavra, partículas em minúscula", () => {
  assert.equal(capitalizarNomePessoa("luana vasconcelos"), "Luana Vasconcelos");
  assert.equal(capitalizarNomePessoa("Luana Vasconcelos"), "Luana Vasconcelos");
  assert.equal(capitalizarNomePessoa("  JOÃO DA SILVA  "), "João da Silva");
  assert.equal(capitalizarNomePessoa("maria-clara DOS santos"), "Maria-Clara dos Santos");
  assert.equal(capitalizarNomePessoa(""), "");
  assert.equal(capitalizarNomePessoa("   "), "");
});

test("capitalizarCadastro segue a regra do texto comum", () => {
  assert.equal(capitalizarCadastro("CASA DO TRABALHADOR"), "Casa do trabalhador");
});
