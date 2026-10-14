// Relatórios de Viagens gerados a partir da lista de despesas (dec 186). Fase 1: ficam só no navegador, em modo demonstração;
// a tabela de relatórios (com `empresa_id`) e o status do lançamento entram na Fase 2. Despesa que entrou num relatório
// fica "Finalizado".
import type { ComprovantesPorPagina } from "./viagens-relatorio.ts";

type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE = "gemape-demo-relatorios-viagens";

export type RelatorioSalvo = {
  id: string;
  criadoEm: string;
  emitente: string;
  empresa: string;
  empregado: string;
  de: string;
  ate: string;
  comprovantesPorPagina: ComprovantesPorPagina;
  supervisor: string;
  diretor: string;
  despesaIds: string[];
};

export type DespesaParaRelatorio = { id: string; data: string; responsavel: string | null };

export function listarRelatorios(storage: StorageLike = localStorage): RelatorioSalvo[] {
  try {
    const lidos = JSON.parse(storage.getItem(CHAVE) ?? "[]");
    return Array.isArray(lidos) ? (lidos as RelatorioSalvo[]).filter((r) => !!r && typeof r === "object" && Array.isArray(r.despesaIds)) : [];
  } catch {
    return [];
  }
}

// Despesa -> relatório em que entrou.
export function relatorioPorDespesa(relatorios: readonly RelatorioSalvo[]): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const r of relatorios) for (const id of r.despesaIds) mapa.set(id, r.id);
  return mapa;
}

function conferirIntegridade(storage: StorageLike): void {
  const bruto = storage.getItem(CHAVE);
  if (bruto === null) return;
  let ok = false;
  try { ok = Array.isArray(JSON.parse(bruto)); } catch { ok = false; }
  if (!ok) throw new Error("Os relatórios salvos neste navegador estão ilegíveis; nada foi alterado.");
}

export type NovoRelatorio = Omit<RelatorioSalvo, "id" | "criadoEm" | "de" | "ate" | "empregado" | "despesaIds"> & { despesas: DespesaParaRelatorio[] };

// Valida tudo e grava de uma vez: pelo menos uma despesa, de um só técnico, nenhuma já finalizada.
export function registrarRelatorio(novo: NovoRelatorio, storage: StorageLike = localStorage, agora = new Date()): RelatorioSalvo {
  if (novo.despesas.length === 0) throw new Error("Marque pelo menos uma despesa para gerar o relatório.");
  const ids = novo.despesas.map((d) => d.id);
  if (new Set(ids).size !== ids.length) throw new Error("Há despesas repetidas na seleção.");
  const tecnicos = new Set(novo.despesas.map((d) => d.responsavel));
  const empregado = novo.despesas[0]!.responsavel;
  if (tecnicos.size !== 1 || !empregado) throw new Error("O relatório é de um técnico só: marque despesas de um mesmo técnico.");
  conferirIntegridade(storage);
  const existentes = listarRelatorios(storage);
  const finalizadas = relatorioPorDespesa(existentes);
  if (ids.some((id) => finalizadas.has(id))) throw new Error("Há despesa marcada que já está finalizada em outro relatório.");
  const datas = novo.despesas.map((d) => d.data).sort();
  const salvo: RelatorioSalvo = {
    id: `rel-${agora.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    criadoEm: agora.toISOString(),
    emitente: novo.emitente, empresa: novo.empresa, empregado,
    de: datas[0]!, ate: datas[datas.length - 1]!,
    comprovantesPorPagina: novo.comprovantesPorPagina, supervisor: novo.supervisor, diretor: novo.diretor,
    despesaIds: ids,
  };
  try {
    storage.setItem(CHAVE, JSON.stringify([salvo, ...existentes]));
  } catch {
    throw new Error("Não há espaço no navegador para guardar este relatório.");
  }
  return salvo;
}
