// Controle das ferramentas por caixa (decisão 101): a caixa lista as ferramentas
// cadastradas nela, quanto está com empregados e o histórico de movimentações dessas ferramentas.
// A caixa é gravada em entregas, vistorias e devoluções; compras e baixas ficam sem caixa.
import { ehBaixa, naturezaMovimentacao } from "./historico-movimentacoes.ts";
import { formatarData } from "./gemape.ts";

type MovimentoCaixa = {
  modulo: string;
  tipo_movimentacao: string;
  item_id: string | null;
  empregado_id: string | null;
  motivo_baixa: string | null;
  quantidade: number;
  data_movimentacao: string;
  observacao: string | null;
  // Caixa gravada na movimentação (só no modo demonstração); vazia em compras, baixas e registros antigos.
  caixa_id?: string | null | undefined;
};

/**
 * Movimentações de ferramenta da caixa, na ordem recebida: as gravadas com a caixa e, entre as sem
 * caixa (compras, baixas, registros antigos), as de ferramentas que estão cadastradas nela.
 */
export function movimentacoesDaCaixa<T extends { modulo: string; item_id: string | null; caixa_id?: string | null | undefined }>(
  movimentacoes: T[],
  caixaId: string,
  ferramentaIds: Iterable<string>,
): T[] {
  const ids = new Set(ferramentaIds);
  return movimentacoes.filter((m) => {
    if (m.modulo !== "ferramenta" || !m.item_id) return false;
    if (m.caixa_id) return m.caixa_id === caixaId;
    return ids.has(m.item_id);
  });
}

/** Caixa da entrega mais recente da ferramenta ao empregado, para a devolução voltar à mesma caixa. */
export function caixaDaUltimaEntrega(
  movimentacoes: (Pick<MovimentoCaixa, "modulo" | "tipo_movimentacao" | "item_id" | "empregado_id" | "motivo_baixa" | "data_movimentacao"> & {
    caixa_id?: string | null | undefined;
    created_at?: string | undefined;
  })[],
  empregadoId: string,
  itemId: string,
): string | null {
  let melhor: (typeof movimentacoes)[number] | null = null;
  for (const m of movimentacoes) {
    if (m.modulo !== "ferramenta" || m.item_id !== itemId || m.empregado_id !== empregadoId) continue;
    if (m.tipo_movimentacao !== "Saida" || ehBaixa(m) || !m.caixa_id) continue;
    const chave = `${m.data_movimentacao}|${m.created_at ?? ""}`;
    if (!melhor || chave > `${melhor.data_movimentacao}|${melhor.created_at ?? ""}`) melhor = m;
  }
  return melhor?.caixa_id ?? null;
}

/**
 * Entregue, devolvido e baixado de uma ferramenta. A baixa com empregado sai do que estava com ele;
 * a baixa sem empregado (perda ou quebra dentro da caixa) sai do que estava guardado na caixa.
 */
export function controleDaFerramenta(
  movimentacoes: Pick<MovimentoCaixa, "modulo" | "tipo_movimentacao" | "item_id" | "empregado_id" | "motivo_baixa" | "quantidade">[],
  ferramentaId: string,
) {
  let entregue = 0;
  let devolvido = 0;
  let baixado = 0;
  let baixadoDaCaixa = 0;
  for (const m of movimentacoes) {
    if (m.modulo !== "ferramenta" || m.item_id !== ferramentaId) continue;
    const quantidade = Number(m.quantidade) || 0;
    if (m.tipo_movimentacao === "Saida") {
      if (!ehBaixa(m)) entregue += quantidade;
      else if (m.empregado_id) baixado += quantidade;
      else baixadoDaCaixa += quantidade;
    } else if (m.tipo_movimentacao === "Devolucao") devolvido += quantidade;
  }
  return {
    entregue,
    devolvido,
    baixado,
    baixadoDaCaixa,
    comEmpregado: Math.max(entregue - devolvido - baixado, 0),
  };
}

/** Quanto da quantidade cadastrada na caixa continua guardado nela. */
export const disponivelNaCaixa = (quantidadeNaCaixa: number, comEmpregado: number, baixadoDaCaixa = 0) =>
  Math.max((Number(quantidadeNaCaixa) || 0) - comEmpregado - baixadoDaCaixa, 0);

