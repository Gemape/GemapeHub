// Ferramentas > Movimentações > Registrar entrada > Usada: a ferramenta volta de um empregado para o estoque.
// Mantém os dados da compra original (fornecedor, nota, data, valor) e dá baixa na caixa de onde ela saiu.
import { controleDaFerramenta, disponivelNaCaixa } from "./controle-caixa.ts";

export type PortadorAtivo = { caixa_id: string; empregado_id: string; status: string };
export type ItemDeCaixa = { caixa_id: string; ferramenta_id: string; quantidade: number };
export type MovimentoUsada = {
  modulo: string; item_id: string | null; empregado_id: string | null; tipo_movimentacao: string; motivo_baixa: string | null; quantidade: number;
  data_movimentacao: string; caixa_id?: string | null; fornecedor?: string | null; fornecedor_id?: string | null; nota_fiscal?: string | null;
  valor_unitario?: number | null; created_at?: string;
};

export type FerramentaComEmpregado = { caixaId: string; ferramentaId: string; disponivel: number };

/** Ferramentas das caixas em que o empregado é o portador ativo, com o que ainda está guardado em cada uma. */
export function ferramentasDoEmpregado(
  empregadoId: string,
  portadores: readonly PortadorAtivo[],
  itensDeTodas: readonly ItemDeCaixa[],
  movimentos: readonly MovimentoUsada[],
): FerramentaComEmpregado[] {
  const caixas = new Set(portadores.filter((p) => p.status === "Ativa" && p.empregado_id === empregadoId).map((p) => p.caixa_id));
  return itensDeTodas.flatMap((i) => {
    if (!caixas.has(i.caixa_id)) return [];
    const doItem = movimentos.filter((m) => m.item_id === i.ferramenta_id && (!m.caixa_id || m.caixa_id === i.caixa_id));
    const c = controleDaFerramenta(doItem, i.ferramenta_id);
    const disponivel = disponivelNaCaixa(i.quantidade, c.comEmpregado, c.baixado + c.baixadoDaCaixa);
    return disponivel > 0 ? [{ caixaId: i.caixa_id, ferramentaId: i.ferramenta_id, disponivel }] : [];
  });
}

export type CompraOriginal = { fornecedor: string | null; fornecedorId: string | null; notaFiscal: string | null; dataCompra: string; valorUnitario: number };

/** A entrada mais recente da ferramenta, de preferência a que tem valor: é dela que a devolução herda fornecedor, nota, data e custo. */
export function compraOriginalDaFerramenta(movimentos: readonly MovimentoUsada[], ferramentaId: string): CompraOriginal | null {
  let melhor: MovimentoUsada | null = null;
  for (const m of movimentos) {
    if (m.modulo !== "ferramenta" || m.item_id !== ferramentaId || m.tipo_movimentacao !== "Entrada") continue;
    const comValor = Number(m.valor_unitario) > 0;
    const melhorComValor = !!melhor && Number(melhor.valor_unitario) > 0;
    if (!melhor || (comValor && !melhorComValor) || (comValor === melhorComValor && `${m.data_movimentacao}|${m.created_at ?? ""}` > `${melhor.data_movimentacao}|${melhor.created_at ?? ""}`)) melhor = m;
  }
  return melhor && { fornecedor: melhor.fornecedor ?? null, fornecedorId: melhor.fornecedor_id ?? null, notaFiscal: melhor.nota_fiscal ?? null, dataCompra: melhor.data_movimentacao, valorUnitario: Number(melhor.valor_unitario) || 0 };
}

export type EscolhaUsada = { ferramentaId: string; nome: string; caixaId: string; quantidade: number; disponivel: number };

/** Confere o que foi escolhido para devolver; devolve a mensagem do que está errado ou null. */
export function erroDaEntradaUsada(empregadoId: string, dataDevolucao: string, escolhas: readonly EscolhaUsada[], semCompra: readonly string[]): string | null {
  if (!empregadoId) return "Escolha o empregado.";
  if (escolhas.length === 0) return "Marque ao menos uma ferramenta para devolver.";
  if (!dataDevolucao) return "Informe a data da devolução.";
  for (const e of escolhas) {
    if (!Number.isInteger(e.quantidade) || e.quantidade < 1) return `Informe a quantidade de ${e.nome} (inteiro, mínimo 1).`;
    if (e.quantidade > e.disponivel) return `${e.nome}: só ${e.disponivel} está na caixa; a devolução não pode passar disso.`;
  }
  const sem = escolhas.find((e) => semCompra.includes(e.ferramentaId));
  if (sem) return `${sem.nome} não tem entrada registrada; registre a entrada nova antes de devolver a usada.`;
  return null;
}
