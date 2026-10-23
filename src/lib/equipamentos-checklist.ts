// Parâmetros > Equipamentos > Check list: itens do check list por tipo de equipamento e a associação deles a cada equipamento. Há dois
// check lists independentes, o de manutenção e o de vistoria, cada um com os seus grupos e as suas associações. Segue o modelo de
// Parâmetros > Veículos > Check list (decisões 74, 116, 119 e 136). Fase 1: só no navegador, em modo demonstração; as tabelas
// entram na Fase 2.
import { GRUPOS_PADRAO_MANUTENCAO, ehGrupoAvulsoEq, type GrupoPadrao } from "./equipamentos-manutencao-padrao.ts";
import { GRUPOS_PADRAO_VISTORIA } from "./equipamentos-vistoria-padrao.ts";
import { chaveDoNome as chave, lerParametrosEquipamento } from "./equipamentos-parametros.ts";
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
// `itensIds`: só esses itens do grupo entram no check list (escolha item a item); sem ele, valem todos os itens do grupo.
export type ItemAssociacao = { grupoId: string; tipo: TipoAssociacao; periodicidade: Periodicidade; obrigatorio: boolean; itensIds?: string[] };
export type ResponsavelAssociacao = { id: string; nome: string };
export type AssociacaoChecklistEquipamento = {
  equipamentoId: string;
  responsavel: ResponsavelAssociacao | null; // null = responsável não definido
  itens: ItemAssociacao[];
  atualizadoEm: string;
};
export type ParteChecklist = { grupos: GrupoChecklistEquipamento[]; associacoes: AssociacaoChecklistEquipamento[] };
export type ChecklistEquipamento = Record<FinalidadeChecklist, ParteChecklist>;
export type EntradaItemAssociacao = { grupoId: string; tipo?: string; periodicidade?: string; itensIds?: string[] };

type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE = "gemape-demo-equipamentos-checklist";

const vazio = (): ChecklistEquipamento => ({ manutencao: { grupos: [], associacoes: [] }, vistoria: { grupos: [], associacoes: [] } });
const ehObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const ehPeriodicidade = (v: unknown): v is Periodicidade => PERIODICIDADES.includes(v as Periodicidade);

const ehTexto = (v: unknown): v is string => typeof v === "string";
const ehGrupo = (v: unknown) =>
  ehObjeto(v) && ehTexto(v["id"]) && ehTexto(v["nome"]) && Array.isArray(v["tipos"]) && v["tipos"].every(ehTexto)
  && Array.isArray(v["itens"]) && v["itens"].every((i) => ehObjeto(i) && ehTexto(i["id"]) && ehTexto(i["nome"]));
const ehAssociacao = (v: unknown) =>
  ehObjeto(v) && ehTexto(v["equipamentoId"]) && ehTexto(v["atualizadoEm"])
  && (v["responsavel"] === null || (ehObjeto(v["responsavel"]) && ehTexto(v["responsavel"]["id"]) && ehTexto(v["responsavel"]["nome"])))
  && Array.isArray(v["itens"]) && v["itens"].every((i) => ehObjeto(i) && ehTexto(i["grupoId"]) && ehTexto(i["tipo"]) && ehPeriodicidade(i["periodicidade"]) && typeof i["obrigatorio"] === "boolean"
    && (i["itensIds"] === undefined || (Array.isArray(i["itensIds"]) && i["itensIds"].every(ehTexto))));

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
        if (!ehObjeto(parte) || !Array.isArray(parte["grupos"]) || !Array.isArray(parte["associacoes"]) || !parte["grupos"].every(ehGrupo) || !parte["associacoes"].every(ehAssociacao)) return { dados: vazio(), legivel: false };
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
const novoId = () => crypto.randomUUID();

