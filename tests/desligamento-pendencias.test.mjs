import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  abrirAlertaDeDesligamento, alertasAbertos, erroDoSupervisor, lerAlertasDeDesligamento, portadoresDesligados, resolverAlertaDeDesligamento, retirarAlertaDeDesligamento,
} from "../src/lib/desligamento-pendencias.ts";
import { pendenciasDeHoje } from "../src/lib/atencao-hoje.ts";

const memoria = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const ent = (o = {}) => ({ empregadoId: "e1", empregadoNome: "Carlos", supervisorId: "s1", supervisorNome: "Marta", dataDesligamento: "2026-11-18", ...o });
const reg = (o = {}) => ({ id: "r1", caixa_id: "c1", caixa_codigo: "CX-0002", empresa_id: "x", empregado_id: "e1", empregado_nome: "Carlos", status: "Ativa", observacao: "", data_inicio: "2026-01-01", data_fim: null, ...o });

test("o desligamento abre um alerta ao supervisor, sem duplicar, e dá para resolver ou desfazer", () => {
  const s = memoria();
  const a = abrirAlertaDeDesligamento(ent(), "2026-11-18T10:00:00Z", s);
  assert.equal(a.supervisorNome, "Marta");
  assert.equal(abrirAlertaDeDesligamento(ent(), "2026-11-18T11:00:00Z", s).id, a.id);
  assert.equal(lerAlertasDeDesligamento(s).length, 1);
  resolverAlertaDeDesligamento(a.id, "2026-11-19T10:00:00Z", s);
  assert.equal(alertasAbertos(lerAlertasDeDesligamento(s)).length, 0);
  // desfazer o desligamento retira só o alerta aberto
  abrirAlertaDeDesligamento(ent({ empregadoId: "e2", empregadoNome: "Ana" }), "x", s);
  retirarAlertaDeDesligamento("e2", s);
  assert.deepEqual(lerAlertasDeDesligamento(s).map((x) => x.empregadoId), ["e1"]);
  // sem supervisor cadastrado o alerta continua existindo
  assert.equal(abrirAlertaDeDesligamento(ent({ empregadoId: "e3", supervisorId: null, supervisorNome: null }), "x", s).supervisorNome, null);
  assert.deepEqual(lerAlertasDeDesligamento({ getItem: () => "{ruim", setItem() {} }), []);
});

test("caixa com portador desligado vira pendência e some quando o vínculo é encerrado", () => {
  const emp = [{ id: "e1", nome: "Carlos", ativo: false, data_demissao: "2026-11-18" }, { id: "e2", nome: "Ana", ativo: true, data_demissao: null }];
  const lista = portadoresDesligados([reg(), reg({ id: "r2", caixa_id: "c2", caixa_codigo: "CX-0001", empregado_id: "e2" })], emp, "2026-11-18");
  assert.deepEqual(lista.map((p) => p.caixaCodigo), ["CX-0002"]);
  assert.equal(portadoresDesligados([reg({ status: "Inativa", data_fim: "2026-11-18" })], emp, "2026-11-18").length, 0);
  // demissão com data futura ainda não gera pendência
  assert.equal(portadoresDesligados([reg()], [{ id: "e1", nome: "Carlos", ativo: true, data_demissao: "2026-12-01" }], "2026-11-18").length, 0);
});

test("o supervisor é obrigatório, outra pessoa e ativo", () => {
  const emp = [{ id: "s1", ativo: true, data_demissao: null }, { id: "s2", ativo: false, data_demissao: "2026-01-01" }, { id: "e1", ativo: true, data_demissao: null }];
  assert.match(erroDoSupervisor("", "e1", emp, "2026-11-18"), /Escolha o supervisor/);
  assert.match(erroDoSupervisor("e1", "e1", emp, "2026-11-18"), /outra pessoa/);
  assert.match(erroDoSupervisor("s2", "e1", emp, "2026-11-18"), /ativo/);
  assert.match(erroDoSupervisor("nao-existe", "e1", emp, "2026-11-18"), /ativo/);
  assert.equal(erroDoSupervisor("s1", "e1", emp, "2026-11-18"), null);
});

test("a tela inicial mostra o alerta ao supervisor e a caixa a desvincular", () => {
  const grupos = pendenciasDeHoje({
    hoje: "2026-11-18", empregados: [], epis: [], uniformes: [], ferramentas: [], movsEpi: [], movsFerramenta: [],
    desligamentos: { alertas: [{ id: "a1", empregadoId: "e1", empregadoNome: "Carlos", supervisorId: "s1", supervisorNome: "Marta", dataDesligamento: "2026-11-18", criadoEm: "x", resolvidoEm: null }], portadores: [{ registroId: "r1", caixaId: "c1", caixaCodigo: "CX-0002", empregadoId: "e1", empregadoNome: "Carlos", dataDemissao: "2026-11-18" }] },
  });
  const subst = grupos.find((g) => g.id === "substituicao-supervisor");
  const port = grupos.find((g) => g.id === "portador-desligado");
  assert.match(subst.itens[0].texto, /Marta: substituir Carlos/);
  assert.match(port.itens[0].detalhe, /vistoria de encerramento/);
  assert.equal(port.prioridade, "alta");
});

test("o cadastro de empregados tem a divisão ativos e inativos, supervisor obrigatório e alerta no desligamento", () => {
  const f = readFileSync(new URL("../src/components/modules/EmpregadosCadastroModulo.tsx", import.meta.url), "utf8");
  assert.match(f, /aria-label="Situação dos empregados"/);
  assert.match(f, /aria-pressed=\{aba === v\}/);
  assert.match(f, /erroDoSupervisor\(supervisorSel/);
  assert.match(f, /abrirAlertaDeDesligamento\(/);
  assert.ok(f.indexOf('aria-label="Situação dos empregados"') < f.indexOf("onClick={() => void abrirNovo()}"), "as abas ficam acima do botão Novo empregado");
});
