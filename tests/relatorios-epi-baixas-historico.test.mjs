import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { precoUnitarioDaBaixa, valorDaBaixa } from "../src/lib/preco-da-baixa.ts";
import { rotuloDaSituacao, situacaoDasEntregas } from "../src/lib/situacao-entregas.ts";

const le = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const compra = (item_id, data_compra, valor_unitario, tamanho_id = null, created_at = "") => ({ item_id, data_compra, valor_unitario, tamanho_id, created_at });
const baixa = (extra = {}) => ({ item_id: "e1", tamanho_id: null, data_movimentacao: "2026-10-25", quantidade: 2, preco_unitario_registrado: null, ...extra });

test("o valor da baixa usa o preço registrado e, sem ele, o da compra mais recente até a data da baixa", () => {
  const compras = [compra("e1", "2026-08-01", 10), compra("e1", "2026-09-10", 12), compra("e1", "2026-11-01", 99), compra("e2", "2026-09-10", 500)];
  assert.equal(precoUnitarioDaBaixa(compras, baixa({ preco_unitario_registrado: 15 })), 15, "o preço registrado vale");
  assert.equal(precoUnitarioDaBaixa(compras, baixa()), 12, "a compra mais recente até a baixa");
  assert.equal(valorDaBaixa(compras, baixa({ quantidade: 3 })), 36);
  assert.equal(precoUnitarioDaBaixa(compras, baixa({ data_movimentacao: "2026-09-10" })), 12, "a compra do próprio dia vale");
  assert.equal(precoUnitarioDaBaixa(compras, baixa({ item_id: "e2" })), 500, "não mistura outro EPI");
});

test("sem compra anterior vale a primeira depois; sem nenhuma compra, zero; o tamanho tem preferência", () => {
  assert.equal(precoUnitarioDaBaixa([compra("e1", "2026-11-01", 20), compra("e1", "2026-12-01", 30)], baixa()), 20);
  assert.equal(precoUnitarioDaBaixa([], baixa()), 0);
  assert.equal(precoUnitarioDaBaixa([compra("e1", "2026-09-01", 0)], baixa()), 0, "compra sem valor não conta");
  assert.equal(precoUnitarioDaBaixa([compra("e1", "2026-09-01", 10, "t40"), compra("e1", "2026-09-02", 14, "t42")], baixa({ tamanho_id: "t40" })), 10);
  assert.equal(precoUnitarioDaBaixa([compra("e1", "2026-09-01", 10, "t40")], baixa({ tamanho_id: "t42" })), 10, "sem compra do tamanho, a do EPI");
  assert.equal(precoUnitarioDaBaixa([compra("e1", "2026-09-01", "12,5".replace(",", "."))], baixa()), 12.5, "valor em texto");
  assert.equal(precoUnitarioDaBaixa([compra("e1", "2026-09-01", 10)], baixa({ item_id: null })), 0);
});

test("o relatório de baixas dá preço às baixas que não o trazem, na tela, na impressão e no CSV", () => {
  const t = le("components/modules/EpiRelatorioBaixa.tsx");
  assert.match(t, /useComprasEpis\(TODAS\)/);
  assert.equal((t.match(/valorDaBaixa\(compras, b\)/g) ?? []).length, 4, "total, PDF, CSV e tabela");
  assert.doesNotMatch(t, /preco_unitario_registrado/);
});

const mov = (id, tipo, quantidade, data, extra = {}) => ({ id, item_id: "e1", tamanho_id: "t40", tipo_movimentacao: tipo, quantidade, motivo_baixa: null, data_movimentacao: data, created_at: id, ...extra });

test("cada entrega mostra o que está em posse, devolvido e baixado, do mais antigo para o mais novo", () => {
  const s = situacaoDasEntregas([
    mov("a", "Saida", 4, "2026-01-10"), mov("b", "Saida", 3, "2026-03-10"),
    mov("c", "Devolucao", 5, "2026-04-01"), mov("d", "Saida", 2, "2026-05-01", { motivo_baixa: "Perda" }),
  ]);
  // A devolução de 5 zera a entrega a (4) e devolve 1 da b; a baixa de 2 sai do que resta da b.
  assert.deepEqual(s.get("a"), { quantidade: 4, devolvido: 4, baixado: 0, emPosse: 0 });
  assert.deepEqual(s.get("b"), { quantidade: 3, devolvido: 1, baixado: 2, emPosse: 0 });
  assert.equal(s.has("c") || s.has("d"), false, "só entregas têm situação");
  assert.equal(rotuloDaSituacao(s.get("a")), "Devolvido");
  assert.equal(rotuloDaSituacao(s.get("b")), "Devolvido e baixado");
});

test("rótulos da situação: em posse, parcial, baixado e sem informação", () => {
  assert.equal(rotuloDaSituacao({ quantidade: 3, devolvido: 0, baixado: 0, emPosse: 3 }), "Em posse");
  assert.equal(rotuloDaSituacao({ quantidade: 3, devolvido: 1, baixado: 0, emPosse: 2 }), "Em posse: 2");
  assert.equal(rotuloDaSituacao({ quantidade: 3, devolvido: 0, baixado: 3, emPosse: 0 }), "Baixado");
  assert.equal(rotuloDaSituacao(undefined), "Em posse");
});

test("devolução e baixa só abatem entregas do mesmo EPI e tamanho; o que passa do que foi entregue é ignorado", () => {
  const s = situacaoDasEntregas([
    mov("a", "Saida", 2, "2026-01-10"), mov("b", "Saida", 2, "2026-01-11", { tamanho_id: "t42" }),
    mov("c", "Devolucao", 1, "2026-02-01", { tamanho_id: "t42" }), mov("d", "Devolucao", 9, "2026-02-02", { tamanho_id: "sem-tamanho" }),
    mov("e", "Saida", 1, "2026-02-03", { item_id: "e2" }),
  ]);
  assert.equal(s.get("a").emPosse, 2, "a devolução do t42 não toca o t40");
  assert.equal(s.get("b").emPosse, 1);
  assert.equal(s.get("e").emPosse, 1, "outro EPI");
  // Devolução "sem-tamanho" não abate entrega com tamanho (é outro grupo) e nada quebra com o excesso.
  assert.equal(s.get("a").devolvido, 0);
});

test("o histórico por empregado lê tudo do empregado, mostra o tipo por extenso e a situação de cada entrega", () => {
  const t = le("components/modules/EpiRelatorioFuncionario.tsx");
  assert.match(t, /queryKey: \["relatorio-funcionario", "epi", empregadoId\]/);
  assert.match(t, /enabled: Boolean\(empregadoId\)/);
  assert.match(t, /lerMovimentacoesRelatorio\(supabase, \{ modulo: "epi", empregadoId \}\)/);
  assert.doesNotMatch(t, /empresaId: empregado\?\.empresa_id/);
  assert.match(t, /rotuloDaSituacao\(situacoes\.get\(h\.id\)\)/);
  assert.equal((t.match(/naturezaMovimentacao\(h\)/g) ?? []).length >= 4, true, "tela, PDF, CSV e busca");
  assert.doesNotMatch(t, /<TableCell>\{h\.tipo_movimentacao\}<\/TableCell>/);
});
