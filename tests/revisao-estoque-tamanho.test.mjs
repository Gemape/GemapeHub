// Correções do code review do PR #54 (estoque por tamanho, decisão 23).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { demoSupabase } from "../src/integrations/supabase/demo-client.ts";
import { lerParametros } from "../src/lib/parametros-base.ts";
import {
  SEM_TAMANHO,
  movimentarTamanho,
  opcoesTamanhoDevolucao,
  tamanhoParaGravar,
  usaMinimoPorTamanho,
  validarLinhasTamanho,
} from "../src/lib/estoque-tamanho.ts";
import * as uso from "../src/lib/uso-parametros.ts";

const ler = (relativo) =>
  readFileSync(fileURLToPath(new URL(`../src/${relativo}`, import.meta.url)), "utf8");
const gerais = () => lerParametros(null);
const botina = (extra = {}) => ({
  id: "b1",
  nome: "Botina",
  codigo_sku: "EPI-0002",
  categoria: "Botina",
  subcategoria_id: "sub-epi-botina",
  estoque_atual: 0,
  ...extra,
});
// Botina cuja subcategoria perdeu todos os tamanhos, mas que ainda tem saldo no 40.
const semAssociacao = () => {
  const p = gerais();
  p.associacoes = p.associacoes.filter((a) => a.subcategoriaId !== "sub-epi-botina");
  return p;
};

test("devolução aceita Sem tamanho e tamanho desativado ou desautorizado", () => {
  const p = gerais();
  p.inativos.push("tam-42");
  const devolver = (tamanho_id, saldos = {}, params = p) =>
    movimentarTamanho(params, "epi", botina(), saldos, {
      tipo_movimentacao: "Devolucao",
      quantidade: 1,
      tamanho_id,
    });
  assert.deepEqual(devolver(SEM_TAMANHO), { [SEM_TAMANHO]: 1 });
  assert.deepEqual(devolver("tam-42", { "tam-42": 0 }), { "tam-42": 1 });
  assert.deepEqual(devolver("tam-40", { "tam-40": 2 }, semAssociacao()), { "tam-40": 3 });
  // Sem informar nada continua recusado, e tamanho excluído de Gerais também.
  assert.throws(() => devolver(null), /Informe o tamanho/);
  assert.throws(() => devolver("tam-inexistente"), /não está autorizado/);
  // A entrada (compra) continua exigindo tamanho autorizado e ativo.
  assert.throws(
    () =>
      movimentarTamanho(
        p,
        "epi",
        botina(),
        {},
        {
          tipo_movimentacao: "Entrada",
          quantidade: 1,
          tamanho_id: SEM_TAMANHO,
        },
      ),
    /Informe o tamanho/,
  );
});

test("opções de devolução: autorizados, os que têm saldo gravado e Sem tamanho", () => {
  const p = gerais();
  p.inativos.push("tam-43");
  const valores = opcoesTamanhoDevolucao(p, "epi", botina({ saldos_tamanho: { "tam-40": 0 } })).map(
    (o) => o.valor,
  );
  assert.ok(valores.includes("tam-37") && valores.includes("tam-43"), "inclui desativado");
  assert.equal(valores.at(-1), SEM_TAMANHO);
  const soComSaldo = opcoesTamanhoDevolucao(
    semAssociacao(),
    "epi",
    botina({ saldos_tamanho: { "tam-40": 2 } }),
  ).map((o) => o.valor);
  assert.deepEqual(soComSaldo, ["tam-40", SEM_TAMANHO]);
  // A devolução grava "Sem tamanho" como escolhido; a saída grava nulo.
  assert.equal(tamanhoParaGravar(SEM_TAMANHO, true), SEM_TAMANHO);
  assert.equal(tamanhoParaGravar(SEM_TAMANHO), null);
});

test("validação: devolução aceita Sem tamanho; entrada sem tamanho ativo explica o motivo", () => {
  const item = botina({ saldos_tamanho: { "tam-40": 2 } });
  assert.equal(
    validarLinhasTamanho(
      [{ item_id: "b1", quantidade: 1, tamanho: SEM_TAMANHO }],
      [item],
      gerais(),
      "epi",
      "devolução",
    ),
    null,
  );
  assert.match(
    validarLinhasTamanho(
      [{ item_id: "b1", quantidade: 1, tamanho: "" }],
      [item],
      semAssociacao(),
      "epi",
      "entrada",
    ) ?? "",
    /não tem tamanho ativo autorizado.*Associar Tamanho e Medida/,
  );
});

