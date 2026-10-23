import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { calcularKpis, semaforoCusto } from "../src/lib/kpis-equipamento.ts";
import { CONFIG_KPIS_PADRAO, lerConfigKpis, salvarConfigKpis, validarConfigKpis, CHAVE_CONFIG_KPIS } from "../src/lib/kpis-equipamento-config.ts";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const memoria = () => {
  const m = new Map();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, String(v)) };
};
const com = (parcial) => ({ ...CONFIG_KPIS_PADRAO, ...parcial });

test("sem nada salvo, valem os padrões; dado ilegível ou inválido volta ao padrão", () => {
  const s = memoria();
  assert.deepEqual(lerConfigKpis(s), CONFIG_KPIS_PADRAO);
  s.setItem(CHAVE_CONFIG_KPIS, "{ilegível");
  assert.deepEqual(lerConfigKpis(s), CONFIG_KPIS_PADRAO);
  s.setItem(CHAVE_CONFIG_KPIS, JSON.stringify({ jornadaHoras: 99 }));
  assert.deepEqual(lerConfigKpis(s), CONFIG_KPIS_PADRAO, "valor fora do limite não vale");
  s.setItem(CHAVE_CONFIG_KPIS, JSON.stringify({ jornadaHoras: 6, aderencia: { verde: 95 } }));
  const c = lerConfigKpis(s);
  assert.deepEqual([c.jornadaHoras, c.aderencia, c.preventiva], [6, { verde: 95, amarelo: 70 }, CONFIG_KPIS_PADRAO.preventiva], "o que falta usa o padrão");
});

test("validação: metas inteiras de 1 a 100 com amarelo abaixo do verde, jornada, fator, meses e dias", () => {
  assert.equal(validarConfigKpis(CONFIG_KPIS_PADRAO), null);
  assert.match(validarConfigKpis(com({ jornadaHoras: 0 })), /jornada/);
  assert.match(validarConfigKpis(com({ jornadaHoras: 7.5 })), /jornada/);
  assert.match(validarConfigKpis(com({ disponibilidade: { verde: 80, amarelo: 80 } })), /Disponibilidade.*amarelo/);
  assert.match(validarConfigKpis(com({ preventiva: { verde: 101, amarelo: 50 } })), /Razão preventiva.*1 a 100/);
  assert.match(validarConfigKpis(com({ aderencia: { verde: 90, amarelo: 0 } })), /Aderência/);
  assert.match(validarConfigKpis(com({ conformidade: { verde: 100, amarelo: 100 } })), /Conformidade/);
  assert.match(validarConfigKpis(com({ custoFatorAmarelo: 0.5 })), /fator/);
  assert.match(validarConfigKpis(com({ recargaExtintorMeses: 0 })), /recarga/);
  assert.match(validarConfigKpis(com({ inspecaoVasoMeses: 61 })), /inspeção/);
  assert.match(validarConfigKpis(com({ prazoVistoriaDias: { ...CONFIG_KPIS_PADRAO.prazoVistoriaDias, "Semanal": 0 } })), /semanal/);
  assert.match(validarConfigKpis(com({ periodoPadraoDias: 45 })), /período/);
});

test("salvar grava só o que vale e o que foi salvo é lido de volta", () => {
  const s = memoria();
  assert.throws(() => salvarConfigKpis(com({ jornadaHoras: 0 }), s), /jornada/);
  assert.equal(s.getItem(CHAVE_CONFIG_KPIS), null);
  salvarConfigKpis(com({ jornadaHoras: 6, recargaExtintorMeses: 6, periodoPadraoDias: 30 }), s);
  assert.deepEqual([lerConfigKpis(s).jornadaHoras, lerConfigKpis(s).recargaExtintorMeses, lerConfigKpis(s).periodoPadraoDias], [6, 6, 30]);
});

