// Cinco indicadores do módulo Equipamentos, calculados dos registros de horímetro, abastecimento, manutenção, ocorrência e check list (só no navegador, em
// modo demonstração):
//  1. Disponibilidade: "meu equipamento está pronto para trabalhar?"
//  2. Custo de manutenção por hora: "esse equipamento está me custando caro demais?"
//  3. Razão preventiva/corretiva: "estou apagando incêndio ou prevenindo?"
//  4. Aderência ao plano de manutenção: "a preventiva está sendo feita mesmo?" (mede execução, não intenção)
//  5. Conformidade legal: "estou exposto a risco de multa ou acidente?"
import { CONFIG_KPIS_PADRAO, type ConfigKpisEquipamento, type PeriodicidadeVistoria } from "./kpis-equipamento-config.ts";
import type { AssociacaoChecklistEquipamento } from "./equipamentos-checklist.ts";
import type { PlanoEquipamento } from "./equipamentos-manutencao.ts";
import type { ChecklistEquipamentoRegistro } from "./checklist-equipamento-exec.ts";
import type { AbastecimentoEquipamento, ManutencaoEquipamentoRegistro, OcorrenciaEquipamento } from "./registros-equipamento.ts";

export type Semaforo = "verde" | "amarelo" | "vermelho" | "neutro";
// Padrões; os valores em vigor vêm de Parâmetros > Equipamentos > Parâmetros Específicos > Indicadores (ConfigKpisEquipamento).
export const JORNADA_HORAS = CONFIG_KPIS_PADRAO.jornadaHoras;
export const META = { disponibilidade: CONFIG_KPIS_PADRAO.disponibilidade, preventiva: CONFIG_KPIS_PADRAO.preventiva, aderencia: CONFIG_KPIS_PADRAO.aderencia, conformidade: CONFIG_KPIS_PADRAO.conformidade };
const STATUS_PRONTOS = ["Ativo", "Reserva"];

export type EquipamentoKpi = {
  id: string; patrimonio: string; nome: string; tipoId: string; status: string; dataAquisicao: string; tecnico: Record<string, string>;
};
export type EntradaKpis = {
  equipamentos: EquipamentoKpi[];
  subcategoriaDoTipo: (tipoId: string) => string;
  abastecimentos: AbastecimentoEquipamento[]; manutencoes: ManutencaoEquipamentoRegistro[]; ocorrencias: OcorrenciaEquipamento[]; checklists: ChecklistEquipamentoRegistro[];
  planos: PlanoEquipamento[]; acoes: { id: string; nome: string }[]; associacoesVistoria: AssociacaoChecklistEquipamento[];
  hoje: string; periodoDias: number;
  config?: ConfigKpisEquipamento;
};
export type Aderencia = { emDia: number; total: number; vencidos: { acao: string; motivo: string }[] };
export type Conformidade = { atendidos: number; total: number; pendencias: string[] };
export type KpiEquipamento = {
  equipamento: EquipamentoKpi;
  prontoAgora: { ok: boolean; motivos: string[] };
  horasParada: number; horasProgramadas: number; disponibilidade: number | null;
  custo: number; horasTrabalhadas: number | null; custoPorHora: number | null;
  preventivas: number; corretivas: number; razaoPreventiva: number | null;
  aderencia: Aderencia | null;
  conformidade: Conformidade;
};
export type KpisFrota = {
  disponibilidade: number | null; prontos: number; total: number;
  custoPorHora: number | null; custo: number; horasTrabalhadas: number;
  preventivas: number; corretivas: number; razaoPreventiva: number | null;
  aderencia: number | null; itensEmDia: number; itensTotal: number;
  conformidade: number | null; comPendencia: number;
};

const dia = (iso: string) => { const [a, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(a ?? 1970, (m ?? 1) - 1, d ?? 1)); };
const isoDe = (d: Date) => d.toISOString().slice(0, 10);
const diasEntre = (de: string, ate: string) => Math.round((dia(ate).getTime() - dia(de).getTime()) / 86_400_000);
const mesesEntre = (de: string, ate: string) => { const a = dia(de); const b = dia(ate); return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth()) - (b.getUTCDate() < a.getUTCDate() ? 1 : 0); };
const somaDias = (iso: string, n: number) => isoDe(new Date(dia(iso).getTime() + n * 86_400_000));
const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : null);

