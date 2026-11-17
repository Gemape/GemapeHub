import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");

// Arquivos já migrados do confirm() do navegador para a janela do sistema; cresce a cada lote do Bloco 4a.
const MIGRADOS = ["components/modules/ItensModulo.tsx"];

test("a janela de confirmação existe, está no layout e cita o item no título da exclusão", () => {
  const janela = ler("components/ConfirmarAcao.tsx");
  assert.match(janela, /titulo: `Excluir \$\{nome\}\?`/);
  assert.match(janela, /destrutivo: true/);
  assert.match(janela, /<AlertDialogCancel>Cancelar<\/AlertDialogCancel>/);
  assert.match(janela, /window\.confirm/, "sem a janela montada, cai no confirm() em vez de passar sem perguntar");
  assert.match(ler("routes/_authenticated/route.tsx"), /<ConfirmarAcaoHost \/>/);
});

test("arquivos migrados não usam mais o confirm() do navegador", () => {
  for (const f of MIGRADOS) {
    const src = ler(f);
    assert.doesNotMatch(src, /(?<![\w.])confirm\(/, f);
    assert.match(src, /confirmar(Exclusao)?\(/, f);
  }
});
