import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");

test("Cadastrar Ferramenta não tem descrição, série, patrimônio, aquisição, empresa, custo nem nota fiscal (decisão 54)", () => {
  const fonte = ler("components/modules/ItensModulo.tsx");
  const form = fonte.slice(fonte.indexOf("<form onSubmit"));
  for (const campo of ["nome", "numero_serie", "patrimonio", "data_aquisicao", "empresa_id", "preco_unitario", "nota_fiscal"]) {
    assert.doesNotMatch(form, new RegExp(`name="${campo}"`), campo);
  }
  assert.match(form, /name="estoque_minimo"/);
  assert.match(form, /id="modelo" name="modelo" required/);
  const lista = fonte.slice(fonte.indexOf('<div className="panel overflow-x-auto">'), fonte.indexOf("<Dialog open"));
  assert.doesNotMatch(lista, /numero_serie|patrimonio|data_aquisicao|preco_unitario/);
  assert.match(lista, /item\.estoque_minimo/);
});

test("a ferramenta nova usa a empresa do cabeçalho e a edição mantém a dela", () => {
  const fonte = ler("components/modules/ItensModulo.tsx");
  assert.match(fonte, /empresa_id: editando\?\.empresa_id \?\? \(empresaPadraoParaEscolha\(empresas, empresaId\) \|\| null\)/);
});

test("a edição não apaga série, patrimônio, aquisição, custo e nota fiscal que a ferramenta já tem", () => {
  const fonte = ler("components/modules/ItensModulo.tsx");
  const valores = fonte.slice(fonte.indexOf("let valores"), fonte.indexOf("if (!editando)"));
  assert.doesNotMatch(valores, /numero_serie|patrimonio|data_aquisicao|preco_unitario|nota_fiscal/);
  // Campos sem input na tela também não podem ser zerados na edição.
  assert.doesNotMatch(valores, /texto\("(ca|tamanho|cor|fornecedor|data_validade)"\)/);
});

test("ferramenta nova recebe série gerada (coluna obrigatória) e exige empresa ativa", () => {
  const fonte = ler("components/modules/ItensModulo.tsx");
  assert.match(fonte, /valores\['numero_serie'\] = `SN-\$\{crypto\.randomUUID\(\)\}`/);
  assert.match(fonte, /!editando && !valores\["empresa_id"\]/);
});
