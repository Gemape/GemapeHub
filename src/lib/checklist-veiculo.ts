// Check list de veículos (decisão 63). Fase 1: fica só no navegador, em modo demonstração; as tabelas
// no banco real são pendência da Fase 2.
import type { GrupoChecklistVeiculo } from "./parametros-base.ts";
import { TODOS_OS_TIPOS } from "./parametros-base.ts";
import { chaveDoTipoVeiculo, type ChaveTipoVeiculo } from "./checklist-veiculos-padrao.ts";
import { registrarOcorrenciasDoChecklist, removerOcorrenciasPorId } from "./ocorrencias-veiculo.ts";
import type { AssociacaoChecklist } from "./checklist-associacao-veiculo.ts";
import { alterarLista, lerLista, type StorageLike } from "./registros-veiculo.ts";

const CHAVE = "gemape-demo-checklists-veiculo";
export const MAX_FOTOS_ITEM = 3;
const LIMITE_FOTO = 600_000; // caracteres do data URL; a foto comprimida fica bem abaixo disso

// Da mais para a menos frequente; a periodicidade vem da associação do veículo (decisão 75).
export const PERIODICIDADES = ["Diário", "Semanal", "Quinzenal", "Mensal"] as const;
export type Periodicidade = (typeof PERIODICIDADES)[number];
export const AVALIACOES = ["OK", "NOK", "N.A."] as const;
export type Avaliacao = (typeof AVALIACOES)[number];
export type StatusChecklist = "Em andamento" | "Concluído";

export type ItemChecklist = {
  id: string;
  grupo: string;
  nome: string;
  avaliacao: Avaliacao | null;
  observacao: string;
  fotos: string[];
  ocorrenciaId: string | null;
  ocorrenciaCodigo: string | null;
  resolucao: { descricao: string; resolvidaEm: string } | null;
};

export type ChecklistVeiculo = {
  id: string;
  codigo: string;
  veiculoId: string;
  veiculoRotulo: string;
  tipoVeiculo: string;
  periodicidade: Periodicidade | ""; // vazio no check list avulso (decisão 90)
  responsavelId: string;
  responsavelNome: string;
  criadoEm: string;
  data: string; // AAAA-MM-DD, horário local
  status: StatusChecklist;
  concluidoEm: string | null;
  itens: ItemChecklist[];
};

// Nome do check list (decisão 90): Placa >> Periodicidade >> Responsável. Sem placa (empilhadeira), entra a descrição do veículo.
export function nomeDoChecklist(c: { placa: string; fallbackVeiculo?: string; periodicidade: string; responsavelNome: string }): string {
  const veiculo = c.placa.trim().toUpperCase() || (c.fallbackVeiculo ?? "").trim();
  return [veiculo, c.periodicidade, c.responsavelNome].map((t) => t.trim().replace(/\s+/g, " ")).join(" >> ");
}

// Só aparece na lista do módulo o check list que tem periodicidade e responsável, ou seja, o que pode receber o nome acima.
export function checklistVisivelNaLista(c: { periodicidade?: string | null | undefined; responsavelNome?: string | null | undefined }): boolean {
  return ehPeriodicidade(c.periodicidade) && (c.responsavelNome ?? "").trim() !== "";
}

const storagePadrao = (): StorageLike | null => (typeof localStorage === "undefined" ? null : localStorage);
const novoId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random()));
const limpar = (t: string, max: number) => t.trim().replace(/\s+/g, " ").slice(0, max);

export const lerChecklists = (storage: StorageLike | null = storagePadrao()): ChecklistVeiculo[] =>
  lerLista<ChecklistVeiculo>(CHAVE, storage).lista;

// Periodicidade do veículo: a mais frequente entre os grupos habilitados em Parâmetros > Veículos > Associar
// itens de check list a um veículo (a associação escreve "Diária"; aqui vale "Diário"). Sem associação, nula.
export function periodicidadeDaAssociacao(associacao: Pick<AssociacaoChecklist, "itens"> | null | undefined): Periodicidade | null {
  const doGrupo = (p: string): Periodicidade | null => (p === "Diária" ? "Diário" : ehPeriodicidade(p) ? p : null);
  const validas = (associacao?.itens ?? []).map((i) => doGrupo(i.periodicidade)).filter((p): p is Periodicidade => p !== null);
  return PERIODICIDADES.find((p) => validas.includes(p)) ?? null;
}

