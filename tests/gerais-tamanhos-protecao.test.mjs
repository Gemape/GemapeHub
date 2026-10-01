import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import * as pb from "../src/lib/parametros-base.ts";
import * as uso from "../src/lib/uso-parametros.ts";

const storage = () => {
  const dados = new Map();
  return {
    getItem: (chave) => dados.get(chave) ?? null,
    setItem: (chave, valor) => dados.set(chave, valor),
  };
};
const ler = (relativo) =>
  readFileSync(fileURLToPath(new URL(`../src/${relativo}`, import.meta.url)), "utf8");

const botina = (extra = {}) => ({
  codigo_sku: "EPI-0002",
  categoria: "Botina",
  subcategoria_id: "sub-epi-botina",
  estoque_atual: 0,
  ...extra,
});

test("tamanhos e unidades podem ser desativados e reativados", () => {
  const s = storage();
  pb.alterarAtivo("tam-40", false, s);
  pb.alterarAtivo("uni-par", false, s);
  let d = pb.lerParametros(s);
  assert.deepEqual(d.inativos, ["tam-40", "uni-par"]);
  assert.ok(
    d.tamanhos.some((t) => t.id === "tam-40"),
    "continua em Gerais",
  );
  // Continua autorizado na subcategoria: a associação não é apagada ao desativar.
  assert.ok(pb.autorizados(d, "sub-epi-botina", "tamanhos").some((t) => t.id === "tam-40"));
  pb.alterarAtivo("tam-40", true, s);
  d = pb.lerParametros(s);
  assert.deepEqual(d.inativos, ["uni-par"]);
  // Excluir limpa o desativado.
  pb.removerOpcao("unidades", "uni-par", s);
  assert.deepEqual(pb.lerParametros(s).inativos, []);
});

test("tamanho em uso por saldo, mínimo, movimentação ou compra não pode ser excluído", () => {
  const d = pb.lerParametros(null);
  const tamanho = d.tamanhos.find((t) => t.id === "tam-40");
  assert.deepEqual(uso.usoDoTamanho(tamanho, d, {}), []);
  const usos = uso.usoDoTamanho(tamanho, d, {
    epis: [
      botina({ codigo_sku: "EPI-0002", saldos_tamanho: { "tam-40": 3 } }),
      botina({ codigo_sku: "EPI-0003", minimos_tamanho: { "tam-40": 1 } }),
      botina({ codigo_sku: "EPI-0004", saldos_tamanho: { "tam-41": 3 } }),
      // Tamanho digitado antigo que casa com Gerais também depende dele.
      botina({ codigo_sku: "EPI-0005", tamanho: "40", estoque_atual: 2 }),
    ],
    uniformes: [],
    movimentacoes: [{ modulo: "epi", item_id: "x", tamanho_id: "tam-40" }],
    compras_epis: [
      { item_id: "x", tamanho_id: "tam-40" },
      { item_id: "y", tamanho_id: "tam-41" },
    ],
    compras_uniformes: [],
  });
  assert.deepEqual(usos, [
    { modulo: "EPI", codigos: ["EPI-0002", "EPI-0003", "EPI-0005"] },
    { modulo: "Movimentações", codigos: ["1 registro(s)"] },
    { modulo: "Compras", codigos: ["1 registro(s)"] },
  ]);
});

test("unidade em uso por produto não pode ser excluída", () => {
  const d = pb.lerParametros(null);
  const par = d.unidades.find((u) => u.id === "uni-par");
  assert.deepEqual(
    uso.usoDaUnidade(par, {
      epis: [
        botina({ unidade_id: "uni-par" }),
        botina({ codigo_sku: "EPI-0009", unidade_medida: "par" }),
      ],
      uniformes: [{ codigo_sku: "UNI-0001", unidade_id: "uni-unidade" }],
    }),
    [{ modulo: "EPI", codigos: ["EPI-0002", "EPI-0009"] }],
  );
});

test("desautorizar tamanho com saldo ou histórico na subcategoria avisa o que depende", () => {
  const d = pb.lerParametros(null);
  const cadastros = {
    epis: [
      botina({ id: "b1", codigo_sku: "EPI-0002", saldos_tamanho: { "tam-40": 2 } }),
      botina({ id: "b2", codigo_sku: "EPI-0003" }),
      {
        id: "c1",
        codigo_sku: "EPI-0004",
        categoria: "Capacete",
        subcategoria_id: "sub-epi-capacete",
        saldos_tamanho: { "tam-40": 1 },
      },
    ],
    uniformes: [],
    movimentacoes: [{ modulo: "epi", item_id: "b2", tamanho_id: "tam-40" }],
  };
  assert.deepEqual(
    uso.dependenciasDaDesautorizacao(d, "sub-epi-botina", "tamanhos", ["tam-40"], cadastros),
    [{ modulo: "EPI", codigos: ["EPI-0002", "EPI-0003"] }],
  );
  assert.deepEqual(
    uso.dependenciasDaDesautorizacao(d, "sub-epi-botina", "tamanhos", ["tam-37"], cadastros),
    [],
  );
  assert.deepEqual(
    uso.dependenciasDaDesautorizacao(d, "sub-epi-botina", "unidades", ["uni-par"], {
      epis: [botina({ codigo_sku: "EPI-0007", unidade_id: "uni-par" })],
    }),
    [{ modulo: "EPI", codigos: ["EPI-0007"] }],
  );
});

test("autorizar tamanhos numa subcategoria com produtos com saldo avisa e não converte", () => {
  const d = pb.lerParametros(null);
  const produtos = [
    {
      codigo_sku: "EPI-0001",
      categoria: "Capacete",
      subcategoria_id: "sub-epi-capacete",
      estoque_atual: 4,
    },
    {
      codigo_sku: "EPI-0010",
      categoria: "Capacete",
      subcategoria_id: "sub-epi-capacete",
      estoque_atual: 0,
    },
  ];
  assert.match(
    uso.avisoAutorizacaoTamanhos(d, "sub-epi-capacete", produtos) ?? "",
    /EPI-0001.*Sem tamanho/,
  );
  // Botina já controla tamanho: autorizar mais um não muda o saldo de ninguém.
  assert.equal(
    uso.avisoAutorizacaoTamanhos(d, "sub-epi-botina", [botina({ estoque_atual: 3 })]),
    null,
  );
});

test("as telas de Gerais usam o desativar, a proteção e os avisos", () => {
  const tela = ler("routes/_authenticated/cadastros/gerais/tamanhos-unidades.tsx");
  assert.match(tela, /onAlternarAtivo/);
  assert.match(tela, /inativos=\{dados\.inativos\}/);
  assert.match(tela, /usoDoTamanho/);
  assert.match(tela, /usoDaUnidade/);
  const associar = ler("routes/_authenticated/cadastros/gerais/associar-tamanhos.tsx");
  assert.match(associar, /dependenciasDaDesautorizacao/);
  assert.match(associar, /avisoAutorizacaoTamanhos/);
  assert.match(associar, /\(desativado\)/);
});
