import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const le = (c) => readFileSync(new URL(`../src/components/modules/${c}`, import.meta.url), "utf8");

test("gerar a Ficha de EPI Avulsa abre a confirmação, e só o Sim gera a ficha", () => {
  const tela = le("EpiFichaEpiAvulsa.tsx");
  assert.match(tela, /onClick=\{\(\) => setConfirmando\(true\)\}/, "o botão só abre a confirmação");
  assert.doesNotMatch(tela, /onClick=\{gerarFicha\}/, "o botão não gera direto");
  assert.match(tela, /onSim=\{\(\) => \{\s*setConfirmando\(false\);\s*void gerarFicha\(\);/);
  assert.match(tela, /onNao=\{\(\) => setConfirmando\(false\)\}/, "Não volta à tela sem gerar");
});

test("a confirmação traz a mensagem pedida, com o caminho do Termo de Entrega como link", () => {
  const c = le("ConfirmarFichaAvulsa.tsx").replace(/\s+/g, " ");
  assert.match(c, /A ficha avulsa de entrega de EPI se destina exclusivamente para o registro manual de itens de consumo corriqueiro, como máscaras e luvas\./);
  assert.match(c, /Caso deseje entregar itens de maior custo e durabilidade, como botinas, capacetes, óculos, entre outros, utilize a rotina/);
  assert.match(c, /<Link to="\/epi" search=\{\{ aba: "termo-entrega" \} as never\}[^>]*>\s*\{"EPIs >> módulo >> termo de entrega"\}\s*<\/Link>/);
  assert.match(c, /Deseja confirmar a geração da Ficha avulsa de entrega de EPI\?/);
  assert.match(c, /<AlertDialogCancel>Não<\/AlertDialogCancel>/);
  assert.match(c, /<AlertDialogAction onClick=\{onSim\}>Sim<\/AlertDialogAction>/);
});

test("o link do Termo de Entrega fecha a confirmação ao ser clicado", () => {
  assert.match(le("ConfirmarFichaAvulsa.tsx"), /onClick=\{onNao\}/);
});
