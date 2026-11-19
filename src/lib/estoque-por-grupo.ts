// Ferramentas > Estoque > por grupo: as ferramentas agrupadas pelo grupo do cadastro (chave L, chave de fenda...), com os saldos somados.
export const SEM_GRUPO = "Sem grupo";

type ItemDoGrupo = { id: string; codigo_sku: string | null; nome: string; empresa_id: string | null; grupo_ferramenta?: string | null; estoque_minimo?: number | null };
type PosicaoSomavel = { saldo: number; guardada: number; comEmpregado: number; semCaixa: number };

export type GrupoDeEstoque = {
  grupo: string;
  itens: { item: ItemDoGrupo; posicao: PosicaoSomavel }[];
  saldo: number;
  minimo: number;
  guardada: number;
  comEmpregado: number;
  semCaixa: number;
  abaixoDoMinimo: number;
};

const ZERO: PosicaoSomavel = { saldo: 0, guardada: 0, comEmpregado: 0, semCaixa: 0 };

/** Agrupa pelo grupo do cadastro (sem diferenciar maiúscula nem acento), ordenado pelo nome; o que não tem grupo vai para "Sem grupo", no fim. */
export function agruparEstoquePorGrupo(itens: readonly ItemDoGrupo[], posicoes: ReadonlyMap<string, PosicaoSomavel>, emAlerta: ReadonlySet<string> = new Set()): GrupoDeEstoque[] {
  const chave = (g: string) => g.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const grupos = new Map<string, GrupoDeEstoque>();
  for (const item of itens) {
    const digitado = (item.grupo_ferramenta ?? "").trim();
    // Um grupo cadastrado como "sem grupo" entra no mesmo balde dos itens sem grupo, com o nome padrão.
    const nome = !digitado || chave(digitado) === chave(SEM_GRUPO) ? SEM_GRUPO : digitado;
    const g = grupos.get(chave(nome)) ?? { grupo: nome, itens: [], saldo: 0, minimo: 0, guardada: 0, comEmpregado: 0, semCaixa: 0, abaixoDoMinimo: 0 };
    const posicao = posicoes.get(item.id) ?? ZERO;
    g.itens.push({ item, posicao });
    g.saldo += posicao.saldo; g.guardada += posicao.guardada; g.comEmpregado += posicao.comEmpregado; g.semCaixa += posicao.semCaixa;
    g.minimo += Number(item.estoque_minimo) || 0;
    // O alerta vem da mesma regra da lista de itens (mínimo por tamanho, parâmetros e níveis), não de uma comparação própria.
    if (emAlerta.has(item.id)) g.abaixoDoMinimo += 1;
    grupos.set(chave(nome), g);
  }
  return [...grupos.values()]
    .map((g) => ({ ...g, itens: g.itens.sort((a, b) => a.item.nome.localeCompare(b.item.nome, "pt-BR") || (a.item.codigo_sku ?? "").localeCompare(b.item.codigo_sku ?? "")) }))
    .sort((a, b) => (a.grupo === SEM_GRUPO ? 1 : b.grupo === SEM_GRUPO ? -1 : a.grupo.localeCompare(b.grupo, "pt-BR")));
}
