// Parâmetros > Equipamentos > Manutenção e Tipos de ocorrência: as ações de manutenção (grupo pai com subitens), o plano de manutenção de cada
// equipamento (limite de horas de uso e de meses, o que vier primeiro) e os tipos de ocorrência. Segue Parâmetros > Veículos (decisões 46, 52 e
// 112), com horas de uso no lugar de km. Fase 1: só no navegador, em modo demonstração; as tabelas entram na Fase 2.
import { chaveDoNome as chave } from "./equipamentos-parametros.ts";
import { ACOES_PADRAO_EQUIPAMENTO } from "./equipamentos-manutencao-padrao.ts";
import { capitalizarTexto } from "./formatacao-cadastral.ts";

export type SubitemAcao = { id: string; nome: string };
export type AcaoManutencaoEquipamento = { id: string; nome: string; subitens: SubitemAcao[] };
export type TipoOcorrenciaEquipamento = { id: string; nome: string; descricao: string };
export type ItemPlano = { acaoId: string; horas: number; meses: number };
export type PlanoEquipamento = { equipamentoId: string; itens: ItemPlano[]; atualizadoEm: string };

// Equipamentos do seletor do plano: os baixados/inativos ficam de fora (menos o do plano em edição) e os que já têm plano aparecem como ocupados.
export function opcoesDePlano<E extends { id: string; status?: string }>(equipamentos: E[], planos: { equipamentoId: string }[], editando: string | null): { equipamento: E; ocupado: boolean }[] {
  const comPlano = new Set(planos.map((p) => p.equipamentoId));
  return equipamentos
    .filter((e) => e.status !== "Baixado/Inativo" || e.id === editando)
    .map((e) => ({ equipamento: e, ocupado: comPlano.has(e.id) && e.id !== editando }));
}
export type EntradaItemPlano = { acaoId: string; horas: string | number; meses: string | number };
export type ManutencaoEquipamento = { acoes: AcaoManutencaoEquipamento[]; tiposOcorrencia: TipoOcorrenciaEquipamento[]; planos: PlanoEquipamento[] };

type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE = "gemape-demo-equipamentos-manutencao";
export const OUTROS = "Outros";

const vazio = (): ManutencaoEquipamento => ({ acoes: [], tiposOcorrencia: [], planos: [] });
const ehObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const ehTexto = (v: unknown): v is string => typeof v === "string";
const ehNumero = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const novoId = () => crypto.randomUUID();

const ehAcao = (v: unknown) =>
  ehObjeto(v) && ehTexto(v["id"]) && ehTexto(v["nome"]) && Array.isArray(v["subitens"]) && v["subitens"].every((s) => ehObjeto(s) && ehTexto(s["id"]) && ehTexto(s["nome"]));
const ehTipo = (v: unknown) => ehObjeto(v) && ehTexto(v["id"]) && ehTexto(v["nome"]) && ehTexto(v["descricao"]);
const ehPlano = (v: unknown) =>
  ehObjeto(v) && ehTexto(v["equipamentoId"]) && ehTexto(v["atualizadoEm"])
  && Array.isArray(v["itens"]) && v["itens"].every((i) => ehObjeto(i) && ehTexto(i["acaoId"]) && ehNumero(i["horas"]) && ehNumero(i["meses"]));

// Dado salvo ilegível nunca é sobrescrito: a leitura vem vazia, mas gravar por cima apagaria o que sobrou.
function ler(storage: StorageLike): { dados: ManutencaoEquipamento; legivel: boolean } {
  const bruto = storage.getItem(CHAVE);
  if (bruto === null) return { dados: vazio(), legivel: true };
  try {
    const lido: unknown = JSON.parse(bruto);
    if (ehObjeto(lido) && Array.isArray(lido["acoes"]) && Array.isArray(lido["tiposOcorrencia"]) && Array.isArray(lido["planos"])
      && lido["acoes"].every(ehAcao) && lido["tiposOcorrencia"].every(ehTipo) && lido["planos"].every(ehPlano)) {
      return { dados: lido as unknown as ManutencaoEquipamento, legivel: true };
    }
  } catch {
    /* cai no ilegível */
  }
  return { dados: vazio(), legivel: false };
}

export const lerManutencaoEquipamento = (storage: StorageLike = localStorage): ManutencaoEquipamento => ler(storage).dados;

