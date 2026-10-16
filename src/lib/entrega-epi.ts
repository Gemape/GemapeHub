// Entrega EPI (módulo EPI): registra a entrega (saída) e a devolução (entrada, só Administrador) de EPI.
// Cada movimentação ganha código automático (ENT-0001 / DEV-0001) e a devolução guarda o responsável.
// Os saldos continuam sendo contados pelo gatilho de movimentações (no demo, demo-client.ts); aqui ficam
// as conferências antes de gravar, a gravação de tudo de uma vez e a leitura do histórico completo.
// Colunas codigo_movimentacao e responsavel_nome existem só no modo demonstração (Fase 2: ver pendencias-fase2.md).
import { capitalizarTexto } from "./formatacao-cadastral.ts";
import { bloqueioPorDemissao } from "./empregados.ts";
import { ehBaixa } from "./historico-movimentacoes.ts";
import { lerTodas } from "./ler-todas.ts";
import { validarSaidaDeEpis } from "./termos-atomicos.ts";

export const SIGLA_ENTREGA = "ENT";
export const SIGLA_DEVOLUCAO = "DEV";

// Cliente do Supabase (ou o de demonstração); tipado de forma solta para os testes poderem usar o de demonstração.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ClienteEntrega = { from: (tabela: string) => any };

export type EmpregadoEntrega = { id: string; nome: string; data_demissao: string | null; ativo?: boolean | null };
export type LinhaEntrega = { item_id: string; quantidade: number; tamanho_id?: string | null };
export type ItemEpiEntrega = {
  id: string; nome: string; estoque_atual: number | null; estoque_minimo?: number | null; status?: string | null;
  [campo: string]: unknown;
};
export type AlertaMinimo = { itemId: string; nome: string; saldo: number; minimo: number };
export type CalculoAlerta = (item: ItemEpiEntrega) => { alerta: boolean; saldo: number; minimo: number };

export type MovimentacaoEpi = {
  id?: string;
  item_id: string | null;
  empregado_id?: string | null;
  tipo_movimentacao: string;
  quantidade: number;
  motivo_baixa?: string | null;
  data_movimentacao: string;
  created_at?: string | null;
  observacao?: string | null;
  tamanho_id?: string | null;
  codigo_movimentacao?: string | null;
  responsavel_nome?: string | null;
};

/** Próximo código da sigla (ENT-0001, DEV-0001...), olhando os códigos já usados; a numeração de cada sigla é separada. */
export function proximoCodigoMovimentacao(sigla: string, existentes: readonly (string | null | undefined)[]): string {
  const prefixo = `${sigla}-`;
  const maior = existentes.reduce((m, c) => {
    if (typeof c !== "string" || !c.startsWith(prefixo)) return m;
    const n = Number(c.slice(prefixo.length));
    return Number.isInteger(n) && n > m ? n : m;
  }, 0);
  return `${prefixo}${String(maior + 1).padStart(4, "0")}`;
}

/** Alerta de estoque mínimo: o saldo chegou (ou passou) do mínimo configurado no cadastro do EPI. */
export const alertaMinimoEpi = (saldo: number, minimo: number): boolean => saldo <= minimo;

const estaInativo = (status: string | null | undefined) => (status ?? "").toLocaleLowerCase("pt-BR") === "inativo";

export function empregadoPodeReceberEpi(e: { nome?: string; ativo?: boolean | null } | null | undefined): string | null {
  if (!e) return "Escolha o empregado.";
  if (e.ativo === false) return `${e.nome ?? "O empregado"} está inativo(a) e não pode receber nem devolver EPI.`;
  return null;
}

/** Quanto o empregado tem em posse: entregue menos devolvido e baixado, do EPI (e do tamanho, quando informado). */
export function emPosseEpi(movs: readonly MovimentacaoEpi[], empregadoId: string, itemId: string, tamanhoId: string | null): number {
  let total = 0;
  for (const m of movs) {
    if (m.item_id !== itemId || (m.empregado_id !== undefined && m.empregado_id !== empregadoId)) continue;
    if (tamanhoId && m.tamanho_id !== tamanhoId) continue;
    const quantidade = Number(m.quantidade) || 0;
    if (m.tipo_movimentacao === "Devolucao" || ehBaixa({ tipo_movimentacao: m.tipo_movimentacao, motivo_baixa: m.motivo_baixa ?? null })) total -= quantidade;
    else if (m.tipo_movimentacao === "Saida") total += quantidade;
  }
  return total;
}

const textoObservacao = (texto: string | null | undefined) => capitalizarTexto(texto ?? "").slice(0, 500) || null;

async function lerItens(cliente: ClienteEntrega, empresaId: string): Promise<ItemEpiEntrega[]> {
  return lerTodas<ItemEpiEntrega>(() => cliente.from("epis").select("*").eq("empresa_id", empresaId), (q) => q.order("id"));
}