export const ehPeriodicidade = (v: unknown): v is Periodicidade => PERIODICIDADES.includes(v as Periodicidade);

// Tipo do check list escolhido no formulário (decisão 65). Cada tipo reúne as subcategorias de Veículos de
// Gerais (pelo nome) a que os grupos de Parâmetros > Itens check list estão ligados.
export const TIPOS_CHECKLIST = [
  { id: "leves", nome: "Veículos leves", chaves: ["passeio", "suv", "van"] },
  { id: "pesados", nome: "Veículos pesados", chaves: ["pesado", "onibus"] },
  { id: "empilhadeira", nome: "Empilhadeira", chaves: ["empilhadeira"] },
] as const satisfies readonly { id: string; nome: string; chaves: readonly ChaveTipoVeiculo[] }[];
export type TipoChecklistId = (typeof TIPOS_CHECKLIST)[number]["id"];

export const ehTipoChecklist = (v: unknown): v is TipoChecklistId => TIPOS_CHECKLIST.some((t) => t.id === v);

// Tipo do check list a que a subcategoria de Veículos (pelo nome) pertence; null quando não há lista para ela.
export function tipoChecklistDaSubcategoria(nomeSubcategoria: string | null | undefined): TipoChecklistId | null {
  const chave = nomeSubcategoria ? chaveDoTipoVeiculo(nomeSubcategoria) : null;
  return TIPOS_CHECKLIST.find((t) => chave !== null && (t.chaves as readonly string[]).includes(chave))?.id ?? null;
}

// Veículos ativos que podem receber o check list do tipo escolhido (pela subcategoria de Veículos do cadastro).
export function veiculosDoTipoChecklist<V extends { status?: string | null }>(
  veiculos: V[],
  tipo: string,
  nomeDaSubcategoriaDe: (veiculo: V) => string | null | undefined,
): V[] {
  if (!ehTipoChecklist(tipo)) return [];
  return veiculos.filter((v) => v.status === "Ativo" && tipoChecklistDaSubcategoria(nomeDaSubcategoriaDe(v)) === tipo);
}

// Grupos de Parâmetros que valem para o tipo escolhido: os ligados a alguma subcategoria desse tipo e os de todos os tipos.
export function gruposDoTipoChecklist(
  grupos: GrupoChecklistVeiculo[],
  subcategorias: { id: string; nome: string }[],
  tipo: string,
): GrupoChecklistVeiculo[] {
  if (!ehTipoChecklist(tipo)) return [];
  const ids = subcategorias.filter((s) => tipoChecklistDaSubcategoria(s.nome) === tipo).map((s) => s.id);
  return grupos.filter((g) => g.itens.length > 0 && (g.tiposVeiculo.includes(TODOS_OS_TIPOS) || g.tiposVeiculo.some((t) => ids.includes(t))));
}

// Grupos do check list de um veículo: só os habilitados na associação dele (Parâmetros > Veículos > Associar
// itens de check list a um veículo), na ordem da associação; grupo apagado ou sem itens fica de fora.
export function gruposAssociadosDoVeiculo(
  associacao: Pick<AssociacaoChecklist, "itens"> | null | undefined,
  grupos: GrupoChecklistVeiculo[],
): GrupoChecklistVeiculo[] {
  return (associacao?.itens ?? []).flatMap((i) => {
    const grupo = grupos.find((g) => g.id === i.grupoId);
    return grupo && grupo.itens.length > 0 ? [grupo] : [];
  });
}

// Grupos do check list que valem para o tipo (subcategoria) do veículo: os ligados a ele e os de todos os tipos.
export function gruposAplicaveis(grupos: GrupoChecklistVeiculo[], subcategoriaId: string | null): GrupoChecklistVeiculo[] {
  return grupos.filter(
    (g) => g.itens.length > 0 && (g.tiposVeiculo.includes(TODOS_OS_TIPOS) || (!!subcategoriaId && g.tiposVeiculo.includes(subcategoriaId))),
  );
}

// ---------- Periodicidade ----------

