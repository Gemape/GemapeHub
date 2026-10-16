// Termo de Encerramento de ferramentas (decisão 16, etapa 5): devolve só o
// saldo ainda sob responsabilidade do empregado, uma única vez.
import { lerTodas } from "./ler-todas.ts";
import { ehBaixa } from "./historico-movimentacoes.ts";

type MovimentacaoSaldo = {
  modulo: string;
  tipo_movimentacao: string;
  item_id: string | null;
  empresa_id: string | null;
  empregado_id: string | null;
  motivo_baixa: string | null;
  quantidade: number;
};

/** Saldo por ferramenta: entregue ao empregado menos o que ele devolveu ou teve baixado. */
export function saldosSobResponsabilidade(
  movimentacoes: MovimentacaoSaldo[],
  filtro: { empregadoId: string; empresaId: string },
): Map<string, number> {
  const saldos = new Map<string, number>();
  for (const m of movimentacoes) {
    if (m.modulo !== "ferramenta" || !m.item_id) continue;
    if (m.empregado_id !== filtro.empregadoId || m.empresa_id !== filtro.empresaId) continue;
    const quantidade = Number(m.quantidade) || 0;
    const delta =
      m.tipo_movimentacao === "Saida"
        ? ehBaixa(m)
          ? -quantidade
          : quantidade
        : m.tipo_movimentacao === "Devolucao"
          ? -quantidade
          : 0;
    if (delta !== 0) saldos.set(m.item_id, (saldos.get(m.item_id) ?? 0) + delta);
  }
  for (const [item, saldo] of saldos) if (saldo <= 0) saldos.delete(item);
  return saldos;
}

type ConsultaMovimentacoes = PromiseLike<{
  data: MovimentacaoSaldo[] | null;
  error: { message: string } | null;
}> & { eq: (coluna: string, valor: string) => ConsultaMovimentacoes };

/** Lê do banco todo o histórico do empregado na empresa, sem limite de linhas, e calcula o saldo. */
export async function lerSaldosSobResponsabilidade(
  cliente: { from: (tabela: "movimentacoes") => { select: (colunas: string) => unknown } },
  filtro: { empregadoId: string; empresaId: string },
): Promise<Map<string, number>> {
  const montar = () =>
    (cliente
      .from("movimentacoes")
      .select(
        "modulo,tipo_movimentacao,item_id,empresa_id,empregado_id,motivo_baixa,quantidade",
      ) as ConsultaMovimentacoes)
      .eq("modulo", "ferramenta")
      .eq("empresa_id", filtro.empresaId)
      .eq("empregado_id", filtro.empregadoId);
  let data: MovimentacaoSaldo[];
  try {
    data = await lerTodas<MovimentacaoSaldo>(montar, (q) => q.order("id"));
  } catch (erro) {
    throw new Error((erro as { message?: string })?.message ?? "Erro ao ler as movimentações.");
  }
  return saldosSobResponsabilidade(data, filtro);
}

/** Devolve a mensagem de erro, ou null quando todas as linhas cabem no saldo. */
export function validarEncerramento(
  linhas: { item_id: string; quantidade: number }[],
  saldos: Map<string, number>,
  dataEncerramento?: string,
): string | null {
  if (dataEncerramento !== undefined && !dataEncerramento) {
    return "Informe a data de encerramento.";
  }
  if (linhas.length === 0) return "Adicione pelo menos uma ferramenta.";
  const pedidas = new Map<string, number>();
  for (const linha of linhas) {
    if (!linha.item_id) return "Selecione a ferramenta de cada linha.";
    if (!Number.isInteger(linha.quantidade) || linha.quantidade < 1) {
      return "A quantidade de cada ferramenta deve ser um número inteiro maior que zero.";
    }
    pedidas.set(linha.item_id, (pedidas.get(linha.item_id) ?? 0) + linha.quantidade);
  }
  for (const [item, quantidade] of pedidas) {
    const saldo = saldos.get(item) ?? 0;
    if (quantidade > saldo) {
      return saldo === 0
        ? "Uma das ferramentas não tem saldo sob responsabilidade deste empregado. Ela já foi devolvida ou nunca foi entregue a ele."
        : `A devolução de ${quantidade} unidade(s) passa do saldo sob responsabilidade do empregado (${saldo}).`;
    }
  }
  return null;
}

/**
 * Termo de Responsabilidade: não entrega mais do que o estoque disponível de cada ferramenta. Com caixa
 * escolhida, o limite é o que está guardado nela (`guardadasNaCaixa`, por ferramenta), não o estoque do cadastro.
 */
export function validarTermoResponsabilidade(
  linhas: { item_id: string; quantidade: number }[],
  itens: { id: string; nome: string; estoque_atual: number | null }[],
  guardadasNaCaixa?: Record<string, number>,
): string | null {
  if (linhas.length === 0) return "Adicione pelo menos uma ferramenta.";
  const pedidas = new Map<string, number>();
  for (const linha of linhas) {
    if (!linha.item_id) return "Selecione a ferramenta de cada linha.";
    if (!Number.isInteger(linha.quantidade) || linha.quantidade < 1) {
      return "A quantidade de cada ferramenta deve ser um número inteiro maior que zero.";
    }
    pedidas.set(linha.item_id, (pedidas.get(linha.item_id) ?? 0) + linha.quantidade);
  }
  for (const [itemId, quantidade] of pedidas) {
    const item = itens.find((i) => i.id === itemId);
    if (guardadasNaCaixa) {
      const guardadas = guardadasNaCaixa[itemId] ?? 0;
      if (quantidade > guardadas) {
        return `A entrega de ${quantidade} unidade(s) de ${item?.nome ?? "uma ferramenta"} passa do que está guardado na caixa (${guardadas}).`;
      }
      continue;
    }
    const estoque = item?.estoque_atual ?? 0;
    if (quantidade > estoque) {
      return `A entrega de ${quantidade} unidade(s) de ${item?.nome ?? "uma ferramenta"} passa do estoque disponível (${estoque}).`;
    }
  }
  return null;
}
