import test from "node:test";
import assert from "node:assert/strict";

import { lerManutencoes, registrarManutencao, resumoManutencao, gruposDaManutencao } from "../src/lib/registros-veiculo.ts";
import { sugestoesPreventivas } from "../src/lib/extrato-veiculo.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const hoje = new Date(2026, 9, 5, 12);
const ACOES = [
  { id: "a1", nome: "Freios", subitens: [{ id: "s1", nome: "Pastilha" }, { id: "s2", nome: "Disco" }] },
  { id: "a2", nome: "Motor", subitens: [{ id: "s3", nome: "Óleo" }] },
  { id: "a3", nome: "Lavagem", subitens: [] },
];
const base = { veiculoId: "v1", data: "2026-10-01", km: "1000", tipo: "Preventiva", local: "empresa", custoPecas: "0", custoMaoDeObra: "0" };

test("uma manutenção abrange vários grupos de ações, cada um com as suas ações e observações", () => {
  const s = memoria();
  const m = registrarManutencao({
    ...base,
    grupos: [
      { acaoId: "a1", itens: [{ subitemId: "s1", observacao: " dianteira " }, { subitemId: "s2" }] },
      { acaoId: "a2", itens: [{ subitemId: "s3" }] },
      { acaoId: "a3", itens: [] },
    ],
  }, s, hoje, ACOES);
  assert.equal(m.grupos.length, 3);
  assert.deepEqual(m.grupos[0], {
    acaoId: "a1", nome: "Freios",
    itens: [{ subitemId: "s1", nome: "Pastilha", observacao: "dianteira" }, { subitemId: "s2", nome: "Disco", observacao: "" }],
  });
  assert.equal(m.acaoId, "a1");
  assert.deepEqual(m.itens.map((i) => i.nome), ["Pastilha", "Disco", "Óleo"]);
  assert.equal(lerManutencoes(s).length, 1);
});

test("a validação vale para cada grupo: obrigatório, conhecido, sem repetição e com ações marcadas", () => {
  const s = memoria();
  const tenta = (grupos) => () => registrarManutencao({ ...base, grupos }, s, hoje, ACOES);
  assert.throws(tenta([]), /grupo/i);
  assert.throws(tenta([{ acaoId: "zz", itens: [] }]), /grupo/i);
  assert.throws(tenta([{ acaoId: "a1", itens: [{ subitemId: "s1" }] }, { acaoId: "a1", itens: [{ subitemId: "s2" }] }]), /repetido/i);
  assert.throws(tenta([{ acaoId: "a1", itens: [{ subitemId: "s1" }] }, { acaoId: "a2", itens: [] }]), /Motor/);
  assert.throws(tenta([{ acaoId: "a1", itens: [{ subitemId: "s3" }] }]), /não pertence/i);
  assert.throws(tenta([{ acaoId: "a1", itens: [{ subitemId: "s1" }, { subitemId: "s1" }] }]), /repetida/i);
  assert.equal(lerManutencoes(s).length, 0);
});

test("a entrada antiga (um grupo só, com acaoId e itens) continua valendo e vira um grupo", () => {
  const m = registrarManutencao({ ...base, acaoId: "a1", itens: [{ subitemId: "s1" }] }, memoria(), hoje, ACOES);
  assert.equal(m.grupos.length, 1);
  assert.equal(m.grupos[0].acaoId, "a1");
  assert.equal(m.acaoId, "a1");
});

test("o resumo lista cada grupo com as suas ações e aceita registro antigo sem grupos", () => {
  const m = registrarManutencao({
    ...base, tipo: "Corretiva", descricao: "barulho",
    grupos: [{ acaoId: "a1", itens: [{ subitemId: "s1" }] }, { acaoId: "a2", itens: [{ subitemId: "s3" }] }],
  }, memoria(), hoje, ACOES);
  const nome = (id) => ACOES.find((a) => a.id === id)?.nome;
  assert.equal(resumoManutencao(m, nome), "Freios: Pastilha; Motor: Óleo · barulho");
  // Grupo apagado de Parâmetros: vale o nome guardado no registro.
  assert.equal(resumoManutencao(m, () => undefined), "Freios: Pastilha; Motor: Óleo · barulho");
  const antigo = { id: "x", veiculoId: "v1", data: "2026-01-01", km: 1, tipo: "Preventiva", acaoId: "a1", descricao: "", criadoEm: "" };
  assert.equal(resumoManutencao(antigo, nome), "Freios");
  assert.deepEqual(gruposDaManutencao(antigo).map((g) => g.acaoId), ["a1"]);
});

test("a preventiva de cada grupo da manutenção zera o prazo do plano de todos os grupos feitos", () => {
  const plano = { veiculoId: "v1", itens: [{ acaoId: "a1", km: 10000, meses: 6 }, { acaoId: "a2", km: 5000, meses: 3 }] };
  const m = registrarManutencao({
    ...base, grupos: [{ acaoId: "a1", itens: [{ subitemId: "s1" }] }, { acaoId: "a2", itens: [{ subitemId: "s3" }] }],
  }, memoria(), hoje, ACOES);
  const r = sugestoesPreventivas({ plano, acoes: ACOES, manutencoes: [m], kmAtual: 1100, hoje: "2026-10-05" });
  assert.deepEqual(r.map((x) => x.status), ["em_dia", "em_dia"]);
  assert.deepEqual(r.map((x) => x.ultima?.km), [1000, 1000]);
});
