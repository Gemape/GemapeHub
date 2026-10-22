// Parâmetros > Equipamentos > Manutenção e Tipos de ocorrência: as ações de manutenção (grupo pai com subitens), o plano de manutenção de cada
// equipamento (limite de horas de uso e de meses, o que vier primeiro) e os tipos de ocorrência. Segue Parâmetros > Veículos (decisões 46, 52 e
// 112), com horas de uso no lugar de km. Fase 1: só no navegador, em modo demonstração; as tabelas entram na Fase 2.
import { chaveDoNome as chave } from "./equipamentos-parametros.ts";
import { capitalizarTexto } from "./formatacao-cadastral.ts";

export type SubitemAcao = { id: string; nome: string };
export type AcaoManutencaoEquipamento = { id: string; nome: string; subitens: SubitemAcao[] };
export type TipoOcorrenciaEquipamento = { id: string; nome: string; descricao: string };
export type ItemPlano = { acaoId: string; horas: number; meses: number };
export type PlanoEquipamento = { equipamentoId: string; itens: ItemPlano[]; atualizadoEm: string };
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
export function salvarAcao(entrada: { id?: string; nome: string; subitens: string[] }, storage: StorageLike = localStorage): AcaoManutencaoEquipamento {
  return alterar(storage, (d) => {
    const nome = capitalizarTexto(entrada.nome);
    if (!nome) throw new Error("Informe o nome da ação de manutenção.");
    const atual = entrada.id ? d.acoes.find((a) => a.id === entrada.id) : undefined;
    if (entrada.id && !atual) throw new Error("Esta ação de manutenção foi excluída.");
    if (d.acoes.some((a) => a.id !== entrada.id && chave(a.nome) === chave(nome))) throw new Error(`Já existe a ação de manutenção ${nome}.`);
    // Todo grupo tem também o item Outros, de descrição aberta; ele fica sempre por último.
    const textos = entrada.subitens.map((s) => capitalizarTexto(s)).filter((s) => s && chave(s) !== chave(OUTROS));
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
