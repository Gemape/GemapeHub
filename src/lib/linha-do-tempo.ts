// Linha do tempo auditável: as movimentações de uma ferramenta, veículo ou empregado viram eventos em ordem cronológica, em frases claras
// ("Retirou Furadeira Bosch", "Registrou ocorrência: Cabo danificado"), com categoria para filtrar. Só montagem de dados em memória.

export type Categoria = "entrega" | "devolucao" | "ocorrencia" | "outros";
export type FiltroTempo = "todos" | Categoria;
export const ROTULO_FILTRO: Record<FiltroTempo, string> = { todos: "Todos", entrega: "Entregas", devolucao: "Devoluções", ocorrencia: "Ocorrências", outros: "Outros" };
export const FILTROS: readonly FiltroTempo[] = ["todos", "entrega", "devolucao", "ocorrencia", "outros"];

export type MovimentoDoTempo = {
  id?: string;
  modulo?: string | null;
  item_id?: string | null;
  tipo_movimentacao: string;
  quantidade?: number | null;
  motivo_baixa?: string | null;
  data_movimentacao: string;
  created_at?: string | null;
  empregado_id?: string | null;
  sinalizar_ocorrencia?: boolean | null;
  tipo_ocorrencia?: string | null;
  tipo_vistoria?: string | null;
  observacao?: string | null;
};

export type EventoDoTempo = { chave: string; dia: string; hora: string | null; ordem: number; categoria: Categoria; titulo: string; detalhe: string };

export type ContextoDoTempo = {
  nomeDoItem: (id: string | null | undefined) => string;
  nomeDoEmpregado?: (id: string | null | undefined) => string | null;
  /** Mostrar o nome do empregado no evento (quando a linha do tempo é do item ou do veículo, não do próprio empregado). */
  mostrarEmpregado?: boolean;
};

const baixa = (m: MovimentoDoTempo) => !!m.motivo_baixa && m.tipo_movimentacao === "Saida";

// Hora local do registro (created_at vem em UTC com Z: converte; sem hora, o evento fica só com o dia).
function horaDe(criado: string | null | undefined): string | null {
  if (!criado) return null;
  const d = new Date(criado);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

export function eventosDoTempo(movs: readonly MovimentoDoTempo[], ctx: ContextoDoTempo): EventoDoTempo[] {
  return movs.map((m, n): EventoDoTempo & { desempate: number } => {
    const item = ctx.nomeDoItem(m.item_id);
    const qtd = Number(m.quantidade) || 0;
    const quantidade = qtd > 1 ? `${qtd} × ` : "";
    const quem = ctx.mostrarEmpregado && m.empregado_id ? ctx.nomeDoEmpregado?.(m.empregado_id) : null;
    const com = quem ? ` · ${quem}` : "";
    let categoria: Categoria = "outros";
    let titulo: string;
    if (m.sinalizar_ocorrencia) {
      categoria = "ocorrencia";
      titulo = `Registrou ocorrência${m.tipo_ocorrencia ? `: ${m.tipo_ocorrencia}` : ""} — ${item}`;
    } else if (baixa(m)) {
      titulo = `Baixa (${m.motivo_baixa}) de ${quantidade}${item}`;
    } else if (m.tipo_movimentacao === "Saida") {
      categoria = "entrega";
      titulo = `Retirou ${quantidade}${item}`;
    } else if (m.tipo_movimentacao === "Devolucao") {
      categoria = "devolucao";
      titulo = `Devolveu ${quantidade}${item}`;
    } else if (m.tipo_movimentacao === "Entrada") titulo = `Entrada no estoque de ${quantidade}${item}`;
    else if (m.tipo_movimentacao === "Vistoria") titulo = `Vistoria${m.tipo_vistoria ? ` (${m.tipo_vistoria})` : ""} — ${item}`;
    else titulo = `${m.tipo_movimentacao} — ${item}`;
    const dia = m.data_movimentacao.slice(0, 10);
    // Dentro do mesmo dia ordena a hora do registro (em milissegundos, qualquer formato de fuso); sem hora, o evento vem depois dos que têm.
    const ms = Date.parse(m.created_at ?? "");
    return {
      chave: m.id ?? `${dia}-${n}`, dia, hora: horaDe(m.created_at), categoria, titulo: titulo + com,
      detalhe: (m.observacao ?? "").trim(),
      ordem: Number.isNaN(ms) ? -1 : ms,
      desempate: n,
    };
  }).sort((a, b) => b.dia.localeCompare(a.dia) || b.ordem - a.ordem || a.desempate - b.desempate).map(({ desempate: _d, ...e }) => e);
}

export const filtrarEventos = (eventos: readonly EventoDoTempo[], filtro: FiltroTempo): EventoDoTempo[] =>
  filtro === "todos" ? [...eventos] : eventos.filter((e) => e.categoria === filtro);

/** Agrupa por dia (já em ordem do mais novo para o mais antigo). */
export function agruparPorDia(eventos: readonly EventoDoTempo[]): { dia: string; eventos: EventoDoTempo[] }[] {
  const grupos: { dia: string; eventos: EventoDoTempo[] }[] = [];
  for (const e of eventos) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.dia === e.dia) ultimo.eventos.push(e);
    else grupos.push({ dia: e.dia, eventos: [e] });
  }
  return grupos;
}

export const contagemPorFiltro = (eventos: readonly EventoDoTempo[]): Record<FiltroTempo, number> => ({
  todos: eventos.length,
  entrega: eventos.filter((e) => e.categoria === "entrega").length,
  devolucao: eventos.filter((e) => e.categoria === "devolucao").length,
  ocorrencia: eventos.filter((e) => e.categoria === "ocorrencia").length,
  outros: eventos.filter((e) => e.categoria === "outros").length,
});
