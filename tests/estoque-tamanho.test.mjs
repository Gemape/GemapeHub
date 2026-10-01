import test from "node:test";
import assert from "node:assert/strict";

import { demoSupabase } from "../src/integrations/supabase/demo-client.ts";
import { lerParametros } from "../src/lib/parametros-base.ts";
import {
  SEM_TAMANHO,
  alertasPorTamanho,
  controlaTamanho,
  movimentarTamanho,
  nomeTamanho,
  opcoesTamanhoEntrada,
  opcoesTamanhoSaida,
  resumoEstoquePorTamanho,
  resumoMinimosPorTamanho,
  saldosPorTamanho,
  tamanhosAutorizadosDoProduto,
  unidadesAutorizadasDoProduto,
  validarLinhasTamanho,
} from "../src/lib/estoque-tamanho.ts";

// Gerais padrão: Botina (sub-epi-botina) autoriza 37 a 43 e Par; Capacete não tem associação.
const gerais = () => lerParametros(null);
const botina = (extra = {}) => ({
  id: crypto.randomUUID(),
  empresa_id: "emp-a",
  nome: "Botina de segurança",
  codigo_sku: "EPI-0901",
  categoria: "Botina",
  subcategoria_id: "sub-epi-botina",
  estoque_atual: 0,
  estoque_minimo: 0,
  ...extra,
});

async function inserir(tabela, linha) {
  const { error } = await demoSupabase.from(tabela).insert(linha);
  assert.equal(error, null);
  return linha;
}
async function ler(tabela, id) {
  const { data } = await demoSupabase.from(tabela).select("*").eq("id", id).single();
  return data;
}
const compraEpi = (item, tamanho_id, quantidade) => ({
  empresa_id: "emp-a",
  item_id: item.id,
  fornecedor: "ACME",
  nota_fiscal: "1",
  data_compra: "2026-10-01",
  quantidade,
  valor_unitario: 10,
  tamanho_id,
});
const saidaEpi = (item, tamanho_id, quantidade) => ({
  modulo: "epi",
  tipo_movimentacao: "Saida",
  item_id: item.id,
  empresa_id: "emp-a",
  quantidade,
  data_movimentacao: "2026-10-01",
  tamanho_id,
});

test("produto da subcategoria com associação controla tamanho; sem associação, não", () => {
  const p = gerais();
  assert.equal(controlaTamanho(p, "epi", botina()), true);
  assert.deepEqual(
    tamanhosAutorizadosDoProduto(p, "epi", botina()).map((t) => t.nome),
    ["37", "38", "39", "40", "41", "42", "43"],
  );
  assert.deepEqual(
    unidadesAutorizadasDoProduto(p, "epi", botina()).map((u) => u.nome),
    ["Par"],
  );
  const capacete = { categoria: "Capacete", subcategoria_id: "sub-epi-capacete", estoque_atual: 4 };
  assert.equal(controlaTamanho(p, "epi", capacete), false);
  assert.deepEqual(unidadesAutorizadasDoProduto(p, "epi", capacete), []);
  assert.deepEqual(saldosPorTamanho(p, "epi", capacete), { [SEM_TAMANHO]: 4 });
});

test("movimentar uma numeração não altera o saldo de outra", async () => {
  const item = await inserir("epis", botina());
  assert.equal(
    (await demoSupabase.from("compras_epis").insert(compraEpi(item, "tam-40", 5))).error,
    null,
  );
  assert.equal(
    (await demoSupabase.from("compras_epis").insert(compraEpi(item, "tam-42", 3))).error,
    null,
  );
  let atual = await ler("epis", item.id);
  assert.deepEqual(atual.saldos_tamanho, { "tam-40": 5, "tam-42": 3 });
  assert.equal(atual.estoque_atual, 8);

  assert.equal(
    (await demoSupabase.from("movimentacoes").insert(saidaEpi(item, "tam-40", 2))).error,
    null,
  );
  atual = await ler("epis", item.id);
  assert.equal(atual.saldos_tamanho["tam-40"], 3);
  assert.equal(atual.saldos_tamanho["tam-42"], 3, "a saída do 40 não mexe no 42");
  assert.equal(atual.estoque_atual, 6);

  // O 42 tem 3: tirar 4 do 42 é recusado mesmo havendo saldo no 40.
  const { error } = await demoSupabase.from("movimentacoes").insert(saidaEpi(item, "tam-42", 4));
  assert.match(error?.message ?? "", /insuficiente.*42/);
  atual = await ler("epis", item.id);
  assert.deepEqual(atual.saldos_tamanho, { "tam-40": 3, "tam-42": 3 });
});

