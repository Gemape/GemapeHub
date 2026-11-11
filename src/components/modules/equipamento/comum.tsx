import { useEffect, useMemo, useState } from "react";

import { hojeLocal, horaBrasilia } from "@/lib/empregados";
import { useEmpresa, TODAS } from "@/lib/empresa-context";
import { listarEquipamentos, type Equipamento } from "@/lib/equipamentos-demo";
import { lerChecklistEquipamento, type FinalidadeChecklist } from "@/lib/equipamentos-checklist";
import { faixaDoIndice, lerFaixasDeVeiculos } from "@/lib/faixas-desempenho";
import { lerManutencaoEquipamento } from "@/lib/equipamentos-manutencao";
import { lerParametrosEquipamento } from "@/lib/equipamentos-parametros";
import { sugestoesPreventivas } from "@/lib/extrato-veiculo";
import {
  EVENTO_REGISTROS_EQUIPAMENTO, lerAbastecimentosEq, lerManutencoesEq, lerOcorrenciasEq, manutencoesConcluidasEq, ultimoHorimetro,
  type AbastecimentoEquipamento, type ManutencaoEquipamentoRegistro, type OcorrenciaEquipamento,
} from "@/lib/registros-equipamento";
import { lerChecklistsEq, type ChecklistEquipamentoRegistro } from "@/lib/checklist-equipamento-exec";

export const TODOS = "todos";
export const reais = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
export const numero = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
// Dia e hora de Brasília, como o resto do sistema (passada a meia-noite em UTC, o dia do navegador seria o de amanhã).
export const hoje = () => hojeLocal();
// Faixa (verde, amarelo ou vermelho) de um percentual, pelos mesmos limites dos indicadores da Frota (Parâmetros > Veículos > Parâmetros Específicos).
export const faixaEq = (pct: number | null) => faixaDoIndice(pct, lerFaixasDeVeiculos())?.faixa ?? null;
// Cores de semáforo dos selos de situação: vermelho (aberta, inativo), amarelo (em andamento, em manutenção, reserva) e verde (encerrada, ativo, concluído).
const SELO = {
  vermelho: "border-red-300 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
  amarelo: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  verde: "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
} as const;
const FAIXA_DA_SITUACAO: Record<string, keyof typeof SELO> = {
  Aberta: "vermelho", "Em tratativa": "amarelo", Encerrada: "verde", Resolvida: "verde",
  Ativo: "verde", "Em manutenção": "amarelo", Reserva: "amarelo", "Baixado/Inativo": "vermelho",
  "Em andamento": "amarelo", Concluído: "verde",
};
export const seloDaSituacao = (situacao: string) => SELO[FAIXA_DA_SITUACAO[situacao] ?? "amarelo"];
export const pctDe =(parte: number, total: number): number | null => (total === 0 ? null : Math.round((parte / total) * 1000) / 10);

// Revisões preventivas de um equipamento: o horímetro faz o papel do km do veículo (vence pelas horas de uso ou pelos meses, o que vier primeiro).
export function revisoesDoEquipamento(e: Equipamento, concluidas: ManutencaoEquipamentoRegistro[], dia: string) {
  const dados = lerManutencaoEquipamento();
  const plano = dados.planos.find((p) => p.equipamentoId === e.id);
  const dele = concluidas.filter((m) => m.equipamentoId === e.id);
  const horimetro = Math.max(ultimoHorimetro(e.id) ?? 0, Number(e.tecnico["horimetroInicial"]) || 0);
  const sugestoes = sugestoesPreventivas({
    plano: plano ? { veiculoId: e.id, atualizadoEm: plano.atualizadoEm, itens: plano.itens.map((i) => ({ acaoId: i.acaoId, km: i.horas, meses: i.meses })) } : null,
    acoes: dados.acoes,
    manutencoes: dele.map((m) => ({ acaoId: null, grupos: m.acoes.map((a) => ({ acaoId: a.acaoId })), data: m.data, km: m.horimetro, tipo: m.tipo })),
    kmAtual: horimetro, hoje: dia,
  });
  // As frases da sugestão falam em km; no equipamento o limite é em horas de uso.
  return { horimetro, sugestoes: sugestoes.map((s) => ({ ...s, motivo: s.motivo.replace("Km próximo", "Horas próximas").replace(/\bkm\b/g, "horas") })) };
}
export const agoraBrasilia = () => horaBrasilia();
// Horímetro para o campo de texto: vírgula decimal, como se digita.
export const horimetroEmTexto = (h: number | null) => (h === null ? "" : String(h).replace(".", ","));
export const rotuloDoEquipamento = (e: Pick<Equipamento, "patrimonio" | "nome">) => `${e.patrimonio} · ${e.nome}`;

