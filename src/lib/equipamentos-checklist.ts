// Parâmetros > Equipamentos > Check list: itens do check list por tipo de equipamento e a associação deles a cada equipamento. Há dois
// check lists independentes, o de manutenção e o de vistoria, cada um com os seus grupos e as suas associações. Segue o modelo de
// Parâmetros > Veículos > Check list (decisões 74, 116, 119 e 136). Fase 1: só no navegador, em modo demonstração; as tabelas
// entram na Fase 2.
import { capitalizarTexto } from "./formatacao-cadastral.ts";

export type FinalidadeChecklist = "manutencao" | "vistoria";
export const FINALIDADES: readonly { id: FinalidadeChecklist; nome: string }[] = [
  { id: "manutencao", nome: "Manutenção" },
  { id: "vistoria", nome: "Vistoria" },
];
export const ehFinalidade = (v: unknown): v is FinalidadeChecklist => v === "manutencao" || v === "vistoria";

// Num grupo, `tipos` são os ids dos tipos de equipamento (Parâmetros Específicos) a que ele vale, ou só TODOS_OS_TIPOS.
export const TODOS_OS_TIPOS = "todos";
export type ItemChecklistEquipamento = { id: string; nome: string };
export type GrupoChecklistEquipamento = { id: string; nome: string; itens: ItemChecklistEquipamento[]; tipos: string[] };

// "Não definida": o grupo não tem periodicidade (avulso). Periódico é obrigatório; avulso, não.
export const NAO_DEFINIDA = "Não definida";
export const NAO_DEFINIDO = "Não definido";
export const PERIODICIDADES = ["Diária", "Semanal", "Quinzenal", "Mensal", NAO_DEFINIDA] as const;
export type Periodicidade = (typeof PERIODICIDADES)[number];
export type TipoAssociacao = "periodico" | "avulso";
export const TIPOS_ASSOCIACAO: readonly { id: TipoAssociacao; nome: string }[] = [
  { id: "periodico", nome: "Periódico" },
  { id: "avulso", nome: "Avulso" },
];
export type ItemAssociacao = { grupoId: string; tipo: TipoAssociacao; periodicidade: Periodicidade; obrigatorio: boolean };
export type ResponsavelAssociacao = { id: string; nome: string };
export type AssociacaoChecklistEquipamento = {
  equipamentoId: string;
  responsavel: ResponsavelAssociacao | null; // null = responsável não definido
  itens: ItemAssociacao[];
  atualizadoEm: string;
};
export type ParteChecklist = { grupos: GrupoChecklistEquipamento[]; associacoes: AssociacaoChecklistEquipamento[] };
export type ChecklistEquipamento = Record<FinalidadeChecklist, ParteChecklist>;
export type EntradaItemAssociacao = { grupoId: string; tipo?: string; periodicidade?: string };

type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE = "gemape-demo-equipamentos-checklist";

const vazio = (): ChecklistEquipamento => ({ manutencao: { grupos: [], associacoes: [] }, vistoria: { grupos: [], associacoes: [] } });
const ehObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const ehPeriodicidade = (v: unknown): v is Periodicidade => PERIODICIDADES.includes(v as Periodicidade);

// Dado salvo ilegível nunca é sobrescrito: a leitura vem vazia, mas gravar por cima apagaria o que sobrou.
function ler(storage: StorageLike): { dados: ChecklistEquipamento; legivel: boolean } {
  const bruto = storage.getItem(CHAVE);
  if (bruto === null) return { dados: vazio(), legivel: true };
  try {
    const lido: unknown = JSON.parse(bruto);
    if (ehObjeto(lido)) {
      const dados = vazio();
      for (const f of FINALIDADES) {
        const parte = lido[f.id];
        if (parte === undefined) continue;
        if (!ehObjeto(parte) || !Array.isArray(parte["grupos"]) || !Array.isArray(parte["associacoes"])) return { dados: vazio(), legivel: false };
        dados[f.id] = { grupos: parte["grupos"] as GrupoChecklistEquipamento[], associacoes: parte["associacoes"] as AssociacaoChecklistEquipamento[] };
      }
      return { dados, legivel: true };
    }
  } catch {
    /* cai no ilegível */
  }
  return { dados: vazio(), legivel: false };
}

export const lerChecklistEquipamento = (storage: StorageLike = localStorage): ChecklistEquipamento => ler(storage).dados;

