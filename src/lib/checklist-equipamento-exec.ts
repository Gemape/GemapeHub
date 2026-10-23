// Execução do check list de equipamentos (manutenção e vistoria), na mesma lógica do de veículos (decisão 63): por equipamento, os itens associados a ele em
// Parâmetros > Equipamentos > Check list são avaliados como OK, NOK ou N.A., com observação e fotos; item NOK gera uma ocorrência e uma pendência no próprio
// check list, aberta até ser resolvida. A periodicidade vem da associação do equipamento. Fase 1: só no navegador, em modo demonstração.
import type { AssociacaoChecklistEquipamento, FinalidadeChecklist, GrupoChecklistEquipamento } from "./equipamentos-checklist.ts";
import { TODOS_OS_TIPOS } from "./equipamentos-checklist.ts";
import { AVALIACOES, ehPeriodicidade, hojeBrasilia, MAX_FOTOS_ITEM, PERIODICIDADES, type Avaliacao, type ItemChecklist, type Periodicidade, type StatusChecklist } from "./checklist-veiculo.ts";
import { registrarOcorrenciaEq, removerOcorrenciaEq } from "./registros-equipamento.ts";
import { alterarLista, lerLista, type StorageLike } from "./registros-veiculo.ts";

export const CHAVE_CHECKLISTS_EQ = "gemape-demo-eq-checklists-exec";
const CHAVE_SEQUENCIA = "gemape-demo-eq-checklists-sequencia";
const LIMITE_FOTO = 600_000; // caracteres do data URL; a foto comprimida fica bem abaixo disso
export const TIPO_OCORRENCIA_CHECKLIST = { id: "checklist-nok", nome: "Item reprovado no check list" } as const;

export type ChecklistEquipamentoRegistro = {
  id: string;
  codigo: string;
  equipamentoId: string;
  equipamentoRotulo: string;
  tipoEquipamento: string;
  finalidade: FinalidadeChecklist;
  periodicidade: Periodicidade | ""; // vazio no check list avulso
  responsavelId: string;
  responsavelNome: string;
  criadoEm: string;
  data: string; // AAAA-MM-DD, horário de Brasília
  status: StatusChecklist;
  concluidoEm: string | null;
  itens: ItemChecklist[];
};

const storagePadrao = (): StorageLike | null => (typeof localStorage === "undefined" ? null : localStorage);
const novoId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random()));
const limpar = (t: string, max: number) => t.trim().replace(/\s+/g, " ").slice(0, max);

export const lerChecklistsEq = (storage: StorageLike | null = storagePadrao()): ChecklistEquipamentoRegistro[] => lerLista<ChecklistEquipamentoRegistro>(CHAVE_CHECKLISTS_EQ, storage).lista;

// Nome do check list: Patrimônio >> Periodicidade >> Responsável; sem periodicidade ou responsável, "Não definida" / "Não definido".
export function nomeDoChecklistEq(c: { patrimonio: string; fallbackEquipamento?: string; periodicidade: string; responsavelNome: string }): string {
  const equipamento = c.patrimonio.trim().toUpperCase() || (c.fallbackEquipamento ?? "").trim();
  return [equipamento, c.periodicidade.trim() || "Não definida", c.responsavelNome.trim() || "Não definido"].map((t) => t.trim().replace(/\s+/g, " ")).join(" >> ");
}
// Só fica fora da lista o check list sem periodicidade E sem responsável (o livre).
export const checklistVisivelNaListaEq = (c: { periodicidade?: string | null | undefined; responsavelNome?: string | null | undefined }): boolean =>
  ehPeriodicidade(c.periodicidade) || (c.responsavelNome ?? "").trim() !== "";

// ---------- Periodicidade e grupos da associação do equipamento ----------
const doGrupo = (p: string): Periodicidade | null => (p === "Diária" ? "Diário" : ehPeriodicidade(p) ? p : null);

// Todas as periodicidades definidas nos grupos periódicos da associação, da mais para a menos frequente.
export function periodicidadesDaAssociacaoEq(associacao: Pick<AssociacaoChecklistEquipamento, "itens"> | null | undefined): Periodicidade[] {
  const validas = (associacao?.itens ?? []).filter((i) => i.tipo === "periodico").map((i) => doGrupo(i.periodicidade)).filter((p): p is Periodicidade => p !== null);
  return PERIODICIDADES.filter((p) => validas.includes(p));
}
// A periodicidade é obrigatória se algum grupo periódico dela estiver marcado como obrigatório.
export const periodicidadeObrigatoriaEq = (associacao: Pick<AssociacaoChecklistEquipamento, "itens"> | null | undefined, periodicidade: Periodicidade): boolean =>
  (associacao?.itens ?? []).some((i) => i.tipo === "periodico" && i.obrigatorio && doGrupo(i.periodicidade) === periodicidade);