test("a entrada da compra leva o tamanho da compra", async () => {
  const item = await inserir("epis", botina());
  await demoSupabase.from("compras_epis").insert(compraEpi(item, "tam-39", 2));
  const { data: entradas } = await demoSupabase
    .from("movimentacoes")
    .select("*")
    .eq("item_id", item.id);
  assert.equal(entradas.length, 1);
  assert.equal(entradas[0].tamanho_id, "tam-39");
});

test("tamanho ausente ou fora dos autorizados é recusado, sem gravar nada", async () => {
  const item = await inserir("epis", botina());
  for (const [tamanho, motivo] of [
    [null, /Informe o tamanho/],
    ["tam-gg", /não está autorizado/],
    ["tam-inexistente", /não está autorizado/],
  ]) {
    const { error } = await demoSupabase.from("compras_epis").insert(compraEpi(item, tamanho, 1));
    assert.match(error?.message ?? "", motivo);
  }
  const { data: compras } = await demoSupabase
    .from("compras_epis")
    .select("*")
    .eq("item_id", item.id);
  assert.equal(compras.length, 0);
  const atual = await ler("epis", item.id);
  assert.equal(atual.estoque_atual, 0);

  // Produto sem tamanho autorizado não aceita tamanho.
  const capacete = await inserir("epis", {
    ...botina(),
    categoria: "Capacete",
    subcategoria_id: "sub-epi-capacete",
  });
  const { error } = await demoSupabase
    .from("compras_epis")
    .insert(compraEpi(capacete, "tam-40", 1));
  assert.match(error?.message ?? "", /não tem tamanho/);
  assert.equal(
    (await demoSupabase.from("compras_epis").insert(compraEpi(capacete, null, 2))).error,
    null,
  );
  assert.equal((await ler("epis", capacete.id)).estoque_atual, 2);
});

test("lote com uma linha inválida não grava nenhuma (atômico por tamanho)", async () => {
  const item = await inserir("epis", botina());
  await demoSupabase.from("compras_epis").insert(compraEpi(item, "tam-40", 2));
  const { error } = await demoSupabase
    .from("movimentacoes")
    .insert([saidaEpi(item, "tam-40", 1), saidaEpi(item, "tam-41", 1)]);
  assert.match(error?.message ?? "", /insuficiente/);
  const atual = await ler("epis", item.id);
  assert.deepEqual(atual.saldos_tamanho, { "tam-40": 2 });
  // Duas linhas do mesmo tamanho somam: 1 + 2 passa do saldo 2.
  const { error: soma } = await demoSupabase
    .from("movimentacoes")
    .insert([saidaEpi(item, "tam-40", 1), saidaEpi(item, "tam-40", 2)]);
  assert.match(soma?.message ?? "", /insuficiente/);
  assert.equal((await ler("epis", item.id)).estoque_atual, 2);
});

test("saldo antigo sem tamanho só sai até zerar; tamanho digitado que casa leva o saldo", async () => {
  const antigo = await inserir("epis", botina({ estoque_atual: 3 }));
  const p = gerais();
  assert.deepEqual(saldosPorTamanho(p, "epi", antigo), { [SEM_TAMANHO]: 3 });
  // Entrada sem tamanho não vai para o "sem tamanho".
  const entradaSem = await demoSupabase
    .from("movimentacoes")
    .insert({ ...saidaEpi(antigo, null, 1), tipo_movimentacao: "Entrada" });
  assert.match(entradaSem.error?.message ?? "", /Informe o tamanho/);
  assert.equal(
    (await demoSupabase.from("movimentacoes").insert(saidaEpi(antigo, null, 2))).error,
    null,
  );
  assert.deepEqual((await ler("epis", antigo.id)).saldos_tamanho, { [SEM_TAMANHO]: 1 });
  const demais = await demoSupabase.from("movimentacoes").insert(saidaEpi(antigo, null, 2));
  assert.match(demais.error?.message ?? "", /insuficiente/);

  // Uniforme antigo, cadastrado um por tamanho, com o tamanho "40" digitado.
  const digitado = botina({ tamanho: "40", estoque_atual: 6 });
  assert.deepEqual(saldosPorTamanho(p, "epi", digitado), { "tam-40": 6 });
});