async function lerCodigos(cliente: ClienteEntrega): Promise<(string | null)[]> {
  const todas = await lerTodas<{ codigo_movimentacao?: string | null }>(() => cliente.from("movimentacoes").select("codigo_movimentacao"), (q) => q.order("created_at").order("id"));
  return todas.map((m) => m.codigo_movimentacao ?? null);
}

function conferirItens(linhas: LinhaEntrega[], itens: ItemEpiEntrega[]): void {
  for (const linha of linhas) {
    const item = itens.find((i) => i.id === linha.item_id);
    if (linha.item_id && !item) throw new Error("O EPI escolhido não existe nesta empresa.");
    if (item && estaInativo(item.status)) throw new Error(`${item.nome} está inativo e não pode ser movimentado.`);
  }
}

function alertasDe(itensDepois: ItemEpiEntrega[], ids: string[], calcular?: CalculoAlerta): AlertaMinimo[] {
  return ids.flatMap((id) => {
    const item = itensDepois.find((i) => i.id === id);
    if (!item) return [];
    const r = calcular ? calcular(item) : { saldo: Number(item.estoque_atual ?? 0), minimo: Number(item.estoque_minimo ?? 0), alerta: alertaMinimoEpi(Number(item.estoque_atual ?? 0), Number(item.estoque_minimo ?? 0)) };
    return r.alerta ? [{ itemId: id, nome: item.nome, saldo: r.saldo, minimo: r.minimo }] : [];
  });
}

type EntradaBase = {
  empresaId: string;
  empregado: EmpregadoEntrega;
  linhas: LinhaEntrega[];
  data: string;
  observacao?: string | null;
  /** Falso fora do modo demonstração: as colunas de código e responsável ainda não existem no banco real. */
  comCodigo?: boolean;
  calcularAlerta?: CalculoAlerta;
};
export type ResultadoMovimentacao = { codigos: string[]; saldoApos: Record<string, number>; alertas: AlertaMinimo[] };

async function gravar(cliente: ClienteEntrega, entrada: EntradaBase, tipo: "Saida" | "Devolucao", responsavel: string | null): Promise<ResultadoMovimentacao> {
  const comCodigo = entrada.comCodigo !== false;
  const sigla = tipo === "Saida" ? SIGLA_ENTREGA : SIGLA_DEVOLUCAO;
  const usados = comCodigo ? await lerCodigos(cliente) : [];
  const codigos: string[] = [];
  const observacao = textoObservacao(entrada.observacao);
  const linhas = entrada.linhas.map((l) => {
    const codigo = comCodigo ? proximoCodigoMovimentacao(sigla, [...usados, ...codigos]) : null;
    if (codigo) codigos.push(codigo);
    return {
      modulo: "epi", tipo_movimentacao: tipo, quantidade: l.quantidade, data_movimentacao: entrada.data,
      item_id: l.item_id, empresa_id: entrada.empresaId, empregado_id: entrada.empregado.id, observacao,
      ...(l.tamanho_id !== undefined ? { tamanho_id: l.tamanho_id } : {}),
      ...(comCodigo ? { codigo_movimentacao: codigo, ...(responsavel ? { responsavel_nome: responsavel } : {}) } : {}),
    };
  });
  // Uma única gravação: o gatilho confere o saldo de todas as linhas e grava todas ou nenhuma.
  const { error } = await cliente.from("movimentacoes").insert(linhas);
  if (error) throw new Error(error.message);
  const depois = await lerItens(cliente, entrada.empresaId);
  const ids = [...new Set(entrada.linhas.map((l) => l.item_id))];
  return {
    codigos,
    saldoApos: Object.fromEntries(ids.map((id) => [id, Number(depois.find((i) => i.id === id)?.estoque_atual ?? 0)])),
    alertas: tipo === "Saida" ? alertasDe(depois, ids, entrada.calcularAlerta) : [],
  };
}

/** Entrega de EPI: confere empregado, EPI e saldo e grava todas as saídas de uma vez (ou nenhuma). */
export async function registrarEntregaEpi(cliente: ClienteEntrega, entrada: EntradaBase): Promise<ResultadoMovimentacao> {
  const bloqueio = empregadoPodeReceberEpi(entrada.empregado) ?? bloqueioPorDemissao(entrada.empregado, "entrega", entrada.data);
  if (bloqueio) throw new Error(bloqueio);
  if (!entrada.data) throw new Error("Informe a data da entrega.");
  const itens = await lerItens(cliente, entrada.empresaId);
  conferirItens(entrada.linhas, itens);
  const erro = validarSaidaDeEpis(entrada.linhas, itens);
  if (erro) throw new Error(erro);
  return gravar(cliente, entrada, "Saida", null);
}

export const MENSAGEM_SO_ADMIN = "Somente o Administrador registra a devolução de EPI.";