// Valida tudo antes de gravar e grava numa única escrita: ou a mudança entra por inteiro, ou nada muda.
function alterar<T>(finalidade: string, storage: StorageLike, acao: (parte: ParteChecklist) => T): T {
  if (!ehFinalidade(finalidade)) throw new Error("Escolha o check list: manutenção ou vistoria.");
  const { dados, legivel } = ler(storage);
  if (!legivel) throw new Error("Os dados do check list de equipamentos salvos neste navegador estão ilegíveis; nada foi alterado.");
  const resultado = acao(dados[finalidade]);
  storage.setItem(CHAVE, JSON.stringify(dados));
  return resultado;
}

// Sem acento, sem maiúscula e sem espaço repetido: "Lança" e "lanca" são o mesmo nome.
const chave = (nome: string) => nome.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
const novoId = () => crypto.randomUUID();

export function salvarGrupoChecklist(
  finalidade: string,
  entrada: { id?: string; nome: string; itens: string[]; tipos: string[] },
  storage: StorageLike = localStorage,
  tiposValidos?: string[],
): GrupoChecklistEquipamento {
  return alterar(finalidade, storage, (parte) => {
    const nome = capitalizarTexto(entrada.nome);
    if (!nome) throw new Error("Informe o nome do grupo.");
    const textos = entrada.itens.map((i) => capitalizarTexto(i)).filter(Boolean);
    if (textos.length === 0) throw new Error("Informe ao menos um item do grupo.");
    const vistos = new Set<string>();
    for (const t of textos) {
      if (vistos.has(chave(t))) throw new Error(`Item repetido no grupo: ${t}.`);
      vistos.add(chave(t));
    }
    const indice = entrada.id ? parte.grupos.findIndex((g) => g.id === entrada.id) : -1;
    if (entrada.id && indice < 0) throw new Error("Este grupo foi excluído; feche a janela e cadastre de novo, se for o caso.");
    if (parte.grupos.some((g) => g.id !== entrada.id && chave(g.nome) === chave(nome))) throw new Error(`Já existe o grupo ${nome} neste check list.`);
    const tipos = [...new Set(entrada.tipos)];
    if (tiposValidos && tipos.some((t) => t !== TODOS_OS_TIPOS && !tiposValidos.includes(t))) throw new Error("Tipo de equipamento inválido: escolha só tipos que existem em Parâmetros Específicos.");
    // Na edição os itens que continuam mantêm o id.
    const anteriores = new Map((parte.grupos[indice]?.itens ?? []).map((i) => [chave(i.nome), i.id]));
    const grupo: GrupoChecklistEquipamento = {
      id: entrada.id ?? novoId(),
      nome,
      itens: textos.map((t) => ({ id: anteriores.get(chave(t)) ?? novoId(), nome: t })),
      tipos: tipos.includes(TODOS_OS_TIPOS) ? [TODOS_OS_TIPOS] : tipos,
    };
    if (indice >= 0) parte.grupos[indice] = grupo;
    else parte.grupos.push(grupo);
    return grupo;
  });
}

// Grupo que algum equipamento usa não se exclui: a associação ficaria apontando para um grupo que não existe mais.
export function removerGrupoChecklist(finalidade: string, id: string, storage: StorageLike = localStorage): void {
  alterar(finalidade, storage, (parte) => {
    if (!parte.grupos.some((g) => g.id === id)) throw new Error("Este grupo já foi excluído.");
    const usos = parte.associacoes.filter((a) => a.itens.some((i) => i.grupoId === id)).length;
    if (usos > 0) throw new Error(`Este grupo está associado a ${usos} ${usos === 1 ? "equipamento" : "equipamentos"}; remova a associação antes de excluir.`);
    parte.grupos = parte.grupos.filter((g) => g.id !== id);
  });
}

// Grupos que valem para um equipamento: os ligados ao tipo dele e os de todos os tipos.
export function gruposAplicaveis(tipoId: string, grupos: GrupoChecklistEquipamento[]): GrupoChecklistEquipamento[] {
  return grupos.filter((g) => g.tipos.includes(TODOS_OS_TIPOS) || (!!tipoId && g.tipos.includes(tipoId)));
}