/** Confere a lista de ferramentas da caixa antes de gravar; devolve a mensagem de erro ou null. */
export function validarFerramentasDaCaixa(
  itens: { ferramenta_id: string; quantidade: number }[],
  comEmpregado: (ferramentaId: string) => number,
  nomeFerramenta: (ferramentaId: string) => string,
): string | null {
  if (itens.length === 0) return "Deixe pelo menos uma ferramenta na caixa.";
  const vistos = new Set<string>();
  for (const i of itens) {
    const nome = nomeFerramenta(i.ferramenta_id);
    if (vistos.has(i.ferramenta_id)) return `${nome} está repetida na caixa.`;
    vistos.add(i.ferramenta_id);
    if (!Number.isInteger(i.quantidade) || i.quantidade < 1) return `Informe a quantidade de ${nome} (inteiro, mínimo 1).`;
    const fora = comEmpregado(i.ferramenta_id);
    if (i.quantidade < fora) return `${nome}: ${fora} está com empregado; a quantidade na caixa não pode ser menor.`;
  }
  return null;
}

/** Quem estava com empregado precisa voltar à caixa antes de a ferramenta sair dela. */
export function ferramentasComEmpregadoRemovidas(
  antes: { ferramenta_id: string }[],
  depois: { ferramenta_id: string }[],
  comEmpregado: (ferramentaId: string) => number,
  nomeFerramenta: (ferramentaId: string) => string,
): string | null {
  const restam = new Set(depois.map((i) => i.ferramenta_id));
  for (const i of antes) {
    if (!restam.has(i.ferramenta_id) && comEmpregado(i.ferramenta_id) > 0)
      return `${nomeFerramenta(i.ferramenta_id)} está com empregado; registre a devolução antes de tirá-la da caixa.`;
  }
  return null;
}

/** Confere a baixa pedida pela caixa; devolve a mensagem de erro ou null. */
export function validarBaixaDaCaixa(dados: {
  ferramentaId: string;
  quantidade: number;
  motivo: string;
  data: string;
  disponivel: number;
  comEmpregado: number;
  empregadoId: string | null;
}): string | null {
  if (!dados.ferramentaId) return "Escolha a ferramenta.";
  if (!Number.isInteger(dados.quantidade) || dados.quantidade < 1) return "Informe a quantidade (inteiro, mínimo 1).";
  if (!dados.motivo) return "Escolha o motivo da baixa.";
  if (!dados.data) return "Informe a data da baixa.";
  const limite = dados.empregadoId ? dados.comEmpregado : dados.disponivel;
  if (dados.quantidade > limite)
    return dados.empregadoId
      ? `Só ${limite} está com empregado; a baixa não pode passar disso.`
      : `Só ${limite} está guardada na caixa; a baixa não pode passar disso.`;
  return null;
}

/** Ocorrências da caixa: as gravadas com ela e, entre as sem caixa, as de ferramentas cadastradas nela. */
export function ocorrenciasDaCaixa<T extends { item_id: string | null; caixa_id?: string | null | undefined }>(
  ocorrencias: T[],
  caixaId: string,
  ferramentaIds: Iterable<string>,
): T[] {
  const ids = new Set(ferramentaIds);
  return ocorrencias.filter((o) => {
    if (o.caixa_id) return o.caixa_id === caixaId;
    return !!o.item_id && ids.has(o.item_id);
  });
}

export function linhaCsvCaixa(
  m: MovimentoCaixa,
  contexto: {
    caixa: string;
    ferramentas: { id: string; codigo_sku: string | null; nome: string }[];
    nomeEmpregado: (id: string | null) => string;
  },
): Record<string, unknown> {
  const ferramenta = contexto.ferramentas.find((f) => f.id === m.item_id);
  return {
    Caixa: contexto.caixa,
    Data: formatarData(m.data_movimentacao),
    Tipo: naturezaMovimentacao({ ...m, veiculo_id: null, onus_baixa: null, tipo_vistoria: null, sinalizar_ocorrencia: false, tipo_ocorrencia: null, conducao_ocorrencia: null }),
    Codigo: ferramenta?.codigo_sku || "—",
    Ferramenta: ferramenta?.nome ?? "—",
    Quantidade: m.quantidade,
    Empregado: contexto.nomeEmpregado(m.empregado_id),
    MotivoBaixa: m.motivo_baixa,
    Observacao: m.observacao,
  };
}
