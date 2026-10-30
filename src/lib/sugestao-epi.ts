// Sugestão de compra de EPI (decisão 330): para comprar, o estoque de novos e de usados é um só. Cada EPI tem o estoque novo, o usado e o total, a média de consumo mensal, o tempo de
// cobertura e o status de criticidade pelos parâmetros de Parâmetros > EPI > Parâmetros Específicos. Daqui sai também a lista do relatório Cotação de preços (PDF ou Excel).
import { escaparHtml } from "./gemape.ts";
import { statusDeCriticidade, STATUS_CRITICIDADE, type ParametrosCompraEpi, type StatusCriticidade } from "./epi-parametros.ts";
import type { LinhaControle } from "./epi-controle-estoque.ts";
import { montarRelatorioTabelaHtml } from "./relatorio-padrao.ts";

export type ItemDaSugestao = {
  id: string; codigo_sku: string; nome: string; empresa_id: string | null; ca?: string | null; subcategoria_id?: string | null;
  estoque_atual?: number | null; estoque_usado?: number | null; estoque_minimo?: number | null;
};

export type LinhaSugestaoEpi = {
  itemId: string;
  codigo: string;
  descricao: string; // nome do EPI, com o tamanho quando o item é de um tamanho só
  empresaId: string | null;
  subcategoriaId: string | null;
  ca: string | null;
  novos: number;
  usados: number;
  total: number;
  minimo: number;
  mediaMensal: number;
  cobertura: number | null; // dias; null = sem consumo no último ano
  status: StatusCriticidade | null; // null = sem consumo, sem como medir
  quantidadeSugerida: number; // 0 quando o item não pede compra
};

export const STATUS_QUE_PEDEM_COMPRA: readonly StatusCriticidade[] = ["ruptura", "comprar_ja", "planejar"];

// Com o tempo de cobertura, o status é o da tabela de criticidade (TC contra o prazo de reposição). Com o estoque mínimo: sem estoque é Ruptura, abaixo do mínimo é Comprar já, no
// mínimo é Planejar, e acima dele é Estável (ou Excesso, se a cobertura passa do limite).
export function statusDoItemEpi(l: { total: number; minimo: number; cobertura: number | null }, p: ParametrosCompraEpi): StatusCriticidade | null {
  if (p.metodo === "cobertura") return l.cobertura === null ? (l.total < l.minimo ? "ruptura" : null) : statusDeCriticidade(l.cobertura, p);
  if (l.total <= 0) return "ruptura";
  if (l.total < l.minimo) return "comprar_ja";
  if (l.minimo > 0 && l.total === l.minimo) return "planejar";
  return l.cobertura !== null && l.cobertura > p.limiteExcesso ? "excesso" : "estavel";
}

// A quantidade cobre o consumo do prazo de reposição mais a cobertura desejada (ou o mínimo), menos o que já há; só para o item que pede compra.
export function quantidadeParaComprar(l: { total: number; minimo: number; mediaMensal: number; status: StatusCriticidade | null }, p: ParametrosCompraEpi): number {
  if (!l.status || !STATUS_QUE_PEDEM_COMPRA.includes(l.status)) return 0;
  const porDia = l.mediaMensal / 30;
  const alvo = p.metodo === "minimo" ? l.minimo + porDia * p.prazoReposicao : Math.max(porDia * (p.diasCobertura + p.prazoReposicao), l.minimo);
  return Math.max(1, Math.ceil(Math.round((alvo - l.total) * 1e6) / 1e6));
}

export function linhasDaSugestaoEpi(e: {
  itens: ItemDaSugestao[]; controle: LinhaControle[]; parametros: ParametrosCompraEpi;
  totalDe?: (item: ItemDaSugestao) => number; tamanhoDe?: (item: ItemDaSugestao) => string;
}): LinhaSugestaoEpi[] {
  const controle = new Map(e.controle.map((l) => [l.itemId, l]));
  return e.itens.filter((i) => controle.has(i.id)).map((item) => {
    const c = controle.get(item.id)!;
    const total = Math.max(0, e.totalDe ? e.totalDe(item) : Number(item.estoque_atual) || 0);
    const usados = Math.min(total, Math.max(0, Number(item.estoque_usado) || 0));
    const minimo = Number(item.estoque_minimo) || 0;
    const mediaMensal = c.consumoAnual;
    // Do total mostrado (que pode diferir do estoque gravado do item), não do estoque do controle.
    const cobertura = mediaMensal > 0 ? Math.round(total / (mediaMensal / 30)) : null;
    const status = statusDoItemEpi({ total, minimo, cobertura }, e.parametros);
    const tamanho = e.tamanhoDe?.(item) ?? "";
    return {
      itemId: item.id, codigo: item.codigo_sku, descricao: tamanho ? `${item.nome} · Tamanho ${tamanho}` : item.nome, empresaId: item.empresa_id, subcategoriaId: item.subcategoria_id ?? null, ca: item.ca ?? null,
      novos: total - usados, usados, total, minimo, mediaMensal, cobertura, status, quantidadeSugerida: quantidadeParaComprar({ total, minimo, mediaMensal, status }, e.parametros),
    };
  });
}

