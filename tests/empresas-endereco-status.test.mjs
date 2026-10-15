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
  assert.equal(enderecoResumido(ENDERECO), "Rua A, 10 · Centro · São Paulo/SP · 01.000-000");
  assert.equal(enderecoResumido({ cidade: "Recife" }), "Recife");
  assert.equal(enderecoResumido({}), "");
});

test("em demonstração, salva endereço e status junto com os dados da empresa", () => {
  const v = valoresDaEmpresa(form({ ...BASE, ...ENDERECO, status: "Inativa" }), true);
  assert.equal(v.nome_fantasia, "Gemape");
  assert.equal(v.rua, "Rua a");
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

test("fora da demonstração a consulta de empresas pede só as colunas que existem", () => {
  const raiz = new URL("../src/", import.meta.url);
  const contexto = readFileSync(new URL("lib/empresa-context.tsx", raiz), "utf8");
  assert.match(contexto, /COLUNAS: string = MODO_DEMO \? "\*" : "id, nome_fantasia, razao_social, cnpj"/);
  const tela = readFileSync(new URL("routes/_authenticated/empresas.tsx", raiz), "utf8");
  assert.match(tela, /import \{ MODO_DEMO \} from "@\/lib\/modo-demo"/);
  assert.doesNotMatch(tela, /const MODO_DEMO =/);
});

test("empresa antiga, sem os campos novos, aparece sem endereço e como Ativa", () => {
  const antiga = { id: "x", nome_fantasia: "GEMAPE", razao_social: "GEMAPE", cnpj: "1" };
  assert.equal(enderecoResumido(antiga), "");
  assert.equal(statusDaEmpresa(antiga), "Ativa");
});

test("empresa nova normaliza texto e CNPJ sem afetar sigla", () => {
  const valores = valoresDaEmpresa(form({
    nome_fantasia: "GEMAPE",
    razao_social: "PROTEÇÃO GEMAPE LTDA",
    cnpj: "12345678000190",
    rua: "RUA SÃO JOSÉ",
    numero: "10",
    bairro: "CENTRO",
    cep: "12345678",
    cidade: "SÃO PAULO",
    estado: "SP",
  }), true);
  assert.equal(valores.nome_fantasia, "Gemape");
  assert.equal(valores.razao_social, "Proteção gemape ltda");
  assert.equal(valores.cnpj, "12.345.678/0001-90");
  assert.equal(valores.rua, "Rua são josé");
  assert.equal(valores.cep, "12.345-678");
  assert.equal(valores.estado, "SP");
});

test("edição de empresa antiga preserva CNPJ e CEP incompletos não alterados", () => {
  const antigo = { cnpj: "123", cep: "123" };
  const valores = valoresDaEmpresa(form({ ...BASE, ...antigo, nome_fantasia: "NOVA EMPRESA" }), true, antigo);
  assert.equal(valores.cnpj, "123");
  assert.equal(valores.cep, "123");
  assert.equal(valores.nome_fantasia, "Nova empresa");
  assert.throws(() => valoresDaEmpresa(form({ ...BASE, cnpj: "456" }), true, antigo), /CNPJ/);
});

import { empresaPadraoParaEscolha, empresasParaEscolha } from "../src/lib/empresas.ts";

const listaEmpresas = [
  { id: "e1", status: "Ativa" },
  { id: "e2", status: "Inativa" },
  { id: "e3" },
];

test("empresa inativa sai das listas de escolha; sem status conta como ativa", () => {
  assert.deepEqual(empresasParaEscolha(listaEmpresas).map((e) => e.id), ["e1", "e3"]);
});

test("a empresa de um registro em edição continua na lista, ainda que inativa", () => {
  assert.deepEqual(empresasParaEscolha(listaEmpresas, ["e2"]).map((e) => e.id), ["e1", "e2", "e3"]);
  assert.deepEqual(empresasParaEscolha(listaEmpresas, [null, undefined]).map((e) => e.id), ["e1", "e3"]);
});

test("a empresa que já vem escolhida é a do cabeçalho se estiver ativa, senão a primeira ativa", () => {
  assert.equal(empresaPadraoParaEscolha(listaEmpresas, "e3"), "e3");
  assert.equal(empresaPadraoParaEscolha(listaEmpresas, "e2"), "e1");
  assert.equal(empresaPadraoParaEscolha(listaEmpresas, "todas"), "e1");
  assert.equal(empresaPadraoParaEscolha([{ id: "x", status: "Inativa" }], "todas"), "");
});

test("os formulários e termos escolhem empresa só entre as ativas; relatórios e cabeçalho seguem com todas", () => {
  const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
  const comEscolha = [
    "components/modules/CadastroProduto.tsx", "components/modules/MovimentacoesModulo.tsx",
    "components/modules/EpiComprasModulo.tsx", "components/modules/UniformesComprasModulo.tsx", "components/modules/EpiTermoEntrega.tsx",
    "components/modules/UniformesTermoEntrega.tsx", "components/modules/UniformesTermoBaixa.tsx", "components/modules/EpiFichaEpiAvulsa.tsx",
    "components/modules/FerramentasTermoVistoria.tsx", "components/modules/FerramentasTermoResponsabilidade.tsx",
    "components/modules/FerramentasTermoEncerramento.tsx", "components/modules/VeiculosCadastroModulo.tsx",
    "components/modules/CaixasFerramentasModulo.tsx", "components/modules/EnderecamentoModulo.tsx", "components/modules/EmpregadosCadastroModulo.tsx",
  ];
  for (const arq of comEscolha) assert.match(ler(arq), /empresasParaEscolha\(empresas/, arq);
  // Edição mantém a empresa do registro.
  assert.match(ler("components/modules/CadastroProduto.tsx"), /empresasParaEscolha\(empresas, \[base\?\.empresa_id\]\)/);
  for (const arq of ["components/modules/EpiRelatorioFuncionario.tsx", "components/modules/UniformesRelatorioFuncionario.tsx", "routes/_authenticated/dashboard.tsx", "components/layout/AppSidebar.tsx"]) {
    assert.doesNotMatch(ler(arq), /empresasParaEscolha/, arq);
  }
});

test("o valor que já vem escolhido nunca é empresa inativa (termos, compras e endereçamento)", () => {
  const ler = (c) => readFileSync(new URL(`../src/components/modules/${c}`, import.meta.url), "utf8");
  for (const arq of ["EpiTermoEntrega", "EpiFichaEpiAvulsa", "FerramentasTermoEncerramento", "FerramentasTermoResponsabilidade", "FerramentasTermoVistoria"]) {
    assert.match(ler(`${arq}.tsx`), /empresas\.length > 0 && empresaSel && !empresasParaEscolha\(empresas\)\.some/, arq);
  }
  for (const arq of ["EpiComprasModulo", "UniformesComprasModulo"]) {
    assert.match(ler(`${arq}.tsx`), /setEmpresaCompra\(empresasParaEscolha\(empresas\)\.some\(\(e\) => e\.id === empresaId\)/, arq);
  }
  assert.match(ler("EnderecamentoModulo.tsx"), /doProduto && empresasParaEscolha\(empresas\)\.some/);
});
