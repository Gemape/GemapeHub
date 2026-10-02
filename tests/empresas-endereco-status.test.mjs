import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  CAMPOS_ENDERECO_EMPRESA,
  STATUS_EMPRESA,
  enderecoResumido,
  statusDaEmpresa,
  valoresDaEmpresa,
} from "../src/lib/empresas.ts";

const form = (dados) => ({ get: (chave) => dados[chave] ?? null });
const BASE = { nome_fantasia: " GEMAPE ", razao_social: "GEMAPE Ltda", cnpj: "00.000.000/0001-00" };
const ENDERECO = { rua: "Rua A", numero: "10", bairro: "Centro", cep: "01000-000", cidade: "São Paulo", estado: "SP" };

test("o status da empresa é Ativa ou Inativa e, sem valor, vale Ativa", () => {
  assert.deepEqual([...STATUS_EMPRESA], ["Ativa", "Inativa"]);
  assert.equal(statusDaEmpresa({}), "Ativa");
  assert.equal(statusDaEmpresa({ status: "Inativa" }), "Inativa");
  assert.equal(statusDaEmpresa({ status: "qualquer coisa" }), "Ativa");
});

test("o endereço tem rua, número, bairro, CEP, cidade e estado", () => {
  assert.deepEqual(CAMPOS_ENDERECO_EMPRESA.map((c) => c.nome), ["rua", "numero", "bairro", "cep", "cidade", "estado"]);
});

test("o endereço resumido junta só o que foi preenchido", () => {
  assert.equal(enderecoResumido(ENDERECO), "Rua A, 10 · Centro · São Paulo/SP · 01000-000");
  assert.equal(enderecoResumido({ cidade: "Recife" }), "Recife");
  assert.equal(enderecoResumido({}), "");
});

test("em demonstração, salva endereço e status junto com os dados da empresa", () => {
  const v = valoresDaEmpresa(form({ ...BASE, ...ENDERECO, status: "Inativa" }), true);
  assert.equal(v.nome_fantasia, "GEMAPE");
  assert.equal(v.rua, "Rua A");
  assert.equal(v.estado, "SP");
  assert.equal(v.status, "Inativa");
});

test("sem informar o status, a empresa é salva como Ativa", () => {
  assert.equal(valoresDaEmpresa(form({ ...BASE }), true).status, "Ativa");
});

test("fora da demonstração não envia colunas que o banco real ainda não tem", () => {
  const v = valoresDaEmpresa(form({ ...BASE, ...ENDERECO, status: "Inativa" }), false);
  assert.deepEqual(Object.keys(v).sort(), ["cnpj", "nome_fantasia", "razao_social"]);
});

test("a tela de empresas mostra endereço e status e a empresa demo vem com eles", () => {
  const raiz = new URL("../src/", import.meta.url);
  const tela = readFileSync(new URL("routes/_authenticated/empresas.tsx", raiz), "utf8");
  assert.match(tela, /<TableHead>Endereço<\/TableHead>/);
  assert.match(tela, /<TableHead>Status<\/TableHead>/);
  assert.match(tela, /CAMPOS_ENDERECO_EMPRESA/);
  assert.match(tela, /valoresDaEmpresa/);
  const demo = readFileSync(new URL("integrations/supabase/demo-client.ts", raiz), "utf8");
  assert.match(demo, /status: "Ativa"/);
});
