import test from "node:test";
import assert from "node:assert/strict";


test("lerTodas junta as páginas além do corte de 1000 linhas", async () => {
  const { lerTodas } = await import("../src/lib/ler-todas.ts");
  const linhas = Array.from({ length: 1234 }, (_, i) => ({ id: i }));
  const montar = () => ({ order: () => ({ range: async (a, b) => ({ data: linhas.slice(a, b + 1), error: null }) }) });
  const lidas = await lerTodas(montar, (q) => q.order("id"));
  assert.equal(lidas.length, 1234);
  await assert.rejects(lerTodas(() => ({ range: async () => ({ data: null, error: new Error("falhou") }) }), (q) => q), /falhou/);
});

test("fornecedores salvos ilegíveis não são sobrescritos", async () => {
  const { salvarFornecedor, removerFornecedor } = await import("../src/lib/fornecedores-demo.ts");
  const dados = new Map([["gemape-demo-fornecedores", "{quebrado"]]);
  const storage = { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
  assert.throws(() => removerFornecedor("x", storage), /ilegíveis/);
  assert.throws(() => salvarFornecedor({ razao_social: "A", cnpj: "" }, storage), /ilegíveis/);
  assert.equal(dados.get("gemape-demo-fornecedores"), "{quebrado");
});

test("busca de endereçamento ignora acentos", async () => {
  const { montarLinhasEnderecamento } = await import("../src/lib/enderecamento-categoria.ts");
  const { salvarEnderecamentoCategoria, lerParametros } = await import("../src/lib/parametros-base.ts");
  const dados = new Map();
  const local = { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
  salvarEnderecamentoCategoria("cat-epi", "opcional", local);
  const produtos = [{ tabela: "epis", codigo_sku: "EPI-0002", nome: "Cinto de Segurança", empresa_id: "a" }];
  assert.equal(montarLinhasEnderecamento(produtos, [], lerParametros(local), "a", "seguranca", false).length, 1);
});

test("telas: troca de empresa limpa empregado e Valor Total usa o preço registrado", async () => {
  const { readFileSync } = await import("node:fs");
  const ler = (f) => readFileSync(`src/components/modules/${f}.tsx`, "utf8");
  for (const f of ["EpiTermoEntrega", "UniformesTermoEntrega", "UniformesTermoBaixa"]) assert.match(ler(f), /setEmpregadoId\(""\)/, f);
  for (const f of ["EpiRelatorioBaixa", "UniformesRelatorioBaixa"]) assert.doesNotMatch(ler(f), /quantidade \* 0/, f);
  assert.match(ler("ChecklistPainelMensal"), /mesEscolhido \?\? mesDe\(hoje\)/);
});
