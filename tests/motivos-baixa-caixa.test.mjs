import test from "node:test";
import assert from "node:assert/strict";
import { MOTIVOS_BAIXA_CAIXA, validarBaixaDaCaixa } from "../src/lib/controle-caixa.ts";
import { ehBaixa } from "../src/lib/historico-movimentacoes.ts";

test("motivos da baixa pela caixa incluem Devolução e não incluem Fornecimento ao Empregado", () => {
  assert.ok(MOTIVOS_BAIXA_CAIXA.includes("Devolução"));
  assert.ok(!MOTIVOS_BAIXA_CAIXA.includes("Fornecimento ao Empregado"));
  for (const m of ["Desligamento", "Desgaste Natural", "Quebra", "Desaparecimento", "Perda", "Mau Uso"]) assert.ok(MOTIVOS_BAIXA_CAIXA.includes(m));
});

test("baixa com motivo Devolução é validada e contada como baixa", () => {
  const dados = { ferramentaId: "f", quantidade: 1, motivo: "Devolução", data: "2026-10-16", disponivel: 1, comEmpregado: 0, empregadoId: null };
  assert.equal(validarBaixaDaCaixa(dados), null);
  assert.equal(ehBaixa({ tipo_movimentacao: "Saida", motivo_baixa: "Devolução" }), true);
});
