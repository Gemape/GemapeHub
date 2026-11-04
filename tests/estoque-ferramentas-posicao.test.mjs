import assert from "node:assert/strict";
import test from "node:test";

import { limiteDaCaixa, posicaoDasFerramentas } from "../src/lib/estoque-ferramentas-posicao.ts";

const mov = (tipo, quantidade, extra = {}) => ({ modulo: "ferramenta", item_id: "f1", empregado_id: null, motivo_baixa: null, tipo_movimentacao: tipo, quantidade, ...extra });
const caixa = [{ caixa_id: "c1", ferramenta_id: "f1", quantidade: 4 }];

test("entradas somam, baixas subtraem e a posição reparte o saldo entre caixa, empregado e sem caixa", () => {
  const movimentos = [
    mov("Entrada", 10),
    mov("Saida", 1, { empregado_id: "e1", caixa_id: "c1" }), // entrega
    mov("Saida", 1, { empregado_id: "e1", caixa_id: "c1", motivo_baixa: "Perda" }), // o empregado perdeu uma
    mov("Saida", 1, { caixa_id: "c1", motivo_baixa: "Quebra" }), // quebra dentro da caixa
    mov("Saida", 1, { motivo_baixa: "Desgaste Natural" }), // baixa avulsa, sem caixa
  ];
  const [p] = posicaoDasFerramentas([{ id: "f1", estoque_atual: 7 }], movimentos, caixa);
  assert.equal(p.entradas, 10);
  assert.equal(p.baixas, 3);
  assert.equal(p.saldoEsperado, 7);
  assert.equal(p.naCaixa, 2, "4 na caixa − 2 baixas feitas por ela");
  assert.equal(p.comEmpregado, 0, "a entrega foi perdida");
  assert.equal(p.guardada, 2);
  assert.equal(p.semCaixa, 5);
  assert.equal(p.guardada + p.comEmpregado + p.semCaixa, p.saldo);
  assert.deepEqual(p.divergencias, []);
});

test("a ferramenta entregue continua no saldo, só muda de lugar", () => {
  const [p] = posicaoDasFerramentas([{ id: "f1", estoque_atual: 4 }], [mov("Entrada", 4), mov("Saida", 2, { empregado_id: "e1", caixa_id: "c1" }), mov("Devolucao", 1, { empregado_id: "e1", caixa_id: "c1" })], caixa);
  assert.equal(p.saldo, 4);
  assert.equal(p.comEmpregado, 1);
  assert.equal(p.guardada, 3);
  assert.equal(p.semCaixa, 0);
});

test("saldo diferente de entradas menos baixas e caixa maior que o estoque são divergências", () => {
  const [a] = posicaoDasFerramentas([{ id: "f1", estoque_atual: 9 }], [mov("Entrada", 4)], caixa);
  assert.match(a.divergencias[0], /não bate/);
  const [b] = posicaoDasFerramentas([{ id: "f1", estoque_atual: 2 }], [mov("Entrada", 2)], caixa);
  assert.equal(b.semCaixa, -2);
  assert.match(b.divergencias[0], /a mais do que o estoque/);
});

test("ferramenta sem caixa fica toda como sem caixa; o limite da caixa soma o que já saiu dela por baixa", () => {
  const [p] = posicaoDasFerramentas([{ id: "f1", estoque_atual: 3 }], [mov("Entrada", 3)], []);
  assert.equal(p.caixaId, null);
  assert.equal(p.semCaixa, 3);
  assert.equal(limiteDaCaixa(3, 0), 3);
  assert.equal(limiteDaCaixa(2, 2), 4);
});

// ---------- dados de teste ----------
import { dadosIniciais as base } from "../src/integrations/supabase/demo-client.ts";
import { prepararDadosDeTeste } from "../src/lib/dados-teste/aplicar.ts";

test("nos dados de teste, o estoque das ferramentas bate com as entradas, as baixas e as caixas, e há posição com empregado e baixa", () => {
  const m = new Map();
  const s = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
  assert.equal(prepararDadosDeTeste(s, base, new Date("2026-10-22T12:00:00-03:00")), "aplicado");
  const d = JSON.parse(s.getItem("gemape-demo-dados"));
  const posicoes = posicaoDasFerramentas(d.ferramentas, d.movimentacoes, d.caixa_ferramenta_itens);
  assert.ok(posicoes.length >= 20);
  for (const p of posicoes) assert.deepEqual(p.divergencias, [], p.ferramentaId);
  assert.ok(posicoes.some((p) => p.comEmpregado > 0), "uma ferramenta está com o portador");
  assert.ok(posicoes.some((p) => p.baixas > 0), "uma ferramenta sofreu baixa pela caixa");
  for (const p of posicoes.filter((x) => x.caixaId)) assert.equal(p.guardada + p.comEmpregado + Math.max(p.semCaixa, 0), p.saldo, p.ferramentaId);
});

import { readFileSync } from "node:fs";
import { disponivelNaCaixa } from "../src/lib/controle-caixa.ts";
import { ferramentasAcimaDoEstoque } from "../src/lib/estoque-ferramentas-posicao.ts";

test("a caixa não guarda mais do que o estoque tem", () => {
  const limite = (id) => ({ a: 3, b: 5 })[id];
  const nome = (id) => `Ferr ${id}`;
  assert.equal(ferramentasAcimaDoEstoque([{ ferramenta_id: "a", quantidade: 3 }, { ferramenta_id: "b", quantidade: 1 }], limite, nome), null);
  assert.match(ferramentasAcimaDoEstoque([{ ferramenta_id: "a", quantidade: 4 }], limite, nome) ?? "", /Ferr a: o estoque tem 3/);
});

test("o guardado na caixa desconta também o que foi baixado de quem estava com o empregado", () => {
  // 5 na caixa, 2 entregues, 1 perdido pelo empregado: sobra 1 com ele e 3 guardadas (e não 4).
  assert.equal(disponivelNaCaixa(5, 1, 1), 3);
});

test("a tela de Estoque de Ferramentas mostra a posição por caixa e o limite vale no cadastro da caixa", () => {
  const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
  const estoque = ler("components/modules/EstoqueModulo.tsx");
  assert.match(estoque, /Posição por caixa/);
  assert.match(estoque, /posicaoDasFerramentas\(itens, movimentos, itensDeCaixa\)/);
  assert.match(ler("components/modules/CaixaGestaoDialogs.tsx"), /ferramentasAcimaDoEstoque\(/);
});

test("Uniformes > Compras: botões no topo à esquerda e compras, sugestão de compras e devoluções em listas separadas por botões", () => {
  const t = readFileSync(new URL("../src/components/modules/UniformesComprasModulo.tsx", import.meta.url), "utf8");
  assert.ok(t.indexOf("Registrar Compra</Button>") < t.indexOf('<SugestaoComprasModulo modulo="uniforme"'), "os botões vêm antes da sugestão");
  assert.match(t, /aria-label="Compras, sugestão de compras ou devoluções"/);
  assert.match(t, /visao === "compras" && <div className="panel/);
  assert.match(t, /visao === "devolucoes" && <EntradasDeUsados/);
  assert.match(t, /visao === "sugestao" && <SugestaoComprasModulo modulo="uniforme"/, "a sugestão de compras tem o seu botão e sai da lista de compras");
  assert.match(t, /\["sugestao", "Sugestão de compras"\]/);
});