// Lê do navegador (modo demonstração) e atualiza quando outra tela grava.
export function useLeitura<T>(ler: () => T): T {
  const [valor, setValor] = useState<T>(() => ler());
  useEffect(() => {
    const atualizar = () => setValor(ler());
    atualizar();
    for (const e of [EVENTO_REGISTROS_EQUIPAMENTO, "storage"]) window.addEventListener(e, atualizar);
    return () => { for (const e of [EVENTO_REGISTROS_EQUIPAMENTO, "storage"]) window.removeEventListener(e, atualizar); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return valor;
}
export const useAbastecimentosEq = (): AbastecimentoEquipamento[] => useLeitura(() => lerAbastecimentosEq());
// Ordens de serviço de todas as situações (a tela de Manutenção) e só as concluídas (inventário, extrato e indicadores).
export const useOrdensEq = (): ManutencaoEquipamentoRegistro[] => useLeitura(() => lerManutencoesEq());
export const useManutencoesEq = (): ManutencaoEquipamentoRegistro[] => useLeitura(() => manutencoesConcluidasEq(lerManutencoesEq()));
export const useOcorrenciasEq = (): OcorrenciaEquipamento[] => useLeitura(() => lerOcorrenciasEq());
export const useChecklistsEq = (): ChecklistEquipamentoRegistro[] => useLeitura(() => lerChecklistsEq());

// Equipamentos da empresa escolhida no topo (ou de todas), do cadastro em Parâmetros > Equipamentos.
export function useEquipamentosDaEmpresa(): Equipamento[] {
  const { empresaId } = useEmpresa();
  const todos = useLeitura(() => listarEquipamentos());
  // Memorizado: a mesma lista (mesma identidade) enquanto o cadastro e a empresa não mudam, para as telas poderem memorizar o que calculam dela.
  return useMemo(() => todos.filter((e) => empresaId === TODAS || e.empresaId === empresaId).sort((x, y) => x.patrimonio.localeCompare(y.patrimonio, "pt-BR")), [todos, empresaId]);
}

// Todos os equipamentos, de todas as empresas (o painel do mês prevê os check lists de todas, para não perder previsões ao trocar de empresa).
export const useEquipamentosTodos = (): Equipamento[] => useLeitura(() => listarEquipamentos());
// Grupos e associações do check list (manutenção ou vistoria) de Parâmetros > Equipamentos.
export const useChecklistParametros = (finalidade: FinalidadeChecklist) => useLeitura(() => lerChecklistEquipamento()[finalidade]);

export function nomeDoTipo(e: Pick<Equipamento, "tipoId">): string {
  return lerParametrosEquipamento().tipos.find((t) => t.id === e.tipoId)?.nome ?? "—";
}
// Abastece quem tem motor a combustão: tipo com o grupo "Máquinas e veículos" e propulsão a diesel, gasolina ou gás.
export function abasteceCombustivel(e: Pick<Equipamento, "tipoId" | "tecnico">): boolean {
  const tipo = lerParametrosEquipamento().tipos.find((t) => t.id === e.tipoId);
  return !!tipo?.grupos.includes("motor") && ["Diesel", "Gasolina", "GLP/Gás"].includes(e.tecnico["propulsao"] ?? "");
}
