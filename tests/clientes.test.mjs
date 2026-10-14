import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { listarClientes, proximoCodigoCliente, removerCliente, salvarCliente } from "../src/lib/clientes-demo.ts";
import { mascaraDoCampo } from "../src/lib/mascaras.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v), dados };
};
const vazio = { nome: "", cpf: "", cnpj: "", endereco: "", contato: "", telefone: "", telefone2: "", email: "", observacao: "" };

test("só o nome é obrigatório e o código é gerado em 5 dígitos", () => {
  const s = memoria();
  assert.equal(proximoCodigoCliente(s), "00001");
  assert.throws(() => salvarCliente(vazio, s), /nome do cliente/);
  const a = salvarCliente({ ...vazio, nome: "oficina do joão ltda" }, s);
  assert.equal(a.codigo, "00001");
  assert.equal(a.nome, "Oficina do João Ltda");
  assert.equal(salvarCliente({ ...vazio, nome: "GERADO MAGELA DA COSTA" }, memoria()).nome, "Gerado Magela da Costa");
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

test("CPF (11 dígitos) e CNPJ (14 dígitos) são campos separados, opcionais, validados e sem repetição", () => {
  const s = memoria();
  assert.throws(() => salvarCliente({ ...vazio, nome: "A", cpf: "123" }, s), /CPF deve ter 11/);
  assert.throws(() => salvarCliente({ ...vazio, nome: "A", cpf: "123.456.789-00" }, s), /CPF inválido/);
  assert.throws(() => salvarCliente({ ...vazio, nome: "A", cnpj: "1122233300018" }, s), /CNPJ deve ter 14/);
  const a = salvarCliente({ ...vazio, nome: "A", cpf: "52998224725" }, s);
  assert.equal(a.cpf, "529.982.247-25");
  assert.equal(a.cnpj, "");
  const b = salvarCliente({ ...vazio, nome: "B", cnpj: "11222333000181" }, s);
  assert.equal(b.cnpj, "11.222.333/0001-81");
  const c = salvarCliente({ ...vazio, nome: "C", cpf: "111.444.777-35", cnpj: "45.997.418/0001-53" }, s);
  assert.equal(c.cpf, "111.444.777-35");
  assert.throws(() => salvarCliente({ ...vazio, nome: "D", cpf: "529.982.247-25" }, s), /CPF já cadastrado/);
  assert.throws(() => salvarCliente({ ...vazio, nome: "D", cnpj: "11222333000181" }, s), /CNPJ já cadastrado/);
  // editar sem mexer nos documentos não os reconfere
  assert.equal(salvarCliente({ ...vazio, nome: "A2", cpf: a.cpf, id: a.id }, s).cpf, a.cpf);
});

test("cadastro antigo com o campo documento passa para CPF ou CNPJ", () => {
  const s = memoria();
  s.dados.set("gemape-demo-clientes", JSON.stringify([
    { id: "1", codigo: "00001", nome: "A", documento: "529.982.247-25" },
    { id: "2", codigo: "00002", nome: "B", documento: "11.222.333/0001-81" },
    { id: "3", codigo: "00003", nome: "C", documento: "" },
  ]));
  const [a, b, c] = listarClientes(s);
  assert.deepEqual([a.cpf, a.cnpj, b.cpf, b.cnpj, c.cpf, c.cnpj], ["529.982.247-25", "", "", "11.222.333/0001-81", "", ""]);
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

test("máscaras: CPF com 11 dígitos e CNPJ com 14", () => {
  assert.equal(mascaraDoCampo("cpf")("529982247259999"), "529.982.247-25");
  assert.equal(mascaraDoCampo("cnpj")("112223330001819999"), "11.222.333/0001-81");
});

test("Clientes aparece em Parâmetros, abaixo de Fornecedores", () => {
  const menu = readFileSync("src/components/layout/AppSidebar.tsx", "utf8");
  assert.ok(menu.indexOf('url: "/cadastros/clientes"') > menu.indexOf('url: "/cadastros/fornecedores"'));
  const tela = readFileSync("src/routes/_authenticated/cadastros/clientes.tsx", "utf8");
  assert.match(tela, /AcoesLinha/);
});

test("nome com inicial maiúscula por palavra e e-mail em minúsculas, também ao digitar", async () => {
  const { formatarPorModo } = await import("../src/lib/campo-capitalizado.ts");
  assert.equal(formatarPorModo("gerado magela da costa", "nome"), "Gerado Magela da Costa");
  assert.equal(formatarPorModo("FaleCom@GMAIL.com", "minusculas"), "falecom@gmail.com");
  const s = memoria();
  assert.equal(salvarCliente({ ...vazio, nome: "A", email: "FALECOM@GMAIL.COM" }, s).email, "falecom@gmail.com");
  const tela = readFileSync("src/routes/_authenticated/cadastros/clientes.tsx", "utf8");
  assert.match(tela, /id="nome" name="nome" capitalizar="nome"/);
  assert.match(tela, /id="email" name="email" type="email" capitalizar="minusculas"/);
});