// Valida tudo antes de gravar e grava numa única escrita: ou a mudança entra por inteiro, ou nada muda.
function alterar<T>(storage: StorageLike, acao: (d: ManutencaoEquipamento) => T): T {
  const { dados, legivel } = ler(storage);
  if (!legivel) throw new Error("Os dados de manutenção de equipamentos salvos neste navegador estão ilegíveis; nada foi alterado.");
  const resultado = acao(dados);
  storage.setItem(CHAVE, JSON.stringify(dados));
  return resultado;
}

// ---------- Ações de manutenção ----------
// `literal` grava os textos como vieram (siglas como QTA e GLP não passam pela capitalização automática): é como entra o padrão inicial.
export function salvarAcao(entrada: { id?: string; nome: string; subitens: string[]; literal?: boolean }, storage: StorageLike = localStorage): AcaoManutencaoEquipamento {
  return alterar(storage, (d) => {
    const texto = (t: string) => (entrada.literal ? t.trim().replace(/\s+/g, " ") : capitalizarTexto(t));
    const nome = texto(entrada.nome);
    if (!nome) throw new Error("Informe o nome da ação de manutenção.");
    const atual = entrada.id ? d.acoes.find((a) => a.id === entrada.id) : undefined;
    if (entrada.id && !atual) throw new Error("Esta ação de manutenção foi excluída.");
    if (d.acoes.some((a) => a.id !== entrada.id && chave(a.nome) === chave(nome))) throw new Error(`Já existe a ação de manutenção ${nome}.`);
    // Todo grupo tem também o item Outros, de descrição aberta; ele fica sempre por último.
    const textos = entrada.subitens.map((s) => texto(s)).filter((s) => s && chave(s) !== chave(OUTROS));
    const vistos = new Set<string>();
    for (const t of textos) {
      if (vistos.has(chave(t))) throw new Error(`Subitem repetido: ${t}.`);
      vistos.add(chave(t));
    }
    const anteriores = new Map((atual?.subitens ?? []).map((s) => [chave(s.nome), s.id]));
    const subitens = [...textos, OUTROS].map((t) => ({ id: anteriores.get(chave(t)) ?? novoId(), nome: t }));
    const acao = { id: entrada.id ?? novoId(), nome, subitens };
    if (atual) d.acoes[d.acoes.indexOf(atual)] = acao;
    else d.acoes.push(acao);
    return acao;
  });
}

// Ação que algum plano usa não se exclui: o plano ficaria apontando para uma ação que não existe mais.
export function removerAcao(id: string, storage: StorageLike = localStorage): void {
  alterar(storage, (d) => {
    if (!d.acoes.some((a) => a.id === id)) throw new Error("Esta ação de manutenção já foi excluída.");
    const usos = d.planos.filter((p) => p.itens.some((i) => i.acaoId === id)).length;
    if (usos > 0) throw new Error(`Esta ação está em ${usos} ${usos === 1 ? "plano" : "planos"} de manutenção; remova-a do plano antes de excluir.`);
    d.acoes = d.acoes.filter((a) => a.id !== id);
  });
}

// ---------- Tipos de ocorrência ----------
export function salvarTipoOcorrencia(entrada: { id?: string; nome: string; descricao: string }, storage: StorageLike = localStorage): TipoOcorrenciaEquipamento {
  return alterar(storage, (d) => {
    const nome = capitalizarTexto(entrada.nome);
    if (!nome) throw new Error("Informe o nome do tipo de ocorrência.");
    const indice = entrada.id ? d.tiposOcorrencia.findIndex((t) => t.id === entrada.id) : -1;
    if (entrada.id && indice < 0) throw new Error("Este tipo de ocorrência foi excluído.");
    if (d.tiposOcorrencia.some((t) => t.id !== entrada.id && chave(t.nome) === chave(nome))) throw new Error(`Já existe o tipo de ocorrência ${nome}.`);
    const tipo = { id: entrada.id ?? novoId(), nome, descricao: capitalizarTexto(entrada.descricao) };
    if (indice >= 0) d.tiposOcorrencia[indice] = tipo;
    else d.tiposOcorrencia.push(tipo);
    return tipo;
  });
}

