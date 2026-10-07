import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const raiz = new URL("../src/", import.meta.url);
const epi = readFileSync(new URL("components/modules/CadastroEpi.tsx", raiz), "utf8");
const janela = readFileSync(new URL("components/parametros/DialogAssociarTamanhos.tsx", raiz), "utf8");

test("a janela abre exatamente a tela de Tamanho e Medidas do menu (decisões 87 e 89)", () => {
  assert.match(janela, /<TamanhosMedidasUnificado de=\{de\} emJanela \/>/); // a mesma tela do menu, sem versão reduzida
});

test("no Novo EPI, o link abre a janela ao lado do diálogo do cadastro, que continua montado", () => {
  assert.match(epi, /onClick=\{\(\) => setAssociarAberto\(true\)\}/);
  assert.match(epi, /Associar tamanhos/);
  const novo = epi.indexOf("<Dialog open={novoAberto}");
  const janelaPos = epi.indexOf("<DialogAssociarTamanhos");
  assert.ok(janelaPos > 0 && janelaPos < novo, "a janela fica fora (antes) do diálogo Novo EPI");
});

test("tamanho escolhido que deixou de ser autorizado volta vazio", () => {
  assert.match(epi, /tamanhoSel && !associados\.some\(\(t\) => t\.id === tamanhoSel\)\) \{\s*setTamanhoSel\(""\);\s*toast\.info/);
});

test("o Novo Uniforme tem a mesma janela de associação, com a mesma proteção do tamanho (decisão 88)", () => {
  const uni = readFileSync(new URL("components/modules/CadastroUniforme.tsx", raiz), "utf8");
  assert.match(uni, /onClick=\{\(\) => setAssociarAberto\(true\)\}/);
  assert.match(uni, /Associar tamanhos/);
  assert.ok(uni.indexOf("<DialogAssociarTamanhos") < uni.indexOf("<Dialog open={novoAberto}"));
  assert.match(uni, /tamanhoSel && !associados\.some\(\(t\) => t\.id === tamanhoSel\)\) \{\s*setTamanhoSel\(""\);\s*toast\.info/);
});
