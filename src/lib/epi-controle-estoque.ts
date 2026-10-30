// Controle de estoque e sugestão de compras dos EPIs, como na planilha CONTROLE DE UNIFORMES E EPIs (REL_ESTOQUE e REL_COMPRAS). As regras foram
// deduzidas dos valores da planilha, cujas macros não vieram no arquivo (docs/ANALISE_PLANILHA_EPI.md): onde há dúvida, está marcado.
// Funções puras: recebem os itens e as movimentações já lidos, e a data de hoje (AAAA-MM-DD, Brasília).

import { statusDeCriticidade, STATUS_CRITICIDADE, type ParametrosCompraEpi, type StatusCriticidade } from "./epi-parametros.ts";

export type ItemControle = { id: string; nome: string; estoque_atual?: number | null; estoque_minimo?: number | null; status?: string | null; empresa_id?: string | null };
export type MovimentoControle = { item_id: string | null; tipo_movimentacao: string; quantidade: number | null; data_movimentacao: string };

export type LinhaControle = {
  itemId: string;
  empresaId: string | null;
  nome: string;
  estoqueCritico: number;
  estoqueAtual: number;
  ultimaEntrada: string | null;
  penultimaEntrada: string | null;
  ultimaSaida: string | null;
  penultimaSaida: string | null;
  consumoMensal: number; // consumo dos últimos 30 dias (saídas menos devoluções)
  consumoTrimestral: number; // 90 dias ÷ 3
  consumoSemestral: number; // 180 dias ÷ 6
  consumoAnual: number; // 365 dias ÷ 12
  cobertura: number | null; // dias; null = sem consumo no último ano
};

export const METAS_COBERTURA = [30, 60, 90, 120, 180] as const;
export type MetaCobertura = (typeof METAS_COBERTURA)[number];
export const META_COBERTURA_PADRAO: MetaCobertura = 120;

const dia = (data: string) => data.slice(0, 10);
const dias = (de: string, ate: string) => Math.round((Date.UTC(+ate.slice(0, 4), +ate.slice(5, 7) - 1, +ate.slice(8, 10)) - Date.UTC(+de.slice(0, 4), +de.slice(5, 7) - 1, +de.slice(8, 10))) / 86_400_000);

// Duas datas mais recentes de uma lista (a última e a penúltima), ou null.
function ultimas(datas: string[]): [string | null, string | null] {
  const ordenadas = [...datas].sort().reverse();
  return [ordenadas[0] ?? null, ordenadas[1] ?? null];
}

export function controleDeEstoque(itens: ItemControle[], movimentos: MovimentoControle[], hoje: string): LinhaControle[] {
  const porItem = new Map<string, MovimentoControle[]>();
  for (const m of movimentos) {
    if (!m.item_id) continue;
    const lista = porItem.get(m.item_id);
    if (lista) lista.push(m);
    else porItem.set(m.item_id, [m]);
  }
  // Item inativo não se repõe: fica fora do controle e da sugestão.
  return itens.filter((item) => (item.status ?? "").toLocaleLowerCase("pt-BR") !== "inativo").map((item) => {
    const doItem = porItem.get(item.id) ?? [];
    const entradas = doItem.filter((m) => m.tipo_movimentacao === "Entrada").map((m) => dia(m.data_movimentacao));
    const saidas = doItem.filter((m) => m.tipo_movimentacao === "Saida");
    // O que o empregado devolve volta ao estoque e não é consumo: sai da conta da mesma janela.
    const devolucoes = doItem.filter((m) => m.tipo_movimentacao === "Devolucao");
    const soma = (lista: MovimentoControle[], janela: number) =>
      lista.filter((m) => { const d = dias(dia(m.data_movimentacao), hoje); return d >= 0 && d < janela; }).reduce((t, m) => t + (m.quantidade ?? 0), 0);
    const somaSaidas = (janela: number) => Math.max(0, soma(saidas, janela) - soma(devolucoes, janela));
    const [ultimaEntrada, penultimaEntrada] = ultimas(entradas);
    const [ultimaSaida, penultimaSaida] = ultimas(saidas.map((m) => dia(m.data_movimentacao)));
    const consumoAnual = somaSaidas(365) / 12;
    const estoqueAtual = item.estoque_atual ?? 0;
    return {
      itemId: item.id,
      empresaId: item.empresa_id ?? null,
      nome: item.nome,
      estoqueCritico: item.estoque_minimo ?? 0,
      estoqueAtual,
      ultimaEntrada, penultimaEntrada, ultimaSaida, penultimaSaida,
      consumoMensal: somaSaidas(30),
      consumoTrimestral: somaSaidas(90) / 3,
      consumoSemestral: somaSaidas(180) / 6,
      consumoAnual,
      cobertura: consumoAnual > 0 ? Math.round(estoqueAtual / (consumoAnual / 30)) : null,
    };
  });
}

export type Prioridade = "1-URGENTE" | "2-ALTA" | "3-MÉDIA" | "4-BAIXA";
export type SugestaoCompra = LinhaControle & { quantidade: number; prioridade: Prioridade; observacao: string; percentualDaMeta: number | null };

