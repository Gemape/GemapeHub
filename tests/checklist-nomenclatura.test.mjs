import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { checklistVisivelNaLista, nomeDoChecklist } from "../src/lib/checklist-veiculo.ts";

test("o nome do check list é Placa >> Periodicidade >> Responsável (decisão 90)", () => {
  assert.equal(
    nomeDoChecklist({ placa: "ABC1D23", periodicidade: "Semanal", responsavelNome: "Luana Vasconcelos" }),
    "ABC1D23 >> Semanal >> Luana Vasconcelos",
  );
  assert.equal(
    nomeDoChecklist({ placa: "  abc1d23 ", periodicidade: "Mensal", responsavelNome: "  Paulo   Silva " }),
    "ABC1D23 >> Mensal >> Paulo Silva",
  );
});

test("sem placa (empilhadeira), o nome usa a descrição do veículo no lugar da placa", () => {
  assert.equal(
    nomeDoChecklist({ placa: "", fallbackVeiculo: "Empilhadeira Hyster 2020", periodicidade: "Diário", responsavelNome: "José" }),
    "Empilhadeira Hyster 2020 >> Diário >> José",
  );
});

test("só o check list sem periodicidade E sem responsável fica fora da lista (dec 116)", () => {
  const ok = { periodicidade: "Semanal", responsavelNome: "Luana" };
  assert.equal(checklistVisivelNaLista(ok), true);
  assert.equal(checklistVisivelNaLista({ periodicidade: "", responsavelNome: "Luana" }), true);
  assert.equal(checklistVisivelNaLista({ periodicidade: "Semanal", responsavelNome: "  " }), true);
  assert.equal(checklistVisivelNaLista({ periodicidade: "", responsavelNome: "" }), false);
  assert.equal(checklistVisivelNaLista({ periodicidade: undefined, responsavelNome: undefined }), false);
  assert.equal(checklistVisivelNaLista({ periodicidade: "Anual", responsavelNome: "" }), false); // valor que não existe
  assert.equal(nomeDoChecklist({ placa: "abc1d23", periodicidade: "", responsavelNome: "" }), "ABC1D23 >> Não definida >> Não definido");
});

test("o módulo mostra o nome na lista e filtra os que não podem ser nomeados", () => {
  const modulo = readFileSync(new URL("../src/components/modules/ChecklistVeiculoModulo.tsx", import.meta.url), "utf8");
  assert.match(modulo, /checklists\.filter\(checklistVisivelNaLista\)/);
  assert.match(modulo, /nomeDe\(c\)/);
});

// ---------- Check list avulso (decisão 90) ----------
import { avaliarItem, concluirChecklist, gruposAplicaveis, iniciarChecklist, iniciarChecklistAvulso, lerChecklists } from "../src/lib/checklist-veiculo.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const agora = new Date(2026, 9, 6, 14, 30);
const GRUPOS = [
  { id: "g1", nome: "Carros · Exterior", itens: [{ id: "i1", nome: "Lataria" }, { id: "i2", nome: "Pneus" }], tiposVeiculo: ["carro"] },
  { id: "g2", nome: "Todos · Comuns", itens: [{ id: "i3", nome: "Limpeza" }], tiposVeiculo: ["*"] },
];
const avulso = (extra = {}) => ({ veiculoId: "v1", veiculoRotulo: "GEM-2026 · Fiat · Strada", tipoVeiculo: "Carro", grupos: gruposAplicaveis(GRUPOS, "carro"), ...extra });
const periodico = (extra = {}) => ({ ...avulso(), periodicidade: "Diário", responsavelId: "e1", responsavelNome: "Maria", ...extra });

test("avulso: sem periodicidade e sem responsável, com os itens do tipo do veículo, e fora da lista de periódicos", () => {
  const s = memoria();
  assert.throws(() => iniciarChecklistAvulso(avulso({ veiculoId: "" }), s, agora), /veículo/i);
  assert.throws(() => iniciarChecklistAvulso(avulso({ grupos: [] }), s, agora), /itens de check list/i);
  const c = iniciarChecklistAvulso(avulso(), s, agora);
  assert.equal(c.codigo, "CHK-0001");
  assert.equal(c.periodicidade, "");
  assert.equal(c.responsavelId, "");
  assert.equal(c.responsavelNome, "");
  assert.deepEqual(c.itens.map((i) => i.nome), ["Lataria", "Pneus", "Limpeza"]);
  assert.equal(checklistVisivelNaLista(c), false);
});

test("avulso e periódico não se bloqueiam: cada um tem o seu em andamento por veículo", () => {
  const s = memoria();
  iniciarChecklistAvulso(avulso(), s, agora);
  assert.throws(() => iniciarChecklistAvulso(avulso(), s, agora), /avulso em andamento/i);
  const p = iniciarChecklist(periodico(), s, agora); // o avulso não impede o periódico
  assert.equal(checklistVisivelNaLista(p), true);
  assert.throws(() => iniciarChecklist(periodico(), s, agora), /em andamento/i);
  assert.equal(lerChecklists(s).length, 2);
});

test("avulso concluído com item NOK gera ocorrência, mesmo sem responsável", () => {
  const s = memoria();
  const c = iniciarChecklistAvulso(avulso(), s, agora);
  c.itens.forEach((i, n) => avaliarItem(c.id, i.id, { avaliacao: n === 0 ? "NOK" : "OK", observacao: n === 0 ? "Amassado" : "" }, s));
  const concluido = concluirChecklist(c.id, s, agora);
  assert.equal(concluido.status, "Concluído");
  assert.equal(concluido.itens.filter((i) => i.ocorrenciaCodigo).length, 1);
});
