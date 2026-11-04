import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const le = (c) => readFileSync(new URL(`../src/components/modules/${c}`, import.meta.url), "utf8");
const GRADE = /grid justify-start gap-3 \[grid-template-columns:repeat\(auto-fill,minmax\(min\(15rem,100%\),18rem\)\)\]/;

test("os cards de Manutenção e de Ocorrências têm largura limitada, alinhados à esquerda, e compactos", () => {
  for (const f of ["CartoesManutencao.tsx", "CartoesOcorrencias.tsx"]) {
    const t = le(f);
    assert.match(t, GRADE, f);
    assert.doesNotMatch(t, /lg:grid-cols-3|sm:grid-cols-2"/, `${f} não estica em colunas de largura total`);
  }
  assert.equal((le("CartoesOcorrencias.tsx").match(/compacto/g) ?? []).length, 2);
});

test("os botões azuis de Manutenção e de Ocorrências são compactos, arredondados e ficam numa linha só, à direita", () => {
  const m = le("ManutencaoVeiculoModulo.tsx");
  assert.match(m, /<section className="flex flex-wrap items-center justify-end gap-2" aria-label="Listas de manutenção">/);
  assert.match(m, /const botaoCadastrar = <Button requiresWrite size="sm" className="rounded-full px-4"/);
  assert.equal((m.match(/size="sm" className="rounded-full px-4"/g) ?? []).length >= 3, true);
  const o = le("OcorrenciasVeiculoModulo.tsx");
  assert.match(o, /<section className="flex flex-wrap items-center justify-end gap-2" aria-label="Ocorrências">/);
  assert.match(o, /size="sm" className="rounded-full px-4" aria-label/);
  assert.match(o, /<Button requiresWrite="operar" size="sm" className="rounded-full px-4" onClick=\{abrirNova\}>Nova ocorrência<\/Button>/);
  // Os botões não voltam a empilhar em coluna.
  assert.doesNotMatch(m + o, /flex flex-col items-end gap-2/);
});
