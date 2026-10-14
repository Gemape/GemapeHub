import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const raiz = new URL("../src/", import.meta.url);
const ler = (caminho) => readFileSync(new URL(caminho, raiz), "utf8");

test("listas de nome (categorias, subcategorias, marcas, tamanhos, unidades) usam AcoesLinha com Clonar, Editar e Excluir", () => {
  const lista = ler("components/parametros/ListaEditavel.tsx");
  assert.match(lista, /import \{ AcoesLinha \}/);
  assert.match(lista, /<AcoesLinha[\s\S]*onClonar=[\s\S]*onEditar=[\s\S]*onExcluir=\{\(\) => onRemover\(item\)\}/);
  assert.doesNotMatch(lista, /Renomear \$\{item\.nome\}|Trash2|Pencil/);
  // Clonar só leva o nome ao campo de inclusão: nada é gravado nem herdado.
  assert.match(lista, /function clonar\(item: Item\)[\s\S]*setNome\(item\.nome\)/);
  // As proteções de exclusão continuam nas telas que usam a lista.
  assert.match(ler("routes/_authenticated/cadastros/gerais/categorias.tsx"), /ListaEditavel/);
  const tamanhos = ler("components/parametros/TamanhosMedidasPainel.tsx");
  assert.match(tamanhos, /usoDoTamanho/);
  assert.match(tamanhos, /ocupado\.current/);
});

test("Código do produto usa AcoesLinha; Clonar copia a numeração e a sigla (dec 138)", () => {
  const tela = ler("routes/_authenticated/cadastros/gerais/codigo-produto.tsx");
  assert.match(tela, /<AcoesLinha[\s\S]*onClonar[\s\S]*onEditar=[\s\S]*onExcluir/);
  assert.match(tela, /onClonar: \(\) => novo\(c\.id, regra\.sigla, regra\.inicial\)/);
  assert.match(tela, /CATEGORIAS_BASE\[c\.id\]/);
});

test("Código de fábrica usa AcoesLinha; Clonar abre associação nova com o código na nota copiado (dec 138)", () => {
  const tela = ler("routes/_authenticated/cadastros/gerais/codigo-fabrica.tsx");
  assert.match(tela, /<AcoesLinha[\s\S]*onClonar=\{\(\) => abrir\(c, true\)\}[\s\S]*onEditar=\{\(\) => abrir\(c\)\}[\s\S]*onExcluir=/);
  assert.match(tela, /const base = editando \?\? modelo/);
  assert.match(tela, /setCodigoNota\(codigo\?\.codigo_fornecedor/);
  assert.match(tela, /editando\?\.id/);
});
