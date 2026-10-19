import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { editarManutencao, gruposDaManutencao, registrarManutencao, servicoDoLocal } from "../src/lib/registros-veiculo.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const hoje = new Date(2026, 9, 13, 12);
const ACOES = [
  { id: "a1", nome: "Freios", subitens: [{ id: "s1", nome: "Pastilha" }, { id: "s2", nome: "Disco" }, { id: "s3", nome: "Fluido" }] },
  { id: "a2", nome: "Pneus", subitens: [{ id: "p1", nome: "Alinhamento" }] },
];
const base = { veiculoId: "v1", data: "2026-10-10", km: "1000", tipo: "Preventiva" };
const gemape = { local: "empresa" };
const oficina = { local: "terceiro", nome: "Oficina" };
const registrar = (entrada, s = memoria()) => registrarManutencao({ ...base, ...entrada }, s, hoje, ACOES);

test("cada item guarda o local e os custos; o custo de cada local é a soma dos seus itens", () => {
  const m = registrar({
    locais: [gemape, oficina],
    grupos: [{ acaoId: "a1", itens: [
      { subitemId: "s1", localIndice: 0, custoPecas: "100", custoMaoDeObra: "50" },
      { subitemId: "s2", localIndice: 1, custoPecas: "10,50", custoMaoDeObra: "5" },
      { subitemId: "s3", localIndice: 0, custoPecas: "", custoMaoDeObra: "20" },
    ] }],
  });
  assert.deepEqual([m.locais[0].custoPecas, m.locais[0].custoMaoDeObra, m.locais[0].custoTotal], [100, 70, 170]);
  assert.deepEqual([m.locais[1].custoPecas, m.locais[1].custoMaoDeObra, m.locais[1].custoTotal], [10.5, 5, 15.5]);
  assert.equal(m.custoTotal, 185.5);
  const itens = gruposDaManutencao(m)[0].itens;
  assert.deepEqual(itens.map((i) => [i.subitemId, i.localIndice, i.custoPecas, i.custoMaoDeObra]), [["s1", 0, 100, 50], ["s2", 1, 10.5, 5], ["s3", 0, 0, 20]]);
});

test("a descrição do serviço do local vem dos itens dele, agrupada por grupo, sem digitar", () => {
  const m = registrar({
    locais: [{ ...gemape, descricao: "texto digitado que deve ser ignorado" }, oficina],
    grupos: [
      { acaoId: "a1", itens: [{ subitemId: "s1", localIndice: 0 }, { subitemId: "s2", localIndice: 1 }, { subitemId: "s3", localIndice: 0 }] },
      { acaoId: "a2", itens: [{ subitemId: "p1", localIndice: 0 }] },
    ],
  });
  assert.equal(m.locais[0].descricao, "Freios: Pastilha, Fluido; Pneus: Alinhamento");
  assert.equal(m.locais[1].descricao, "Freios: Disco");
});

test("custo do item vazio vale 0 e o local com itens não exige os custos digitados", () => {
  const m = registrar({ locais: [gemape], grupos: [{ acaoId: "a1", itens: [{ subitemId: "s1", localIndice: 0 }] }] });
  assert.equal(m.locais[0].custoTotal, 0);
});

test("local sem itens continua como antes: custos digitados e descrição livre", () => {
  const m = registrar({
    locais: [gemape, { ...oficina, descricao: "Retífica", custoPecas: "1.000,50", custoMaoDeObra: "200" }],
    grupos: [{ acaoId: "a1", itens: [{ subitemId: "s1", localIndice: 0, custoPecas: "10", custoMaoDeObra: "5" }] }],
  });
  assert.equal(m.locais[0].custoTotal, 15);
  assert.equal(m.locais[1].descricao, "Retífica");
  assert.equal(m.locais[1].custoTotal, 1200.5);
  assert.equal(m.custoTotal, 1215.5);
  assert.throws(() => registrar({ locais: [{ ...oficina, custoPecas: "", custoMaoDeObra: "1" }], grupos: [{ acaoId: "a1", itens: [{ subitemId: "s1" }] }] }), /custo das peças/);
});

test("validações: custo sem local, local fora da lista e custo inválido", () => {
  const tenta = (itens) => () => registrar({ locais: [gemape, oficina], grupos: [{ acaoId: "a1", itens }] });
  assert.throws(tenta([{ subitemId: "s1", custoPecas: "10" }]), /Escolha onde foi feito o item Pastilha/);
  assert.throws(tenta([{ subitemId: "s1", localIndice: 2 }]), /local do item Pastilha/);
  assert.throws(tenta([{ subitemId: "s1", localIndice: -1 }]), /local do item Pastilha/);
  assert.throws(tenta([{ subitemId: "s1", localIndice: 0, custoPecas: "abc" }]), /custo das peças de Pastilha/);
  assert.throws(tenta([{ subitemId: "s1", localIndice: 0, custoMaoDeObra: "-1" }]), /custo da mão de obra de Pastilha/);
});

test("item sem local e sem custo continua valendo (registros antigos e itens só marcados)", () => {
  const m = registrar({ locais: [{ ...gemape, custoPecas: "10", custoMaoDeObra: "5" }], grupos: [{ acaoId: "a1", itens: [{ subitemId: "s1" }] }] });
  assert.equal(m.custoTotal, 15);
  assert.equal(gruposDaManutencao(m)[0].itens[0].localIndice, undefined);
});

