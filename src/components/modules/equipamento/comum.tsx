import { useEffect, useState } from "react";

import { hojeLocal, horaBrasilia } from "@/lib/empregados";
import { useEmpresa, TODAS } from "@/lib/empresa-context";
import { listarEquipamentos, type Equipamento } from "@/lib/equipamentos-demo";
import { lerChecklistEquipamento, type FinalidadeChecklist } from "@/lib/equipamentos-checklist";
import { lerParametrosEquipamento } from "@/lib/equipamentos-parametros";
import {
  EVENTO_REGISTROS_EQUIPAMENTO, lerAbastecimentosEq, lerManutencoesEq, lerOcorrenciasEq,
  type AbastecimentoEquipamento, type ManutencaoEquipamentoRegistro, type OcorrenciaEquipamento,
} from "@/lib/registros-equipamento";
import { lerChecklistsEq, type ChecklistEquipamentoRegistro } from "@/lib/checklist-equipamento-exec";

export const TODOS = "todos";
export const reais = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
export const numero = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
// Dia e hora de Brasília, como o resto do sistema (passada a meia-noite em UTC, o dia do navegador seria o de amanhã).
export const hoje = () => hojeLocal();
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
export const useManutencoesEq = (): ManutencaoEquipamentoRegistro[] => useLeitura(() => lerManutencoesEq());
export const useOcorrenciasEq = (): OcorrenciaEquipamento[] => useLeitura(() => lerOcorrenciasEq());
export const useChecklistsEq = (): ChecklistEquipamentoRegistro[] => useLeitura(() => lerChecklistsEq());

// Equipamentos da empresa escolhida no topo (ou de todas), do cadastro em Parâmetros > Equipamentos.
export function useEquipamentosDaEmpresa(): Equipamento[] {
  const { empresaId } = useEmpresa();
  const todos = useLeitura(() => listarEquipamentos());
  return todos.filter((e) => empresaId === TODAS || e.empresaId === empresaId).sort((a, b) => a.patrimonio.localeCompare(b.patrimonio, "pt-BR"));
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