export function salvarGrupoChecklist(
  finalidade: string,
  entrada: { id?: string; nome: string; itens: string[]; tipos: string[] },
  storage: StorageLike = localStorage,
  tiposValidos?: string[],
  tipoDoEquipamento?: (equipamentoId: string) => string | undefined,
): GrupoChecklistEquipamento {
  return alterar(finalidade, storage, (parte) => {
    const atual = entrada.id ? parte.grupos.find((g) => g.id === entrada.id) : undefined;
    // Texto igual ao já salvo não passa de novo pela capitalização: o padrão traz siglas (ART, GLP, CO2) que ela estragaria.
    const mesmo = (texto: string, salvo: string | undefined) => (salvo !== undefined && texto.trim().replace(/\s+/g, " ") === salvo ? salvo : capitalizarTexto(texto));
    const nome = mesmo(entrada.nome, atual?.nome);
    if (!nome) throw new Error("Informe o nome do grupo.");
    const salvos = new Map((atual?.itens ?? []).map((i) => [i.nome, i.nome]));
    const textos = entrada.itens.map((i) => mesmo(i, salvos.get(i.trim().replace(/\s+/g, " ")))).filter(Boolean);
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
    // Tirar um tipo do grupo deixaria equipamentos desse tipo com um grupo que não vale mais para eles.
    if (tipoDoEquipamento && atual && !tipos.includes(TODOS_OS_TIPOS)) {
      // Associação de equipamento que já não existe (sem tipo) não trava a edição: só se exclui.
      const presos = parte.associacoes.filter((a) => {
        const tipoDele = tipoDoEquipamento(a.equipamentoId);
        return tipoDele !== undefined && a.itens.some((i) => i.grupoId === atual.id) && !tipos.includes(tipoDele);
      });
      if (presos.length > 0) {
        throw new Error(`Este grupo está associado a ${presos.length} ${presos.length === 1 ? "equipamento" : "equipamentos"} de um tipo que você está tirando; remova a associação antes.`);
      }
    }
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
// `avulso` (como em Veículos): true traz só os grupos "Avulso · ..."; false traz os do periódico; sem o parâmetro, todos.
export function gruposAplicaveis(tipoId: string, grupos: GrupoChecklistEquipamento[], avulso?: boolean): GrupoChecklistEquipamento[] {
  return grupos.filter((g) => (avulso === undefined || ehGrupoAvulsoEq(g.nome) === avulso) && (g.tipos.includes(TODOS_OS_TIPOS) || (!!tipoId && g.tipos.includes(tipoId))));
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
      // Escolha item a item: só itens que o grupo tem, ao menos um; com todos eles, o grupo vale inteiro (itens novos entram sozinhos).
      if (i.itensIds && i.itensIds.length === 0) throw new Error(`Marque ao menos um item do grupo ${grupo.nome}.`);
      if (i.itensIds?.some((id) => !grupo.itens.some((x) => x.id === id))) throw new Error(`Um item escolhido não existe mais no grupo ${grupo.nome}.`);
      const escolhidos = [...new Set(i.itensIds ?? [])];
      const itensIds = i.itensIds && escolhidos.length < grupo.itens.length ? { itensIds: escolhidos } : {};
      // O avulso não tem periodicidade e não é obrigatório; o periódico precisa de uma periodicidade definida e é obrigatório.
      if (i.tipo === "avulso") return { grupoId: i.grupoId, tipo: "avulso", periodicidade: NAO_DEFINIDA, obrigatorio: false, ...itensIds };
      if (!ehPeriodicidade(i.periodicidade) || i.periodicidade === NAO_DEFINIDA) {
        throw new Error("Escolha a periodicidade (Diária, Semanal, Quinzenal ou Mensal) de cada grupo periódico, ou marque o grupo como Avulso.");
      }
      return { grupoId: i.grupoId, tipo: "periodico", periodicidade: i.periodicidade, obrigatorio: true, ...itensIds };
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
    if (!parte.associacoes.some((a) => a.equipamentoId === equipamentoId)) throw new Error("Esta associação já foi excluída.");
    parte.associacoes = parte.associacoes.filter((a) => a.equipamentoId !== equipamentoId);
  });
}

const PADRAO: Record<FinalidadeChecklist, readonly GrupoPadrao[]> = { manutencao: GRUPOS_PADRAO_MANUTENCAO, vistoria: GRUPOS_PADRAO_VISTORIA };

// "Cadastrar padrão": cria os grupos do padrão que ainda não existem (por nome); os que já existem, mesmo editados, ficam como estão.
// Grupo de um tipo que não existe mais em Parâmetros Específicos não é criado (ficaria sem equipamento): conta em `semTipo`.
export function cadastrarPadraoChecklist(finalidade: FinalidadeChecklist, storage: StorageLike = localStorage, aPartirDe = 0): { criados: number; semTipo: number } {
  return alterar(finalidade, storage, (parte) => {
    const tipos = lerParametrosEquipamento(storage).tipos;
    let criados = 0;
    let semTipo = 0;
    for (const p of PADRAO[finalidade].slice(aPartirDe)) {
      // Texto do padrão entra como foi escrito (siglas como ART, GLP e CO2 não passam pela capitalização automática).
      if (parte.grupos.some((g) => chave(g.nome) === chave(p.nome))) continue;
      if (!tipos.some((t) => t.id === p.tipoId)) {
        semTipo++;
        continue;
      }
      parte.grupos.push({ id: novoId(), nome: p.nome, itens: p.itens.map((t) => ({ id: novoId(), nome: t })), tipos: [p.tipoId] });
      criados++;
    }
    return { criados, semTipo };
  });
}
// ---------- Restaurar configurações iniciais ----------
export type SituacaoPadraoGrupo = "igual" | "alterado" | "ausente";

// Todos os grupos do padrão inicial do check list (manutenção ou vistoria) e a situação de cada um no cadastro atual: "igual" (nome, itens na ordem e tipo de
// equipamento como no padrão), "alterado" ou "ausente" (não existe mais).
export function situacaoPadraoChecklist(finalidade: FinalidadeChecklist, storage: StorageLike = localStorage): { nome: string; itens: readonly string[]; situacao: SituacaoPadraoGrupo }[] {
  const { grupos } = lerChecklistEquipamento(storage)[finalidade];
  return PADRAO[finalidade].map((p) => {
    const grupo = grupos.find((g) => chave(g.nome) === chave(p.nome));
    if (!grupo) return { nome: p.nome, itens: p.itens, situacao: "ausente" as const };
    const igual = grupo.nome === p.nome && grupo.itens.length === p.itens.length && grupo.itens.every((i, n) => i.nome === p.itens[n]) && grupo.tipos.length === 1 && grupo.tipos[0] === p.tipoId;
    return { nome: p.nome, itens: p.itens, situacao: igual ? ("igual" as const) : ("alterado" as const) };
  });
}

// Restaura de uma vez os grupos do padrão inicial escolhidos, tudo ou nada. Grupo que existe volta ao nome, aos itens e ao tipo iniciais (o id fica, e os itens que já
// existiam mantêm o id); grupo excluído é cadastrado de novo. Se o tipo de equipamento do padrão não existe mais em Parâmetros Específicos, os tipos atuais ficam como
// estão (o grupo novo fica sem tipo) e o retorno conta.
export function restaurarPadroesChecklist(finalidade: FinalidadeChecklist, nomes: string[], storage: StorageLike = localStorage): { restaurados: number; criados: number; semTipo: number } {
  if (nomes.length === 0) throw new Error("Marque ao menos um padrão para restaurar.");
  const escolhidos = nomes.map((n) => {
    const p = PADRAO[finalidade].find((x) => chave(x.nome) === chave(n));
    if (!p) throw new Error("Há um grupo que não faz parte do padrão inicial.");
    return p;
  });
  return alterar(finalidade, storage, (parte) => {
    const tiposExistentes = lerParametrosEquipamento(storage).tipos;
    let restaurados = 0;
    let criados = 0;
    let semTipo = 0;
    for (const p of new Set(escolhidos)) {
      const tipoExiste = tiposExistentes.some((t) => t.id === p.tipoId);
      const grupo = parte.grupos.find((g) => chave(g.nome) === chave(p.nome));
      if (grupo) {
        const anteriores = new Map(grupo.itens.map((i) => [chave(i.nome), i.id]));
        grupo.nome = p.nome;
        grupo.itens = p.itens.map((t) => ({ id: anteriores.get(chave(t)) ?? novoId(), nome: t }));
        if (tipoExiste) grupo.tipos = [p.tipoId];
        else semTipo += 1;
        restaurados += 1;
      } else {
        parte.grupos.push({ id: novoId(), nome: p.nome, itens: p.itens.map((t) => ({ id: novoId(), nome: t })), tipos: tipoExiste ? [p.tipoId] : [] });
        if (!tipoExiste) semTipo += 1;
        criados += 1;
      }
    }
    return { restaurados, criados, semTipo };
  });
}

// Os grupos padrão de manutenção e de vistoria entram sozinhos na primeira vez (como os de Veículos); depois, o que a pessoa excluir só volta pelo botão Restaurar
// configurações iniciais. O marcador guarda quantos grupos de cada padrão já foram oferecidos (o valor antigo "1" valia os 16 primeiros de cada): grupo novo no fim
// do padrão, como os avulsos, entra uma vez em quem já tinha o padrão, sem trazer de volta o que foi excluído.
const CHAVE_PADRAO = "gemape-demo-equipamentos-checklist-padrao";
const GRUPOS_DA_PRIMEIRA_VERSAO = 16;
// Devolve se gravou, para a tela ler de novo.
export function aplicarPadraoUmaVez(storage: StorageLike & Pick<Storage, "getItem"> = localStorage): boolean {
  const marcador = storage.getItem(CHAVE_PADRAO);
  let oferecidos: Record<string, number> = { manutencao: 0, vistoria: 0 };
  if (marcador === "1") oferecidos = { manutencao: GRUPOS_DA_PRIMEIRA_VERSAO, vistoria: GRUPOS_DA_PRIMEIRA_VERSAO };
  else if (marcador) { try { oferecidos = { ...oferecidos, ...(JSON.parse(marcador) as Record<string, number>) }; } catch { oferecidos = { manutencao: PADRAO.manutencao.length, vistoria: PADRAO.vistoria.length }; /* marcador ilegível: não recadastra o que a pessoa pode ter excluído */ } }
  const faltam = FINALIDADES.filter((f) => (oferecidos[f.id] ?? 0) < PADRAO[f.id].length);
  if (faltam.length === 0) return false;
  try {
    for (const f of faltam) cadastrarPadraoChecklist(f.id, storage, oferecidos[f.id] ?? 0);
    storage.setItem(CHAVE_PADRAO, JSON.stringify({ manutencao: PADRAO.manutencao.length, vistoria: PADRAO.vistoria.length }));
    return true;
  } catch {
    return false; // dado ilegível: nada é gravado por cima, e a tentativa se repete na próxima abertura
  }
}
export const cadastrarPadraoManutencao = (storage?: StorageLike) => cadastrarPadraoChecklist("manutencao", storage);
export const cadastrarPadraoVistoria = (storage?: StorageLike) => cadastrarPadraoChecklist("vistoria", storage);

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
  grupos: { grupoId: string; nome: string; obrigatorio: boolean; itensIds?: string[] }[];
};

const textoDoNome = (t: string) => t.trim().replace(/\s+/g, " ");

export function checklistsDaAssociacao(
  rotuloEquipamento: string,
  associacao: AssociacaoChecklistEquipamento,
  grupos: { id: string; nome: string; itens?: { id: string }[] }[],
): ChecklistAssociado[] {
  // Só os grupos que ainda existem e, na escolha item a item, só os itens que ainda existem (item renomeado ganha id novo); sem nenhum, o grupo sai.
  const doEquipamento = associacao.itens.flatMap((i) => {
    const grupo = grupos.find((g) => g.id === i.grupoId);
    if (!grupo) return [];
    if (!i.itensIds) return [{ ...i, nome: grupo.nome }];
    const existentes = grupo.itens ? i.itensIds.filter((id) => grupo.itens!.some((x) => x.id === id)) : i.itensIds;
    return existentes.length > 0 ? [{ ...i, itensIds: existentes, nome: grupo.nome }] : [];
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
      grupos: deste.map((i) => ({ grupoId: i.grupoId, nome: i.nome, obrigatorio: i.obrigatorio, ...(i.itensIds ? { itensIds: i.itensIds } : {}) })),
    } satisfies ChecklistAssociado];
  });
}
