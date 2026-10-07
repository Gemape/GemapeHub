// Associar itens de check list a um veículo (decisão 74). Fase 1: fica só no navegador, em modo
// demonstração; a tabela no banco real é pendência da Fase 2.
// Para cada veículo: os grupos de Itens check list habilitados, a periodicidade de cada grupo e o responsável.

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const CHAVE = "gemape-demo-associacoes-checklist-veiculo";
export const EVENTO_ASSOCIACOES_CHECKLIST = "gemape-associacoes-checklist-veiculo";

export const PERIODICIDADES_ASSOCIACAO = ["Diária", "Semanal", "Quinzenal", "Mensal"] as const;
export type PeriodicidadeAssociacao = (typeof PERIODICIDADES_ASSOCIACAO)[number];

export type ItemAssociacao = { grupoId: string; periodicidade: PeriodicidadeAssociacao };
export type ResponsavelAssociacao = { id: string; nome: string };
export type AssociacaoChecklist = {
  veiculoId: string;
  responsavel: ResponsavelAssociacao;
  itens: ItemAssociacao[];
  atualizadoEm: string;
};
export type EntradaItemAssociacao = { grupoId: string; periodicidade: string };

const storagePadrao = (): StorageLike | null =>
  typeof localStorage === "undefined" ? null : localStorage;

const ehPeriodicidade = (v: unknown): v is PeriodicidadeAssociacao =>
  PERIODICIDADES_ASSOCIACAO.includes(v as PeriodicidadeAssociacao);

// `integro` é false quando havia dados que não puderam ser lidos: nada é gravado por cima deles.
function lerComEstado(storage: StorageLike | null): { lista: AssociacaoChecklist[]; integro: boolean } {
  if (!storage) return { lista: [], integro: true };
  const bruto = storage.getItem(CHAVE);
  if (bruto === null) return { lista: [], integro: true };
  try {
    const salvos = JSON.parse(bruto) as unknown;
    if (!Array.isArray(salvos)) return { lista: [], integro: false };
    const lista = salvos
      .filter((a): a is Partial<AssociacaoChecklist> => !!a && typeof a === "object" && "veiculoId" in a)
      .map((a) => ({
        veiculoId: String(a.veiculoId),
        atualizadoEm: String(a.atualizadoEm ?? ""),
        responsavel: { id: String(a.responsavel?.id ?? ""), nome: String(a.responsavel?.nome ?? "") },
        itens: (Array.isArray(a.itens) ? a.itens : [])
          .filter((i) => !!i && typeof i === "object" && ehPeriodicidade(i.periodicidade))
          .map((i) => ({ grupoId: String(i.grupoId), periodicidade: i.periodicidade })),
      }));
    return { lista, integro: true };
  } catch {
    return { lista: [], integro: false };
  }
}

export const lerAssociacoes = (storage: StorageLike | null = storagePadrao()): AssociacaoChecklist[] =>
  lerComEstado(storage).lista;

function alterar(storage: StorageLike | null, mudanca: (lista: AssociacaoChecklist[]) => AssociacaoChecklist[]) {
  if (!storage) throw new Error("Armazenamento do navegador indisponível.");
  const { lista, integro } = lerComEstado(storage);
  if (!integro) {
    throw new Error("As associações salvas neste navegador não puderam ser lidas. Nada foi alterado, para não apagá-las.");
  }
  storage.setItem(CHAVE, JSON.stringify(mudanca(lista)));
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_ASSOCIACOES_CHECKLIST));
}

function validar(
  veiculoId: string,
  responsavel: ResponsavelAssociacao | null,
  itens: EntradaItemAssociacao[],
  gruposValidos?: string[],
): { responsavel: ResponsavelAssociacao; itens: ItemAssociacao[] } {
  if (!veiculoId) throw new Error("Selecione o veículo.");
  if (!responsavel || !responsavel.id || !responsavel.nome.trim()) throw new Error("Defina o responsável.");
  if (gruposValidos && itens.some((i) => !gruposValidos.includes(i.grupoId))) {
    throw new Error("Um grupo de itens não existe mais em Itens check list. Remova-o e salve de novo.");
  }
  if (itens.length === 0) throw new Error("Habilite ao menos um grupo de itens de check list.");
  const vistos = new Set<string>();
  const validos = itens.map((i) => {
    if (vistos.has(i.grupoId)) throw new Error("Grupo de itens repetido na associação.");
    vistos.add(i.grupoId);
    if (!ehPeriodicidade(i.periodicidade)) {
      throw new Error("Escolha a periodicidade (Diária, Semanal, Quinzenal ou Mensal) de cada grupo.");
    }
    return { grupoId: i.grupoId, periodicidade: i.periodicidade };
  });
  return { responsavel: { id: responsavel.id, nome: responsavel.nome.trim() }, itens: validos };
}

export function criarAssociacao(
  veiculoId: string,
  responsavel: ResponsavelAssociacao | null,
  itens: EntradaItemAssociacao[],
  storage = storagePadrao(),
  agora = new Date(),
  gruposValidos?: string[],
): AssociacaoChecklist {
  const v = validar(veiculoId, responsavel, itens, gruposValidos);
  const associacao: AssociacaoChecklist = { veiculoId, ...v, atualizadoEm: agora.toISOString() };
  alterar(storage, (lista) => {
    if (lista.some((a) => a.veiculoId === veiculoId)) throw new Error("Este veículo já tem itens de check list associados. Use Editar.");
    return [...lista, associacao];
  });
  return associacao;
}

// Editar abre todos os campos (decisão 51): troca grupos, periodicidade, responsável e também o
// veículo, desde que o veículo novo não tenha associação. Tudo ou nada.
export function editarAssociacao(
  veiculoIdAtual: string,
  novo: { veiculoId: string; responsavel: ResponsavelAssociacao | null; itens: EntradaItemAssociacao[] },
  storage = storagePadrao(),
  agora = new Date(),
  gruposValidos?: string[],
): AssociacaoChecklist {
  const v = validar(novo.veiculoId, novo.responsavel, novo.itens, gruposValidos);
  const associacao: AssociacaoChecklist = { veiculoId: novo.veiculoId, ...v, atualizadoEm: agora.toISOString() };
  alterar(storage, (lista) => {
    if (!lista.some((a) => a.veiculoId === veiculoIdAtual)) throw new Error("Associação não encontrada.");
    if (novo.veiculoId !== veiculoIdAtual && lista.some((a) => a.veiculoId === novo.veiculoId)) {
      throw new Error("Este veículo já tem itens de check list associados. Use Editar.");
    }
    return lista.map((a) => (a.veiculoId === veiculoIdAtual ? associacao : a));
  });
  return associacao;
}

export function removerAssociacao(veiculoId: string, storage = storagePadrao()): void {
  alterar(storage, (lista) => lista.filter((a) => a.veiculoId !== veiculoId));
}

// Grupos da associação que ainda existem em Parâmetros > Veículos > Itens check list.
export function gruposDaAssociacao(
  associacao: AssociacaoChecklist,
  grupos: { id: string; nome: string }[],
): (ItemAssociacao & { nome: string })[] {
  return associacao.itens.flatMap((i) => {
    const grupo = grupos.find((g) => g.id === i.grupoId);
    return grupo ? [{ ...i, nome: grupo.nome }] : [];
  });
}
