import test from "node:test";
import assert from "node:assert/strict";

import { dadosIniciais as base } from "../src/integrations/supabase/demo-client.ts";
import { prepararDadosDeTeste } from "../src/lib/dados-teste/aplicar.ts";
import { lerMotivosDevolucaoEpi } from "../src/lib/epi-parametros.ts";
import { linhasDeEstoqueEpi } from "../src/lib/estoque-epi-visao.ts";
import { minimosDeEpi, saldosDeEpi } from "../src/lib/estoque-epi-saldos.ts";
import * as Gerais from "../src/lib/parametros-base.ts";

const AGORA = new Date("2026-10-22T12:00:00-03:00");
const memoria = () => {
  const m = new Map();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
};
const prontos = () => {
  const s = memoria();
  assert.equal(prepararDadosDeTeste(s, base, AGORA), "aplicado");
  return s;
};
const dados = (s) => JSON.parse(s.getItem("gemape-demo-dados"));
const devolucoes = (d) => d.movimentacoes.filter((m) => m.modulo === "epi" && m.tipo_movimentacao === "Devolucao");

test("toda devolução de EPI dos dados de teste entra como usada, com a compra de origem e um motivo válido", () => {
  const d = dados(prontos());
  const devs = devolucoes(d);
  assert.ok(devs.length >= 15, `há várias devoluções (${devs.length})`);
  const motivos = lerMotivosDevolucaoEpi({ getItem: () => null, setItem: () => undefined });
  for (const m of devs) {
    assert.equal(m.condicao, "usado");
    assert.ok(motivos.includes(m.motivo_devolucao), `motivo ${m.motivo_devolucao}`);
    const compra = d.compras_epis.find((c) => c.id === m.compra_origem_id);
    assert.ok(compra, "a compra de origem existe");
    assert.equal(compra.item_id, m.item_id, "e é do mesmo EPI");
    assert.equal(m.nota_fiscal_origem, compra.nota_fiscal);
    assert.equal(m.data_compra_origem, compra.data_compra);
    assert.equal(m.fornecedor_origem, compra.fornecedor);
    assert.ok(m.ca_origem, "com o CA");
    assert.ok(m.empregado_id && m.responsavel_nome, "feita por um empregado e recebida por um responsável");
  }
});

test("as devoluções se espalham pelas três empresas, por vários EPIs e tamanhos", () => {
  const d = dados(prontos());
  const devs = devolucoes(d);
  assert.equal(new Set(devs.map((m) => m.empresa_id)).size, 3);
  assert.ok(new Set(devs.map((m) => m.item_id)).size >= 8);
  assert.ok(new Set(devs.map((m) => m.tamanho_id)).size >= 3);
  assert.ok(new Set(devs.map((m) => m.motivo_devolucao)).size >= 3);
});

test("a aba Usados do Estoque mostra as devoluções: o total de usados é o que foi devolvido, e os novos não perdem nada", () => {
  const s = prontos();
  const d = dados(s);
  const parametros = Gerais.lerParametros(s);
  const itens = d.epis;
  const linhas = linhasDeEstoqueEpi({
    itens, compras: d.compras_epis, devolucoes: d.movimentacoes.filter((m) => m.modulo === "epi"),
    saldosDe: (id) => saldosDeEpi(parametros, itens.find((i) => i.id === id)),
    minimosDe: (id) => minimosDeEpi(parametros, itens.find((i) => i.id === id)),
    mediaMensalDe: () => 0,
  });
  const usados = linhas.filter((l) => l.condicao === "usado");
  const devolvido = devolucoes(d).reduce((t, m) => t + Number(m.quantidade), 0);
  assert.equal(usados.reduce((t, l) => t + l.disponivel, 0), devolvido);
  assert.ok(usados.every((l) => l.nf && l.fornecedor && l.dataCompra && l.ca), "cada linha usada leva os dados da compra");
  const total = itens.reduce((t, i) => t + Object.values(saldosDeEpi(parametros, i)).reduce((a, v) => a + Math.max(0, v), 0), 0);
  assert.equal(linhas.reduce((t, l) => t + l.disponivel, 0), total, "novos + usados = o estoque");
});

test("os dados de teste trazem ocorrências de EPI, cada uma com empregado, EPI e responsável", () => {
  const d = dados(prontos());
  const ocs = d.ocorrencias.filter((o) => o.tipo_ocorrencia === "EPI" && String(o.id).startsWith("teste-"));
  assert.equal(ocs.length, 8);
  for (const o of ocs) {
    const item = d.epis.find((i) => i.id === o.item_id);
    const empregado = d.empregados.find((e) => e.id === o.empregado_id);
    assert.ok(item && empregado, "o EPI e o empregado existem");
    assert.equal(item.empresa_id, empregado.empresa_id, "o EPI é da empresa do empregado");
    assert.ok(o.descricao_ocorrencia && o.responsavel_registro && o.data && o.hora);
  }
  assert.ok(new Set(ocs.map((o) => o.empresa_id)).size >= 2, "em mais de uma empresa");
});