const doDia = (data: string) => new Date(`${data}T12:00:00`);
const texto = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Diário: o dia de hoje. Semanal: de segunda a domingo da semana de hoje. Quinzenal: de 1 a 15 ou de 16 ao
// fim do mês. Mensal: o mês de hoje.
export function periodoAtual(periodicidade: Periodicidade, hoje: string): { inicio: string; fim: string } {
  if (periodicidade === "Diário") return { inicio: hoje, fim: hoje };
  const d = doDia(hoje);
  if (periodicidade === "Quinzenal" || periodicidade === "Mensal") {
    const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const primeiraMetade = periodicidade === "Quinzenal" && d.getDate() > 15;
    const inicio = new Date(d.getFullYear(), d.getMonth(), primeiraMetade ? 16 : 1);
    const fim = periodicidade === "Quinzenal" && d.getDate() <= 15 ? new Date(d.getFullYear(), d.getMonth(), 15) : ultimo;
    return { inicio: texto(inicio), fim: texto(fim) };
  }
  const desdeSegunda = (d.getDay() + 6) % 7;
  const inicio = new Date(d);
  inicio.setDate(d.getDate() - desdeSegunda);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  return { inicio: texto(inicio), fim: texto(fim) };
}

// Dia de hoje em Brasília (AAAA-MM-DD), qualquer que seja o fuso do navegador.
export const hojeBrasilia = (agora = new Date()) => agora.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

export type SituacaoPeriodica = "em_dia" | "em_andamento" | "pendente";

// Em dia: há check list concluído no período atual; em andamento: há um aberto; senão pendente.
export function situacaoPeriodica(
  periodicidade: Periodicidade,
  checklistsDoVeiculo: { data: string; status: StatusChecklist; concluidoEm?: string | null }[],
  hoje: string,
): SituacaoPeriodica {
  const { inicio, fim } = periodoAtual(periodicidade, hoje);
  // Vale o dia da conclusão (Brasília); sem ele, o dia em que foi iniciado.
  const diaDe = (c: { data: string; concluidoEm?: string | null }) =>
    c.concluidoEm ? hojeBrasilia(new Date(c.concluidoEm)) : c.data;
  if (checklistsDoVeiculo.some((c) => c.status === "Concluído" && diaDe(c) >= inicio && diaDe(c) <= fim)) return "em_dia";
  if (checklistsDoVeiculo.some((c) => c.status === "Em andamento")) return "em_andamento";
  return "pendente";
}

// ---------- Resumo e pendências ----------

export const pendenciaAberta = (i: ItemChecklist) => i.avaliacao === "NOK" && !i.resolucao;

export function resumoChecklist(c: Pick<ChecklistVeiculo, "itens">) {
  const n = (a: Avaliacao) => c.itens.filter((i) => i.avaliacao === a).length;
  return {
    total: c.itens.length,
    avaliados: c.itens.filter((i) => i.avaliacao !== null).length,
    ok: n("OK"),
    nok: n("NOK"),
    na: n("N.A."),
    pendenciasAbertas: c.itens.filter(pendenciaAberta).length,
  };
}

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

export type EntradaChecklist = {
  veiculoId: string;
  veiculoRotulo: string;
  tipoVeiculo: string;
  periodicidade: string | null | undefined;
  responsavelId: string;
  responsavelNome: string;
  grupos: GrupoChecklistVeiculo[]; // já filtrados por gruposAplicaveis
};

export function iniciarChecklist(entrada: EntradaChecklist, storage = storagePadrao(), agora = new Date()): ChecklistVeiculo {
  if (!entrada.veiculoId) throw new Error("Selecione o veículo.");
  if (!ehPeriodicidade(entrada.periodicidade)) {
    throw new Error("Este veículo não tem periodicidade: associe itens de check list a ele em Parâmetros > Veículos > Associar itens de check list a um veículo.");
  }
  if (!entrada.responsavelId) throw new Error("Selecione o responsável pelo check list.");
  return gravarNovoChecklist({ ...entrada, periodicidade: entrada.periodicidade }, false, storage, agora);
}

// Check list avulso (decisão 90): sem periodicidade e sem responsável, com todos os grupos do tipo do veículo. Fica fora
// da lista principal, do painel do mês e da situação por veículo; gera ocorrência dos itens NOK como qualquer outro.
export type EntradaChecklistAvulso = Pick<EntradaChecklist, "veiculoId" | "veiculoRotulo" | "tipoVeiculo" | "grupos">;

export function iniciarChecklistAvulso(entrada: EntradaChecklistAvulso, storage = storagePadrao(), agora = new Date()): ChecklistVeiculo {
  if (!entrada.veiculoId) throw new Error("Selecione o veículo.");
  return gravarNovoChecklist({ ...entrada, periodicidade: "", responsavelId: "", responsavelNome: "" }, true, storage, agora);
}

