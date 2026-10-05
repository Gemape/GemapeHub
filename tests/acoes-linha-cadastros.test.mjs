import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ler = (c) => readFileSync(new URL(`../src/routes/_authenticated/${c}`, import.meta.url), "utf8");
const completo = /<AcoesLinha[\s\S]*?onClonar=[\s\S]*?onEditar=[\s\S]*?onExcluir=/;

test("Empresas usa AcoesLinha; Clonar abre cadastro novo sem CNPJ", () => {
  const src = ler("empresas.tsx");
  assert.match(src, completo);
  assert.match(src, /setEditando\(null\);\s*setModelo\(empresa\)/);
  assert.match(src, /defaultValue=\{editando\?\.cnpj \? formatarCnpj\(editando\.cnpj\) : ""\}/);
  assert.doesNotMatch(src, /<Button requiresWrite\s+variant="ghost"/);
});

test("Empregados usa AcoesLinha; Clonar limpa CPF, matrícula e e-mail", () => {
  const src = ler("empregados.tsx");
  assert.match(src, /<AcoesLinha rotulo=\{e\.nome\} onClonar=.*onEditar=.*onExcluir=/);
  assert.match(src, /setEditando\(clonar \? null : empregado\)/);
  assert.match(src, /defaultValue=\{editando\?\.cpf \? mascararCpf\(editando\.cpf\) : ""\}/);
  assert.match(src, /defaultValue=\{editando\?\.matricula \?\? ""\}/);
  assert.match(src, /defaultValue=\{editando\?\.email \?\? ""\}/);
});

test("Fornecedores usa AcoesLinha; Clonar gera código novo e deixa CNPJ em branco", () => {
  const src = ler("cadastros/fornecedores.tsx");
  assert.match(src, /<AcoesLinha rotulo=\{fornecedor\.nome_fantasia\} onClonar=.*onEditar=.*onExcluir=/);
  assert.match(src, /!clonar && fornecedor \? fornecedor\.codigo : proximoCodigoFornecedor\(\)/);
  assert.match(src, /formatarCnpj\(editando\?\.cnpj \?\? ""\)/);
});

test("Ficha de EPI usa AcoesLinha; Clonar copia só o texto e deixa o EPI em branco", () => {
  const src = ler("epi-ficha.tsx");
  assert.match(src, completo);
  assert.match(src, /setEpiSel\(""\);\s*setConteudo\(conteudoCopiado\)/);
});

test("Clonar empregado não copia a demissão e a ficha e os códigos deixam quem só lê abrir o registro (revisão)", async () => {
  const { readFileSync } = await import("node:fs");
  const ler = (a) => readFileSync(new URL(`../src/${a}`, import.meta.url), "utf8");
  assert.match(ler("routes/_authenticated/empregados.tsx"), /defaultValue=\{editando\?\.data_demissao/);
  for (const a of ["routes/_authenticated/epi-ficha.tsx", "routes/_authenticated/cadastros/gerais/codigo-fabrica.tsx", "routes/_authenticated/cadastros/gerais/codigo-produto.tsx"]) {
    assert.match(ler(a), /<AcoesLinha[\s\S]*?editarLivre/);
  }
  assert.match(ler("components/parametros/AcoesLinha.tsx"), /requiresWrite=\{!editarLivre\}/);
});