export function removerTipoOcorrencia(id: string, storage: StorageLike = localStorage): void {
  alterar(storage, (d) => {
    if (!d.tiposOcorrencia.some((t) => t.id === id)) throw new Error("Este tipo de ocorrência já foi excluído.");
    d.tiposOcorrencia = d.tiposOcorrencia.filter((t) => t.id !== id);
  });
}

// ---------- Plano de manutenção ----------
// Inteiro maior que zero, com ponto só como separador de milhar ("5.000"); "1.5" não vale.
const inteiroPositivo = (valor: string | number): number | null => {
  if (typeof valor === "number" && !Number.isInteger(valor)) return null;
  const texto = String(valor ?? "").trim();
  if (!/^\d+$/.test(texto) && !/^\d{1,3}(\.\d{3})+$/.test(texto)) return null;
  const numero = Number(texto.replace(/\./g, ""));
  return numero > 0 && numero <= 9_999_999 ? numero : null;
};

export function salvarPlano(
  entrada: { modo: "criar" | "editar"; equipamentoId: string; itens: EntradaItemPlano[] },
  storage: StorageLike = localStorage,
  agora = new Date(),
): PlanoEquipamento {
  return alterar(storage, (d) => {
    if (!entrada.equipamentoId) throw new Error("Selecione o equipamento.");
    if (entrada.itens.length === 0) throw new Error("Habilite ao menos uma ação de manutenção.");
    const vistos = new Set<string>();
    const itens = entrada.itens.map((i) => {
      if (!d.acoes.some((a) => a.id === i.acaoId)) throw new Error("Uma ação do plano não existe mais em Ações de manutenção. Remova-a e salve de novo.");
      if (vistos.has(i.acaoId)) throw new Error("Ação repetida no plano.");
      vistos.add(i.acaoId);
      const horas = inteiroPositivo(i.horas);
      if (horas === null) throw new Error("Informe o limite de horas de uso (número inteiro maior que zero) de cada ação.");
      const meses = inteiroPositivo(i.meses);
      if (meses === null) throw new Error("Informe o limite de meses (número inteiro maior que zero) de cada ação.");
      return { acaoId: i.acaoId, horas, meses };
    });
    const indice = d.planos.findIndex((p) => p.equipamentoId === entrada.equipamentoId);
    if (entrada.modo === "criar" && indice >= 0) throw new Error("Este equipamento já tem plano. Use Editar.");
    if (entrada.modo === "editar" && indice < 0) throw new Error("Plano não encontrado.");
    const plano = { equipamentoId: entrada.equipamentoId, itens, atualizadoEm: agora.toISOString() };
    if (indice >= 0) d.planos[indice] = plano;
    else d.planos.push(plano);
    return plano;
  });
}

export function removerPlano(equipamentoId: string, storage: StorageLike = localStorage): void {
  alterar(storage, (d) => {
    if (!d.planos.some((p) => p.equipamentoId === equipamentoId)) throw new Error("Este plano já foi excluído.");
    d.planos = d.planos.filter((p) => p.equipamentoId !== equipamentoId);
  });
}

// Itens do plano cuja ação ainda existe em Ações de manutenção.
export function itensDoPlano(plano: PlanoEquipamento, acoes: { id: string; nome: string }[]): (ItemPlano & { nome: string })[] {
  return plano.itens.flatMap((i) => {
    const acao = acoes.find((a) => a.id === i.acaoId);
    return acao ? [{ ...i, nome: acao.nome }] : [];
  });
}


// ---------- Padrão inicial das ações de manutenção ----------
export type SituacaoPadraoAcao = "igual" | "alterado" | "ausente";
export type FilhoPadraoAcao = { nome: string; existe: boolean };
const subitensDoPadrao = (p: { subitens: readonly string[] }) => [...p.subitens, OUTROS];
const acaoDoPadrao = (acoes: AcaoManutencaoEquipamento[], nome: string) => acoes.find((a) => chave(a.nome) === chave(nome));
// Outros fica sempre por último (e existe em toda ação).
const comOutros = (subitens: SubitemAcao[]): SubitemAcao[] => [...subitens.filter((s) => chave(s.nome) !== chave(OUTROS)), subitens.find((s) => chave(s.nome) === chave(OUTROS)) ?? { id: novoId(), nome: OUTROS }];