function gravarNovoChecklist(entrada: Omit<EntradaChecklist, "periodicidade"> & { periodicidade: Periodicidade | "" }, avulso: boolean, storage: StorageLike | null, agora: Date): ChecklistVeiculo {
  const itens: ItemChecklist[] = entrada.grupos.flatMap((g) =>
    g.itens.map((i) => ({
      id: `${g.id}:${i.id}`, grupo: g.nome, nome: i.nome, avaliacao: null, observacao: "", fotos: [],
      ocorrenciaId: null, ocorrenciaCodigo: null, resolucao: null,
    })),
  );
  if (itens.length === 0) throw new Error("Não há itens de check list para o tipo deste veículo. Cadastre ou ligue os grupos em Parâmetros > Veículos > Itens check list.");
  let criado!: ChecklistVeiculo;
  gravar(() =>
    alterarLista<ChecklistVeiculo>(CHAVE, storage, (lista) => {
      // O avulso e o periódico não se bloqueiam: cada tipo tem o seu em andamento por veículo.
      if (lista.some((c) => c.veiculoId === entrada.veiculoId && c.status === "Em andamento" && checklistVisivelNaLista(c) === !avulso)) {
        throw new Error(avulso ? "Este veículo já tem um check list avulso em andamento. Conclua-o antes de iniciar outro." : "Este veículo já tem um check list em andamento. Conclua-o antes de iniciar outro.");
      }
      const maior = lista.reduce((m, c) => Math.max(m, Number(c.codigo.replace(/\D/g, "")) || 0), 0);
      criado = {
        id: novoId(),
        codigo: `CHK-${String(maior + 1).padStart(4, "0")}`,
        veiculoId: entrada.veiculoId,
        veiculoRotulo: limpar(entrada.veiculoRotulo, 200),
        tipoVeiculo: limpar(entrada.tipoVeiculo, 80),
        periodicidade: entrada.periodicidade,
        responsavelId: entrada.responsavelId,
        responsavelNome: limpar(entrada.responsavelNome, 120),
        criadoEm: agora.toISOString(),
        data: hojeBrasilia(agora),
        status: "Em andamento",
        concluidoEm: null,
        itens,
      };
      return [...lista, criado];
    }),
  );
  return criado;
}

function alterarAberto(id: string, storage: StorageLike | null, mudar: (c: ChecklistVeiculo) => void): void {
  gravar(() =>
    alterarLista<ChecklistVeiculo>(CHAVE, storage, (lista) => {
      const c = lista.find((x) => x.id === id);
      if (!c) throw new Error("Check list não encontrado.");
      if (c.status !== "Em andamento") throw new Error("Este check list já foi concluído e não pode mais ser alterado.");
      mudar(c);
      return lista;
    }),
  );
}

const acharItem = (c: ChecklistVeiculo, itemId: string) => {
  const i = c.itens.find((x) => x.id === itemId);
  if (!i) throw new Error("Item não encontrado neste check list.");
  return i;
};

// Avalia o item (OK, NOK ou N.A.) e guarda a observação; avaliacao nula limpa a avaliação.
export function avaliarItem(
  id: string,
  itemId: string,
  dados: { avaliacao: string | null; observacao: string },
  storage = storagePadrao(),
): void {
  if (dados.avaliacao !== null && !AVALIACOES.includes(dados.avaliacao as Avaliacao)) throw new Error("Escolha OK, NOK ou N.A.");
  alterarAberto(id, storage, (c) => {
    const i = acharItem(c, itemId);
    i.avaliacao = dados.avaliacao as Avaliacao | null;
    i.observacao = limpar(dados.observacao, 500);
  });
}

export function adicionarFotosItem(id: string, itemId: string, fotos: string[], storage = storagePadrao()): void {
  alterarAberto(id, storage, (c) => {
    const i = acharItem(c, itemId);
    if (i.fotos.length + fotos.length > MAX_FOTOS_ITEM) throw new Error(`No máximo ${MAX_FOTOS_ITEM} fotos por item.`);
    if (fotos.some((f) => typeof f !== "string" || !f.startsWith("data:image/") || f.length > LIMITE_FOTO)) {
      throw new Error("Uma das fotos não é uma imagem válida ou ficou grande demais.");
    }
    i.fotos = [...i.fotos, ...fotos];
  });
}

