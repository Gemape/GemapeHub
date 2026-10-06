import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fonte = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");

test("Frota, Manutenção, Movimentações e Ocorrências de Veículos têm campo de busca", () => {
  assert.match(fonte("components/modules/FrotaModulo.tsx"), /placeholder="Buscar por descrição ou responsável"/);
  assert.match(fonte("components/modules/FrotaModulo.tsx"), /nomeResponsavel\(v\.empregado_responsavel_id\)/);
  assert.match(fonte("components/modules/ManutencaoVeiculoModulo.tsx"), /combinaBusca\(busca/);
  const mov = fonte("components/modules/MovimentacoesModulo.tsx");
  assert.match(mov, /ehVeiculo && busca\.trim\(\)/);
  assert.match(mov, /visiveis\.map\(/);
  assert.match(fonte("components/modules/OcorrenciasModulo.tsx"), /Buscar por descrição ou responsável/);
});

test("a busca de Movimentações aparece só em Veículos, sem mudar EPI, uniforme e ferramenta", () => {
  assert.match(fonte("components/modules/MovimentacoesModulo.tsx"), /\{ehVeiculo && \(\s*<Input\s+aria-label="Buscar movimentação"/);
});
