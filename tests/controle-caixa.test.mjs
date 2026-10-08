import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  movimentacoesDaCaixa,
  controleDaFerramenta,
  disponivelNaCaixa,
  linhaCsvCaixa,
} from "../src/lib/controle-caixa.ts";

const mov = (o) => ({ modulo: "ferramenta", tipo_movimentacao: "Saida", item_id: "f1", empregado_id: "e1", motivo_baixa: "Fornecimento ao Empregado", quantidade: 1, data_movimentacao: "2026-10-01", observacao: null, ...o });

test("movimentacoesDaCaixa mantém só ferramentas da caixa e a ordem recebida", () => {
  const lista = [mov({ id: "a", item_id: "f2" }), mov({ id: "b", item_id: "f9" }), mov({ id: "c", modulo: "epi", item_id: "f1" }), mov({ id: "d", item_id: "f1" })];
  assert.deepEqual(movimentacoesDaCaixa(lista, ["f1", "f2"]).map((m) => m.id), ["a", "d"]);
});

test("controleDaFerramenta soma entregas, devoluções e baixas e não fica negativo", () => {
  const lista = [
    mov({ quantidade: 3 }),
    mov({ tipo_movimentacao: "Devolucao", motivo_baixa: null, quantidade: 1 }),
    mov({ motivo_baixa: "Quebra", quantidade: 1 }),
    mov({ item_id: "outra", quantidade: 9 }),
  ];
  assert.deepEqual(controleDaFerramenta(lista, "f1"), { entregue: 3, devolvido: 1, baixado: 1, comEmpregado: 1 });
  assert.equal(controleDaFerramenta([mov({ tipo_movimentacao: "Devolucao", quantidade: 5 })], "f1").comEmpregado, 0);
});

test("disponivelNaCaixa desconta o que está com empregados, sem ficar negativo", () => {
  assert.equal(disponivelNaCaixa(5, 2), 3);
  assert.equal(disponivelNaCaixa(1, 4), 0);
});

test("linhaCsvCaixa traz caixa, código, ferramenta e empregado", () => {
  const linha = linhaCsvCaixa(mov({ quantidade: 2 }), {
    caixa: "CX-0001",
    ferramentas: [{ id: "f1", codigo_sku: "FER-0001", nome: "Martelo" }],
    nomeEmpregado: () => "Ana",
  });
  assert.equal(linha.Caixa, "CX-0001");
  assert.equal(linha.Codigo, "FER-0001");
  assert.equal(linha.Ferramenta, "Martelo");
  assert.equal(linha.Empregado, "Ana");
  assert.equal(linha.Tipo, "Saída (entrega)");
});

test("a tela Número da caixa mostra controle por ferramenta e histórico de movimentações (decisão 101)", () => {
  const f = readFileSync(new URL("../src/components/modules/FerramentasCaixasModulo.tsx", import.meta.url), "utf8");
  assert.match(f, /lerMovimentacoesRelatorio\(supabase, \{ modulo: "ferramenta"/);
  assert.match(f, /movimentacoesDaCaixa\(/);
  assert.match(f, /controleDaFerramenta\(/);
  for (const c of ["Com empregado", "Disponível", "Histórico de movimentações"]) assert.ok(f.includes(c), c);
});
