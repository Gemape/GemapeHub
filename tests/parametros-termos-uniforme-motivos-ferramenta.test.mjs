import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lerTextosTermosUniforme, salvarTextosTermosUniforme, TEXTOS_UNIFORME_PADRAO } from "../src/lib/uniforme-termos-texto.ts";
import { lerMotivosBaixaFerramenta, salvarMotivosBaixaFerramenta } from "../src/lib/ferramentas-motivos-baixa.ts";
import { MOTIVOS_BAIXA_CAIXA } from "../src/lib/controle-caixa.ts";
import { montarTermoEntregaUniformeHtml } from "../src/lib/termo-entrega-uniforme-html.ts";
import { montarTermoBaixaUniformeHtml } from "../src/lib/termo-baixa-uniforme-html.ts";

const memoria = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const empresa = { razao_social: "Gemape Ltda", cnpj: "12345678000190", nome_fantasia: "Gemape" };

test("sem texto cadastrado o termo de uniforme sai com o texto de sempre", () => {
  const entrega = montarTermoEntregaUniformeHtml({ empresa, empregado: { nome: "Ana", cpf: "111" }, data: "2026-11-18", linhas: [{ nome: "Camisa", quantidade: 1, estado: "Novo" }] });
  assert.match(entrega, /Declaramos que nesta data, <strong>18\/11\/2026<\/strong>, entregamos ao colaborador\(a\) <strong>Ana<\/strong>, CPF nº <strong>111<\/strong>/);
  assert.match(entrega, /<table>[\s\S]*Camisa[\s\S]*<\/table>[\s\S]*devolvê-los à empresa quando solicitado/);
  const baixa = montarTermoBaixaUniformeHtml({ empresa: { ...empresa }, empregado: { nome: "Ana" }, data: "2026-11-18", motivo: "Desgaste Natural", onus: "Empresa", linhas: [] });
  assert.match(baixa, /Registramos nesta data, <strong>18\/11\/2026<\/strong>, a baixa definitiva[\s\S]*<strong>Ana<\/strong>/);
  assert.match(baixa, /Desgaste Natural[\s\S]*está ciente da baixa dos itens acima/);
});

test("o texto cadastrado vale no termo, com os dados escapados e a tabela no lugar", () => {
  const html = montarTermoEntregaUniformeHtml({
    empresa, empregado: { nome: "<b>Ana</b>", cpf: "111" }, data: "2026-11-18", linhas: [{ nome: "Camisa", quantidade: 1, estado: "Novo" }],
    texto: "Recebi de {empresa}: {empregado}.\n\n{tabela}\n\nAssino em {data}.",
  });
  assert.match(html, /Recebi de <strong>Gemape Ltda<\/strong>: <strong>&lt;b&gt;Ana&lt;\/b&gt;<\/strong>\./);
  assert.match(html, /Camisa[\s\S]*Assino em <strong>18\/11\/2026<\/strong>/);
  assert.doesNotMatch(html, /<b>Ana<\/b>/);
});

test("textos do uniforme: padrão, salvar, texto inválido e armazenamento corrompido", () => {
  const s = memoria();
  assert.deepEqual(lerTextosTermosUniforme(s), TEXTOS_UNIFORME_PADRAO);
  salvarTextosTermosUniforme({ entrega: "Entrega {tabela}", baixa: "Baixa {tabela}" }, s);
  assert.equal(lerTextosTermosUniforme(s).entrega, "Entrega {tabela}");
  assert.throws(() => salvarTextosTermosUniforme({ entrega: "{tabela} e {tabela}", baixa: "ok" }, s), /uma marca/);
  assert.throws(() => salvarTextosTermosUniforme({ entrega: "   ", baixa: "ok" }, s), /escreva o texto/);
  assert.deepEqual(lerTextosTermosUniforme({ getItem: () => "{quebrado", setItem() {} }), TEXTOS_UNIFORME_PADRAO);
});

test("motivos de baixa das ferramentas: padrão, salvar e recusar lista vazia", () => {
  const s = memoria();
  assert.deepEqual(lerMotivosBaixaFerramenta(s), [...MOTIVOS_BAIXA_CAIXA]);
  assert.deepEqual(salvarMotivosBaixaFerramenta(["Perda", "  Quebra  ", "Perda"], s), ["Perda", "Quebra"]);
  assert.deepEqual(lerMotivosBaixaFerramenta(s), ["Perda", "Quebra"]);
  assert.throws(() => salvarMotivosBaixaFerramenta([], s), /pelo menos um motivo/);
});

test("as telas de baixa e reposição leem os motivos cadastrados e os parâmetros mostram os editores", () => {
  const le = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  for (const f of ["CaixaGestaoDialogs", "FerramentasReposicaoCaixa"]) assert.match(le(`src/components/modules/${f}.tsx`), /useState\(lerMotivosBaixaFerramenta\)[\s\S]*motivosBaixa\.map/, f);
  assert.match(le("src/components/parametros/ParametrosFerramentas.tsx"), /salvarMotivosBaixaFerramenta/);
  assert.match(le("src/components/parametros/ParametrosUniforme.tsx"), /<TextosTermosUniforme \/>/);
});

test("a marca {cpf} vale no termo de baixa e, sem {tabela}, a lista vem depois do texto", () => {
  const html = montarTermoBaixaUniformeHtml({ empresa, empregado: { nome: "Ana", cpf: "111.222.333-44" }, data: "2026-11-18", motivo: "Perda", onus: "Empresa", linhas: [{ nome: "Camisa", quantidade: 1, estado: "Novo" }], texto: "Baixa de {empregado}, CPF {cpf}." });
  assert.match(html, /CPF <strong>111\.222\.333-44<\/strong>/);
  assert.ok(html.indexOf("CPF <strong>") < html.indexOf("Camisa"));
});
