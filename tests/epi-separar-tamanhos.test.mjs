import { test } from "node:test";
import assert from "node:assert/strict";

import { aplicarSeparacao, planejarSeparacao } from "../src/lib/epi-separar-tamanhos.ts";

const regra = { sigla: "EPI", inicial: "0001" };
const ordem = ["t-p", "t-m", "t-g"];
const saldosDe = (l) => l.saldos_tamanho ?? { "sem-tamanho": Number(l.estoque_atual ?? 0) };
const novoId = (() => { let n = 0; return () => `novo-${++n}`; })();

function base() {
  return {
    empresas: [{ id: "e1" }, { id: "e2" }],
    epis_catalogo: [],
    enderecamentos: [{ id: "end1", empresa_id: "e1", codigo_produto: "EPI-0001", rua: "A", prateleira: "1", apartamento: "2" }],
    movimentacoes: [{ id: "m1", item_id: "a1", tamanho_id: "t-p", quantidade: 3, tipo_movimentacao: "Entrada" }],
    epis: [
      { id: "a1", empresa_id: "e1", codigo_sku: "EPI-0001", nome: "Luva de raspa", categoria: "Luva", subcategoria_id: "sub-luva", unidade_id: "u-par", unidade_medida: "Par", status: "Ativo",
        estoque_atual: 10, estoque_minimo: 4, saldos_tamanho: { "t-p": 4, "t-m": 6 }, minimos_tamanho: { "t-p": 2, "t-m": 3 }, tamanhos_selecionados: ["t-p", "t-m"] },
      { id: "a2", empresa_id: "e2", codigo_sku: "EPI-0001", nome: "luva de  raspa", categoria: "Luva", subcategoria_id: "sub-luva", unidade_id: "u-par", unidade_medida: "Par", status: "Ativo",
        estoque_atual: 5, estoque_minimo: 1, saldos_tamanho: { "t-g": 5 }, minimos_tamanho: { "t-g": 1 } },
      { id: "b1", empresa_id: "e1", codigo_sku: "EPI-0002", nome: "Capacete", categoria: "Capacete", subcategoria_id: "sub-cap", status: "Ativo", estoque_atual: 7, estoque_minimo: 2 },
      { id: "c1", empresa_id: "e1", codigo_sku: "EPI-0003", nome: "Bota", categoria: "Bota", subcategoria_id: "sub-bota", status: "Ativo", estoque_atual: 2, estoque_minimo: 1, saldos_tamanho: { "t-m": 2 }, minimos_tamanho: { "t-m": 1 } },
    ],
  };
}
const opcoes = { regra, ordemTamanhos: ordem, saldosDe };

test("o plano separa só o EPI com mais de um tamanho, juntando as empresas pela descrição", () => {
  const plano = planejarSeparacao(base(), opcoes);
  assert.equal(plano.grupos.length, 1);
  const g = plano.grupos[0];
  assert.equal(g.nome, "Luva de raspa");
  assert.deepEqual(g.tamanhos.map((t) => [t.tamanhoId, t.codigo]), [["t-p", "EPI-0004"], ["t-m", "EPI-0005"], ["t-g", "EPI-0006"]]);
  assert.deepEqual(g.antigos.map((a) => a.id), ["a1", "a2"]);
});

test("a prévia avisa de endereços copiados e de associações que ficam no código antigo", () => {
  const plano = planejarSeparacao(base(), { ...opcoes, codigosFabrica: [{ empresa_id: "e1", codigo_produto: "EPI-0001" }] });
  assert.equal(plano.grupos[0].enderecosACopiar, 3);
  assert.equal(plano.grupos[0].associacoesNfe, 1);
});

test("aplicar cria o catálogo, leva saldo e mínimo por empresa e zera o antigo, sem mexer no histórico", () => {
  const dados = base();
  const historico = JSON.stringify(dados.movimentacoes);
  const r = aplicarSeparacao(dados, opcoes, novoId, "2026-10-02T12:00:00.000Z");
  assert.equal(r.erro, undefined);
  assert.equal(dados.epis_catalogo.length, 3);
  const cat = (t) => dados.epis_catalogo.find((c) => c.tamanho_id === t);
  assert.equal(cat("t-m").codigo_sku, "EPI-0005");
  assert.equal(cat("t-p").estoque_minimo, 2);
  const estoque = (t, emp) => dados.epis.find((e) => e.catalogo_id === cat(t).id && e.empresa_id === emp);
  assert.equal(estoque("t-p", "e1").estoque_atual, 4);
  assert.deepEqual(estoque("t-p", "e1").saldos_tamanho, { "t-p": 4 });
  assert.equal(estoque("t-p", "e1").estoque_minimo, 2);
  assert.equal(estoque("t-m", "e1").estoque_atual, 6);
  assert.equal(estoque("t-g", "e2").estoque_atual, 5);
  assert.equal(estoque("t-g", "e1").estoque_atual, 0);
  const a1 = dados.epis.find((e) => e.id === "a1");
  assert.equal(a1.estoque_atual, 0);
  assert.deepEqual(a1.saldos_tamanho, { "t-p": 0, "t-m": 0 });
  assert.equal(a1.status, "Inativo");
  assert.equal(a1.separado_em, "2026-10-02T12:00:00.000Z");
  assert.equal(dados.epis.find((e) => e.id === "b1").estoque_atual, 7);
  assert.equal(dados.epis.find((e) => e.id === "c1").estoque_atual, 2);
  assert.equal(JSON.stringify(dados.movimentacoes), historico);
  // O soma dos saldos de antes continua igual: 10 + 5.
  const somaLuva = dados.epis.filter((e) => e.catalogo_id).reduce((n, e) => n + e.estoque_atual, 0);
  assert.equal(somaLuva, 15);
});