export function removerFotoItem(id: string, itemId: string, indice: number, storage = storagePadrao()): void {
  alterarAberto(id, storage, (c) => {
    const i = acharItem(c, itemId);
    if (!Number.isInteger(indice) || indice < 0 || indice >= i.fotos.length) throw new Error("Foto não encontrada.");
    i.fotos = i.fotos.filter((_, n) => n !== indice);
  });
}

// Conclui o check list: todos os itens precisam estar avaliados e cada NOK precisa de observação. Cada
// item NOK gera uma ocorrência Aberta e fica como pendência aberta no check list. N.A. não gera nada.
export function concluirChecklist(id: string, storage = storagePadrao(), agora = new Date()): ChecklistVeiculo {
  const atual = lerChecklists(storage).find((c) => c.id === id);
  if (!atual) throw new Error("Check list não encontrado.");
  if (atual.status !== "Em andamento") throw new Error("Este check list já foi concluído.");
  const faltam = atual.itens.filter((i) => i.avaliacao === null).length;
  if (faltam > 0) throw new Error(`Avalie todos os itens antes de concluir: faltam ${faltam}.`);
  const semObs = atual.itens.find((i) => i.avaliacao === "NOK" && !i.observacao);
  if (semObs) throw new Error(`Descreva o problema do item reprovado: ${semObs.nome}.`);
  const nok = atual.itens.filter((i) => i.avaliacao === "NOK");
  const criadas = registrarOcorrenciasDoChecklist(
    nok.map((i) => ({
      veiculoId: atual.veiculoId,
      condutorId: atual.responsavelId,
      descricao: `Item reprovado no check list ${atual.codigo} (${i.grupo}): ${i.nome}. ${i.observacao}`,
    })),
    storage,
    agora,
  );
  try {
    let concluido!: ChecklistVeiculo;
    alterarAberto(id, storage, (c) => {
      nok.forEach((n, k) => {
        const item = acharItem(c, n.id);
        item.ocorrenciaId = criadas[k]!.id;
        item.ocorrenciaCodigo = criadas[k]!.codigo;
      });
      c.status = "Concluído";
      c.concluidoEm = agora.toISOString();
      concluido = c;
    });
    return { ...concluido };
  } catch (erro) {
    // O check list não pôde ser gravado: as ocorrências recém-criadas são desfeitas, para não duplicar no próximo envio.
    try { removerOcorrenciasPorId(criadas.map((o) => o.id), storage); } catch { /* sem o que fazer */ }
    throw erro;
  }
}

// Resolve uma pendência NOK de um check list concluído, registrando o que foi feito.
export function resolverPendencia(id: string, itemId: string, descricao: string, storage = storagePadrao(), agora = new Date()): void {
  const texto = limpar(descricao, 500);
  if (!texto) throw new Error("Descreva como a pendência foi resolvida.");
  gravar(() =>
    alterarLista<ChecklistVeiculo>(CHAVE, storage, (lista) => {
      const c = lista.find((x) => x.id === id);
      if (!c) throw new Error("Check list não encontrado.");
      if (c.status !== "Concluído") throw new Error("Conclua o check list antes de resolver as pendências.");
      const i = acharItem(c, itemId);
      if (i.avaliacao !== "NOK") throw new Error("Só itens reprovados (NOK) têm pendência.");
      if (i.resolucao) throw new Error("Esta pendência já foi resolvida.");
      i.resolucao = { descricao: texto, resolvidaEm: agora.toISOString() };
      return lista;
    }),
  );
}

// Pendências NOK ainda abertas, de todos os check lists concluídos (ou só de um veículo).
export function pendenciasAbertas(checklists: ChecklistVeiculo[], veiculoId?: string) {
  return checklists
    .filter((c) => c.status === "Concluído" && (!veiculoId || c.veiculoId === veiculoId))
    .flatMap((c) => c.itens.filter(pendenciaAberta).map((item) => ({ checklist: c, item })));
}

export function excluirChecklistEmAndamento(id: string, storage = storagePadrao()): void {
  gravar(() =>
    alterarLista<ChecklistVeiculo>(CHAVE, storage, (lista) => {
      const c = lista.find((x) => x.id === id);
      if (!c) throw new Error("Check list não encontrado.");
      if (c.status !== "Em andamento") throw new Error("Só é possível descartar um check list em andamento.");
      return lista.filter((x) => x.id !== id);
    }),
  );
}
