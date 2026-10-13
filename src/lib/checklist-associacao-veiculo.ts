// Associar itens de check list a um veículo (decisão 74). Fase 1: fica só no navegador, em modo
// demonstração; a tabela no banco real é pendência da Fase 2.
// Para cada veículo: os grupos de Itens check list habilitados, a periodicidade de cada grupo e o responsável.

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const CHAVE = "gemape-demo-associacoes-checklist-veiculo";
export const EVENTO_ASSOCIACOES_CHECKLIST = "gemape-associacoes-checklist-veiculo";

// "Não definida" (decisão 116): o grupo não tem periodicidade; com responsável também não definido, o check list é livre.
export const NAO_DEFINIDA = "Não definida";
export const NAO_DEFINIDO = "Não definido";
export const PERIODICIDADES_ASSOCIACAO = ["Diária", "Semanal", "Quinzenal", "Mensal", NAO_DEFINIDA] as const;
export type PeriodicidadeAssociacao = (typeof PERIODICIDADES_ASSOCIACAO)[number];

export type ItemAssociacao = { grupoId: string; tipo: TipoAssociacao; periodicidade: PeriodicidadeAssociacao; obrigatorio: boolean };
export type ResponsavelAssociacao = { id: string; nome: string };
// Cada grupo habilitado é de um dos dois check lists do veículo (decisão 119): o periódico, mais apurado, com periodicidade
// definida, ou o avulso, só para registrar itens mais simples, sem periodicidade (guardada como "Não definida").
export type TipoAssociacao = "periodico" | "avulso";
export const TIPOS_ASSOCIACAO: readonly { id: TipoAssociacao; nome: string }[] = [
  { id: "periodico", nome: "Periódico" },
  { id: "avulso", nome: "Avulso" },
];
export const ehTipoAssociacao = (v: unknown): v is TipoAssociacao => v === "periodico" || v === "avulso";
export type AssociacaoChecklist = {
  veiculoId: string;
  responsavel: ResponsavelAssociacao | null; // null = responsável não definido (decisão 116)
  itens: ItemAssociacao[];
  atualizadoEm: string;
};
export type EntradaItemAssociacao = { grupoId: string; tipo?: TipoAssociacao; periodicidade: string; obrigatorio?: boolean };

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
    const validos = salvos.filter((a): a is Partial<AssociacaoChecklist> => !!a && typeof a === "object" && "veiculoId" in a);
    const lista = validos
      .map((a) => ({
        veiculoId: String(a.veiculoId),
        atualizadoEm: String(a.atualizadoEm ?? ""),
        responsavel: a.responsavel?.id ? { id: String(a.responsavel.id), nome: String(a.responsavel.nome ?? "") } : null,
        itens: (Array.isArray(a.itens) ? a.itens : [])
          .filter((i) => !!i && typeof i === "object" && ehPeriodicidade(i.periodicidade))
          .map((i) => {
            // Sem tipo gravado (antes da decisão 119): periódico se tem periodicidade definida, senão avulso.
            const tipo: TipoAssociacao = ehTipoAssociacao(i.tipo) ? i.tipo : i.periodicidade === NAO_DEFINIDA ? "avulso" : "periodico";
            // Decisão 136: o tipo define a obrigatoriedade (periódico é obrigatório e entra no KPI; avulso não), mesmo em dados gravados antes.
            return { grupoId: String(i.grupoId), tipo, periodicidade: i.periodicidade, obrigatorio: tipo === "periodico" };
          }),
      }));
    // Entrada que não deu para ler: a lista aparece sem ela, mas nenhuma gravação passa por cima.
    return { lista, integro: validos.length === salvos.length };
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
): { responsavel: ResponsavelAssociacao | null; itens: ItemAssociacao[] } {
  if (!veiculoId) throw new Error("Selecione o veículo.");
  if (responsavel && (!responsavel.id || !responsavel.nome.trim())) throw new Error("Responsável inválido: escolha um empregado ou deixe Não definido.");
  if (gruposValidos && itens.some((i) => !gruposValidos.includes(i.grupoId))) {
    throw new Error("Um grupo de itens não existe mais em Itens check list. Remova-o e salve de novo.");
  }
  if (itens.length === 0) throw new Error("Habilite ao menos um grupo de itens de check list.");
  const vistos = new Set<string>();
  const validos = itens.map((i) => {
    if (vistos.has(i.grupoId)) throw new Error("Grupo de itens repetido na associação.");
    vistos.add(i.grupoId);
    // O avulso não tem periodicidade (fica "Não definida"); o periódico precisa de uma periodicidade definida.
    const tipo: TipoAssociacao = i.tipo === "avulso" ? "avulso" : "periodico";
    if (tipo === "avulso") return { grupoId: i.grupoId, tipo, periodicidade: NAO_DEFINIDA as PeriodicidadeAssociacao, obrigatorio: false };
    if (!ehPeriodicidade(i.periodicidade) || i.periodicidade === NAO_DEFINIDA) {
      throw new Error("Escolha a periodicidade (Diária, Semanal, Quinzenal ou Mensal) de cada grupo periódico, ou marque o grupo como Avulso.");
    }
    return { grupoId: i.grupoId, tipo, periodicidade: i.periodicidade, obrigatorio: true };
  });
  return { responsavel: responsavel ? { id: responsavel.id, nome: responsavel.nome.trim() } : null, itens: validos };
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
    if (lista.some((a) => a.veiculoId === veiculoId)) throw new Error("Este veículo já tem itens de check list associados.");
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
      throw new Error("Este veículo já tem itens de check list associados.");
    }
    return lista.map((a) => (a.veiculoId === veiculoIdAtual ? associacao : a));
  });
  return associacao;
}

