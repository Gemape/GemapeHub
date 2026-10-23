import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { montarLinhasEnderecamento, precisaAvisarEnderecamento } from "../src/lib/enderecamento-categoria.ts";
import { CATEGORIA_EQUIPAMENTOS, enderecamentoDaCategoria, lerParametros, salvarEnderecamentoCategoria } from "../src/lib/parametros-base.ts";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const memoria = () => {
  const m = new Map();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)) };
};
const equipamento = { tabela: "equipamentos", codigo_sku: "PAT-0001", nome: "Empilhadeira", empresa_id: "e1" };

test("o endereçamento de equipamentos começa em Não usa e se define como o das categorias", () => {
  const s = memoria();
  assert.equal(enderecamentoDaCategoria(lerParametros(s), CATEGORIA_EQUIPAMENTOS), "nao_usa");
  for (const tipo of ["opcional", "obrigatorio", "nao_usa"]) {
    salvarEnderecamentoCategoria(CATEGORIA_EQUIPAMENTOS, tipo, s);
    assert.equal(enderecamentoDaCategoria(lerParametros(s), CATEGORIA_EQUIPAMENTOS), tipo);
  }
  assert.throws(() => salvarEnderecamentoCategoria(CATEGORIA_EQUIPAMENTOS, "talvez", s), /inválido/);
  assert.throws(() => salvarEnderecamentoCategoria("cat-inexistente", "opcional", s), /Categoria/, "outras categorias continuam precisando existir em Gerais");
});

test("equipamento só entra na lista de endereçamento quando a categoria usa, e o aviso só vale para Obrigatório", () => {
  const s = memoria();
  const linhas = () => montarLinhasEnderecamento([equipamento], [], lerParametros(s), "todas", "", false);
  assert.equal(linhas().length, 0, "não usa: fora da lista");
  salvarEnderecamentoCategoria(CATEGORIA_EQUIPAMENTOS, "opcional", s);
  assert.equal(linhas().length, 1);
  assert.equal(precisaAvisarEnderecamento(lerParametros(s), CATEGORIA_EQUIPAMENTOS, "e1", "PAT-0001", []), false, "opcional não avisa");
  salvarEnderecamentoCategoria(CATEGORIA_EQUIPAMENTOS, "obrigatorio", s);
  assert.equal(precisaAvisarEnderecamento(lerParametros(s), CATEGORIA_EQUIPAMENTOS, "e1", "PAT-0001", []), true);
  assert.equal(precisaAvisarEnderecamento(lerParametros(s), CATEGORIA_EQUIPAMENTOS, "e1", "pat-0001", [{ empresa_id: "e1", codigo_produto: "PAT-0001" }]), false, "com endereço, sem aviso");
  const endereco = { id: "x", empresa_id: "e1", codigo_produto: "pat-0001", rua: "A", prateleira: "2", apartamento: "3" };
  assert.equal(montarLinhasEnderecamento([equipamento], [endereco], lerParametros(s), "todas", "", true).length, 0, "só sem endereço");
});

test("a tela de Parâmetros Específicos de equipamentos traz o endereçamento, e o módulo de endereçamento lista os equipamentos", () => {
  assert.match(ler("components/parametros/EquipamentosEspecificos.tsx"), /<EnderecamentoEquipamentos \/>/);
  const campo = ler("components/parametros/EnderecamentoEquipamentos.tsx");
  assert.match(campo, /Endereçamento de estoque/);
  for (const opcao of ["Não usa", "Opcional", "Obrigatório"]) assert.match(campo, new RegExp(`>${opcao}<`));
  assert.match(ler("components/modules/EnderecamentoModulo.tsx"), /tabela: "equipamentos" as const, codigo_sku: e\.patrimonio/);
  assert.match(ler("components/parametros/EquipamentoDialog.tsx"), /avisarEnderecamentoObrigatorio\(lerParametros\(\), CATEGORIA_EQUIPAMENTOS/);
  assert.doesNotMatch(campo, /supabase|fetch\(|\.from\(/);
});