test("mínimo por tamanho só vale com algum mínimo de tamanho maior que zero", () => {
  const p = gerais();
  assert.equal(usaMinimoPorTamanho(p, "epi", botina({ minimos_tamanho: { "tam-40": 2 } })), true);
  assert.equal(usaMinimoPorTamanho(p, "epi", botina({ minimos_tamanho: { "tam-40": 0 } })), false);
  assert.equal(usaMinimoPorTamanho(p, "epi", botina()), false);
  // Produto sem tamanho nunca usa mínimo por tamanho.
  const capacete = {
    categoria: "Capacete",
    subcategoria_id: "sub-epi-capacete",
    minimos_tamanho: { "tam-m": 1 },
  };
  assert.equal(usaMinimoPorTamanho(p, "epi", capacete), false);
});

test("desautorizar unidade avisa também o produto que a usa pelo texto antigo", () => {
  const d = gerais();
  assert.deepEqual(
    uso.dependenciasDaDesautorizacao(d, "sub-epi-botina", "unidades", ["uni-par"], {
      epis: [botina({ codigo_sku: "EPI-0009", unidade_medida: "Par" })],
    }),
    [{ modulo: "EPI", codigos: ["EPI-0009"] }],
  );
});

test("telas: mínimo único quando a grade fica vazia, alerta no módulo e fila em Associar", () => {
  const cadastro = ler("components/modules/CadastroProduto.tsx");
  assert.match(cadastro, /usaGrade/);
  // Fora da grade o mínimo por tamanho é limpo, para não ficar escondido.
  assert.match(cadastro, /valores\["minimos_tamanho"\] = \{\}/);
  assert.doesNotMatch(cadastro, /resumoEstoquePorTamanho|alertasPorTamanho/);
  assert.match(ler("components/modules/EstoqueModulo.tsx"), /estadoEstoqueModulo/);
  assert.match(ler("routes/_authenticated/dashboard.tsx"), /usaMinimoPorTamanho/);
  const associar = ler("routes/_authenticated/cadastros/gerais/associar-tamanhos.tsx");
  assert.match(associar, /fila\.current/);
  assert.match(associar, /lerParametros\(\)/);
  for (const tela of [
    associar,
    ler("routes/_authenticated/cadastros/gerais/tamanhos-unidades.tsx"),
  ]) {
    assert.match(tela, /lerCadastrosDeUso/);
    assert.doesNotMatch(tela, /async function lerCadastros/);
  }
  assert.match(ler("lib/ler-cadastros-uso.ts"), /Promise\.all/);
  assert.match(ler("components/SeletorTamanho.tsx"), /MODO_DEMO/);
  assert.match(ler("components/SeletorTamanho.tsx"), /Nenhum tamanho autorizado/);
  assert.match(
    ler("components/modules/MovimentacoesModulo.tsx"),
    /tipoMovimentacao === "Devolucao"\s*\?\s*"devolucao"/,
  );
  assert.doesNotMatch(ler("lib/uso-parametros.ts"), /"cat-epi"/);
});

test("devolução em Sem tamanho de produto sem tamanho é gravada no estoque único", async () => {
  const capacete = {
    id: crypto.randomUUID(),
    empresa_id: "emp-a",
    nome: "Capacete",
    codigo_sku: "EPI-0960",
    categoria: "Capacete",
    subcategoria_id: "sub-epi-capacete",
    estoque_atual: 1,
  };
  assert.equal((await demoSupabase.from("epis").insert(capacete)).error, null);
  const { error } = await demoSupabase.from("movimentacoes").insert({
    modulo: "epi",
    tipo_movimentacao: "Devolucao",
    item_id: capacete.id,
    empresa_id: "emp-a",
    quantidade: 2,
    data_movimentacao: "2026-10-01",
    tamanho_id: SEM_TAMANHO,
  });
  assert.equal(error, null);
  const { data } = await demoSupabase.from("epis").select("*").eq("id", capacete.id).single();
  assert.equal(data.estoque_atual, 3);
});
