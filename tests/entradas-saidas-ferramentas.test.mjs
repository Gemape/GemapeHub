import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { filtrarEntradasSaidas, linhasEntradasSaidas, resumoEntradasSaidas } from "../src/lib/entradas-saidas-ferramentas.ts";

const le = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const m = (id, extra) => ({ id, modulo: "ferramenta", item_id: "f1", empresa_id: "emp1", empregado_id: null, tipo_movimentacao: "Entrada", motivo_baixa: null, quantidade: 1, data_movimentacao: "2026-11-01", observacao: null, ...extra });

const movimentos = [
  m("a", { quantidade: 10 }),
  m("b", { tipo_movimentacao: "Saida", motivo_baixa: "Fornecimento ao Empregado", empregado_id: "e1", caixa_id: "c1", data_movimentacao: "2026-11-02", quantidade: 2 }),
  m("c", { tipo_movimentacao: "Devolucao", empregado_id: "e1", caixa_id: "c1", data_movimentacao: "2026-11-03", motivo_devolucao: "Fim do serviço" }),
  m("d", { tipo_movimentacao: "Saida", motivo_baixa: "Quebra", empregado_id: "e1", data_movimentacao: "2026-11-04" }),
  m("e", { tipo_movimentacao: "Saida", motivo_baixa: "Perda", data_movimentacao: "2026-11-05", quantidade: 3 }),
  m("f", { tipo_movimentacao: "Transferencia", data_movimentacao: "2026-11-06" }),
  m("g", { modulo: "epi", tipo_movimentacao: "Entrada" }),
];

test("compra e devolução são entradas; entrega e baixa são saídas com o motivo; transferência e outro módulo ficam de fora", () => {
  const l = linhasEntradasSaidas(movimentos);
  assert.deepEqual(l.map((x) => x.chave), ["e", "d", "c", "b", "a"], "mais recente primeiro");
  const por = Object.fromEntries(l.map((x) => [x.chave, x]));
  assert.deepEqual([por.a.sentido, por.a.natureza], ["Entrada", "Compra"]);
  assert.deepEqual([por.b.sentido, por.b.natureza, por.b.motivo], ["Saída", "Entrega ao empregado", "Fornecimento ao Empregado"]);
  assert.deepEqual([por.c.sentido, por.c.natureza, por.c.motivo], ["Entrada", "Devolução do empregado", "Fim do serviço"]);
  assert.deepEqual([por.d.sentido, por.d.natureza, por.d.motivo], ["Saída", "Baixa", "Quebra"]);
});

test("a baixa sem caixa gravada usa a caixa da última entrega ao empregado; sem empregado fica sem caixa", () => {
  const por = Object.fromEntries(linhasEntradasSaidas(movimentos).map((x) => [x.chave, x]));
  assert.equal(por.d.caixaId, "c1");
  assert.equal(por.e.caixaId, null);
  assert.equal(por.a.caixaId, null);
});

test("filtros por movimento, caixa, empregado e motivo", () => {
  const l = linhasEntradasSaidas(movimentos);
  assert.deepEqual(filtrarEntradasSaidas(l, { sentido: "Saída" }).map((x) => x.chave), ["e", "d", "b"]);
  assert.deepEqual(filtrarEntradasSaidas(l, { caixaId: "c1" }).map((x) => x.chave), ["d", "c", "b"]);
  assert.deepEqual(filtrarEntradasSaidas(l, { empregadoId: "e1", motivo: "Quebra" }).map((x) => x.chave), ["d"]);
});

test("o resumo soma entradas, saídas e as saídas por motivo, maior primeiro", () => {
  const r = resumoEntradasSaidas(linhasEntradasSaidas(movimentos));
  assert.equal(r.entradas, 11);
  assert.equal(r.saidas, 6);
  assert.deepEqual(r.saidasPorMotivo, [["Perda", 3], ["Fornecimento ao Empregado", 2], ["Quebra", 1]]);
});

test("o Estoque das ferramentas não mostra mais entradas, baixas nem extrato; o relatório está em Relatórios", async () => {
  const estoque = le("src/components/modules/EstoqueModulo.tsx");
  assert.doesNotMatch(estoque, /<TableHead[^>]*>(Entradas|Baixas)<|\.entradas|\.baixas|ExtratoFerramenta|setExtrato/);
  const { ABAS_FERRAMENTA_RELATORIOS, abaDoModulo } = await import("../src/lib/menu-parametros.ts");
  assert.ok(ABAS_FERRAMENTA_RELATORIOS.some((a) => a.aba === "entradas-saidas"));
  assert.equal(abaDoModulo("ferramenta", "entradas-saidas"), "entradas-saidas");
  assert.match(le("src/components/modules/PaginaModulo.tsx"), /value="entradas-saidas"[\s\S]*<FerramentasEntradasSaidas \/>/);
  const tela = le("src/components/modules/FerramentasEntradasSaidas.tsx");
  for (const t of ["Caixa", "Empregado", "Motivo", "Saídas por motivo"]) assert.match(tela, new RegExp(t));
});