// Cadastra as ações do padrão inicial que ainda não existem (mesmo nome, sem diferenciar maiúsculas e acentos); o que já existe não é repetido nem alterado.
export function cadastrarPadraoAcoes(storage: StorageLike = localStorage, aPartirDe = 0): { criadas: number } {
  return alterar(storage, (d) => {
    let criadas = 0;
    for (const p of ACOES_PADRAO_EQUIPAMENTO.slice(aPartirDe)) {
      if (acaoDoPadrao(d.acoes, p.nome)) continue;
      d.acoes.push({ id: novoId(), nome: p.nome, subitens: comOutros(p.subitens.map((nome) => ({ id: novoId(), nome }))) });
      criadas += 1;
    }
    return { criadas };
  });
}
// As ações padrão entram sozinhas na primeira vez (como as de Veículos); depois, o que a pessoa excluir só volta pelo botão Restaurar configurações iniciais.
// O marcador guarda quantas ações do padrão já foram oferecidas (o valor antigo "1" valia as 35 primeiras): ação nova no fim do padrão entra uma vez em quem
// já tinha o padrão, sem trazer de volta o que foi excluído.
const CHAVE_ACOES_PADRAO = "gemape-demo-equipamentos-acoes-padrao";
const ACOES_DA_PRIMEIRA_VERSAO = 35;
export function aplicarAcoesPadraoUmaVez(storage: StorageLike = localStorage): boolean {
  const marcador = storage.getItem(CHAVE_ACOES_PADRAO);
  const oferecidas = marcador === "1" ? ACOES_DA_PRIMEIRA_VERSAO : Number(marcador) || 0;
  if (oferecidas >= ACOES_PADRAO_EQUIPAMENTO.length) return false;
  try {
    cadastrarPadraoAcoes(storage, oferecidas);
    storage.setItem(CHAVE_ACOES_PADRAO, String(ACOES_PADRAO_EQUIPAMENTO.length));
    return true;
  } catch {
    return false; // dado ilegível: nada é gravado por cima, e a tentativa se repete na próxima abertura
  }
}

// Todas as ações do padrão inicial com a situação de cada uma no cadastro atual: "igual" (nome e subitens, na ordem), "alterado" ou "ausente" (não existe mais),
// e, para cada subitem, se ele existe.
export function situacaoPadraoAcoes(storage: StorageLike = localStorage): { nome: string; situacao: SituacaoPadraoAcao; filhos: FilhoPadraoAcao[] }[] {
  const { acoes } = lerManutencaoEquipamento(storage);
  return ACOES_PADRAO_EQUIPAMENTO.map((p) => {
    const acao = acaoDoPadrao(acoes, p.nome);
    const esperados = subitensDoPadrao(p);
    const igual = !!acao && acao.nome === p.nome && acao.subitens.length === esperados.length && acao.subitens.every((s, n) => s.nome === esperados[n]);
    return {
      nome: p.nome, situacao: !acao ? "ausente" : igual ? "igual" : "alterado",
      filhos: esperados.map((nome) => ({ nome, existe: !!acao?.subitens.some((s) => chave(s.nome) === chave(nome)) })),
    };
  });
}

// Restaura as ações do padrão inicial escolhendo pais e filhos, tudo ou nada. Pai marcado volta ao nome inicial (ou é cadastrado de novo, se foi excluído); só os
// filhos marcados são restaurados ou incluídos. Os não marcados e os que a pessoa criou ficam como estão.
export function restaurarAcoesEscolhidas(escolhas: { nome: string; filhos: string[] }[], storage: StorageLike = localStorage): { restaurados: number; criados: number; filhos: number } {
  if (escolhas.length === 0) throw new Error("Marque ao menos uma ação para restaurar.");
  const planos = escolhas.map((e) => {
    const padrao = ACOES_PADRAO_EQUIPAMENTO.find((p) => chave(p.nome) === chave(e.nome));
    if (!padrao) throw new Error("Há uma ação que não faz parte do padrão inicial.");
    const todos = subitensDoPadrao(padrao);
    for (const f of e.filhos) if (!todos.some((i) => chave(i) === chave(f))) throw new Error(`O subitem ${f} não faz parte do padrão inicial de ${padrao.nome}.`);
    return { padrao, todos, marcados: todos.filter((i) => e.filhos.some((f) => chave(i) === chave(f))) };
  });
  return alterar(storage, (d) => {
    let restaurados = 0;
    let criados = 0;
    let filhos = 0;
    for (const { padrao, todos, marcados } of planos) {
      const acao = acaoDoPadrao(d.acoes, padrao.nome);
      if (!acao) {
        d.acoes.push({ id: novoId(), nome: padrao.nome, subitens: comOutros(marcados.map((nome) => ({ id: novoId(), nome }))) });
        criados += 1;
        filhos += marcados.length;
        continue;
      }
      // Na ordem do padrão: o que já existe fica (o marcado volta ao nome inicial), o marcado que falta entra; os criados pela pessoa vão ao fim.
      const resultado: SubitemAcao[] = [];
      for (const i of todos) {
        const atual = acao.subitens.find((s) => chave(s.nome) === chave(i));
        const marcado = marcados.some((m) => chave(m) === chave(i));
        if (atual) {
          resultado.push(marcado ? { ...atual, nome: i } : atual);
          if (marcado) filhos += 1;
        } else if (marcado) {
          resultado.push({ id: novoId(), nome: i });
          filhos += 1;
        }
      }
      for (const s of acao.subitens) if (!todos.some((i) => chave(i) === chave(s.nome))) resultado.push(s);
      acao.nome = padrao.nome;
      acao.subitens = comOutros(resultado);
      restaurados += 1;
    }
    return { restaurados, criados, filhos };
  });
}