// Entra na sugestão o item abaixo do estoque crítico ou com cobertura abaixo da meta. Quantidade = o necessário para chegar à meta
// (consumo médio mensal × meta em meses) ou ao estoque crítico, o que for maior, menos o que já há, arredondado para cima (mínimo 1).
// Prioridade (cortes 25%, 50% e 75% da meta: inferidos, só se viram "1-URGENTE" e "4-BAIXA" na planilha): urgente quando abaixo do crítico.
export function sugestoesDeCompra(linhas: LinhaControle[], meta: number): SugestaoCompra[] {
  return linhas.flatMap((l) => {
    const abaixoCritico = l.estoqueAtual < l.estoqueCritico;
    const abaixoMeta = l.cobertura !== null && l.cobertura < meta;
    if (!abaixoCritico && !abaixoMeta) return [];
    const percentualDaMeta = l.cobertura === null ? null : Math.round((l.cobertura / meta) * 100);
    const alvo = Math.max((l.consumoAnual * meta) / 30, l.estoqueCritico);
    const quantidade = Math.max(1, Math.ceil(Math.round((alvo - l.estoqueAtual) * 1e6) / 1e6));
    const prioridade: Prioridade = abaixoCritico || (percentualDaMeta !== null && percentualDaMeta < 25) ? "1-URGENTE"
      : percentualDaMeta !== null && percentualDaMeta < 50 ? "2-ALTA"
        : percentualDaMeta !== null && percentualDaMeta < 75 ? "3-MÉDIA" : "4-BAIXA";
    const partes = [
      abaixoCritico ? "Abaixo do estoque crítico." : "",
      percentualDaMeta === null ? "Sem consumo no último ano." : abaixoMeta ? `Cobertura abaixo da meta (${percentualDaMeta}%).` : "",
    ].filter(Boolean);
    return [{ ...l, quantidade, prioridade, observacao: partes.join(" "), percentualDaMeta }];
  }).sort((a, b) => a.prioridade.localeCompare(b.prioridade) || a.nome.localeCompare(b.nome, "pt-BR"));
}

// Sugestão de compra do EPI pelos parâmetros de Parâmetros Específicos (decisão 328). Com o método do tempo de cobertura, o item entra pela tabela de criticidade (TC contra o prazo de
// reposição TR): Ruptura, Comprar já e Planejar; com o do estoque mínimo, entra quando o estoque está no mínimo ou abaixo dele. A quantidade cobre o consumo do prazo de reposição
// mais a meta (cobertura) ou o estoque mínimo, o que for maior, menos o que já há.
export type SugestaoEpi = SugestaoCompra & { status: StatusCriticidade | null };

export function sugestoesDeCompraEpi(linhas: LinhaControle[], p: ParametrosCompraEpi): SugestaoEpi[] {
  return linhas.flatMap((l): SugestaoEpi[] => {
    const porDia = l.consumoAnual / 30;
    const status = l.cobertura === null ? null : statusDeCriticidade(l.cobertura, p);
    const abaixoCritico = l.estoqueAtual < l.estoqueCritico;
    const noMinimo = l.estoqueCritico > 0 && l.estoqueAtual === l.estoqueCritico;
    let prioridade: Prioridade | null = null;
    if (p.metodo === "minimo") prioridade = abaixoCritico ? "1-URGENTE" : noMinimo ? "2-ALTA" : null;
    else if (abaixoCritico || status === "ruptura") prioridade = "1-URGENTE";
    else if (status === "comprar_ja") prioridade = "2-ALTA";
    else if (status === "planejar") prioridade = "3-MÉDIA";
    if (!prioridade) return [];
    const alvo = p.metodo === "minimo" ? l.estoqueCritico + porDia * p.prazoReposicao : Math.max(porDia * (p.diasCobertura + p.prazoReposicao), l.estoqueCritico);
    const quantidade = Math.max(1, Math.ceil(Math.round((alvo - l.estoqueAtual) * 1e6) / 1e6));
    const partes = [abaixoCritico ? "Abaixo do estoque mínimo." : noMinimo ? "No estoque mínimo." : "", // O significado só entra quando explica por que o item foi sugerido (estável e excesso não pedem compra).
      status === null ? "Sem consumo no último ano." : ["ruptura", "comprar_ja", "planejar"].includes(status) ? STATUS_CRITICIDADE[status].significado : ""].filter(Boolean);
    return [{ ...l, quantidade, prioridade, observacao: partes.join(" "), percentualDaMeta: l.cobertura === null || p.diasCobertura < 1 ? null : Math.round((l.cobertura / p.diasCobertura) * 100), status }];
  }).sort((a, b) => a.prioridade.localeCompare(b.prioridade) || a.nome.localeCompare(b.nome, "pt-BR"));
}

// A meta fica no navegador (demonstração), como as outras configurações.
type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHAVE_META = "gemape-demo-epi-meta-cobertura";
const ehMeta = (v: number): v is MetaCobertura => (METAS_COBERTURA as readonly number[]).includes(v);

export function lerMetaCobertura(storage: StorageLike = localStorage): MetaCobertura {
  try {
    const n = Number(storage.getItem(CHAVE_META));
    return ehMeta(n) ? n : META_COBERTURA_PADRAO;
  } catch {
    return META_COBERTURA_PADRAO;
  }
}

export function salvarMetaCobertura(meta: number, storage: StorageLike = localStorage): void {
  if (!ehMeta(meta)) throw new Error("A meta de cobertura é 30, 60, 90, 120 ou 180 dias.");
  storage.setItem(CHAVE_META, String(meta));
}
