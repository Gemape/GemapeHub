import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// As telas rodam no fuso do Brasil: no fim da noite, o UTC já é o dia seguinte.
process.env.TZ = "America/Sao_Paulo";
const { diasAtrasLocal, primeiroDiaDoMesLocal } = await import("../src/lib/datas-locais.ts");
const { hojeLocal } = await import("../src/lib/empregados.ts");

const noiteDoUltimoDia = new Date("2026-09-30T23:30:00-03:00");

test("hoje às 23:30 de Brasília ainda é o mesmo dia", () => {
  assert.equal(hojeLocal(noiteDoUltimoDia), "2026-09-30");
});

test("o primeiro dia do mês segue o calendário local", () => {
  assert.equal(primeiroDiaDoMesLocal(noiteDoUltimoDia), "2026-09-01");
  assert.equal(primeiroDiaDoMesLocal(new Date("2026-10-01T00:10:00-03:00")), "2026-10-01");
});

test("30 dias atrás conta a partir do dia local", () => {
  assert.equal(diasAtrasLocal(30, noiteDoUltimoDia), "2026-08-31");
  assert.equal(diasAtrasLocal(0, noiteDoUltimoDia), "2026-09-30");
});

test("as datas padrão das telas não usam mais o dia em UTC", () => {
  for (const arquivo of [
    "src/components/modules/EpiComprasModulo.tsx",
    "src/components/modules/UniformesComprasModulo.tsx",
    "src/components/modules/FerramentasTermoVistoria.tsx",
    "src/components/modules/EpiRelatorioBaixa.tsx",
    "src/components/modules/UniformesRelatorioBaixa.tsx",
    "src/components/modules/OcorrenciasModulo.tsx",
    "src/routes/_authenticated/relatorios.tsx",
  ]) {
    const codigo = readFileSync(new URL(`../${arquivo}`, import.meta.url), "utf8");
    assert.equal(codigo.includes("toISOString().slice(0, 10)"), false, arquivo);
  }
});
