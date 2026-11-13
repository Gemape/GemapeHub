import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { lerTodas, percentualDaEtapa } from "../src/lib/ler-todas.ts";
import { lerHistoricoEpiEmpregado } from "../src/lib/historico-epi-empregado.ts";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");

test("a porcentagem da etapa anda com as linhas lidas e não passa do fim da etapa", () => {
  assert.equal(percentualDaEtapa(0, 1000, 0, 80), 0);
  assert.equal(percentualDaEtapa(500, 1000, 0, 80), 40);
  assert.equal(percentualDaEtapa(1500, 1000, 0, 80), 80);
  assert.equal(percentualDaEtapa(0, 0, 0, 80), 0, "sem total conhecido, começa no começo");
  const estimado = percentualDaEtapa(500, 0, 0, 80);
  assert.ok(estimado > 0 && estimado < 80, `sem total, estima pelos blocos: ${estimado}`);
});

test("lerTodas avisa o progresso a cada bloco lido", async () => {
  const blocos = [Array(500).fill({}), Array(120).fill({})];
  let i = 0;
  const consulta = { order: () => consulta, range: async () => ({ data: blocos[i++], error: null }) };
  const avisos = [];
  const todas = await lerTodas(() => consulta, (q) => q, (n) => avisos.push(n));
  assert.equal(todas.length, 620);
  assert.deepEqual(avisos, [500, 620]);
});

test("o histórico do empregado conta as linhas antes de ler e avisa lidas/total", async () => {
  const linhas = Array.from({ length: 3 }, (_, i) => ({ item_id: "a", tipo_movimentacao: "Saida", quantidade: 1, data_movimentacao: `2026-01-0${i + 1}`, created_at: `2026-01-0${i + 1}` }));
  const encadeia = (resultado) => { const q = { eq: () => q, order: () => q, range: async () => ({ data: linhas, error: null }), then: (ok) => Promise.resolve(resultado).then(ok) }; return q; };
  const cliente = { from: () => ({ select: (_c, opcoes) => (opcoes?.head ? encadeia({ count: 3 }) : encadeia({})) }) };
  const avisos = [];
  const r = await lerHistoricoEpiEmpregado(cliente, { empregadoId: "e", empresaId: "m" }, (lidas, total) => avisos.push([lidas, total]));
  assert.equal(r.length, 3);
  assert.deepEqual(avisos, [[0, 3], [3, 3]]);
});

test("tabelas e blocos usam esqueletos em vez de texto solto de carregamento", () => {
  const esq = ler("components/Esqueletos.tsx");
  assert.match(esq, /export function LinhasEsqueleto/);
  assert.match(esq, /export function BlocoEsqueleto/);
  assert.match(esq, /role="status"/);
  for (const arq of ["components/modules/CadastroEpi.tsx", "components/modules/EstoqueEpiModulo.tsx", "components/modules/FrotaModulo.tsx", "components/modules/OcorrenciasModulo.tsx"]) {
    assert.match(ler(arq), /<LinhasEsqueleto colunas=/, arq);
  }
  assert.match(ler("components/modules/EpiRelatorioFuncionario.tsx"), /<BlocoEsqueleto /);
});

test("a ficha de EPI mostra a barra de progresso real e a fecha mesmo se der erro", () => {
  const ficha = ler("components/modules/EpiFichaEpiAvulsa.tsx");
  assert.match(ficha, /<ProgressoRelatorio progresso=\{progresso\}/);
  assert.match(ficha, /Carregando dados de EPIs…/);
  assert.match(ficha, /percentualDaEtapa\(lidas, total, 0, 80\)/);
  assert.match(ficha, /catch \(erro\) \{\s*setProgresso\(null\);/);
  assert.match(ficha, /\} finally \{\s*setProgresso\(null\);/, "qualquer falha ao montar/abrir fecha a janela");
  assert.match(ler("components/ProgressoRelatorio.tsx"), /<Progress value=/);
});
