import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ler = (a) => readFileSync(new URL(`../src/${a}`, import.meta.url), "utf8");

test("o botão padrão das listas tem Clonar, Editar e Excluir, nessa ordem, e Excluir só do Administrador (decisão 45)", () => {
  const acoes = ler("components/parametros/AcoesLinha.tsx");
  const c = acoes.indexOf('rotulo: "Clonar" as const');
  const e = acoes.indexOf('rotulo: "Editar" as const');
  const x = acoes.indexOf('rotulo: "Excluir" as const');
  assert.ok(c > 0 && c < e && e < x);
  assert.match(acoes, /onExcluir && canDelete && canWrite/);
});

test("menos ruído na linha: Editar à vista e as ações raras (Clonar, Excluir) no menu ⋮", () => {
  const acoes = ler("components/parametros/AcoesLinha.tsx");
  assert.match(acoes, /acoes\.find\(\(a\) => a\.rotulo === "Editar"\)/);
  assert.match(acoes, /aria-label=\{`Mais ações de \$\{rotulo\}`\}/);
  assert.match(acoes, /<DropdownMenu modal=\{false\}>/);
  assert.match(acoes, /onClonar && canWrite/, "sem permissão de escrita, Clonar não aparece");
  assert.match(acoes, /onEditar && \(editarLivre \|\| canWrite\)/, "quem só lê ainda abre o registro quando editarLivre");
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