export function salvarAssociacao(
  finalidade: string,
  entrada: { modo: "criar" | "editar"; equipamentoId: string; tipoId: string; responsavel: ResponsavelAssociacao | null; itens: EntradaItemAssociacao[] },
  storage: StorageLike = localStorage,
  agora = new Date(),
): AssociacaoChecklistEquipamento {
  return alterar(finalidade, storage, (parte) => {
    if (!entrada.equipamentoId) throw new Error("Selecione o equipamento.");
    if (entrada.responsavel && (!entrada.responsavel.id || !entrada.responsavel.nome.trim())) {
      throw new Error("Responsável inválido: escolha um empregado ou deixe Não definido.");
    }
    if (entrada.itens.length === 0) throw new Error("Habilite ao menos um grupo de itens de check list.");
    const vistos = new Set<string>();
    const itens: ItemAssociacao[] = entrada.itens.map((i) => {
      if (vistos.has(i.grupoId)) throw new Error("Grupo de itens repetido na associação.");
      vistos.add(i.grupoId);
      const grupo = parte.grupos.find((g) => g.id === i.grupoId);
      if (!grupo) throw new Error("Um grupo de itens não existe mais no check list. Remova-o e salve de novo.");
      if (gruposAplicaveis(entrada.tipoId, [grupo]).length === 0) throw new Error(`O grupo ${grupo.nome} não vale para o tipo deste equipamento.`);
      // O avulso não tem periodicidade e não é obrigatório; o periódico precisa de uma periodicidade definida e é obrigatório.
      if (i.tipo === "avulso") return { grupoId: i.grupoId, tipo: "avulso", periodicidade: NAO_DEFINIDA, obrigatorio: false };
      if (!ehPeriodicidade(i.periodicidade) || i.periodicidade === NAO_DEFINIDA) {
        throw new Error("Escolha a periodicidade (Diária, Semanal, Quinzenal ou Mensal) de cada grupo periódico, ou marque o grupo como Avulso.");
      }
      return { grupoId: i.grupoId, tipo: "periodico", periodicidade: i.periodicidade, obrigatorio: true };
    });
    const indice = parte.associacoes.findIndex((a) => a.equipamentoId === entrada.equipamentoId);
    if (entrada.modo === "criar" && indice >= 0) throw new Error("Este equipamento já tem itens de check list associados.");
    if (entrada.modo === "editar" && indice < 0) throw new Error("Associação não encontrada.");
    const associacao: AssociacaoChecklistEquipamento = {
      equipamentoId: entrada.equipamentoId,
      responsavel: entrada.responsavel ? { id: entrada.responsavel.id, nome: entrada.responsavel.nome.trim() } : null,
      itens,
      atualizadoEm: agora.toISOString(),
    };
    if (indice >= 0) parte.associacoes[indice] = associacao;
    else parte.associacoes.push(associacao);
    return associacao;
  });
}

export function removerAssociacao(finalidade: string, equipamentoId: string, storage: StorageLike = localStorage): void {
  alterar(finalidade, storage, (parte) => {
    parte.associacoes = parte.associacoes.filter((a) => a.equipamentoId !== equipamentoId);
  });
}

// ---------- Check lists do equipamento ----------
// Os grupos habilitados se juntam por periodicidade: cada periodicidade é um check list do equipamento, com o nome
// PATRIMÔNIO >> PERIODICIDADE >> RESPONSÁVEL. Periódico quando a periodicidade está definida; senão é avulso, e livre
// (qualquer hora, qualquer pessoa) quando o responsável também não está definido.
export type TipoChecklistAssociado = "Periódico" | "Avulso" | "Livre";
export type ChecklistAssociado = {
  nome: string;
  periodicidade: Periodicidade;
  responsavelNome: string | null;
  tipo: TipoChecklistAssociado;
  obrigatorio: "Sim" | "Não" | "Parcial";
  grupos: { grupoId: string; nome: string; obrigatorio: boolean }[];
};

const textoDoNome = (t: string) => t.trim().replace(/\s+/g, " ");

export function checklistsDaAssociacao(
  rotuloEquipamento: string,
  associacao: AssociacaoChecklistEquipamento,
  grupos: { id: string; nome: string }[],
): ChecklistAssociado[] {
  // Só os grupos que ainda existem.
  const doEquipamento = associacao.itens.flatMap((i) => {
    const grupo = grupos.find((g) => g.id === i.grupoId);
    return grupo ? [{ ...i, nome: grupo.nome }] : [];
  });
  return PERIODICIDADES.flatMap((periodicidade) => {
    const deste = doEquipamento.filter((i) => i.periodicidade === periodicidade);
    if (deste.length === 0) return [];
    const definida = periodicidade !== NAO_DEFINIDA;
    const responsavelNome = associacao.responsavel?.nome ?? null;
    const sims = deste.filter((i) => i.obrigatorio).length;
    return [{
      nome: [rotuloEquipamento, periodicidade, responsavelNome ?? NAO_DEFINIDO].map(textoDoNome).join(" >> "),
      periodicidade,
      responsavelNome,
      tipo: definida ? "Periódico" : responsavelNome ? "Avulso" : "Livre",
      obrigatorio: sims === 0 ? "Não" : sims === deste.length ? "Sim" : "Parcial",
      grupos: deste.map((i) => ({ grupoId: i.grupoId, nome: i.nome, obrigatorio: i.obrigatorio })),
    } satisfies ChecklistAssociado];
  });
}