/** Devolução de EPI (só Administrador): volta ao estoque, no limite do que o empregado tem em posse. */
export async function registrarDevolucaoEpi(cliente: ClienteEntrega, entrada: EntradaBase & { administrador: boolean; responsavel: string }): Promise<ResultadoMovimentacao> {
  if (!entrada.administrador) throw new Error(MENSAGEM_SO_ADMIN);
  const bloqueio = empregadoPodeReceberEpi(entrada.empregado) ?? bloqueioPorDemissao(entrada.empregado, "devolucao", entrada.data);
  if (bloqueio) throw new Error(bloqueio);
  if (!entrada.data) throw new Error("Informe a data da devolução.");
  if (!entrada.responsavel.trim()) throw new Error("Informe o responsável pela devolução.");
  if (entrada.linhas.length === 0) throw new Error("Adicione pelo menos um EPI.");
  const itens = await lerItens(cliente, entrada.empresaId);
  conferirItens(entrada.linhas, itens);
  const historico = await lerTodas<MovimentacaoEpi>(
    () => cliente.from("movimentacoes").select("*").eq("modulo", "epi").eq("empresa_id", entrada.empresaId).eq("empregado_id", entrada.empregado.id),
    (q) => q.order("created_at").order("id"),
  );
  const pedidas = new Map<string, { quantidade: number; tamanho: string | null; item: string }>();
  for (const l of entrada.linhas) {
    if (!l.item_id) throw new Error("Selecione o EPI de cada linha.");
    if (!Number.isInteger(l.quantidade) || l.quantidade < 1) throw new Error("A quantidade de cada EPI deve ser um número inteiro maior que zero.");
    const chave = `${l.item_id}|${l.tamanho_id ?? ""}`;
    const atual = pedidas.get(chave) ?? { quantidade: 0, tamanho: l.tamanho_id ?? null, item: l.item_id };
    atual.quantidade += l.quantidade;
    pedidas.set(chave, atual);
  }
  for (const p of pedidas.values()) {
    const comEmpregado = emPosseEpi(historico, entrada.empregado.id, p.item, p.tamanho && p.tamanho !== "sem-tamanho" ? p.tamanho : null);
    if (p.quantidade > comEmpregado) {
      const nome = itens.find((i) => i.id === p.item)?.nome ?? "um EPI";
      throw new Error(`A devolução de ${p.quantidade} unidade(s) de ${nome} passa do que o empregado tem em posse (${Math.max(0, comEmpregado)}).`);
    }
  }
  return gravar(cliente, entrada, "Devolucao", entrada.responsavel.trim());
}

/** Histórico completo de movimentações de EPI da empresa, por EPI e/ou empregado, lido em blocos (sem o limite de 1000 linhas). */
export async function lerHistoricoEpiPorItem(
  cliente: ClienteEntrega,
  filtro: { empresaId: string; itemId?: string; empregadoId?: string },
): Promise<MovimentacaoEpi[]> {
  const montar = () => {
    let q = cliente.from("movimentacoes").select("*").eq("modulo", "epi").eq("empresa_id", filtro.empresaId);
    if (filtro.itemId) q = q.eq("item_id", filtro.itemId);
    if (filtro.empregadoId) q = q.eq("empregado_id", filtro.empregadoId);
    return q;
  };
  const todas = await lerTodas<MovimentacaoEpi>(montar, (q) => q.order("created_at").order("id"));
  return [...todas].sort((a, b) => b.data_movimentacao.localeCompare(a.data_movimentacao) || (b.created_at ?? "").localeCompare(a.created_at ?? ""));
}

export type LinhaFichaEpi = {
  data: string; quantidade: number; nome?: string | undefined; ca?: string | null | undefined; tipo: string; baixaMotivo?: string | null | undefined;
  tamanho?: string | undefined; codigo?: string | null | undefined; responsavel?: string | null | undefined;
};

/** Linhas da Ficha de EPI: entrega, devolução (com o responsável) e baixa, cada uma com o código da movimentação. */
export function linhasDaFichaEpi(
  historico: readonly MovimentacaoEpi[],
  itens: readonly { id: string; nome?: string; ca?: string | null }[],
  nomeTamanho: (tamanhoId: string | null | undefined) => string | undefined,
): LinhaFichaEpi[] {
  return historico.map((h) => {
    const item = itens.find((i) => i.id === h.item_id);
    const baixa = ehBaixa({ tipo_movimentacao: h.tipo_movimentacao, motivo_baixa: h.motivo_baixa ?? null });
    return {
      data: h.data_movimentacao, quantidade: h.quantidade, nome: item?.nome, ca: item?.ca, tipo: h.tipo_movimentacao,
      baixaMotivo: baixa ? h.motivo_baixa : null, tamanho: nomeTamanho(h.tamanho_id),
      codigo: h.codigo_movimentacao ?? null, responsavel: h.tipo_movimentacao === "Devolucao" ? h.responsavel_nome ?? null : null,
    };
  });
}
