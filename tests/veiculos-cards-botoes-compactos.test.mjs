import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const le = (c) => readFileSync(new URL(`../src/components/modules/${c}`, import.meta.url), "utf8");
const GRADE = /<GradeDeCartoes colunas=\{4\}/;

test("os cards de Ocorrências usam a grade padrão de cartões (decisão 375), compactos; os de Manutenção seguem o padrão da Frota (decisão 404)", () => {
  const o = le("CartoesOcorrencias.tsx");
  assert.match(o, GRADE);
  assert.doesNotMatch(o, /lg:grid-cols-3|sm:grid-cols-2"/, "CartoesOcorrencias.tsx não estica em colunas de largura total");
  assert.equal((o.match(/compacto/g) ?? []).length, 2);
  const m = le("CartoesManutencao.tsx");
  assert.equal((m.match(/compacto/g) ?? []).length, 3, "os três cards são compactos");
  assert.match(m, /\{graficos\}/, "os gráficos ficam ao lado dos cards");
});

test("os botões azuis de Manutenção e de Ocorrências são compactos, arredondados e ficam numa linha só, à esquerda", () => {
  const m = le("ManutencaoVeiculoModulo.tsx");
  assert.match(m, /<section className="flex flex-wrap items-center gap-2" aria-label="Listas de manutenção">/);
  assert.match(m, /const botaoCadastrar = <Button requiresWrite size="sm" className="rounded-full px-4"/);
  assert.equal((m.match(/size="sm" className="rounded-full px-4"/g) ?? []).length >= 3, true);
  const o = le("OcorrenciasVeiculoModulo.tsx");
  assert.match(o, /<section className="flex flex-wrap items-center gap-2" aria-label="Ocorrências">/);
  assert.match(o, /size="sm" className="rounded-full px-4" aria-label/);
  assert.match(o, /<Button requiresWrite="operar" size="sm" className="rounded-full px-4" onClick=\{abrirNova\}>Nova ocorrência<\/Button>/);
  // Os botões não voltam a empilhar em coluna.
  assert.doesNotMatch(m + o, /flex flex-col items-end gap-2/);
});

test("os botões das listas seguem o mesmo estilo do painel: Nova ocorrência e Voltar ao painel também compactos e arredondados", () => {
  const o = le("OcorrenciasVeiculoModulo.tsx");
  // Todo botão Nova ocorrência da tela (painel e lista) é compacto e arredondado.
  const novas = o.match(/<Button requiresWrite="operar"[^>]*onClick=\{abrirNova\}>Nova ocorrência<\/Button>/g) ?? [];
  assert.equal(novas.length, 2);
  for (const b of novas) assert.match(b, /size="sm" className="rounded-full px-4"/);
  assert.match(o, /variant="outline" size="sm" className="order-first rounded-full" onClick=\{\(\) => setVerLista\(false\)\}/);
  assert.match(le("ManutencaoVeiculoModulo.tsx"), /variant="outline" size="sm" className="rounded-full" onClick=\{\(\) => setAba\("painel"\)\}/);
});