const base = (config) => ({
  equipamentos: [{ id: "e1", patrimonio: "P", nome: "Extintor", tipoId: "t", status: "Ativo", dataAquisicao: "2020-01-10", tecnico: { vencimentoTesteHidrostatico: "2030-01-01", ultimaRecarga: "2026-03-01" } }],
  subcategoriaDoTipo: () => "sub-nr23", abastecimentos: [], manutencoes: [], ocorrencias: [{ id: "o", equipamentoId: "e1", status: "Aberta" }], checklists: [],
  planos: [], acoes: [], associacoesVistoria: [], hoje: "2026-10-23", periodoDias: 30, ...(config ? { config } : {}),
});

test("a configuração muda o cálculo: jornada, validade da recarga, pronto agora e requisito de ocorrência", () => {
  const padrao = calcularKpis(base()).porEquipamento[0];
  assert.equal(padrao.horasProgramadas, 22 * 8);
  assert.ok(padrao.conformidade.pendencias.every((p) => !/Recarga/.test(p)), "recarga de 7 meses está dentro dos 12");
  assert.equal(padrao.prontoAgora.ok, false);
  const ajustada = calcularKpis(base(com({ jornadaHoras: 6, recargaExtintorMeses: 6, prontoOcorrenciaAberta: false }))).porEquipamento[0];
  assert.equal(ajustada.horasProgramadas, 22 * 6);
  assert.ok(ajustada.conformidade.pendencias.some((p) => /Recarga em até 6 meses/.test(p)), "agora a recarga venceu");
  assert.equal(ajustada.prontoAgora.ok, true, "ocorrência aberta deixou de tirar o equipamento de pronto");
  // Requisito de ocorrência de segurança aberta só existe para empilhadeiras e máquinas, e pode ser desligado.
  const maquina = (config) => calcularKpis({ ...base(config), subcategoriaDoTipo: () => "sub-nr11" }).porEquipamento[0].conformidade;
  assert.equal(maquina().total, 2);
  assert.equal(maquina(com({ exigirSemOcorrenciaAberta: false })).total, 1);
});

test("prazo da vistoria e fator do custo por hora seguem a configuração", () => {
  const associacao = { equipamentoId: "e1", responsavel: null, atualizadoEm: "", itens: [{ grupoId: "g", tipo: "periodico", periodicidade: "Semanal", obrigatorio: true }] };
  const vistoria = { equipamentoId: "e1", finalidade: "vistoria", data: "2026-10-12", status: "Concluído", itens: [{ avaliacao: "OK", resolucao: null }] }; // 11 dias atrás
  const entrada = (config) => ({ ...base(config), subcategoriaDoTipo: () => "sub-nr11", ocorrencias: [], associacoesVistoria: [associacao], checklists: [vistoria] });
  assert.match(calcularKpis(entrada()).porEquipamento[0].conformidade.pendencias[0], /Vistoria em dia \(a cada 7 dias/);
  const folgada = calcularKpis(entrada(com({ prazoVistoriaDias: { ...CONFIG_KPIS_PADRAO.prazoVistoriaDias, "Semanal": 14 } }))).porEquipamento[0].conformidade;
  assert.deepEqual([folgada.atendidos, folgada.total], [2, 2]);
  assert.equal(semaforoCusto(14, 10, 1.5), "amarelo");
  assert.equal(semaforoCusto(14, 10, 1.2), "vermelho");
});

test("a tela de Parâmetros Específicos de equipamentos tem os Indicadores e o módulo lê a configuração", () => {
  assert.match(ler("components/parametros/EquipamentosEspecificos.tsx"), /<IndicadoresEquipamentoParametros \/>/);
  const modulo = ler("components/modules/equipamento/IndicadoresEquipamentoModulo.tsx");
  assert.match(modulo, /lerConfigKpis\(\)/);
  assert.match(modulo, /config: cfg/);
  assert.doesNotMatch(ler("components/parametros/IndicadoresEquipamentoParametros.tsx") + ler("lib/kpis-equipamento-config.ts"), /supabase|fetch\(|\.from\(/);
});
