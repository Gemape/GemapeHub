import test from "node:test";
import assert from "node:assert/strict";

import { lerManutencoes, registrarManutencao, editarManutencao, registrarAbastecimento } from "../src/lib/registros-veiculo.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const hoje = new Date(2026, 9, 7, 12);
const ACOES = [
  { id: "a1", nome: "Freios", subitens: [{ id: "s1", nome: "Pastilha" }, { id: "s2", nome: "Disco" }] },
  { id: "a2", nome: "Motor", subitens: [{ id: "s3", nome: "Óleo" }] },
];
const base = { veiculoId: "v1", data: "2026-10-01", km: "1000", tipo: "Preventiva", local: "empresa", custoPecas: "100", custoMaoDeObra: "50" };
const criar = (s) => registrarManutencao({ ...base, grupos: [{ acaoId: "a1", itens: [{ subitemId: "s1" }] }] }, s, hoje, ACOES);

test("editar troca grupos, ações, local e custos mantendo o código do registro e a data de criação", () => {
  const s = memoria();
  const m = criar(s);
  const e = editarManutencao(m.id, {
    ...base, km: "1200", local: "terceiro", localNome: "Oficina", custoPecas: "300", custoMaoDeObra: "0",
    grupos: [{ acaoId: "a1", itens: [{ subitemId: "s2", observacao: "trocado" }] }, { acaoId: "a2", itens: [{ subitemId: "s3" }] }],
  }, s, hoje, ACOES);
  assert.equal(e.id, m.id);
  assert.equal(e.criadoEm, m.criadoEm);
  assert.equal(e.km, 1200);
  assert.equal(e.local, "terceiro");
  assert.equal(e.custoTotal, 300);
  assert.deepEqual(e.grupos.map((g) => g.acaoId), ["a1", "a2"]);
  assert.equal(lerManutencoes(s).length, 1);
  assert.equal(lerManutencoes(s)[0].km, 1200);
});

test("editar valida como o cadastro e não grava nada se algo estiver errado", () => {
  const s = memoria();
  const m = criar(s);
  const tenta = (extra) => () => editarManutencao(m.id, { ...base, grupos: [{ acaoId: "a1", itens: [{ subitemId: "s1" }] }], ...extra }, s, hoje, ACOES);
  assert.throws(tenta({ grupos: [] }), /grupo/i);
  assert.throws(tenta({ local: "" }), /local/i);
  assert.throws(tenta({ custoPecas: "x" }), /peças/i);
  assert.throws(tenta({ tipo: "Corretiva", descricao: "" }), /descri/i);
  assert.throws(() => editarManutencao("nao-existe", { ...base, grupos: [{ acaoId: "a1", itens: [{ subitemId: "s1" }] }] }, s, hoje, ACOES), /não encontrada/i);
  assert.equal(lerManutencoes(s)[0].km, 1000);
});

test("o km da própria manutenção não conflita com ela mesma, mas continua valendo contra os outros registros", () => {
  const s = memoria();
  const m = criar(s); // 01/10, 1000 km
  registrarAbastecimento({ veiculoId: "v1", data: "2026-10-05", hora: "08:00", km: "1500", litros: "30", valor: "200" }, s, hoje);
  const ok = { ...base, grupos: [{ acaoId: "a1", itens: [{ subitemId: "s1" }] }] };
  // Mesmo km, mesma data: vale.
  assert.doesNotThrow(() => editarManutencao(m.id, ok, s, hoje, ACOES));
  // Subir para 1600 antes de um abastecimento de 1500 quebra a ordem.
  assert.throws(() => editarManutencao(m.id, { ...ok, km: "1600" }, s, hoje, ACOES), /km/i);
});
