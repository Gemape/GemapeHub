import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { listarClientes, proximoCodigoCliente, removerCliente, salvarCliente } from "../src/lib/clientes-demo.ts";
import { mascararCpfOuCnpj } from "../src/lib/mascaras.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v), dados };
};
const vazio = { nome: "", documento: "", endereco: "", contato: "", telefone: "", telefone2: "", email: "", observacao: "" };

test("só o nome é obrigatório e o código é gerado em 5 dígitos", () => {
  const s = memoria();
  assert.equal(proximoCodigoCliente(s), "00001");
  assert.throws(() => salvarCliente(vazio, s), /nome do cliente/);
  const a = salvarCliente({ ...vazio, nome: "oficina do joão ltda" }, s);
  assert.equal(a.codigo, "00001");
  assert.equal(a.nome, "Oficina do joão ltda");
  assert.equal(proximoCodigoCliente(s), "00002");
});

test("código excluído não é reaproveitado e editar não muda o código", () => {
  const s = memoria();
  const a = salvarCliente({ ...vazio, nome: "A" }, s);
  const b = salvarCliente({ ...vazio, nome: "B" }, s);
  removerCliente(b.id, s);
  assert.equal(proximoCodigoCliente(s), "00003");
  const editado = salvarCliente({ ...vazio, nome: "A novo", id: a.id }, s);
  assert.equal(editado.codigo, "00001");
  assert.equal(listarClientes(s).length, 1);
});

test("CPF ou CNPJ: valida quando preenchido, formata e não repete", () => {
  const s = memoria();
  assert.throws(() => salvarCliente({ ...vazio, nome: "A", documento: "123.456.789-00" }, s), /CPF.*CNPJ/);
  assert.throws(() => salvarCliente({ ...vazio, nome: "A", documento: "123" }, s), /CPF.*CNPJ/);
  const a = salvarCliente({ ...vazio, nome: "A", documento: "52998224725" }, s);
  assert.equal(a.documento, "529.982.247-25");
  const b = salvarCliente({ ...vazio, nome: "B", documento: "11222333000181" }, s);
  assert.equal(b.documento, "11.222.333/0001-81");
  assert.throws(() => salvarCliente({ ...vazio, nome: "C", documento: "529.982.247-25" }, s), /já cadastrado/);
});

test("telefones e e-mail são conferidos só quando preenchidos", () => {
  const s = memoria();
  assert.throws(() => salvarCliente({ ...vazio, nome: "A", telefone: "123" }, s), /Telefone deve/);
  assert.throws(() => salvarCliente({ ...vazio, nome: "A", telefone2: "123" }, s), /Telefone 2 deve/);
  assert.throws(() => salvarCliente({ ...vazio, nome: "A", email: "sem-arroba" }, s), /E-mail/);
  const ok = salvarCliente({ ...vazio, nome: "A", telefone: "1133334444", telefone2: "11999998888", email: "A@B.com" }, s);
  assert.equal(ok.telefone, "(11)3333.4444");
  assert.equal(ok.telefone2, "(11)9.9999.8888");
  assert.equal(ok.email, "a@b.com");
});

test("dado ilegível não é sobrescrito", () => {
  const s = memoria();
  s.dados.set("gemape-demo-clientes", "{quebrado");
  assert.throws(() => salvarCliente({ ...vazio, nome: "A" }, s), /ilegíveis/);
  assert.throws(() => removerCliente("x", s), /ilegíveis/);
  assert.equal(s.dados.get("gemape-demo-clientes"), "{quebrado");
});

test("máscara de CPF/CNPJ muda conforme a digitação", () => {
  assert.equal(mascararCpfOuCnpj("52998224725"), "529.982.247-25");
  assert.equal(mascararCpfOuCnpj("11222333000181"), "11.222.333/0001-81");
  assert.equal(mascararCpfOuCnpj("5299"), "529.9");
});

test("Clientes aparece em Parâmetros, abaixo de Fornecedores", () => {
  const menu = readFileSync("src/components/layout/AppSidebar.tsx", "utf8");
  assert.ok(menu.indexOf('url: "/cadastros/clientes"') > menu.indexOf('url: "/cadastros/fornecedores"'));
  const tela = readFileSync("src/routes/_authenticated/cadastros/clientes.tsx", "utf8");
  assert.match(tela, /AcoesLinha/);
});
