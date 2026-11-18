import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { entregarFerramentaNaCaixa } from "../src/lib/movimentacoes-caixa.ts";

const le = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const base = {
  ferramentaId: "f1", nomeFerramenta: "Furadeira", quantidade: 2, data: "2026-11-18",
  empresaDaCaixa: "emp1", empresaDaFerramenta: "emp1", itensDaCaixa: [{ ferramenta_id: "f2", quantidade: 1 }], emOutraCaixa: null, semCaixa: 5,
};

test("a entrega à caixa soma na caixa e não leva empregado", () => {
  const r = entregarFerramentaNaCaixa(base);
  assert.deepEqual(r.itens.map((i) => [i.ferramenta_id, i.quantidade]), [["f2", 1], ["f1", 2]]);
  const mais = entregarFerramentaNaCaixa({ ...base, itensDaCaixa: [{ ferramenta_id: "f1", quantidade: 3 }] });
  assert.deepEqual(mais.itens.map((i) => [i.ferramenta_id, i.quantidade]), [["f1", 5]]);
});

test("a entrega à caixa recusa quantidade inválida, outra empresa, ferramenta em outra caixa e falta de saldo sem caixa", () => {
  assert.match(entregarFerramentaNaCaixa({ ...base, quantidade: 0 }).erro, /quantidade/);
  assert.match(entregarFerramentaNaCaixa({ ...base, quantidade: 1.5 }).erro, /quantidade/);
  assert.match(entregarFerramentaNaCaixa({ ...base, ferramentaId: "" }).erro, /Escolha a ferramenta/);
  assert.match(entregarFerramentaNaCaixa({ ...base, data: "" }).erro, /data/);
  assert.match(entregarFerramentaNaCaixa({ ...base, empresaDaFerramenta: "emp2" }).erro, /outra empresa/);
  assert.match(entregarFerramentaNaCaixa({ ...base, emOutraCaixa: "CX-0002" }).erro, /já está na caixa CX-0002/);
  assert.match(entregarFerramentaNaCaixa({ ...base, semCaixa: 1 }).erro, /Só 1 de Furadeira está fora das caixas/);
  assert.match(entregarFerramentaNaCaixa({ ...base, semCaixa: -3 }).erro, /Só 0 de/);
});

test("Ferramentas tem o menu Movimentações no lugar de Entrada no estoque e Entrega de ferramentas", async () => {
  const { ABAS_FERRAMENTA, abaDoModulo, descricaoDaAba } = await import("../src/lib/menu-parametros.ts");
  const ids = ABAS_FERRAMENTA.map((a) => a.aba);
  assert.ok(ids.includes("movimentacoes"));
  assert.ok(!ids.includes("entrada-estoque") && !ids.includes("entrega"));
  assert.equal(abaDoModulo("ferramenta", "movimentacoes"), "movimentacoes");
  assert.match(descricaoDaAba("ferramenta", "movimentacoes", "x"), /caixa/);
  const pagina = le("src/components/modules/PaginaModulo.tsx");
  assert.match(pagina, /value="movimentacoes"[\s\S]*<FerramentasMovimentacoes \/>/);
});

test("a baixa pela caixa não pede nem grava empregado, e a devolução ao empregado saiu da entrada no estoque", () => {
  const dialogos = le("src/components/modules/CaixaGestaoDialogs.tsx");
  const baixa = dialogos.slice(dialogos.indexOf("export function DialogBaixaCaixa("), dialogos.indexOf("/** Ocorrência ligada"));
  assert.doesNotMatch(baixa, /baixa-empregado|setEmpregadoId|useEmpregados/);
  assert.match(baixa, /empregado_id: null,/);
  const mov = le("src/components/modules/MovimentacoesModulo.tsx");
  assert.doesNotMatch(mov, /DevolucaoFerramentaDialog|setDevolucaoAberta/);
});

test("a entrega à caixa grava a caixa e nenhuma pessoa, só depois de a caixa salvar", () => {
  const t = le("src/components/modules/FerramentasEntregaCaixa.tsx");
  assert.match(t, /empregado_id: null/);
  assert.match(t, /tipo_movimentacao: "Transferencia"/);
  assert.match(t, /origem_local: ORIGEM_ENTREGA_CAIXA/);
  assert.match(t, /salvarCaixa\.mutate\([\s\S]*onSuccess: \(\) => \{[\s\S]*registrar\.mutate/);
});
