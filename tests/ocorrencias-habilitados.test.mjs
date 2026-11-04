import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const le = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");

test("nas Ocorrências de EPI e de Uniformes só os habilitados aparecem; Ferramentas e Veículos oferecem todos os ativos", () => {
  const t = le("components/modules/OcorrenciasModulo.tsx");
  assert.match(t, /modulo === "epi" \? soEmpregadosDeEpi\(empregados\) : modulo === "uniforme" \? soEmpregadosDeUniforme\(empregados\) : empregados/);
  assert.match(t, /\{elegiveis\.map\(\(e\) => \(/);
  assert.doesNotMatch(t, /\{empregados\.map\(\(e\) => \(/, "a lista não volta a usar todos os ativos");
});

test("editar uma ocorrência mantém visível o empregado vinculado, inativo ou fora dos habilitados", () => {
  const t = le("components/modules/OcorrenciasModulo.tsx");
  assert.match(t, /!elegiveis\.some\(\(a\) => a\.id === e\.id\)/);
  assert.match(t, /"não habilitado" : "inativo"/);
});

test("a tela de habilitados do EPI lista as rotinas em que o filtro vale, inclusive as Ocorrências", () => {
  const t = le("components/parametros/HabilitarEmpregadosEpi.tsx");
  assert.match(t, /Na Entrega EPI, no Termo de Entrega, na Ficha avulsa, na devolução e nas Ocorrências só aparecem os habilitados/);
  assert.match(t, /Os relatórios e a baixa definitiva mostram todos/);
});

test("o aviso de repetição do cartão de lista concorda com o gênero: Este motivo, Esta área", () => {
  const c = le("components/parametros/CartaoDeMotivos.tsx");
  assert.match(c, /\$\{feminino \? "Esta" : "Este"\} \$\{singular\} já está na lista/);
  assert.match(le("components/parametros/ParametrosUniforme.tsx"), /singular="área"\s+feminino/);
  assert.match(le("components/parametros/ParametrosEpi.tsx"), /singular="área"\s+feminino/);
});