const norm = (t: string | null | undefined) => (t ?? "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[̀-ͯ]/g, "");

export function filtrarSugestaoEpi(linhas: LinhaSugestaoEpi[], f: { empresaId?: string; palavra?: string }): LinhaSugestaoEpi[] {
  const palavra = norm(f.palavra).trim();
  return linhas.filter((l) => (!f.empresaId || l.empresaId === f.empresaId) && (!palavra || norm(`${l.codigo} ${l.descricao} ${l.ca ?? ""}`).includes(palavra)));
}

// Critérios do relatório: a subcategoria (vazia = todas) e os níveis de criticidade que a pessoa quer comprar.
export function itensDaCotacao(linhas: LinhaSugestaoEpi[], c: { subcategoriaId: string; niveis: StatusCriticidade[] }): LinhaSugestaoEpi[] {
  // "sem-subcategoria" é a opção dos EPIs que não têm subcategoria.
  const daSubcategoria = (l: LinhaSugestaoEpi) => !c.subcategoriaId || (c.subcategoriaId === "sem-subcategoria" ? l.subcategoriaId === null : l.subcategoriaId === c.subcategoriaId);
  return linhas.filter((l) => daSubcategoria(l) && l.status !== null && c.niveis.includes(l.status));
}

export type LinhaCotacao = { codigo: string; descricao: string; ca: string; empresa: string; quantidade: number; estoque: number; status: string };
const COLUNAS_COTACAO = ["Código", "Descrição", "CA", "Empresa", "Quantidade a cotar", "Estoque atual", "Criticidade", "Preço unitário (R$)", "Prazo de entrega (dias)"];
const celulasCotacao = (l: LinhaCotacao): string[] => [l.codigo, l.descricao, l.ca || "—", l.empresa, String(l.quantidade), String(l.estoque), l.status, "", ""];

// PDF (visualizador do sistema): a lista com as duas últimas colunas em branco, para o fornecedor preencher o preço e o prazo.
export function montarCotacaoHtml(d: { linhas: LinhaCotacao[]; criterio: string; empresa?: string; geradoEm?: Date | string }): string {
  return montarRelatorioTabelaHtml({
    titulo: "Cotação de preços",
    subtitulos: [d.criterio],
    ...(d.empresa ? { empresa: d.empresa } : {}),
    resumo: [["Itens", String(d.linhas.length)], ["Unidades a cotar", String(d.linhas.reduce((t, l) => t + l.quantidade, 0))]],
    colunas: COLUNAS_COTACAO.map((titulo, n) => ({ titulo, direita: n === 4 || n === 5 })),
    linhas: d.linhas.map(celulasCotacao),
    vazio: "Nenhum item selecionado.",
    ...(d.geradoEm ? { geradoEm: d.geradoEm } : {}),
  });
}

// Excel: tabela HTML salva como .xls, que o Excel abre direto (sem biblioteca); o texto passa por escaparHtml.
export function montarCotacaoExcel(linhas: LinhaCotacao[]): string {
  const cabecalho = `<tr>${COLUNAS_COTACAO.map((c) => `<th>${escaparHtml(c)}</th>`).join("")}</tr>`;
  const corpo = linhas.map((l) => `<tr>${celulasCotacao(l).map((v) => `<td>${escaparHtml(/^\s*[=+@-]/.test(v) ? `'${v}` : v)}</td>`).join("")}</tr>`).join("");
  return `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><title>Cotação de preços</title></head><body><table border="1">${cabecalho}${corpo}</table></body></html>`;
}

export const rotuloDoStatus = (s: StatusCriticidade | null) => (s ? STATUS_CRITICIDADE[s].rotulo : "Sem consumo");