test("o endereço do código antigo é copiado para os novos, sem repetir", () => {
  const dados = base();
  aplicarSeparacao(dados, opcoes, novoId, "2026-10-02T12:00:00.000Z");
  const novos = dados.enderecamentos.filter((e) => e.codigo_produto !== "EPI-0001");
  assert.deepEqual(novos.map((e) => e.codigo_produto).sort(), ["EPI-0004", "EPI-0005", "EPI-0006"]);
  assert.ok(novos.every((e) => e.empresa_id === "e1" && e.rua === "A"));
  assert.equal(dados.enderecamentos.find((e) => e.id === "end1").codigo_produto, "EPI-0001");
});

test("saldo em Sem tamanho fica no antigo, que continua ativo", () => {
  const dados = base();
  dados.epis[0].saldos_tamanho = { "t-p": 4, "t-m": 6, "sem-tamanho": 3 };
  dados.epis[0].estoque_atual = 13;
  aplicarSeparacao(dados, opcoes, novoId, "2026-10-02T12:00:00.000Z");
  const a1 = dados.epis.find((e) => e.id === "a1");
  assert.equal(a1.estoque_atual, 3);
  assert.deepEqual(a1.saldos_tamanho, { "t-p": 0, "t-m": 0, "sem-tamanho": 3 });
  assert.equal(a1.status, "Ativo");
});

test("tamanho que já está no catálogo é reaproveitado e recebe o saldo, sem duplicar", () => {
  const dados = base();
  dados.epis_catalogo.push({ id: "k1", codigo_sku: "EPI-0009", nome: "Luva de Raspa", subcategoria_id: "sub-luva", tamanho_id: "t-p", estoque_minimo: 1, status: "Ativo" });
  dados.epis.push({ id: "k1e1", empresa_id: "e1", catalogo_id: "k1", codigo_sku: "EPI-0009", nome: "Luva de Raspa", estoque_atual: 2, estoque_minimo: 1, saldos_tamanho: { "t-p": 2 }, status: "Ativo" });
  aplicarSeparacao(dados, opcoes, novoId, "2026-10-02T12:00:00.000Z");
  assert.equal(dados.epis_catalogo.filter((c) => c.tamanho_id === "t-p").length, 1);
  const existente = dados.epis.find((e) => e.id === "k1e1");
  assert.equal(existente.estoque_atual, 6);
  assert.deepEqual(existente.saldos_tamanho, { "t-p": 6 });
});

test("rodar de novo não faz nada: o antigo já separado não entra no plano", () => {
  const dados = base();
  aplicarSeparacao(dados, opcoes, novoId, "2026-10-02T12:00:00.000Z");
  const antes = JSON.stringify(dados);
  const r = aplicarSeparacao(dados, opcoes, novoId, "2026-10-02T13:00:00.000Z");
  assert.equal(r.separados, 0);
  assert.equal(JSON.stringify(dados), antes);
});

test("sem regra de código, nada é gravado", () => {
  const dados = base();
  const antes = JSON.stringify(dados);
  const r = aplicarSeparacao(dados, { ...opcoes, regra: null }, novoId, "2026-10-02T12:00:00.000Z");
  assert.match(r.erro, /regra do código/);
  assert.equal(JSON.stringify(dados), antes);
});

import { readFileSync } from "node:fs";

test("a tela mostra a prévia, só o Administrador separa e o demo expõe a operação", () => {
  const tela = readFileSync(new URL("../src/components/modules/CadastroEpi.tsx", import.meta.url), "utf8");
  assert.match(tela, /plano\.grupos\.length > 0 && isAdmin/);
  assert.match(tela, /rpc\("separar_epis_por_tamanho"\)/);
  assert.match(tela, /travaSeparar\.current/);
  const demo = readFileSync(new URL("../src/integrations/supabase/demo-client.ts", import.meta.url), "utf8");
  assert.match(demo, /nome === "separar_epis_por_tamanho"/);
});
