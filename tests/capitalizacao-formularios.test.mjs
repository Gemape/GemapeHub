import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const raiz = new URL("../src/", import.meta.url).pathname;
const arquivos = (dir) => readdirSync(dir).flatMap((n) => {
  const c = join(dir, n);
  return statSync(c).isDirectory() ? arquivos(c) : /\.tsx$/.test(n) ? [c] : [];
});
const tsx = arquivos(raiz).filter((f) => !f.includes("/components/ui/"));

test("a propriedade capitalizar só aceita texto, nome ou minusculas (e-mail, dec 166)", () => {
  for (const f of tsx) {
    for (const m of readFileSync(f, "utf8").matchAll(/capitalizar[=:]\s*\{?\s*"(\w+)"/g)) {
      assert.ok(["texto", "nome", "minusculas"].includes(m[1]), `${f}: ${m[1]}`);
    }
  }
});

test("campo de código, documento, placa, e-mail, senha, data e busca não é capitalizado", () => {
  const proibidos = /(codigo|sku|cnpj|cpf|rg|cep|placa|renavam|chassi|email|senha|password|telefone|data|hora|busca|serie|patrimonio|nota_fiscal)/i;
  for (const f of tsx) {
    for (const m of readFileSync(f, "utf8").matchAll(/<(?:Input|Textarea)\b[^>]*>/g)) {
      const tag = m[0];
      if (!/capitalizar=/.test(tag)) continue;
      // O modo "minusculas" só baixa as letras (e-mail), não capitaliza: é o único permitido nesses campos.
      if (/capitalizar="minusculas"/.test(tag)) continue;
      const nome = /(?:name|id)="([^"]+)"/.exec(tag)?.[1] ?? "";
      assert.doesNotMatch(nome, proibidos, `${f}: ${nome}`);
      assert.doesNotMatch(tag, /type="(number|date|time|email|password|tel|file|hidden|search)"/, `${f}: ${nome}`);
    }
  }
});

test("os componentes Input e Textarea corrigem ao sair do campo e o Input também no Enter", () => {
  const input = readFileSync(join(raiz, "components/ui/input.tsx"), "utf8");
  const area = readFileSync(join(raiz, "components/ui/textarea.tsx"), "utf8");
  for (const fonte of [input, area]) {
    assert.match(fonte, /capitalizar\?: ModoCapitalizacao/);
    assert.match(fonte, /onBlur=\{\(e\) => \{\s*if \(capitalizar\) aplicarNoCampo\(e\.currentTarget, capitalizar\);/);
  }
  assert.match(input, /e\.key === "Enter"/);
});

test("nome de pessoa usa a regra por palavra nos cadastros de empregado e de contato do fornecedor", () => {
  const ler = (c) => readFileSync(join(raiz, c), "utf8");
  assert.match(ler("lib/empregados.ts"), /capitalizarNomePessoa\(dados\.nome\)/);
  assert.match(ler("lib/fornecedores-demo.ts"), /contato: capitalizarNomePessoa\(valores\.contato\)/);
  assert.match(ler("routes/_authenticated/cadastros/fornecedores.tsx"), /contato: capitalizarNomePessoa\(/);
});
