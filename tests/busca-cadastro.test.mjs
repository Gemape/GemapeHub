import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { camposDeBusca } from "../src/lib/busca-cadastro.ts";
import { combinaBusca } from "../src/lib/parametros-base.ts";

const ler = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const acha = (termo, cadastro, extras) => combinaBusca(termo, ...camposDeBusca(cadastro, extras));

test("a busca por palavra-chave olha qualquer campo, sem maiúsculas nem acentos, e exige todas as palavras", () => {
  const cliente = { id: "x1", codigo: "00007", nome: "José da Conceição Ltda", cpf: "", cnpj: "12.345.678/0001-90", contato: "Marta Souza", telefone: "(11) 98765-4321", cidade: "Itu" };
  assert.ok(acha("jose conceicao", cliente));
  assert.ok(acha("MARTA", cliente));
  assert.ok(acha("itu marta", cliente), "palavras de campos diferentes, em qualquer ordem");
  assert.ok(!acha("marta campinas", cliente), "todas as palavras precisam aparecer");
  assert.ok(acha("", cliente), "sem texto, tudo aparece");
  // Documento e telefone casam com ou sem pontuação.
  assert.ok(acha("12345678000190", cliente));
  assert.ok(acha("12.345.678", cliente));
  assert.ok(acha("987654321", cliente));
  assert.ok(acha("(11) 98765", cliente));
  // Campos extras da tela (empresa, datas, situação) também valem.
  assert.ok(acha("gemape ativo", { nome: "Ana", cpf: "529.982.247-25" }, ["Gemape Máquinas", "Ativo"]));
  assert.ok(acha("52998224725", { nome: "Ana", cpf: "529.982.247-25" }));
  assert.ok(!acha("lapa", { nome: "Ana" }, ["Gemape Máquinas"]));
  // Campos vazios e objetos aninhados não quebram.
  assert.doesNotThrow(() => camposDeBusca({ a: null, b: undefined, c: { d: 1 }, e: true }));
});

test("as telas de Empregados, Clientes e Fornecedores têm o campo de busca por palavra-chave", () => {
  const empregados = ler("components/modules/EmpregadosCadastroModulo.tsx");
  assert.match(empregados, /aria-label="Buscar empregado por palavra-chave"/);
  assert.match(empregados, /separarEmpregados\(encontrados\)/);
  assert.match(ler("routes/_authenticated/cadastros/clientes.tsx"), /aria-label="Buscar cliente por palavra-chave"/);
  assert.match(ler("routes/_authenticated/cadastros/clientes.tsx"), /clientes\.filter\(\(c\) => combinaBusca\(busca, \.\.\.camposDeBusca\(c,/);
  assert.match(ler("routes/_authenticated/cadastros/fornecedores.tsx"), /aria-label="Buscar fornecedor por palavra-chave"/);
  assert.match(ler("routes/_authenticated/cadastros/fornecedores.tsx"), /fornecedores\.filter\(\(f\) => combinaBusca\(busca, \.\.\.camposDeBusca\(f,/);
});

test("identificadores internos (id, *_id) não entram na busca", () => {
  assert.ok(!acha("abcdef12", { id: "abcdef12-0000", empresa_id: "abcdef12", nome: "Ana" }));
  assert.ok(acha("ana", { id: "abcdef12-0000", nome: "Ana" }));
});