// Grupos do check list: os da periodicidade escolhida, ou os avulsos ("avulso"); só os que existem, com os itens escolhidos item a item.
export function gruposDoChecklistEq(associacao: Pick<AssociacaoChecklistEquipamento, "itens"> | null | undefined, grupos: GrupoChecklistEquipamento[], periodicidade: Periodicidade | "avulso" | ""): GrupoChecklistEquipamento[] {
  return (associacao?.itens ?? [])
    .filter((i) => (periodicidade === "avulso" ? i.tipo === "avulso" : i.tipo === "periodico" && doGrupo(i.periodicidade) === periodicidade))
    .flatMap((i) => {
      const grupo = grupos.find((g) => g.id === i.grupoId);
      if (!grupo) return [];
      const itens = i.itensIds ? grupo.itens.filter((x) => i.itensIds!.includes(x.id)) : grupo.itens;
      return itens.length > 0 ? [{ ...grupo, itens }] : [];
    });
}
// Equipamento sem associação: o avulso traz os grupos que valem para o tipo dele e os de todos os tipos.
export const gruposDoTipoEq = (grupos: GrupoChecklistEquipamento[], tipoId: string): GrupoChecklistEquipamento[] =>
  grupos.filter((g) => g.itens.length > 0 && (g.tipos.includes(TODOS_OS_TIPOS) || (!!tipoId && g.tipos.includes(tipoId))));

// ---------- Gravação ----------
function gravar<T>(acao: () => T): T {
  try {
    return acao();
  } catch (erro) {
    if (erro instanceof Error && /quota|exceeded/i.test(`${erro.name} ${erro.message}`)) {
      throw new Error("O navegador ficou sem espaço para guardar o check list. Remova fotos ou conclua e arquive check lists antigos.");
    }
    throw erro;
  }
}

export type EntradaChecklistEq = {
  equipamentoId: string; equipamentoRotulo: string; tipoEquipamento: string; finalidade: FinalidadeChecklist;
  periodicidade: string | null | undefined; responsavelId: string; responsavelNome: string; grupos: GrupoChecklistEquipamento[];
};
export type EntradaChecklistAvulsoEq = Pick<EntradaChecklistEq, "equipamentoId" | "equipamentoRotulo" | "tipoEquipamento" | "finalidade" | "grupos">;

export function iniciarChecklistEq(entrada: EntradaChecklistEq, storage = storagePadrao(), agora = new Date()): ChecklistEquipamentoRegistro {
  if (!entrada.equipamentoId) throw new Error("Selecione o equipamento.");
  if (!ehPeriodicidade(entrada.periodicidade)) throw new Error("Este equipamento não tem periodicidade: associe itens de check list a ele em Parâmetros > Equipamentos > Check list.");
  if (!entrada.responsavelId) throw new Error("Selecione o responsável pelo check list.");
  return gravarNovo({ ...entrada, periodicidade: entrada.periodicidade }, false, storage, agora);
}
// Avulso: sem periodicidade e sem responsável; fica fora da lista principal, do painel do mês e da situação por equipamento.
export function iniciarChecklistAvulsoEq(entrada: EntradaChecklistAvulsoEq, storage = storagePadrao(), agora = new Date()): ChecklistEquipamentoRegistro {
  if (!entrada.equipamentoId) throw new Error("Selecione o equipamento.");
  return gravarNovo({ ...entrada, periodicidade: "", responsavelId: "", responsavelNome: "" }, true, storage, agora);
}

// Cada check list tem um código único (CHE-0001...): maior que o maior existente e que o último já entregue.
function proximoCodigo(lista: ChecklistEquipamentoRegistro[], storage: StorageLike | null): string {
  const numero = (texto: string | null | undefined) => Number(String(texto ?? "").replace(/\D/g, "")) || 0;
  let entregue = 0;
  try { entregue = numero(storage?.getItem(CHAVE_SEQUENCIA)); } catch { /* sem armazenamento: vale só a lista */ }
  const proximo = Math.max(entregue, ...lista.map((c) => numero(c.codigo))) + 1;
  try { storage?.setItem(CHAVE_SEQUENCIA, String(proximo)); } catch { /* sem o que fazer */ }
  return `CHE-${String(proximo).padStart(4, "0")}`;
}

