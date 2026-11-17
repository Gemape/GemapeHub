import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mensagemHumana } from "../src/lib/erros-humanos.ts";

test("duplicidade cita o campo e o valor", () => {
  const m = mensagemHumana({ message: 'duplicate key value violates unique constraint "x"', details: "Key (placa)=(ABC1D23) already exists." });
  assert.match(m, /a placa ABC1D23/);
});
test("duplicidade de coluna desconhecida cai no texto genérico", () => {
  assert.match(mensagemHumana({ message: "duplicate key", details: "Key (zzz)=(1) already exists." }), /código, número ou placa/);
});
test("campo obrigatório vazio cita o campo", () => {
  assert.match(mensagemHumana({ message: 'null value in column "nome" violates not-null constraint' }), /Falta preencher: o nome/);
  assert.match(mensagemHumana({ message: 'null value in column "zzz" violates not-null constraint' }), /campo obrigatório/);
});
test("mensagens de validação dizem o que fazer", () => {
  const le = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  for (const [p, re] of [
    ["src/lib/empregados.ts", /CPF inválido\. Confira os 11 dígitos/],
    ["src/lib/clientes-demo.ts", /nome@empresa\.com\.br/],
    ["src/lib/equipamentos.ts", /como 15\/03\/2026/],
    ["src/lib/portadores-caixa.ts", /Escolha Ativa ou Inativa/],
    ["src/lib/parametros-base.ts", /Escolha Não usa, Opcional ou Obrigatório/],
    ["src/components/modules/CadastroProduto.tsx", /Informe em reais/],
  ]) assert.match(le(p), re, p);
});

test("validação ao sair do campo: Clientes, Fornecedores e Empresas", async () => {
  const v = await import("../src/lib/validacao-campos.ts");
  assert.match(v.validarCnpjCampo("12.345"), /14 dígitos/);
  assert.equal(v.validarCnpjCampo("12.345.678/0001-95"), null);
  assert.equal(v.validarCnpjCampo(""), null);
  assert.match(v.validarCepCampo("123"), /8 dígitos/);
  assert.match(v.validarTelefoneCampo("123"), /DDD/);
  assert.equal(v.validarTelefoneCampo("(11) 91234-5678"), null);
  assert.match(v.validarEmailCampo("a@b"), /nome@empresa/);
  assert.match(v.validarCpfSimples("111.111.111-11"), /CPF inválido/);
  const le = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  for (const p of ["src/components/parametros/ClienteDialog.tsx", "src/components/parametros/FornecedorDialog.tsx", "src/routes/_authenticated/empresas.tsx"]) {
    assert.match(le(p), /useErrosCampos/, p);
    assert.match(le(p), /<ErroCampo id=/, p);
  }
});

test("esqueleto onde o carregamento é real", () => {
  const le = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  for (const p of ["src/routes/_authenticated/relatorios.tsx", "src/routes/_authenticated/dashboard.tsx", "src/components/modules/InventarioContagem.tsx"]) {
    assert.match(le(p), /<LinhasEsqueleto /, p);
  }
});
