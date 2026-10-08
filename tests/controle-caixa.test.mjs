import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  movimentacoesDaCaixa,
  caixaDaUltimaEntrega,
  controleDaFerramenta,
  disponivelNaCaixa,
  linhaCsvCaixa,
} from "../src/lib/controle-caixa.ts";

const mov = (o) => ({ modulo: "ferramenta", tipo_movimentacao: "Saida", item_id: "f1", empregado_id: "e1", motivo_baixa: "Fornecimento ao Empregado", quantidade: 1, data_movimentacao: "2026-10-01", observacao: null, ...o });

test("movimentacoesDaCaixa usa a caixa gravada e, sem caixa, as ferramentas cadastradas nela", () => {
  const lista = [
    mov({ id: "a", item_id: "f2" }),
    mov({ id: "b", item_id: "f9" }),
    mov({ id: "c", modulo: "epi", item_id: "f1" }),
    mov({ id: "d", item_id: "f1", caixa_id: "cx1" }),
    mov({ id: "e", item_id: "f1", caixa_id: "cx2" }),
    mov({ id: "f", item_id: "f9", caixa_id: "cx1" }),
  ];
  assert.deepEqual(movimentacoesDaCaixa(lista, "cx1", ["f1", "f2"]).map((m) => m.id), ["a", "d", "f"]);
  assert.deepEqual(movimentacoesDaCaixa(lista, "cx2", ["f1"]).map((m) => m.id), ["e"]);
});

test("caixaDaUltimaEntrega devolve a caixa da entrega mais recente do empregado, ignorando baixa e outras pessoas", () => {
  const lista = [
    mov({ caixa_id: "cx1", data_movimentacao: "2026-10-01" }),
    mov({ caixa_id: "cx2", data_movimentacao: "2026-10-05" }),
    mov({ caixa_id: "cx3", data_movimentacao: "2026-10-09", motivo_baixa: "Quebra" }),
    mov({ caixa_id: "cx4", data_movimentacao: "2026-10-09", empregado_id: "e2" }),
    mov({ caixa_id: null, data_movimentacao: "2026-10-10" }),
  ];
  assert.equal(caixaDaUltimaEntrega(lista, "e1", "f1"), "cx2");
  assert.equal(caixaDaUltimaEntrega(lista, "e1", "outra"), null);
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

test("entrega, vistoria e devolução gravam a caixa só no modo demonstração (decisão 103)", () => {
  const ler = (n) => readFileSync(new URL(`../src/components/modules/${n}.tsx`, import.meta.url), "utf8");
  assert.match(ler("FerramentasTermoResponsabilidade"), /\.\.\.\(MODO_DEMO \? \{ caixa_id: caixaSel \|\| null \} : \{\}\)/);
  assert.match(ler("FerramentasTermoVistoria"), /\.\.\.\(MODO_DEMO \? \{ caixa_id: caixaSel \|\| null \} : \{\}\)/);
  const enc = ler("FerramentasTermoEncerramento");
  assert.match(enc, /caixaDaUltimaEntrega\(entregas, empregadoId, item\.item_id\)/);
  assert.match(enc, /MODO_DEMO \? \{ caixa_id:/);
});

test("a tela Número da caixa mostra controle por ferramenta e histórico de movimentações (decisão 101)", () => {
  const f = readFileSync(new URL("../src/components/modules/FerramentasCaixasModulo.tsx", import.meta.url), "utf8");
  assert.match(f, /lerMovimentacoesRelatorio\(supabase, \{ modulo: "ferramenta"/);
  assert.match(f, /movimentacoesDaCaixa\(movimentacoes, caixa\.id,/);
  assert.match(f, /controleDaFerramenta\(historico,/);
  assert.match(f, /controleDaFerramenta\(/);
  for (const c of ["Com empregado", "Disponível", "Histórico de movimentações"]) assert.ok(f.includes(c), c);
});
