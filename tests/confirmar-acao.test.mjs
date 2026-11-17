import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");

// Fora da janela do sistema ficam só os avisos de "alterações não salvas" ao sair da tela: rodam no bloqueio de navegação do roteador, que
// precisa de resposta na hora (etapa própria). Cada arquivo lista quantas chamadas restam.
const PENDENTES = { "components/parametros/QuestionarioDespesasConstrutor.tsx": 1, "components/parametros/HabilitarEmpregadosViagens.tsx": 1 };

function arquivos(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? arquivos(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []));
}

test("a janela de confirmação existe, está no layout e cita o item no título da exclusão", () => {
  const janela = ler("components/ConfirmarAcao.tsx");
  assert.match(janela, /titulo: `Excluir \$\{nome\}\?`/);
  assert.match(janela, /destrutivo: true/);
  assert.match(janela, /<AlertDialogCancel>Cancelar<\/AlertDialogCancel>/);
  assert.match(janela, /window\.confirm/, "sem a janela montada, cai no confirm() em vez de passar sem perguntar");
  assert.match(ler("routes/_authenticated/route.tsx"), /<ConfirmarAcaoHost \/>/);
});

test("nenhuma tela usa o confirm() do navegador, fora os avisos de alteração não salva", () => {
  const raiz = fileURLToPath(new URL("../src/", import.meta.url));
  const achados = {};
  for (const f of arquivos(raiz)) {
    const rel = relative(raiz, f).replaceAll("\\", "/");
    const n = (readFileSync(f, "utf8").match(/(?<![\w.])confirm\(/g) ?? []).length;
    if (n && rel !== "components/ConfirmarAcao.tsx") achados[rel] = n;
  }
  assert.deepEqual(achados, PENDENTES);
});
