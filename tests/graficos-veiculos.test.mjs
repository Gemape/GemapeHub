import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  contagemPorMes,
  mesesRecentes,
  placaDoRotulo,
  rotuloMesCurto,
} from "../src/lib/graficos-veiculos.ts";

const ler = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");

test("meses recentes: os seis últimos, do mais antigo ao do mês atual, passando de um ano para o outro", () => {
  assert.deepEqual(mesesRecentes("2026-10-29"), [
    "2026-05",
    "2026-06",
    "2026-07",
    "2026-08",
    "2026-09",
    "2026-10",
  ]);
  assert.deepEqual(mesesRecentes("2026-02-10", 4), ["2025-11", "2025-12", "2026-01", "2026-02"]);
  assert.equal(rotuloMesCurto("2026-10"), "out/26");
});

test("contagem por mês: datas com ou sem hora entram no mês certo e as de fora da janela ficam de fora", () => {
  const linhas = contagemPorMes(
    { preventivas: ["2026-10-01", "2026-10-20T10:00", "2026-04-30"], corretivas: ["2026-09-12"] },
    "2026-10-29",
  );
  const out = linhas.find((l) => l.mes === "2026-10");
  const set = linhas.find((l) => l.mes === "2026-09");
  assert.deepEqual(
    [out.preventivas, out.corretivas, set.preventivas, set.corretivas],
    [2, 0, 0, 1],
  );
  assert.equal(linhas.length, 6);
  assert.equal(
    linhas.reduce((t, l) => t + l.preventivas, 0),
    2,
    "abril não está nos seis meses",
  );
});

test("placa do rótulo do veículo", () => {
  assert.equal(placaDoRotulo("TST1A23 · Utilitário · Fiat · Strada"), "TST1A23");
  assert.equal(placaDoRotulo("Sem separador"), "Sem separador");
});

test("as telas de Veículos têm os gráficos comparativos abaixo dos cards, e todo indicador usa o mesmo card (decisões 324 e 325)", () => {
  assert.match(
    ler("components/modules/FrotaModulo.tsx"),
    /<CartoesIndicadoresFrota\s+indicadores=\{indicadores\}\s+cpk=\{cpk\}\s+custoPreventivo=\{custoPreventivo\}\s+graficos=\{<GraficosFrota compacto /,
  );
  assert.match(
    ler("components/modules/ManutencaoVeiculoModulo.tsx"),
    /<CartoesManutencao indicadores=\{indicadores\} \/>\s*<GraficosManutencao /,
  );
  assert.match(
    ler("components/modules/OcorrenciasVeiculoModulo.tsx"),
    /<CartoesOcorrencias indicadores=\{indicadores\} \/>\s*<GraficosOcorrencias /,
  );
  assert.match(
    ler("components/modules/ChecklistResultadosPainel.tsx"),
    /<GraficosChecklist linhas=\{linhas\} grupoDe=\{grupoDe\} compacto \/>/,
  );
  assert.match(ler("components/StatCard.tsx"), /<Cartao titulo=\{titulo\}/);
  assert.match(ler("components/modules/ViagensPainel.tsx"), /return <Cartao titulo=\{titulo\}/);
});
