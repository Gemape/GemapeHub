import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  controleDeEstoque, META_COBERTURA_PADRAO, METAS_COBERTURA, sugestoesDeCompra, lerMetaCobertura, salvarMetaCobertura,
} from "../src/lib/epi-controle-estoque.ts";

const HOJE = "2026-04-10";
const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const memoria = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};
const item = (id, nome, atual, minimo) => ({ id, nome, estoque_atual: atual, estoque_minimo: minimo });
const mov = (item_id, tipo, quantidade, data) => ({ item_id, tipo_movimentacao: tipo, quantidade, data_movimentacao: data });

test("médias: mensal = saídas de 30 dias, trimestral = 90 dias ÷ 3, semestral = 180 ÷ 6, anual = 365 ÷ 12", () => {
  const [l] = controleDeEstoque([item("a", "Bota", 0, 0)], [mov("a", "Saida", 1, "2026-04-01")], HOJE);
  assert.equal(l.consumoMensal, 1);
  assert.ok(Math.abs(l.consumoTrimestral - 1 / 3) < 1e-9);
  assert.ok(Math.abs(l.consumoSemestral - 1 / 6) < 1e-9);
  assert.ok(Math.abs(l.consumoAnual - 1 / 12) < 1e-9);
  // Saída mais antiga entra só nas janelas maiores.
  const [m] = controleDeEstoque([item("a", "Bota", 0, 0)], [mov("a", "Saida", 6, "2025-12-01")], HOJE);
  assert.deepEqual([m.consumoMensal, m.consumoTrimestral, m.consumoSemestral, m.consumoAnual], [0, 0, 1, 0.5]);
  const [n] = controleDeEstoque([item("a", "Bota", 0, 0)], [mov("a", "Saida", 6, "2024-01-01")], HOJE);
  assert.equal(n.consumoAnual, 0);
});

test("cobertura em dias = estoque ÷ (média anual ÷ 30); sem consumo vira null", () => {
  const [l] = controleDeEstoque([item("a", "Bota", -1, 0)], [mov("a", "Saida", 2, "2026-03-01")], HOJE);
  assert.equal(l.cobertura, -180);
  const [m] = controleDeEstoque([item("a", "Luva", 2, 0)], [mov("a", "Saida", 8, "2026-03-01")], HOJE);
  assert.equal(m.cobertura, 90);
  assert.equal(controleDeEstoque([item("a", "Sem giro", 4, 2)], [], HOJE)[0].cobertura, null);
});

test("últimas e penúltimas entradas e saídas, por data", () => {
  const [l] = controleDeEstoque([item("a", "Capacete", 5, 1)], [
    mov("a", "Entrada", 10, "2026-01-05"), mov("a", "Entrada", 4, "2026-03-20"), mov("a", "Entrada", 2, "2025-11-01"),
    mov("a", "Saida", 1, "2026-02-02"), mov("a", "Devolucao", 1, "2026-03-30"),
  ], HOJE);
  assert.deepEqual([l.ultimaEntrada, l.penultimaEntrada], ["2026-03-20", "2026-01-05"]);
  assert.deepEqual([l.ultimaSaida, l.penultimaSaida], ["2026-02-02", null]);
});

test("sugestão de compras: o exemplo da planilha (meta 120 dias)", () => {
  const itens = [item("n37", "Bota N.37", -1, 0), item("gg", "Luva GG", 2, 0), item("mat", "Bota mateiro", 0, 1), item("ok", "Colete", 50, 1), item("n41", "Bota N.41", 0, 0)];
  const movs = [mov("n37", "Saida", 2, "2026-03-01"), mov("gg", "Saida", 8, "2026-03-01"), mov("ok", "Saida", 1, "2026-03-01"), mov("n41", "Saida", 1, "2026-03-01")];
  const s = sugestoesDeCompra(controleDeEstoque(itens, movs, HOJE), 120);
  const por = (id) => s.find((x) => x.itemId === id);
  assert.equal(por("n37").quantidade, 2);
  assert.equal(por("n37").prioridade, "1-URGENTE");
  assert.equal(por("n37").observacao, "Abaixo do estoque crítico. Cobertura abaixo da meta (-150%).");
  assert.equal(por("gg").quantidade, 1);
  assert.equal(por("gg").prioridade, "4-BAIXA");
  assert.equal(por("gg").observacao, "Cobertura abaixo da meta (75%).");
  assert.equal(por("mat").quantidade, 1);
  assert.equal(por("mat").prioridade, "1-URGENTE");
  assert.equal(por("mat").observacao, "Abaixo do estoque crítico. Sem consumo no último ano.");
  assert.equal(por("n41").quantidade, 1);
  assert.equal(por("n41").observacao, "Cobertura abaixo da meta (0%).");
  assert.equal(por("ok"), undefined, "cobertura acima da meta e acima do crítico não entra");
});

test("abaixo do crítico soma o aviso e a prioridade sobe; prioridades por faixa de cobertura da meta", () => {
  const base = (atual, saidas) => sugestoesDeCompra(controleDeEstoque([item("a", "X", atual, 1)], [mov("a", "Saida", saidas, "2026-03-01")], HOJE), 120)[0];
  assert.equal(base(0, 12).observacao, "Abaixo do estoque crítico. Cobertura abaixo da meta (0%).");
  // média anual 1/mês: cobertura = estoque × 30 dias; meta 120 → estoque 1 = 25%, 2 = 50%, 3 = 75%
  assert.equal(base(1, 12).prioridade, "2-ALTA");
  assert.equal(base(2, 12).prioridade, "3-MÉDIA");
  assert.equal(base(3, 12).prioridade, "4-BAIXA");
  assert.equal(base(4, 12), undefined, "100% da meta: não precisa comprar");
});

test("meta de cobertura: 30, 60, 90, 120 ou 180 dias; padrão 120; lixo salvo volta ao padrão", () => {
  assert.deepEqual([...METAS_COBERTURA], [30, 60, 90, 120, 180]);
  const s = memoria();
  assert.equal(lerMetaCobertura(s), META_COBERTURA_PADRAO);
  salvarMetaCobertura(90, s);
  assert.equal(lerMetaCobertura(s), 90);
  assert.throws(() => salvarMetaCobertura(45, s), /30, 60, 90, 120 ou 180/);
  s.setItem("gemape-demo-epi-meta-cobertura", "abc");
  assert.equal(lerMetaCobertura(s), META_COBERTURA_PADRAO);
});

test("as telas: estoque detalhado na aba Estoque e sugestão de compras na aba Compras, só do módulo de EPIs", () => {
  assert.match(ler("components/modules/EstoqueModulo.tsx"), /modulo === 'epi' && <EpiControleEstoque/);
  assert.match(ler("components/modules/EpiComprasModulo.tsx"), /<EpiSugestaoCompras/);
  const tela = ler("components/modules/EpiControleEstoque.tsx");
  for (const t of ["Média mensal", "Média trimestral", "Média semestral", "Média anual", "Última entrada", "Penúltima entrada", "Última saída", "Penúltima saída", "Cobertura \\(dias\\)"]) assert.match(tela, new RegExp(t));
  const sug = ler("components/modules/EpiSugestaoCompras.tsx");
  for (const t of ["Quantidade sugerida", "Prioridade", "Observação", "Meta de cobertura"]) assert.match(sug, new RegExp(t));
  assert.doesNotMatch(tela + sug, /dangerouslySetInnerHTML|innerHTML/);
});
