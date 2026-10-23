import test from "node:test";
import assert from "node:assert/strict";

import { calcularKpis, diasUteis, semaforoCusto, semaforoPct, META } from "../src/lib/kpis-equipamento.ts";

const HOJE = "2026-10-23"; // sexta-feira
const eq = (extra = {}) => ({ id: "e1", patrimonio: "PAT-1", nome: "Empilhadeira", tipoId: "t", status: "Ativo", dataAquisicao: "2020-01-10", tecnico: { horimetroInicial: "100" }, ...extra });
const base = (parte = {}) => ({
  equipamentos: [eq()], subcategoriaDoTipo: () => "sub-nr11", abastecimentos: [], manutencoes: [], ocorrencias: [], checklists: [], planos: [], acoes: [{ id: "a1", nome: "Troca de óleo" }, { id: "a2", nome: "Lubrificação" }],
  associacoesVistoria: [], hoje: HOJE, periodoDias: 30, ...parte,
});
const manut = (extra) => ({ id: "m", equipamentoId: "e1", tipo: "Preventiva", data: "2026-10-10", horimetro: 200, acoes: [], local: "empresa", localNome: "Empresa", custoPecas: 0, custoMaoDeObra: 0, observacao: "", criadoEm: "", ...extra });
const abast = (data, horimetro) => ({ id: `a${data}`, equipamentoId: "e1", data, hora: "08:00", horimetro, litros: 40, valor: 200, criadoEm: "" });
const um = (entrada) => calcularKpis(entrada).porEquipamento[0];

test("dias úteis contam só segunda a sexta", () => {
  assert.equal(diasUteis("2026-10-19", "2026-10-23"), 5);
  assert.equal(diasUteis("2026-10-17", "2026-10-18"), 0);
  assert.equal(diasUteis("2026-10-01", "2026-10-31"), 22);
});

test("disponibilidade: horas de parada sobre as horas programadas, só do período", () => {
  const k = um(base({ manutencoes: [manut({ horasParada: 16 }), manut({ data: "2026-01-05", horasParada: 500 })] }));
  assert.equal(k.horasProgramadas, 22 * 8); // 24/09 a 23/10 = 22 dias úteis
  assert.equal(k.horasParada, 16);
  assert.ok(Math.abs(k.disponibilidade - ((176 - 16) / 176) * 100) < 1e-9);
  assert.equal(um(base({ manutencoes: [manut({ horasParada: 9999 })] })).disponibilidade, 0, "a parada nunca passa das horas programadas");
});

test("pronto agora: status, ocorrência aberta e última vistoria com item não conforme tiram o equipamento", () => {
  assert.equal(um(base()).prontoAgora.ok, true);
  assert.deepEqual(um(base({ equipamentos: [eq({ status: "Em manutenção" })] })).prontoAgora.motivos, ["Status: Em manutenção"]);
  assert.match(um(base({ ocorrencias: [{ id: "o", equipamentoId: "e1", status: "Aberta" }] })).prontoAgora.motivos[0], /1 ocorrência aberta/);
  const vistoria = { equipamentoId: "e1", finalidade: "vistoria", data: "2026-10-20", status: "Concluído", itens: [{ avaliacao: "NOK", resolucao: null }] };
  assert.match(um(base({ checklists: [vistoria] })).prontoAgora.motivos[0], /vistoria com item não conforme/);
});

test("custo por hora: custo do período sobre as horas de horímetro rodadas desde antes do período", () => {
  const k = um(base({ abastecimentos: [abast("2026-08-01", 300), abast("2026-10-15", 400)], manutencoes: [manut({ data: "2026-10-10", horimetro: 350, custoPecas: 300, custoMaoDeObra: 100 })] }));
  assert.equal(k.custo, 400);
  assert.equal(k.horasTrabalhadas, 100); // 400 - 300 (leitura anterior ao período)
  assert.equal(k.custoPorHora, 4);
  assert.equal(um(base()).custoPorHora, null, "sem leituras no período não há custo por hora");
});

test("razão preventiva/corretiva do período", () => {
  const k = um(base({ manutencoes: [manut({ data: "2026-10-01" }), manut({ data: "2026-10-02" }), manut({ data: "2026-10-03" }), manut({ data: "2026-10-04", tipo: "Corretiva" }), manut({ data: "2026-01-04", tipo: "Corretiva" })] }));
  assert.deepEqual([k.preventivas, k.corretivas, k.razaoPreventiva], [3, 1, 75]);
  assert.equal(um(base()).razaoPreventiva, null);
});

