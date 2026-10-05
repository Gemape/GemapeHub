// Rótulo do EPI na Ficha de EPI: código, descrição e tamanho no formato "TAM X".
import { SEM_TAMANHO } from "./estoque-tamanho.ts";
import { mesmoNome } from "./parametros-base.ts";

type Epi = {
  codigo_sku: string;
  nome: string;
  tamanhos_selecionados?: string[] | null;
  // EPI antigo: tamanho em texto, casado com Gerais pelo nome.
  tamanho?: string | null;
};
type Tamanhos = { tamanhos: { id: string; nome: string }[] };

// Nome do tamanho do EPI, ou null se ele não tem tamanho (ou o tamanho foi excluído de Gerais).
// Vale o primeiro tamanho selecionado que ainda existe; sem ele, o texto antigo `tamanho`.
export function tamanhoDoEpi(epi: Pick<Epi, "tamanhos_selecionados" | "tamanho">, p: Tamanhos): string | null {
  for (const id of epi.tamanhos_selecionados ?? []) {
    if (id === SEM_TAMANHO) continue;
    const achado = p.tamanhos.find((t) => t.id === id);
    if (achado) return achado.nome;
  }
  const antigo = (epi.tamanho ?? "").trim();
  if (antigo && antigo !== SEM_TAMANHO) return p.tamanhos.find((t) => mesmoNome(t.nome, antigo))?.nome ?? null;
  return null;
}

export function rotuloEpiFicha(epi: Epi, p: Tamanhos): string {
  const tamanho = tamanhoDoEpi(epi, p);
  return `${epi.codigo_sku} · ${epi.nome} · ${tamanho ? `TAM ${tamanho}` : "Sem tamanho"}`;
}
