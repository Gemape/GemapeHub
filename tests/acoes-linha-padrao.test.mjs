import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ler = (a) => readFileSync(new URL(`../src/${a}`, import.meta.url), "utf8");

test("o botão padrão das listas tem Clonar, Editar e Excluir, nessa ordem, e Excluir só do Administrador (decisão 45)", () => {
  const acoes = ler("components/parametros/AcoesLinha.tsx");
  const c = acoes.indexOf("Clonar\n");
  const e = acoes.indexOf("Editar\n");
  const x = acoes.indexOf("Excluir\n");
  assert.ok(c > 0 && c < e && e < x);
  assert.match(acoes, /onExcluir && isAdmin/);
});

test("Cadastrar EPI usa o botão padrão com os três botões", () => {
  const epi = ler("components/modules/CadastroEpi.tsx");
  assert.match(epi, /<AcoesLinha[\s\S]*onClonar=[\s\S]*onEditar=[\s\S]*onExcluir=/);
  assert.match(epi, /rpc\([\s\S]*p_id/);
});

test("o diálogo de editar EPI é irmão do de clonar, não está dentro dele", () => {
  const epi = ler("components/modules/CadastroEpi.tsx");
  const clonar = epi.indexOf("<Dialog open={!!clonando}");
  const editar = epi.indexOf("<Dialog open={editando !== null}");
  assert.ok(editar > 0 && clonar > 0 && editar < clonar);
  assert.match(epi.slice(editar, clonar), /<\/Dialog>\s*$/);
});
