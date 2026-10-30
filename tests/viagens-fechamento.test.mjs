import test from "node:test";
import assert from "node:assert/strict";

import { fechamentoDoRelatorio } from "../src/lib/viagens.ts";

const P = { ano: 2026, mes: 10 };
const desp = (id, data) => ({ id, tipo: "Combustível", data, hora: "10:00", itens: [] });
const lista = [desp("a", "2026-10-01"), desp("b", "2026-10-01"), desp("c", "2026-10-01"), desp("d", "2026-10-20")];
const prazos = { mecanico: 3, pcm: 5, mecanicoAplica: true, pcmAplica: true };
// a: relatório no dia 5 (4 dias, no prazo); b: no dia 9 (8 dias, fora); c: sem relatório e vencido; d: sem relatório, ainda dentro do prazo.
const criados = new Map([["a", "2026-10-05T15:00:00.000Z"], ["b", "2026-10-09T15:00:00.000Z"]]);

test("fechamento do relatório: fechadas no prazo ÷ fechadas ou vencidas; aberta dentro do prazo não entra", () => {
  const f = fechamentoDoRelatorio(lista, P, prazos, criados, "2026-10-21");
  assert.deepEqual([f.noPrazo, f.medidos, f.indice], [1, 3, (1 / 3) * 100]);
});

test("com o indicador desligado em Parâmetros, não há índice", () => {
  const f = fechamentoDoRelatorio(lista, P, { ...prazos, pcmAplica: false }, criados, "2026-10-21");
  assert.deepEqual([f.medidos, f.indice], [0, null]);
});
