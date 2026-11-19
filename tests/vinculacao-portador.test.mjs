import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ehRetroativa, erroDaDataDoVinculo, textoDaAutorizacao, validarSupervisor } from "../src/lib/vinculacao-portador.ts";
import { erroDoRegistroDePortador, registrarPortador } from "../src/lib/portadores-caixa.ts";

const memoria = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const caixa = { id: "c1", codigo: "CX-0001", codigo_num: 1, empresa_id: "x", status: "Ativa" };
const pessoa = (id, o = {}) => ({ id, nome: `Pessoa ${id}`, empresa_id: "x", ativo: true, data_demissao: null, ...o });
const agora = new Date("2026-11-18T15:00:00Z");

test("data retroativa pede autorização, futura é recusada e o fim não antecede o início do portador", () => {
  assert.equal(ehRetroativa("2026-11-17", "2026-11-18"), true);
  assert.equal(ehRetroativa("2026-11-18", "2026-11-18"), false);
  assert.match(erroDaDataDoVinculo("2026-11-19", "2026-11-18"), /futura/);
  assert.match(erroDaDataDoVinculo("2026-01-01", "2026-11-18", "2026-02-01"), /anterior a 01\/02\/2026/);
  assert.equal(erroDaDataDoVinculo("2026-11-18", "2026-11-18", "2026-02-01"), null);
  assert.match(erroDaDataDoVinculo("", "2026-11-18"), /Informe a data/);
});

test("o supervisor precisa ser empregado ativo que supervisiona alguém, com a senha certa", () => {
  const emp = [pessoa("s1", { nome: "Marta Souza" }), pessoa("e1", { supervisor_id: "s1" }), pessoa("s2", { nome: "Rui", ativo: false })];
  assert.ok("supervisor" in validarSupervisor("marta souza", "supervisor", emp, "2026-11-18"));
  assert.match(validarSupervisor("Marta Souza", "errada", emp, "2026-11-18").erro, /Senha/);
  assert.match(validarSupervisor("Pessoa e1", "supervisor", emp, "2026-11-18").erro, /não encontrado/);
  assert.match(validarSupervisor("", "x", emp, "2026-11-18").erro, /nome/);
  assert.match(validarSupervisor("Marta", "supervisor", [pessoa("s1")], "2026-11-18").erro, /Nenhum empregado tem supervisor/);
  assert.match(textoDaAutorizacao({ acao: "vincular", caixa: "CX-0001", empregado: "Ana", data: "2026-11-10", hoje: "2026-11-18" }), /10\/11\/2026.*18\/11\/2026.*início da responsabilidade de Ana pela caixa CX-0001/);
  assert.match(textoDaAutorizacao({ acao: "desvincular", caixa: "CX-0001", empregado: "Ana", data: "2026-11-10", hoje: "2026-11-18" }), /encerramento da responsabilidade/);
});

test("registrarPortador grava a data informada e a autorização, e recusa datas impossíveis", () => {
  const s = memoria();
  const base = { caixa, habilitadas: [1], observacao: "", agora };
  registrarPortador({ ...base, empregado: pessoa("e1"), status: "Ativa", data: "2026-11-10", autorizadoPor: "Marta" }, s);
  let h = JSON.parse(s.getItem("gemape-demo-portadores-caixa"));
  assert.equal(h[0].data_inicio, "2026-11-10");
  assert.match(h[0].observacao, /autorizado por Marta/);
  assert.throws(() => registrarPortador({ ...base, empregado: null, status: "Inativa", data: "2026-11-01" }, s), /anterior ao início/);
  assert.throws(() => registrarPortador({ ...base, empregado: null, status: "Inativa", data: "2026-11-30" }, s), /futura/);
  registrarPortador({ ...base, empregado: null, status: "Inativa", data: "2026-11-15" }, s);
  h = JSON.parse(s.getItem("gemape-demo-portadores-caixa"));
  assert.equal(h[0].data_fim, "2026-11-15");
  assert.throws(() => registrarPortador({ ...base, empregado: pessoa("e2"), status: "Ativa", data: "2026-11-12" }, s), /outro portador até 15\/11\/2026/);
});

test("o menu tem Vinculação de portador, com vistoria, confirmação, termo de encerramento e senha do supervisor", () => {
  const f = readFileSync(new URL("../src/components/modules/PortadoresCaixaModulo.tsx", import.meta.url), "utf8");
  for (const x of ["Vincular portador", "Desvincular portador", "Vistoria de encerramento da caixa", "Confirmar a desvinculação?", "Autorização do supervisor", "Termo de Encerramento de Responsabilidade com Vistoria da Caixa", 'tipo_vistoria: "Encerramento"']) assert.ok(f.includes(x), x);
  const m = readFileSync(new URL("../src/lib/menu-parametros.ts", import.meta.url), "utf8");
  assert.match(m, /aba: "vinculacao-portador", titulo: "Vinculação de portador"/);
  assert.match(readFileSync(new URL("../src/components/modules/PaginaModulo.tsx", import.meta.url), "utf8"), /value="vinculacao-portador"[\s\S]*<PortadoresCaixaModulo \/>/);
});

test("o portador não autoriza o próprio registro e nome repetido não vale como autorização", () => {
  const emp = [pessoa("s1", { nome: "Marta Souza" }), pessoa("s2", { nome: "Marta Souza" }), pessoa("e1", { supervisor_id: "s1" }), pessoa("e2", { supervisor_id: "s2" })];
  assert.match(validarSupervisor("Marta Souza", "supervisor", emp, "2026-11-18").erro, /mais de um supervisor/);
  const unico = [pessoa("s1", { nome: "Marta Souza" }), pessoa("e1", { supervisor_id: "s1" })];
  assert.match(validarSupervisor("Marta Souza", "supervisor", unico, "2026-11-18", "s1").erro, /próprio portador/);
  assert.ok("supervisor" in validarSupervisor("Marta Souza", "supervisor", unico, "2026-11-18", "e1"));
});

test("a conferência prévia recusa o registro impossível sem gravar nada", () => {
  const base = { caixa, habilitadas: [1], observacao: "", agora, empregado: null, status: "Inativa" };
  assert.match(erroDoRegistroDePortador({ ...base, data: "2026-11-10" }, memoria()), /não tem portador ativo/);
});