export function removerAssociacao(veiculoId: string, storage = storagePadrao()): void {
  alterar(storage, (lista) => lista.filter((a) => a.veiculoId !== veiculoId));
}

// Grupos da associação que ainda existem em Parâmetros > Veículos > Check list.
export function gruposDaAssociacao(
  associacao: AssociacaoChecklist,
  grupos: { id: string; nome: string }[],
): (ItemAssociacao & { nome: string })[] {
  return associacao.itens.flatMap((i) => {
    const grupo = grupos.find((g) => g.id === i.grupoId);
    return grupo ? [{ ...i, nome: grupo.nome }] : [];
  });
}

// ---------- Check lists do veículo (decisão 116) ----------
// Os grupos habilitados se juntam por periodicidade: cada periodicidade é um check list do veículo, com o nome
// PLACA >> PERIODICIDADE >> RESPONSÁVEL. Periódico quando a periodicidade está definida; senão é avulso, e livre
// (qualquer hora, qualquer pessoa) quando o responsável também não está definido.
export type TipoChecklistAssociado = "Periódico" | "Avulso" | "Livre";
export type ChecklistAssociado = {
  nome: string;
  periodicidade: PeriodicidadeAssociacao;
  responsavelNome: string | null;
  tipo: TipoChecklistAssociado;
  obrigatorio: "Sim" | "Não" | "Parcial";
  grupos: { grupoId: string; nome: string; obrigatorio: boolean }[];
};

export const textoDoNome = (t: string) => t.trim().replace(/\s+/g, " ");

export function checklistsDaAssociacao(
  rotuloVeiculo: string,
  associacao: AssociacaoChecklist,
  grupos: { id: string; nome: string }[],
): ChecklistAssociado[] {
  const doVeiculo = gruposDaAssociacao(associacao, grupos);
  return PERIODICIDADES_ASSOCIACAO.flatMap((periodicidade) => {
    const deste = doVeiculo.filter((i) => i.periodicidade === periodicidade);
    if (deste.length === 0) return [];
    const definida = periodicidade !== NAO_DEFINIDA;
    const responsavelNome = associacao.responsavel?.nome ?? null;
    const sims = deste.filter((i) => i.obrigatorio).length;
    return [{
      nome: [rotuloVeiculo, periodicidade, responsavelNome ?? NAO_DEFINIDO].map(textoDoNome).join(" >> "),
      periodicidade,
      responsavelNome,
      tipo: definida ? "Periódico" : responsavelNome ? "Avulso" : "Livre",
      obrigatorio: sims === 0 ? "Não" : sims === deste.length ? "Sim" : "Parcial",
      grupos: deste.map((i) => ({ grupoId: i.grupoId, nome: i.nome, obrigatorio: i.obrigatorio })),
    } satisfies ChecklistAssociado];
  });
}

// Grupos de cada check list do veículo (decisão 119), para o módulo: o periódico traz só os grupos periódicos da sua
// periodicidade; o avulso traz só os grupos marcados como avulsos. Sem associação, quem chama decide o que traz.
export function gruposDaPeriodicidade<T extends { grupoId: string; tipo: TipoAssociacao; periodicidade: string }>(
  associacao: { itens: T[] } | null | undefined,
  periodicidade: string,
): T[] {
  const nome = periodicidade === "Diário" ? "Diária" : periodicidade;
  return (associacao?.itens ?? []).filter((i) => i.tipo === "periodico" && i.periodicidade === nome);
}

export function gruposAvulsosDaAssociacao<T extends { grupoId: string; tipo: TipoAssociacao }>(
  associacao: { itens: T[] } | null | undefined,
): T[] {
  return (associacao?.itens ?? []).filter((i) => i.tipo === "avulso");
}