function gravarNovo(entrada: Omit<EntradaChecklistEq, "periodicidade"> & { periodicidade: Periodicidade | "" }, avulso: boolean, storage: StorageLike | null, agora: Date): ChecklistEquipamentoRegistro {
  const itens: ItemChecklist[] = entrada.grupos.flatMap((g) => g.itens.map((i) => ({
    id: `${g.id}:${i.id}`, grupo: g.nome, nome: i.nome, avaliacao: null, observacao: "", fotos: [], ocorrenciaId: null, ocorrenciaCodigo: null, resolucao: null,
  })));
  if (itens.length === 0) throw new Error("Não há itens de check list para este equipamento. Associe os itens em Parâmetros > Equipamentos > Check list.");
  let criado!: ChecklistEquipamentoRegistro;
  gravar(() => alterarLista<ChecklistEquipamentoRegistro>(CHAVE_CHECKLISTS_EQ, storage, (lista) => {
    // O avulso e o periódico não se bloqueiam; cada periodicidade tem o seu periódico em andamento por equipamento e finalidade.
    if (lista.some((c) => c.equipamentoId === entrada.equipamentoId && c.finalidade === entrada.finalidade && c.status === "Em andamento" && checklistVisivelNaListaEq(c) === !avulso && (avulso || c.periodicidade === entrada.periodicidade))) {
      throw new Error(avulso
        ? "Este equipamento já tem um check list avulso em andamento. Conclua-o antes de iniciar outro."
        : `Este equipamento já tem um check list ${String(entrada.periodicidade).toLowerCase()} em andamento. Conclua-o antes de iniciar outro.`);
    }
    criado = {
      id: novoId(), codigo: proximoCodigo(lista, storage), equipamentoId: entrada.equipamentoId, equipamentoRotulo: limpar(entrada.equipamentoRotulo, 200),
      tipoEquipamento: limpar(entrada.tipoEquipamento, 80), finalidade: entrada.finalidade, periodicidade: entrada.periodicidade, responsavelId: entrada.responsavelId,
      responsavelNome: limpar(entrada.responsavelNome, 120), criadoEm: agora.toISOString(), data: hojeBrasilia(agora), status: "Em andamento", concluidoEm: null, itens,
    };
    return [...lista, criado];
  }));
  return criado;
}

function alterarAberto(id: string, storage: StorageLike | null, mudar: (c: ChecklistEquipamentoRegistro) => void): void {
  gravar(() => alterarLista<ChecklistEquipamentoRegistro>(CHAVE_CHECKLISTS_EQ, storage, (lista) => {
    const c = lista.find((x) => x.id === id);
    if (!c) throw new Error("Check list não encontrado.");
    if (c.status !== "Em andamento") throw new Error("Este check list já foi concluído e não pode mais ser alterado.");
    mudar(c);
    return lista;
  }));
}
const acharItem = (c: ChecklistEquipamentoRegistro, itemId: string) => {
  const i = c.itens.find((x) => x.id === itemId);
  if (!i) throw new Error("Item não encontrado neste check list.");
  return i;
};

export function avaliarItemEq(id: string, itemId: string, dados: { avaliacao: string | null; observacao: string }, storage = storagePadrao()): void {
  if (dados.avaliacao !== null && !AVALIACOES.includes(dados.avaliacao as Avaliacao)) throw new Error("Escolha OK, NOK ou N.A.");
  alterarAberto(id, storage, (c) => {
    const i = acharItem(c, itemId);
    i.avaliacao = dados.avaliacao as Avaliacao | null;
    i.observacao = limpar(dados.observacao, 500);
  });
}
export function adicionarFotosItemEq(id: string, itemId: string, fotos: string[], storage = storagePadrao()): void {
  alterarAberto(id, storage, (c) => {
    const i = acharItem(c, itemId);
    if (i.fotos.length + fotos.length > MAX_FOTOS_ITEM) throw new Error(`No máximo ${MAX_FOTOS_ITEM} fotos por item.`);
    if (fotos.some((f) => typeof f !== "string" || !f.startsWith("data:image/") || f.length > LIMITE_FOTO)) throw new Error("Uma das fotos não é uma imagem válida ou ficou grande demais.");
    i.fotos = [...i.fotos, ...fotos];
  });
}
export function removerFotoItemEq(id: string, itemId: string, indice: number, storage = storagePadrao()): void {
  alterarAberto(id, storage, (c) => {
    const i = acharItem(c, itemId);
    if (!Number.isInteger(indice) || indice < 0 || indice >= i.fotos.length) throw new Error("Foto não encontrada.");
    i.fotos = i.fotos.filter((_, n) => n !== indice);
  });
}

