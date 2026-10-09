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

test("Clonar EPI abre o formulário de novo preenchido com todos os dados da origem (dec 138)", () => {
  const epi = ler("components/modules/CadastroEpi.tsx");
  assert.doesNotMatch(epi, /<Dialog open=\{!!clonando\}/); // sem a janela curta: é o próprio formulário Novo, preenchido
  assert.match(epi, /defaultValue=\{clonando\?\.nome \?\? ""\}/);
  assert.match(epi, /defaultValue=\{clonando\?\.estoque_minimo \?\? ""\}/);
  assert.match(epi, /clonando: !!clonando/);
  const editar = epi.indexOf("<Dialog open={editando !== null}");
  assert.ok(editar > epi.indexOf("<Dialog open={novoAberto}"));
});
