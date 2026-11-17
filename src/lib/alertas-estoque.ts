// Alertas de estoque mínimo: UMA contagem para a tela inicial, os cartões e o Dashboard, no mesmo critério da coluna "Alerta" das telas de Estoque.
// Cada linha é um item (de uma empresa) em um tamanho, como a linha da lista de Estoque; item sem tamanho vira uma linha só.
// "Próximo do mínimo" (1 acima) é só aviso de leitura e não entra na contagem (decisão 417).
import { nivelDoAlerta } from "./estoque-epi-visao.ts";

export type NivelMinimo = "abaixo" | "minimo";
export type ModuloEstoque = "epi" | "uniforme" | "ferramenta";
export type EstadoComTamanhos = {
  saldo: number;
  minimo: number;
  alerta: boolean;
  /** Um por tamanho com alerta (EPI e uniforme com mínimo por tamanho). */
  alertas?: readonly { nome: string; saldo: number; minimo: number }[];
};
export type ItemParaAlerta = { id: string; nome: string; empresa_id?: string | null; status?: string | null };
export type LinhaDeEstoqueAlerta = {
  chave: string;
  itemId: string;
  nome: string;
  empresaId: string | null;
  modulo: ModuloEstoque;
  /** Nome do tamanho; null quando o item não é controlado por tamanho. */
  tamanho: string | null;
  saldo: number;
  minimo: number;
  nivel: NivelMinimo;
};

export const ROTULO_NIVEL: Record<NivelMinimo, string> = { abaixo: "Abaixo do mínimo", minimo: "No estoque mínimo" };

/** Linhas em alerta (abaixo do mínimo ou no mínimo) dos itens ativos de um módulo. */
export function linhasDeAlertaEstoque(
  itens: readonly ItemParaAlerta[],
  modulo: ModuloEstoque,
  estado: (item: ItemParaAlerta) => EstadoComTamanhos,
): LinhaDeEstoqueAlerta[] {
  return itens.filter((i) => i.status !== "Inativo").flatMap((i) => {
    const s = estado(i);
    if (!s.alerta) return [];
    const partes = s.alertas && s.alertas.length > 0 ? s.alertas : [{ nome: null, saldo: s.saldo, minimo: s.minimo }];
    return partes.flatMap((p) => {
      const nivel = nivelDoAlerta(p.saldo, p.minimo);
      return nivel === "abaixo" || nivel === "minimo"
        ? [{ chave: `min-${modulo}-${i.id}-${p.nome ?? "geral"}`, itemId: i.id, nome: i.nome, empresaId: i.empresa_id ?? null, modulo, tamanho: p.nome, saldo: p.saldo, minimo: p.minimo, nivel }]
        : [];
    });
  });
}

/** Estado padrão (saldo e mínimo gravados no item): alerta quando há mínimo definido e o saldo chegou nele. */
export const estadoGravado = (i: { estoque_atual?: number | null; estoque_minimo?: number | null }): EstadoComTamanhos => {
  const saldo = Math.max(0, i.estoque_atual ?? 0);
  const minimo = i.estoque_minimo ?? 0;
  return { saldo, minimo, alerta: minimo > 0 && saldo <= minimo };
};
