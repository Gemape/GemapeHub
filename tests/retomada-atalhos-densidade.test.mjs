import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { periodoDoAtalho } from "../src/lib/periodo-atalho.ts";
import { maisRecenteEmAndamento, quandoComecou } from "../src/lib/lancamento-aberto.ts";

const fonte = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("atalhos de data: hoje, ontem, Nd e mes viram o período exato", () => {
  const hoje = "2026-11-13";
  assert.deepEqual(periodoDoAtalho("hoje", hoje), { inicio: hoje, fim: hoje });
  assert.deepEqual(periodoDoAtalho(" Hoje ", hoje), { inicio: hoje, fim: hoje });
  assert.deepEqual(periodoDoAtalho("ontem", hoje), { inicio: "2026-11-12", fim: "2026-11-12" });
  assert.deepEqual(periodoDoAtalho("7d", hoje), { inicio: "2026-11-07", fim: hoje }, "7 dias com o de hoje");
  assert.deepEqual(periodoDoAtalho("1d", hoje), { inicio: hoje, fim: hoje });
  assert.deepEqual(periodoDoAtalho("mes", hoje), { inicio: "2026-11-01", fim: "2026-11-30" });
  assert.deepEqual(periodoDoAtalho("mês", "2028-02-10"), { inicio: "2028-02-01", fim: "2028-02-29" }, "ano bissexto e acento");
  assert.deepEqual(periodoDoAtalho("30d", "2026-03-05"), { inicio: "2026-02-04", fim: "2026-03-05" }, "atravessa o mês");
});

test("atalhos de data: texto que não é atalho não vira período", () => {
  for (const t of ["", "7", "0d", "366d", "amanha", "d", "-3d", "7 d"]) assert.equal(periodoDoAtalho(t, "2026-11-13"), null, t);
});

test("retomada: diz hoje, ontem ou a data, com a hora de Brasília", () => {
  const agora = new Date("2026-11-13T18:00:00Z"); // 15:00 em Brasília
  assert.equal(quandoComecou("2026-11-13T14:20:00Z", agora), "de hoje às 11:20");
  assert.equal(quandoComecou("2026-11-12T19:05:00Z", agora), "de ontem às 16:05");
  assert.equal(quandoComecou("2026-11-02T12:40:00Z", agora), "de 02/11 às 09:40");
  assert.equal(quandoComecou("lixo", agora), "");
  assert.equal(quandoComecou(null, agora), "");
});

test("retomada: pega o em andamento mais recente e ignora os concluídos", () => {
  const lista = [
    { id: "a", status: "Concluído", criadoEm: "2026-11-13T15:00:00Z" },
    { id: "b", status: "Em andamento", criadoEm: "2026-11-12T10:00:00Z" },
    { id: "c", status: "Em andamento", criadoEm: "2026-11-13T09:00:00Z" },
  ];
  assert.equal(maisRecenteEmAndamento(lista)?.id, "c");
  assert.equal(maisRecenteEmAndamento([lista[0]]), null);
});

test("telas ligadas: banner nos dois check lists, atalho nos filtros de período, X no campo e densidade nas tabelas", () => {
  for (const f of ["src/components/modules/ChecklistVeiculoModulo.tsx", "src/components/modules/equipamento/ChecklistEquipamentoModulo.tsx"]) {
    assert.match(fonte(f), /<BannerLancamentoAberto/, f);
    assert.match(fonte(f), /tela === null &&.*pendente/, f);
  }
  const banner = fonte("src/components/BannerLancamentoAberto.tsx");
  assert.match(banner, /Continuar de onde parou/);
  assert.match(banner, /AlertDialog/, "descartar pede confirmação");
  for (const f of ["AbastecimentoVeiculoModulo", "ExtratoVeiculo", "ExtratoFerramenta", "equipamento/ExtratoEquipamento", "EpiRelatorioFuncionario", "EpiRelatorioBaixa", "EstoqueEpiModulo"]) {
    assert.match(fonte(`src/components/modules/${f}.tsx`), /<AtalhoPeriodo/, f);
  }
  const input = fonte("src/components/ui/input.tsx");
  assert.match(input, /aria-label="Limpar campo"/);
  assert.match(input, /\(buscar\|pesquisar\|filtrar\)/);
  assert.match(fonte("src/components/layout/BarraDeFiltros.tsx"), /data-campo-limpavel/);
  assert.match(fonte("src/components/ui/table.tsx"), /data-densidade=\{densidade\}/);
  for (const f of ["MovimentacoesModulo", "EstoqueModulo", "EstoqueEpiModulo"]) assert.match(fonte(`src/components/modules/${f}.tsx`), /<AlternarDensidade/, f);
});