test("editar mantém o local e os custos dos itens", () => {
  const s = memoria();
  const m = registrar({ locais: [gemape], grupos: [{ acaoId: "a1", itens: [{ subitemId: "s1", localIndice: 0, custoPecas: "10", custoMaoDeObra: "5" }] }] }, s);
  const e = editarManutencao(m.id, { ...base, locais: [gemape], grupos: [{ acaoId: "a1", itens: [{ subitemId: "s1", localIndice: 0, custoPecas: "20", custoMaoDeObra: "5" }] }] }, s, hoje, ACOES);
  assert.equal(e.custoTotal, 25);
  assert.equal(gruposDaManutencao(e)[0].itens[0].custoPecas, 20);
});

test("servicoDoLocal monta o texto só com os itens do local", () => {
  const grupos = [
    { nome: "Freios", itens: [{ nome: "Pastilha", localIndice: 0 }, { nome: "Disco", localIndice: 1 }] },
    { nome: "Pneus", itens: [{ nome: "Alinhamento" }] },
  ];
  assert.equal(servicoDoLocal(grupos, 0), "Freios: Pastilha");
  assert.equal(servicoDoLocal(grupos, 1), "Freios: Disco");
  assert.equal(servicoDoLocal(grupos, 2), "");
});

const dialogo = readFileSync(new URL("../src/components/modules/NovaManutencaoDialog.tsx", import.meta.url), "utf8");

test("a tela tem a caixa de busca dos grupos e ações", () => {
  assert.match(dialogo, /filtrarPaisEFilhos/);
  assert.match(dialogo, /aria-label="Buscar grupo ou ação"/);
});

test("em Grupos de ações a ação marcada só escolhe Onde foi feito; os custos ficam dentro do local", () => {
  assert.match(dialogo, /aria-label=\{`Onde foi feito: \$\{sub\.nome\}`\}/);
  assert.doesNotMatch(dialogo, /Custo das peças de \$\{sub\.nome\}/);
  assert.doesNotMatch(dialogo, /Custo da mão de obra de \$\{sub\.nome\}/);
});

test("cada ação puxada para o local tem os campos de peças e de mão de obra dentro do local", () => {
  const lista = dialogo.indexOf("itensDoLocal(l.chave).map((a) =>");
  assert.ok(lista > 0, "lista de ações do local");
  const peças = dialogo.indexOf("Custo das peças de ${a.sub.nome}");
  const mao = dialogo.indexOf("Custo da mão de obra de ${a.sub.nome}");
  assert.ok(peças > lista && mao > lista, "campos dentro da lista do local");
  assert.match(dialogo, /mudarDetalhe\(a\.grupo\.id, a\.sub\.id, \{ pecas: e\.target\.value \}\)/);
  assert.match(dialogo, /mudarDetalhe\(a\.grupo\.id, a\.sub\.id, \{ mao: e\.target\.value \}\)/);
});

test("o seletor Onde foi feito some quando há um único local e a ação já está nele", () => {
  assert.match(dialogo, /locais\.length !== 1 \|\| !/);
});

test("o serviço do local é o texto gerado dos itens (servicoDoLocal) quando há itens nele", () => {
  assert.match(dialogo, /servicoDoLocal\(/);
});

test("o local lista cada ação marcada com peças, mão de obra, total e a observação dela", () => {
  assert.match(dialogo, /itensDoLocal\(l\.chave\)\.map\(\(a\) =>/);
  assert.match(dialogo, /data-detalhe-item/);
  assert.match(dialogo, /em peças/);
  assert.match(dialogo, /em mão de obra/);
  assert.match(dialogo, /marcados\[a\.grupo\.id\]\?\.\[a\.sub\.id\]/);
});

test("o seletor Onde foi feito ignora valor vazio (o Radix o dispara ao montar o local novo e apagaria a atribuição automática)", () => {
  assert.match(dialogo, /onValueChange=\{\(v\) => v && mudarDetalhe\(grupo\.id, sub\.id, \{ chaveLocal: v \}\)\}/);
});

test("revisão: o serviço gerado do local não é cortado em 300 caracteres quando há muitas ações", () => {
  const subitens = Array.from({ length: 12 }, (_, i) => ({ id: `x${i}`, nome: `Ação de revisão número ${i + 1} do veículo` }));
  const acoes = [{ id: "g1", nome: "Revisão geral do sistema de transmissão e fluidos", subitens }];
  const m = registrarManutencao(
    { ...base, locais: [gemape], grupos: [{ acaoId: "g1", itens: subitens.map((s) => ({ subitemId: s.id, localIndice: 0 })) }] },
    memoria(), hoje, acoes,
  );
  assert.ok(m.locais[0].descricao.length > 300, `descrição de ${m.locais[0].descricao.length} caracteres`);
  assert.ok(m.locais[0].descricao.endsWith("Ação de revisão número 12 do veículo"));
});

test("revisão: o parágrafo do serviço gerado não leva aria-label (rótulo em texto simples é ignorado)", () => {
  assert.doesNotMatch(dialogo, /aria-label=\{`Serviço, \$\{titulo\}`\}/);
});