export function diasUteis(inicio: string, fim: string): number {
  let n = 0;
  for (let d = dia(inicio); isoDe(d) <= fim; d = new Date(d.getTime() + 86_400_000)) { const s = d.getUTCDay(); if (s !== 0 && s !== 6) n++; }
  return n;
}

export function semaforoPct(valor: number | null, meta: { verde: number; amarelo: number }): Semaforo {
  if (valor === null) return "neutro";
  return valor >= meta.verde ? "verde" : valor >= meta.amarelo ? "amarelo" : "vermelho";
}
// Custo por hora não tem meta fixa: compara com a média da frota (até o fator configurado, 1,5 vez por padrão, ainda é aceitável).
export function semaforoCusto(valor: number | null, mediaFrota: number | null, fatorAmarelo = CONFIG_KPIS_PADRAO.custoFatorAmarelo): Semaforo {
  if (valor === null || mediaFrota === null || mediaFrota === 0) return "neutro";
  return valor <= mediaFrota ? "verde" : valor <= mediaFrota * fatorAmarelo ? "amarelo" : "vermelho";
}

export function calcularKpis(e: EntradaKpis): { porEquipamento: KpiEquipamento[]; frota: KpisFrota; inicio: string } {
  const cfg = e.config ?? CONFIG_KPIS_PADRAO;
  const inicio = somaDias(e.hoje, -(e.periodoDias - 1));
  const noPeriodo = (data: string) => data >= inicio && data <= e.hoje;
  const porEquipamento = e.equipamentos.map((eq): KpiEquipamento => {
    const manut = e.manutencoes.filter((m) => m.equipamentoId === eq.id);
    const abast = e.abastecimentos.filter((a) => a.equipamentoId === eq.id);
    const ocor = e.ocorrencias.filter((o) => o.equipamentoId === eq.id);
    const checks = e.checklists.filter((c) => c.equipamentoId === eq.id);
    const inicial = Number(eq.tecnico["horimetroInicial"]) || 0;
    // Leituras de horímetro (data e valor): a inicial do cadastro, os abastecimentos e as manutenções.
    const leituras = [{ data: eq.dataAquisicao, h: inicial }, ...abast.map((a) => ({ data: a.data, h: a.horimetro })), ...manut.map((m) => ({ data: m.data, h: m.horimetro }))].filter((l) => l.data <= e.hoje);
    const atual = leituras.length ? Math.max(...leituras.map((l) => l.h)) : inicial;

    // 1. Disponibilidade: horas programadas (dias úteis × jornada) menos as horas de parada informadas nas manutenções do período.
    const horasProgramadas = diasUteis(inicio < eq.dataAquisicao ? eq.dataAquisicao : inicio, e.hoje) * cfg.jornadaHoras;
    const horasParada = Math.min(horasProgramadas, manut.filter((m) => noPeriodo(m.data)).reduce((s, m) => s + (m.horasParada ?? 0), 0));
    const disponibilidade = horasProgramadas > 0 ? ((horasProgramadas - horasParada) / horasProgramadas) * 100 : null;
    const motivos: string[] = [];
    if (!STATUS_PRONTOS.includes(eq.status)) motivos.push(`Status: ${eq.status}`);
    const abertas = ocor.filter((o) => o.status === "Aberta").length;
    if (abertas > 0 && cfg.prontoOcorrenciaAberta) motivos.push(`${abertas} ocorrência${abertas > 1 ? "s" : ""} aberta${abertas > 1 ? "s" : ""}`);
    // Vale a última vistoria concluída; item NOK ainda sem resolução (pendência aberta) tira o equipamento de "pronto".
    const ultimaVistoria = checks.filter((c) => c.finalidade === "vistoria" && c.status === "Concluído").sort((a, b) => b.data.localeCompare(a.data))[0];
    if (cfg.prontoVistoriaNok && ultimaVistoria && ultimaVistoria.itens.some((i) => i.avaliacao === "NOK" && !i.resolucao)) motivos.push("Última vistoria com item não conforme");

    // 2. Custo de manutenção por hora trabalhada no período (horímetro final menos o de antes do período, ou o primeiro dentro dele).
    const custo = manut.filter((m) => noPeriodo(m.data)).reduce((s, m) => s + m.custoPecas + m.custoMaoDeObra, 0);
    // A leitura inicial do cadastro só vale como ponto de partida se o equipamento entrou dentro do período; senão ela não diz quantas horas foram rodadas nele.
    const medicoes = leituras.filter((l) => l.data !== eq.dataAquisicao || noPeriodo(l.data));
    const antes = medicoes.filter((l) => l.data < inicio);
    const dentro = medicoes.filter((l) => noPeriodo(l.data));
    const base = antes.length ? Math.max(...antes.map((l) => l.h)) : dentro.length ? Math.min(...dentro.map((l) => l.h)) : null;
    const horas = base !== null && dentro.length ? Math.max(...dentro.map((l) => l.h)) - base : null;
    const horasTrabalhadas = horas !== null && horas > 0 ? horas : null;

    // 3. Razão preventiva/corretiva no período.
    const preventivas = manut.filter((m) => noPeriodo(m.data) && m.tipo === "Preventiva").length;
    const corretivas = manut.filter((m) => noPeriodo(m.data) && m.tipo === "Corretiva").length;

    // 4. Aderência ao plano: cada item (ação, limite de horas, limite de meses) vence quando as horas de uso OU os meses desde a última execução
    // chegam ao limite; sem execução registrada, conta desde a aquisição e o horímetro inicial.
    const plano = e.planos.find((p) => p.equipamentoId === eq.id);
    let aderencia: Aderencia | null = null;
    if (plano) {
      const itens = plano.itens.flatMap((i) => { const a = e.acoes.find((x) => x.id === i.acaoId); return a ? [{ ...i, nome: a.nome }] : []; });
      const vencidos: Aderencia["vencidos"] = [];
      for (const i of itens) {
        const feitas = manut.filter((m) => m.acoes.some((a) => a.acaoId === i.acaoId)).sort((a, b) => b.data.localeCompare(a.data) || b.horimetro - a.horimetro);
        const ultima = feitas[0] ? { data: feitas[0].data, h: feitas[0].horimetro } : { data: eq.dataAquisicao, h: inicial };
        const usoHoras = atual - ultima.h;
        const usoMeses = mesesEntre(ultima.data, e.hoje);
        const porHoras = usoHoras >= i.horas;
        const porMeses = usoMeses >= i.meses;
        if (porHoras || porMeses) vencidos.push({ acao: i.nome, motivo: [porHoras ? `${Math.round(usoHoras)} h de uso (limite ${i.horas} h)` : "", porMeses ? `${usoMeses} meses (limite ${i.meses})` : ""].filter(Boolean).join(" e ") + (feitas[0] ? "" : ", nunca executada") });
      }
      aderencia = { emDia: itens.length - vencidos.length, total: itens.length, vencidos };
    }

    // 5. Conformidade legal: requisitos conforme o tipo (NR-23 extintor, NR-13 vaso de pressão, NR-11 e NR-12 máquinas) e a vistoria periódica de todos.
    const requisitos: { nome: string; ok: boolean }[] = [];
    const sub = e.subcategoriaDoTipo(eq.tipoId);
    const associacao = e.associacoesVistoria.find((a) => a.equipamentoId === eq.id);
    const prazos = (associacao?.itens ?? []).map((i) => cfg.prazoVistoriaDias[i.periodicidade as PeriodicidadeVistoria]).filter((d): d is number => d !== undefined);
    if (prazos.length === 0) requisitos.push({ nome: "Check list de vistoria periódico associado ao equipamento", ok: false });
    else {
      const prazo = Math.min(...prazos);
      const ok = !!ultimaVistoria && diasEntre(ultimaVistoria.data, e.hoje) <= prazo;
      requisitos.push({ nome: `Vistoria em dia (a cada ${prazo} dia${prazo > 1 ? "s" : ""}${ultimaVistoria ? `, última em ${ultimaVistoria.data.split("-").reverse().join("/")}` : ", nenhuma registrada"})`, ok });
    }
    if (sub === "sub-nr23") {
      const teste = eq.tecnico["vencimentoTesteHidrostatico"];
      requisitos.push({ nome: `Teste hidrostático válido${teste ? ` (vence em ${teste.split("-").reverse().join("/")})` : " (sem data informada)"}`, ok: !!teste && teste >= e.hoje });
      const recarga = eq.tecnico["ultimaRecarga"];
      requisitos.push({ nome: `Recarga em até ${cfg.recargaExtintorMeses} meses${recarga ? ` (última em ${recarga.split("-").reverse().join("/")})` : " (sem data informada)"}`, ok: !!recarga && mesesEntre(recarga, e.hoje) < cfg.recargaExtintorMeses });
    } else if (sub === "sub-nr13") {
      const preventiva = manut.filter((m) => m.tipo === "Preventiva").sort((a, b) => b.data.localeCompare(a.data))[0];
      requisitos.push({ nome: `Inspeção de segurança (manutenção preventiva) nos últimos ${cfg.inspecaoVasoMeses} meses${preventiva ? "" : " (nenhuma registrada)"}`, ok: !!preventiva && mesesEntre(preventiva.data, e.hoje) < cfg.inspecaoVasoMeses });
    } else if ((sub === "sub-nr11" || sub === "sub-nr12-nr10") && cfg.exigirSemOcorrenciaAberta) {
      requisitos.push({ nome: "Sem ocorrência de segurança aberta", ok: abertas === 0 });
    }
    const conformidade: Conformidade = { atendidos: requisitos.filter((r) => r.ok).length, total: requisitos.length, pendencias: requisitos.filter((r) => !r.ok).map((r) => r.nome) };

    return {
      equipamento: eq, prontoAgora: { ok: motivos.length === 0, motivos }, horasParada, horasProgramadas, disponibilidade, custo, horasTrabalhadas,
      custoPorHora: horasTrabalhadas !== null ? custo / horasTrabalhadas : null, preventivas, corretivas, razaoPreventiva: pct(preventivas, preventivas + corretivas), aderencia, conformidade,
    };
  });

  const soma = (f: (k: KpiEquipamento) => number) => porEquipamento.reduce((s, k) => s + f(k), 0);
  const comHoras = porEquipamento.filter((k) => k.horasTrabalhadas !== null);
  const horasFrota = comHoras.reduce((s, k) => s + (k.horasTrabalhadas ?? 0), 0);
  const custoFrota = comHoras.reduce((s, k) => s + k.custo, 0);
  const comPlano = porEquipamento.filter((k) => k.aderencia);
  const itensTotal = comPlano.reduce((s, k) => s + (k.aderencia?.total ?? 0), 0);
  const itensEmDia = comPlano.reduce((s, k) => s + (k.aderencia?.emDia ?? 0), 0);
  const reqTotal = soma((k) => k.conformidade.total);
  const frota: KpisFrota = {
    disponibilidade: pct(soma((k) => k.horasProgramadas - k.horasParada), soma((k) => k.horasProgramadas)),
    prontos: porEquipamento.filter((k) => k.prontoAgora.ok).length, total: porEquipamento.length,
    custoPorHora: horasFrota > 0 ? custoFrota / horasFrota : null, custo: soma((k) => k.custo), horasTrabalhadas: horasFrota,
    preventivas: soma((k) => k.preventivas), corretivas: soma((k) => k.corretivas), razaoPreventiva: pct(soma((k) => k.preventivas), soma((k) => k.preventivas + k.corretivas)),
    aderencia: pct(itensEmDia, itensTotal), itensEmDia, itensTotal,
    conformidade: pct(soma((k) => k.conformidade.atendidos), reqTotal), comPendencia: porEquipamento.filter((k) => k.conformidade.pendencias.length > 0).length,
  };
  return { porEquipamento, frota, inicio };
}
