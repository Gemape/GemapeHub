import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { alertasDeMinimoEpi, minimosDeEpi, saldosDeEpi } from "../src/lib/estoque-epi-saldos.ts";
import { linhasDeEstoqueEpi } from "../src/lib/estoque-epi-visao.ts";

const ler = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const P = { tamanhos: [], produtoTamanhos: [], subcategorias: [], categorias: [] };
// Produto com três tamanhos: M abaixo do mínimo, G no mínimo, P folgado.
const multi = { id: "i1", codigo_sku: "EPI-1", nome: "Luva", empresa_id: "e1", estoque_atual: 22, estoque_minimo: 12, saldos_tamanho: { M: 2, G: 5, P: 15 }, minimos_tamanho: { M: 5, G: 5, P: 2 } };
const sem = { id: "i2", codigo_sku: "EPI-2", nome: "Capacete", empresa_id: "e1", estoque_atual: 0, estoque_minimo: 0 };

test("a regra única alerta por tamanho: M abaixo e G no mínimo alertam, P folgado não; o total (22 > 12) não esconde nada", () => {
  const a = alertasDeMinimoEpi(P, multi, "epi");
  assert.deepEqual(a.map((x) => [x.chave, x.saldo, x.minimo]), [["M", 2, 5], ["G", 5, 5]]);
});

test("sem mínimo, só o saldo zerado alerta; com saldo e sem mínimo não", () => {
  assert.equal(alertasDeMinimoEpi(P, sem, "epi").length, 1);
  assert.equal(alertasDeMinimoEpi(P, { ...sem, estoque_atual: 3 }, "epi").length, 0);
  assert.equal(alertasDeMinimoEpi(P, { ...sem, estoque_atual: 3, estoque_minimo: 3 }, "epi").length, 1);
});

test("a aba Estoque e a regra única concordam, linha a linha, em quem está em alerta", () => {
  for (const item of [multi, sem, { ...sem, id: "i3", estoque_atual: 4, estoque_minimo: 4 }]) {
    const linhas = linhasDeEstoqueEpi({
      itens: [item], compras: [], devolucoes: [],
      saldosDe: () => saldosDeEpi(P, item), minimosDe: () => minimosDeEpi(P, item), mediaMensalDe: () => 0,
    });
    const daAba = [...new Set(linhas.filter((l) => l.alerta).map((l) => l.tamanhoId ?? "sem-tamanho"))].sort();
    const daRegra = alertasDeMinimoEpi(P, item, "epi").map((a) => a.chave).sort();
    assert.deepEqual(daAba, daRegra, item.nome);
  }
});

test("o botão, o Dashboard e o aviso da Entrega usam a regra única (decisão 417)", () => {
  assert.match(ler("components/modules/SugestaoComprasEpi.tsx"), /alertasDeMinimoEpi\(parametros, item as never, modulo\)/);
  assert.match(ler("routes/_authenticated/dashboard.tsx"), /alertasDeMinimoEpi\(parametros, i as never/);
  assert.match(ler("components/modules/EpiEntrega.tsx"), /alertasDeMinimoEpi\(parametros, item as never, modulo\)/);
  assert.doesNotMatch(ler("routes/_authenticated/dashboard.tsx"), /alertasPorTamanho|usaMinimoPorTamanho/);
});
