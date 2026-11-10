import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ler = (a) => readFileSync(new URL(`../src/${a}`, import.meta.url), "utf8");

for (const [nome, arquivo] of [
  ["Uniformes e EPI antigo (CadastroProduto)", "components/modules/CadastroProduto.tsx"],
  ["Ferramentas (ItensModulo)", "components/modules/ItensModulo.tsx"],
]) {
  test(`${nome} usa AcoesLinha com Clonar, Editar e Excluir`, () => {
    const fonte = ler(arquivo);
    assert.match(fonte, /<AcoesLinha[\s\S]*onClonar=[\s\S]*onEditar=[\s\S]*onExcluir=/);
    // Sem botões soltos de Editar/Excluir na linha.
    assert.doesNotMatch(fonte, /^\s*(Editar|Excluir)\s*$/m);
  });

  test(`${nome}: Clonar abre cadastro novo (sem editando), com código gerado e sem estoque herdado`, () => {
    const fonte = ler(arquivo);
    assert.match(fonte, /onClonar=\{\(\) => void abrirNovo\(item\)\}/);
    assert.match(fonte, /const (base = (rascunho \?\? )?editando \?\? modelo|original = editando \?\? modelo);/);
    assert.match(fonte, /setEditando\(null\);\s*setModelo\(origem \?\? null\)/);
    assert.match(fonte, /estoque_atual/);
  });
}

test("Clonar ferramenta copia todos os dados, inclusive o modelo (decisão 138)", () => {
  const fonte = ler("components/modules/ItensModulo.tsx");
  assert.match(fonte, /defaultValue=\{base\?\.modelo \?\? ""\}/);
  assert.match(fonte, /defaultValue=\{base\?\.estoque_minimo \?\? 0\}/);
  assert.match(fonte, /setGrupoEscolhido\(base\?\.grupo_ferramenta \?\? ""\)/);
  assert.match(fonte, /value=\{grupoEscolhido\} onValueChange=\{\(g\) => \{ setGrupoEscolhido\(g\); setTamanhoEscolhido\(SEM_TAMANHO\); \}\}/);
});
