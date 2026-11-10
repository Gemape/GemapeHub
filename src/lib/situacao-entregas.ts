// Situação de cada entrega no histórico de um empregado. O histórico guarda entregas (saídas), devoluções e baixas, mas não diz de qual entrega saiu cada devolução ou baixa:
// vale a regra de que o mais antigo sai primeiro, por EPI e tamanho. Assim cada entrega mostra quanto ainda está em posse, quanto foi devolvido e quanto foi baixado.
import { ehBaixa } from "./historico-movimentacoes.ts";

export type MovimentoDoHistorico = {
  id: string;
  item_id: string | null;
  tamanho_id?: string | null;
  tipo_movimentacao: string;
  quantidade: number;
  motivo_baixa: string | null;
  data_movimentacao: string;
  created_at?: string | null;
};
export type SituacaoDaEntrega = { quantidade: number; devolvido: number; baixado: number; emPosse: number };

const numero = (v: unknown) => Number(v) || 0;
// "sem-tamanho" (como a devolução grava) vale como sem tamanho.
const chaveDe = (m: MovimentoDoHistorico) => `${m.item_id ?? ""}|${m.tamanho_id && m.tamanho_id !== "sem-tamanho" ? m.tamanho_id : ""}`;

export function situacaoDasEntregas(movimentos: readonly MovimentoDoHistorico[]): Map<string, SituacaoDaEntrega> {
  const ordenados = [...movimentos].sort(
    (a, b) => a.data_movimentacao.slice(0, 10).localeCompare(b.data_movimentacao.slice(0, 10)) || String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")) || a.id.localeCompare(b.id),
  );
  const resultado = new Map<string, SituacaoDaEntrega>();
  const lotes = new Map<string, SituacaoDaEntrega[]>();
  for (const m of ordenados) {
    if (!m.item_id) continue;
    const baixa = ehBaixa(m);
    if (m.tipo_movimentacao === "Saida" && !baixa) {
      const lote: SituacaoDaEntrega = { quantidade: numero(m.quantidade), devolvido: 0, baixado: 0, emPosse: numero(m.quantidade) };
      resultado.set(m.id, lote);
      const chave = chaveDe(m);
      const lista = lotes.get(chave);
      if (lista) lista.push(lote);
      else lotes.set(chave, [lote]);
    } else if (m.tipo_movimentacao === "Devolucao" || baixa) {
      let falta = numero(m.quantidade);
      for (const lote of lotes.get(chaveDe(m)) ?? []) {
        if (falta <= 0) break;
        const q = Math.min(lote.emPosse, falta);
        if (q <= 0) continue;
        lote.emPosse -= q;
        falta -= q;
        if (baixa) lote.baixado += q;
        else lote.devolvido += q;
      }
    }
  }
  return resultado;
}

// O texto da coluna Status da entrega: Em posse, Devolvido, Baixado, Devolvido e baixado, ou Em posse com a quantidade que ainda resta (só o número).
export function rotuloDaSituacao(s: SituacaoDaEntrega | undefined): string {
  if (!s || s.emPosse === s.quantidade) return "Em posse";
  if (s.emPosse > 0) return `Em posse: ${s.emPosse}`;
  if (s.devolvido > 0 && s.baixado > 0) return "Devolvido e baixado";
  return s.baixado > 0 ? "Baixado" : "Devolvido";
}