test("opções de tamanho: entrada só os ativos autorizados; saída só os que têm saldo", () => {
  const p = gerais();
  p.inativos.push("tam-38");
  const produto = botina({
    saldos_tamanho: { "tam-40": 2, "tam-38": 1, [SEM_TAMANHO]: 0 },
    estoque_atual: 3,
  });
  const entrada = opcoesTamanhoEntrada(p, "epi", produto).map((o) => o.rotulo);
  assert.equal(entrada.includes("38"), false, "desativado sai da escolha");
  assert.equal(entrada.includes("40"), true);
  assert.deepEqual(
    opcoesTamanhoSaida(p, "epi", produto).map((o) => [o.valor, o.saldo]),
    [
      ["tam-38", 1],
      ["tam-40", 2],
    ],
    "o desativado com saldo ainda pode sair",
  );
});

test("renomear ou desativar um tamanho em Gerais se reflete nos cadastros", () => {
  const p = gerais();
  const produto = botina({ saldos_tamanho: { "tam-40": 2 }, estoque_atual: 2 });
  assert.equal(resumoEstoquePorTamanho(p, "epi", produto), "40: 2");
  p.tamanhos.find((t) => t.id === "tam-40").nome = "40 BR";
  assert.equal(nomeTamanho(p, "tam-40"), "40 BR");
  assert.equal(resumoEstoquePorTamanho(p, "epi", produto), "40 BR: 2");
  p.inativos.push("tam-40");
  assert.equal(
    opcoesTamanhoEntrada(p, "epi", produto).some((o) => o.valor === "tam-40"),
    false,
  );
  assert.match(resumoEstoquePorTamanho(p, "epi", produto), /40 BR \(desativado\): 2/);
  // O mínimo por tamanho segue a ordem de Gerais e também marca o desativado.
  const comMinimos = { ...produto, minimos_tamanho: { "tam-42": 1, "tam-40": 3, "tam-39": 0 } };
  assert.equal(resumoMinimosPorTamanho(p, comMinimos), "40 BR (desativado): 3 · 42: 1");
  assert.equal(nomeTamanho(p, SEM_TAMANHO), "Sem tamanho");
});

test("movimentarTamanho devolve os novos saldos e recusa saldo negativo", () => {
  const p = gerais();
  const produto = botina();
  const saldos = movimentarTamanho(
    p,
    "epi",
    produto,
    { "tam-40": 1 },
    { tipo_movimentacao: "Devolucao", quantidade: 2, tamanho_id: "tam-40" },
  );
  assert.deepEqual(saldos, { "tam-40": 3 });
  assert.throws(
    () =>
      movimentarTamanho(
        p,
        "epi",
        produto,
        { "tam-40": 1 },
        { tipo_movimentacao: "Saida", quantidade: 2, tamanho_id: "tam-40" },
      ),
    /insuficiente/,
  );
  // Vistoria e transferência não mexem no saldo.
  assert.deepEqual(
    movimentarTamanho(
      p,
      "epi",
      produto,
      { "tam-40": 1 },
      { tipo_movimentacao: "Transferencia", quantidade: 5, tamanho_id: null },
    ),
    { "tam-40": 1 },
  );
});

test("estoque mínimo e alerta por tamanho", () => {
  const p = gerais();
  const produto = botina({
    saldos_tamanho: { "tam-40": 1, "tam-41": 5 },
    minimos_tamanho: { "tam-40": 2, "tam-41": 2, "tam-42": 1 },
    estoque_atual: 6,
  });
  assert.deepEqual(
    alertasPorTamanho(p, "epi", produto).map((a) => [a.nome, a.saldo, a.minimo]),
    [
      ["40", 1, 2],
      ["42", 0, 1],
    ],
  );
  // Produto sem tamanho usa o mínimo único (a tela compara estoque e mínimo como antes).
  assert.deepEqual(
    alertasPorTamanho(p, "epi", {
      categoria: "Capacete",
      subcategoria_id: "sub-epi-capacete",
      estoque_atual: 0,
      estoque_minimo: 3,
    }),
    [],
  );
});

