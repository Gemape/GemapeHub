// Mini-resumo do colaborador na tela de entrega: o que ele tem em posse, o que está vencido e o que ainda deve devolver. Só leitura, sem gravar nada.
import { emPosseEpi, type MovimentacaoEpi } from "./entrega-epi.ts";

export type ItemDoResumo = { id: string; nome: string; ca_validade?: string | null; data_validade?: string | null };
export type PosseDoResumo = { itemId: string; nome: string; quantidade: number; tamanhos: string[]; vencido: boolean };
export type ResumoEmpregado = { emPosse: PosseDoResumo[]; vencidos: number };

// Vence quando a validade (do CA ou do próprio item) é anterior a hoje; sem validade informada, não é vencido.
const venceu = (i: ItemDoResumo, hoje: string): boolean => [i.ca_validade, i.data_validade].some((d) => !!d && d.slice(0, 10) < hoje);

export function resumoEmpregado(movs: readonly MovimentacaoEpi[], itens: readonly ItemDoResumo[], empregadoId: string, hoje: string): ResumoEmpregado {
  const porItem = new Map(itens.map((i) => [i.id, i]));
  const ids = [...new Set(movs.filter((m) => m.item_id && m.empregado_id === empregadoId).map((m) => m.item_id as string))];
  const emPosse: PosseDoResumo[] = [];
  for (const id of ids) {
    const quantidade = emPosseEpi(movs, empregadoId, id, null);
    if (quantidade <= 0) continue;
    // Item apagado ou fora da lista continua em posse do empregado: aparece, só que sem validade para conferir.
    const item = porItem.get(id);
    const tamanhos = [...new Set(movs.filter((m) => m.item_id === id && m.empregado_id === empregadoId && m.tamanho_id).map((m) => m.tamanho_id as string))]
      .filter((t) => emPosseEpi(movs, empregadoId, id, t) > 0);
    emPosse.push({ itemId: id, nome: item?.nome ?? "Item removido do cadastro", quantidade, tamanhos, vencido: item ? venceu(item, hoje) : false });
  }
  emPosse.sort((a, b) => Number(b.vencido) - Number(a.vencido) || a.nome.localeCompare(b.nome, "pt-BR"));
  return { emPosse, vencidos: emPosse.filter((p) => p.vencido).length };
}
