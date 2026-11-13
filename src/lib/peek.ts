// Montagem dos textos da gaveta e do cartão rápido (peek). Só dados em memória: quem chama busca o que precisa.
import { formatarData } from "./gemape.ts";

export type MovimentoResumo = { tipo_movimentacao: string; quantidade: number; data_movimentacao: string; created_at?: string | null; item_id?: string | null };

const ROTULO_TIPO: Record<string, string> = { Entrada: "Entrada", Saida: "Saída", Devolucao: "Devolução", Transferencia: "Transferência", Vistoria: "Vistoria" };

/** As últimas `n` movimentações (mais recentes primeiro), em frases curtas: "Saída · Luva" com "2 · 12/03/2026". */
export function ultimasMovimentacoes(movs: readonly MovimentoResumo[], nomeDoItem: (id: string | null | undefined) => string, n = 5): { texto: string; valor: string }[] {
  return [...movs]
    .sort((a, b) => (b.data_movimentacao + (b.created_at ?? "")).localeCompare(a.data_movimentacao + (a.created_at ?? "")))
    .slice(0, n)
    .map((m) => ({ texto: `${ROTULO_TIPO[m.tipo_movimentacao] ?? m.tipo_movimentacao} · ${nomeDoItem(m.item_id)}`, valor: `${m.quantidade} · ${formatarData(m.data_movimentacao)}` }));
}

/** Situação da validade do CA de um EPI: texto curto e se está vencido ou vencendo (até 30 dias). */
export function situacaoDoCa(validade: string | null | undefined, hoje: string): { texto: string; vencido: boolean; avisar: boolean } {
  if (!validade) return { texto: "Validade do CA não informada", vencido: false, avisar: false };
  const dia = validade.slice(0, 10);
  const dias = Math.round((Date.parse(`${dia}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / 86_400_000);
  if (dias < 0) return { texto: `CA vencido em ${formatarData(dia)}`, vencido: true, avisar: true };
  if (dias <= 30) return { texto: `CA vence em ${dias} dia${dias === 1 ? "" : "s"} (${formatarData(dia)})`, vencido: false, avisar: true };
  return { texto: `CA válido até ${formatarData(dia)}`, vencido: false, avisar: false };
}