export type ItemCriadoAcaoEq = { id: string; nome: string; doPadrao: boolean; filhos: SubitemAcao[] };
// Pais e filhos que a pessoa criou: as ações fora do padrão inicial (com todos os subitens) e, nas do padrão, só os subitens extras. Ação do padrão sem extras não aparece.
export function itensCriadosAcoes(storage: StorageLike = localStorage): ItemCriadoAcaoEq[] {
  const lista: ItemCriadoAcaoEq[] = [];
  for (const a of lerManutencaoEquipamento(storage).acoes) {
    const padrao = ACOES_PADRAO_EQUIPAMENTO.find((p) => chave(p.nome) === chave(a.nome));
    const proprios = a.subitens.filter((s) => chave(s.nome) !== chave(OUTROS));
    if (!padrao) { lista.push({ id: a.id, nome: a.nome, doPadrao: false, filhos: proprios }); continue; }
    const extras = proprios.filter((s) => !padrao.subitens.some((i) => chave(i) === chave(s.nome)));
    if (extras.length > 0) lista.push({ id: a.id, nome: a.nome, doPadrao: true, filhos: extras });
  }
  return lista;
}

// Exclui os itens criados pela pessoa que foram marcados. Pai marcado: some a ação criada por ela ou, numa ação do padrão, os subitens extras. Filho marcado:
// some só esse subitem. Só vale para o que aparece em itensCriadosAcoes: o padrão inicial nunca é apagado por aqui; ação em uso num plano não se exclui.
export function excluirItensCriadosAcoes(ids: string[], storage: StorageLike = localStorage): { acoes: number; subitens: number } {
  const criados = itensCriadosAcoes(storage);
  const escolhidos = new Set(ids);
  if (!criados.some((c) => escolhidos.has(c.id) || c.filhos.some((f) => escolhidos.has(f.id)))) throw new Error("Marque ao menos um item criado por você.");
  return alterar(storage, (d) => {
    let acoes = 0;
    let subitens = 0;
    for (const c of criados) {
      const paiMarcado = escolhidos.has(c.id);
      const sairam = new Set(c.filhos.filter((f) => paiMarcado || escolhidos.has(f.id)).map((f) => f.id));
      const removeAcaoInteira = paiMarcado && !c.doPadrao;
      if (sairam.size === 0 && !removeAcaoInteira) continue;
      if (removeAcaoInteira) {
        const usos = d.planos.filter((p) => p.itens.some((i) => i.acaoId === c.id)).length;
        if (usos > 0) throw new Error(`A ação ${c.nome} está em ${usos} ${usos === 1 ? "plano" : "planos"} de manutenção; remova-a do plano antes de excluir.`);
        d.acoes = d.acoes.filter((a) => a.id !== c.id);
        acoes += 1;
      } else {
        const acao = d.acoes.find((a) => a.id === c.id);
        if (acao) acao.subitens = acao.subitens.filter((i) => !sairam.has(i.id));
      }
      subitens += sairam.size;
    }
    return { acoes, subitens };
  });
}