test("aderência: item vence por horas OU por meses desde a última execução; sem execução conta da aquisição", () => {
  const plano = { equipamentoId: "e1", atualizadoEm: "", itens: [{ acaoId: "a1", horas: 250, meses: 3 }, { acaoId: "a2", horas: 100, meses: 24 }] };
  const feito = manut({ data: "2026-10-10", horimetro: 200, acoes: [{ acaoId: "a1", nome: "Troca de óleo", subitens: [] }] });
  const a = um(base({ planos: [plano], manutencoes: [feito], abastecimentos: [abast("2026-10-20", 300)] })).aderencia;
  assert.equal(a.total, 2);
  // a1 em dia (100 h de uso, 0 mês); a2 nunca feita: 200 h desde o horímetro inicial (100) passam de 100 h.
  assert.deepEqual(a.vencidos.map((v) => v.acao), ["Lubrificação"]);
  assert.match(a.vencidos[0].motivo, /nunca executada/);
  const porMeses = um(base({ planos: [plano], manutencoes: [manut({ data: "2026-06-01", horimetro: 150, acoes: [{ acaoId: "a1", nome: "Troca de óleo", subitens: [] }] })] })).aderencia;
  assert.ok(porMeses.vencidos.some((v) => v.acao === "Troca de óleo" && /meses/.test(v.motivo)));
  assert.equal(um(base()).aderencia, null, "sem plano não há aderência");
});

test("conformidade legal: vistoria periódica em dia e os requisitos de cada tipo", () => {
  const associacao = { equipamentoId: "e1", responsavel: null, atualizadoEm: "", itens: [{ grupoId: "g", tipo: "periodico", periodicidade: "Semanal", obrigatorio: true }] };
  const vistoria = (data) => ({ equipamentoId: "e1", finalidade: "vistoria", data, status: "Concluído", itens: [{ avaliacao: "OK", resolucao: null }] });
  const sem = um(base()).conformidade;
  assert.deepEqual([sem.atendidos, sem.total], [1, 2]);
  assert.match(sem.pendencias[0], /associado/);
  const emDia = um(base({ associacoesVistoria: [associacao], checklists: [vistoria("2026-10-20")] })).conformidade;
  assert.deepEqual([emDia.atendidos, emDia.total, emDia.pendencias.length], [2, 2, 0]);
  const atrasada = um(base({ associacoesVistoria: [associacao], checklists: [vistoria("2026-10-01")] })).conformidade;
  assert.match(atrasada.pendencias[0], /Vistoria em dia/);
  // Extintor (NR-23): teste hidrostático e recarga.
  const extintor = eq({ tecnico: { vencimentoTesteHidrostatico: "2026-01-01", ultimaRecarga: "2026-03-01" } });
  const nr23 = um(base({ equipamentos: [extintor], subcategoriaDoTipo: () => "sub-nr23", associacoesVistoria: [associacao], checklists: [vistoria("2026-10-20")] })).conformidade;
  assert.deepEqual([nr23.atendidos, nr23.total], [2, 3]);
  assert.match(nr23.pendencias[0], /Teste hidrostático/);
  // Vaso de pressão (NR-13): manutenção preventiva nos últimos 12 meses.
  const nr13 = um(base({ subcategoriaDoTipo: () => "sub-nr13" })).conformidade;
  assert.equal(nr13.total, 2);
  assert.ok(nr13.pendencias.some((p) => /Inspeção de segurança/.test(p)));
});

test("frota soma tudo e o semáforo segue as metas", () => {
  const dois = base({ equipamentos: [eq(), eq({ id: "e2", patrimonio: "PAT-2" })], manutencoes: [manut({ horasParada: 88 }), manut({ equipamentoId: "e2", tipo: "Corretiva", horasParada: 0 })] });
  const { frota } = calcularKpis(dois);
  assert.equal(frota.total, 2);
  assert.equal(frota.preventivas + frota.corretivas, 2);
  assert.ok(Math.abs(frota.disponibilidade - ((352 - 88) / 352) * 100) < 1e-9);
  assert.equal(semaforoPct(95, META.disponibilidade), "verde");
  assert.equal(semaforoPct(85, META.disponibilidade), "amarelo");
  assert.equal(semaforoPct(40, META.preventiva), "vermelho");
  assert.equal(semaforoPct(null, META.aderencia), "neutro");
  assert.equal(semaforoCusto(10, 10), "verde");
  assert.equal(semaforoCusto(14, 10), "amarelo");
  assert.equal(semaforoCusto(20, 10), "vermelho");
  assert.equal(semaforoCusto(null, 10), "neutro");
});
