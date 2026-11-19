import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compraOriginalDaFerramenta, erroDaEntradaUsada, ferramentasDoEmpregado } from "../src/lib/entrada-usada-ferramenta.ts";

const mov = (o) => ({ modulo: "ferramenta", item_id: "f1", empregado_id: null, tipo_movimentacao: "Entrada", motivo_baixa: null, quantidade: 1, data_movimentacao: "2026-01-10", ...o });

test("lista só as ferramentas das caixas em que o empregado é o portador ativo, menos o que já saiu por baixa", () => {
  const portadores = [{ caixa_id: "c1", empregado_id: "e1", status: "Ativa" }, { caixa_id: "c2", empregado_id: "e1", status: "Inativa" }, { caixa_id: "c3", empregado_id: "e2", status: "Ativa" }];
  const itens = [{ caixa_id: "c1", ferramenta_id: "f1", quantidade: 3 }, { caixa_id: "c2", ferramenta_id: "f2", quantidade: 1 }, { caixa_id: "c3", ferramenta_id: "f3", quantidade: 1 }];
  const baixa = mov({ tipo_movimentacao: "Saida", motivo_baixa: "Perda", quantidade: 1, caixa_id: "c1" });
  assert.deepEqual(ferramentasDoEmpregado("e1", portadores, itens, [baixa]), [{ caixaId: "c1", ferramentaId: "f1", disponivel: 2 }]);
  assert.deepEqual(ferramentasDoEmpregado("e9", portadores, itens, []), []);
});

test("a devolução herda fornecedor, nota, data e custo da entrada mais recente com valor", () => {
  const compras = [
    mov({ fornecedor: "A", nota_fiscal: "1", valor_unitario: 10, data_movimentacao: "2026-01-10" }),
    mov({ fornecedor: "B", nota_fiscal: "2", valor_unitario: 12, data_movimentacao: "2026-03-05" }),
    mov({ fornecedor: "C", valor_unitario: 0, data_movimentacao: "2026-06-01" }),
  ];
  // sem nenhuma entrada com valor, vale a mais recente, com custo zero
  assert.equal(compraOriginalDaFerramenta([mov({ data_movimentacao: "2026-02-01" }), mov({ fornecedor: "Z", data_movimentacao: "2026-04-01" })], "f1").fornecedor, "Z");
  assert.deepEqual(compraOriginalDaFerramenta(compras, "f1"), { fornecedor: "B", fornecedorId: null, notaFiscal: "2", dataCompra: "2026-03-05", valorUnitario: 12 });
  assert.equal(compraOriginalDaFerramenta(compras, "outra"), null);
});

test("a entrada usada exige empregado, ferramenta marcada, quantidade dentro da caixa e compra registrada", () => {
  const ok = { ferramentaId: "f1", nome: "Chave", caixaId: "c1", quantidade: 1, disponivel: 2 };
  assert.match(erroDaEntradaUsada("", "2026-11-18", [ok], []), /empregado/);
  assert.match(erroDaEntradaUsada("e1", "2026-11-18", [], []), /ao menos uma/);
  assert.match(erroDaEntradaUsada("e1", "2026-11-18", [{ ...ok, quantidade: 3 }], []), /só 2/);
  assert.match(erroDaEntradaUsada("e1", "2026-11-18", [ok], ["f1"]), /entrada registrada/);
  assert.equal(erroDaEntradaUsada("e1", "2026-11-18", [ok], []), null);
});

test("os submenus de Movimentações têm os novos nomes e a entrada oferece nova ou usada", () => {
  const m = readFileSync(new URL("../src/components/modules/FerramentasMovimentacoes.tsx", import.meta.url), "utf8");
  assert.match(m, /"Saída do estoque"/);
  assert.match(m, /"Baixa definitiva"/);
  const d = readFileSync(new URL("../src/components/modules/CompraFerramentaDialog.tsx", import.meta.url), "utf8");
  assert.match(d, /aria-label="Tipo da entrada"/);
  assert.match(d, /<EntradaUsadaFerramenta/);
  const mm = readFileSync(new URL("../src/components/modules/MovimentacoesModulo.tsx", import.meta.url), "utf8");
  assert.match(mm, /"Registrar entrada"/);
  assert.doesNotMatch(mm, /Registrar Compra/);
});