// Conclui: todos os itens avaliados e cada NOK com observação. Cada item NOK gera uma ocorrência Aberta do equipamento e fica como pendência.
export function concluirChecklistEq(id: string, storage = storagePadrao(), agora = new Date()): ChecklistEquipamentoRegistro {
  const atual = lerChecklistsEq(storage).find((c) => c.id === id);
  if (!atual) throw new Error("Check list não encontrado.");
  if (atual.status !== "Em andamento") throw new Error("Este check list já foi concluído.");
  const faltam = atual.itens.filter((i) => i.avaliacao === null).length;
  if (faltam > 0) throw new Error(`Avalie todos os itens antes de concluir: faltam ${faltam}.`);
  const semObs = atual.itens.find((i) => i.avaliacao === "NOK" && !i.observacao);
  if (semObs) throw new Error(`Descreva o problema do item reprovado: ${semObs.nome}.`);
  const nok = atual.itens.filter((i) => i.avaliacao === "NOK");
  const criadas = nok.map((i) => registrarOcorrenciaEq({
    equipamentoId: atual.equipamentoId, tipoId: TIPO_OCORRENCIA_CHECKLIST.id, tipoNome: TIPO_OCORRENCIA_CHECKLIST.nome, data: hojeBrasilia(agora),
    descricao: `Item reprovado no check list ${atual.codigo} (${i.grupo}): ${i.nome}. ${i.observacao}`,
  }, storage, agora));
  try {
    let concluido!: ChecklistEquipamentoRegistro;
    alterarAberto(id, storage, (c) => {
      nok.forEach((n, k) => { const item = acharItem(c, n.id); item.ocorrenciaId = criadas[k]!.id; item.ocorrenciaCodigo = `OCE-${criadas[k]!.id.slice(0, 6).toUpperCase()}`; });
      c.status = "Concluído";
      c.concluidoEm = agora.toISOString();
      concluido = c;
    });
    return { ...concluido };
  } catch (erro) {
    // O check list não pôde ser gravado: as ocorrências recém-criadas são desfeitas, para não duplicar no próximo envio.
    for (const o of criadas) { try { removerOcorrenciaEq(o.id, storage); } catch { /* sem o que fazer */ } }
    throw erro;
  }
}

export function resolverPendenciaEq(id: string, itemId: string, descricao: string, storage = storagePadrao(), agora = new Date()): void {
  const texto = limpar(descricao, 500);
  if (!texto) throw new Error("Descreva como a pendência foi resolvida.");
  gravar(() => alterarLista<ChecklistEquipamentoRegistro>(CHAVE_CHECKLISTS_EQ, storage, (lista) => {
    const c = lista.find((x) => x.id === id);
    if (!c) throw new Error("Check list não encontrado.");
    if (c.status !== "Concluído") throw new Error("Conclua o check list antes de resolver as pendências.");
    const i = acharItem(c, itemId);
    if (i.avaliacao !== "NOK") throw new Error("Só itens reprovados (NOK) têm pendência.");
    if (i.resolucao) throw new Error("Esta pendência já foi resolvida.");
    i.resolucao = { descricao: texto, resolvidaEm: agora.toISOString() };
    return lista;
  }));
}

export const pendenciaAbertaEq = (i: ItemChecklist) => i.avaliacao === "NOK" && !i.resolucao;
// Pendências NOK ainda abertas, de todos os check lists concluídos (ou só de um equipamento).
export function pendenciasAbertasEq(checklists: ChecklistEquipamentoRegistro[], equipamentoId?: string) {
  return checklists.filter((c) => c.status === "Concluído" && (!equipamentoId || c.equipamentoId === equipamentoId)).flatMap((c) => c.itens.filter(pendenciaAbertaEq).map((item) => ({ checklist: c, item })));
}

export function excluirChecklistEmAndamentoEq(id: string, storage = storagePadrao()): void {
  gravar(() => alterarLista<ChecklistEquipamentoRegistro>(CHAVE_CHECKLISTS_EQ, storage, (lista) => {
    const c = lista.find((x) => x.id === id);
    if (!c) throw new Error("Check list não encontrado.");
    if (c.status !== "Em andamento") throw new Error("Só é possível descartar um check list em andamento.");
    return lista.filter((x) => x.id !== id);
  }));
}