test("validação das linhas na tela: tamanho escolhido e saldo do tamanho", () => {
  const p = gerais();
  const itens = [
    botina({ id: "b", saldos_tamanho: { "tam-40": 2, [SEM_TAMANHO]: 1 }, estoque_atual: 3 }),
    {
      id: "c",
      nome: "Capacete",
      categoria: "Capacete",
      subcategoria_id: "sub-epi-capacete",
      estoque_atual: 5,
    },
  ];
  assert.equal(
    validarLinhasTamanho(
      [{ item_id: "b", quantidade: 2, tamanho: "tam-40" }],
      itens,
      p,
      "epi",
      "entrega",
    ),
    null,
  );
  assert.match(
    validarLinhasTamanho(
      [{ item_id: "b", quantidade: 1, tamanho: "" }],
      itens,
      p,
      "epi",
      "entrega",
    ),
    /Escolha o tamanho/,
  );
  assert.match(
    validarLinhasTamanho(
      [
        { item_id: "b", quantidade: 2, tamanho: "tam-40" },
        { item_id: "b", quantidade: 1, tamanho: "tam-40" },
      ],
      itens,
      p,
      "epi",
      "entrega",
    ),
    /passa do estoque.*40.*\(2\)/,
  );
  assert.equal(
    validarLinhasTamanho(
      [{ item_id: "b", quantidade: 1, tamanho: SEM_TAMANHO }],
      itens,
      p,
      "epi",
      "baixa",
    ),
    null,
  );
  assert.equal(
    validarLinhasTamanho(
      [{ item_id: "c", quantidade: 5, tamanho: "" }],
      itens,
      p,
      "epi",
      "entrega",
    ),
    null,
  );
  assert.match(
    validarLinhasTamanho(
      [{ item_id: "c", quantidade: 6, tamanho: "" }],
      itens,
      p,
      "epi",
      "entrega",
    ),
    /passa do estoque/,
  );
  // Entrada: precisa de tamanho autorizado e ativo; não confere saldo.
  assert.match(
    validarLinhasTamanho(
      [{ item_id: "b", quantidade: 9, tamanho: SEM_TAMANHO }],
      itens,
      p,
      "epi",
      "entrada",
    ),
    /Escolha o tamanho/,
  );
  assert.equal(
    validarLinhasTamanho(
      [{ item_id: "b", quantidade: 9, tamanho: "tam-43" }],
      itens,
      p,
      "epi",
      "entrada",
    ),
    null,
  );
});

test("uniforme também controla por tamanho quando a subcategoria tem associação", async () => {
  const p = gerais();
  p.associacoes.push({
    subcategoriaId: "sub-uniformes-camisa",
    tamanhos: ["tam-p", "tam-m"],
    unidades: [],
  });
  const camisa = {
    id: "u",
    nome: "Camisa",
    categoria: "Camisa",
    subcategoria_id: "sub-uniformes-camisa",
    estoque_atual: 0,
  };
  assert.equal(controlaTamanho(p, "uniforme", camisa), true);
  assert.deepEqual(
    unidadesAutorizadasDoProduto(p, "uniforme", camisa),
    [],
    "sem unidade autorizada, nada é exigido",
  );
  // No demo (Gerais padrão), Camisa não tem associação: segue com estoque único.
  const item = await inserir("uniformes", {
    id: crypto.randomUUID(),
    empresa_id: "emp-a",
    nome: "Camisa",
    categoria: "Camisa",
    subcategoria_id: "sub-uniformes-camisa",
    estoque_atual: 1,
  });
  const { error } = await demoSupabase.from("compras_uniformes").insert({
    empresa_id: "emp-a",
    item_id: item.id,
    fornecedor: "ACME",
    data_compra: "2026-10-01",
    quantidade: 2,
    valor_unitario: 5,
  });
  assert.equal(error, null);
  const atual = await ler("uniformes", item.id);
  assert.equal(atual.estoque_atual, 3);
  assert.equal(atual.saldos_tamanho, undefined);
});
