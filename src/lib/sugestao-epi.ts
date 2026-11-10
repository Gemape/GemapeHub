// Sugestão de compra de EPI (decisão 330): para comprar, o estoque de novos e de usados é um só. Cada EPI tem o estoque novo, o usado e o total, a média de consumo mensal, o tempo de
// cobertura e o status de criticidade pelos parâmetros de Parâmetros > EPI > Parâmetros Específicos. Daqui sai também a lista do relatório Cotação de preços (PDF ou Excel).
import { escaparHtml } from "./gemape.ts";
import {
  statusDeCriticidade,
  STATUS_CRITICIDADE,
  type ParametrosCompraEpi,
  type StatusCriticidade,
} from "./epi-parametros.ts";
import type { LinhaControle } from "./epi-controle-estoque.ts";
import { montarRelatorioTabelaHtml } from "./relatorio-padrao.ts";

export type ItemDaSugestao = {
  id: string;
  codigo_sku: string;
  nome: string;
  empresa_id: string | null;
  ca?: string | null;
  subcategoria_id?: string | null;
  estoque_atual?: number | null;
  estoque_minimo?: number | null;
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

export const STATUS_QUE_PEDEM_COMPRA: readonly StatusCriticidade[] = [
  "ruptura",
  "comprar_ja",
  "planejar",
];

// Com o tempo de cobertura, o status é o da tabela de criticidade (TC contra o prazo de reposição). Com o estoque mínimo: sem estoque é Ruptura, abaixo do mínimo é Comprar já, no
// mínimo é Planejar, e acima dele é Estável (ou Excesso, se a cobertura passa do limite).
export function statusDoItemEpi(
  l: { total: number; minimo: number; cobertura: number | null },
  p: ParametrosCompraEpi,
): StatusCriticidade | null {
  if (p.metodo === "cobertura")
    return l.cobertura === null
      ? l.total < l.minimo
        ? "ruptura"
        : null
      : statusDeCriticidade(l.cobertura, p);
  if (l.total <= 0) return "ruptura";
  if (l.total < l.minimo) return "comprar_ja";
  if (l.minimo > 0 && l.total === l.minimo) return "planejar";
  return l.cobertura !== null && l.cobertura > p.limiteExcesso ? "excesso" : "estavel";
}

// A quantidade cobre o consumo do prazo de reposição mais a cobertura desejada (ou o mínimo), menos o que já há; só para o item que pede compra.
export function quantidadeParaComprar(
  l: { total: number; minimo: number; mediaMensal: number; status: StatusCriticidade | null },
  p: ParametrosCompraEpi,
): number {
  if (!l.status || !STATUS_QUE_PEDEM_COMPRA.includes(l.status)) return 0;
  const porDia = l.mediaMensal / 30;
  const alvo =
    p.metodo === "minimo"
      ? l.minimo + porDia * p.prazoReposicao
      : Math.max(porDia * (p.diasCobertura + p.prazoReposicao), l.minimo);
  return Math.max(1, Math.ceil(Math.round((alvo - l.total) * 1e6) / 1e6));
}

export function linhasDaSugestaoEpi(e: {
  itens: ItemDaSugestao[];
  controle: LinhaControle[];
  parametros: ParametrosCompraEpi;
  totalDe?: (item: ItemDaSugestao) => number;
  tamanhoDe?: (item: ItemDaSugestao) => string;
  // Unidades usadas do EPI, as mesmas que a aba Estoque mostra (vêm das devoluções); sem a função, nenhuma.
  usadosDe?: (item: ItemDaSugestao) => number;
  // Estoque mínimo do EPI (a soma dos mínimos por tamanho, quando o item os usa); sem a função, o estoque_minimo do item.
  minimoDe?: (item: ItemDaSugestao) => number;
}): LinhaSugestaoEpi[] {
  const controle = new Map(e.controle.map((l) => [l.itemId, l]));
  return e.itens
    .filter((i) => controle.has(i.id))
    .map((item) => {
      const c = controle.get(item.id)!;
      const total = Math.max(0, e.totalDe ? e.totalDe(item) : Number(item.estoque_atual) || 0);
      const usados = Math.min(total, Math.max(0, e.usadosDe?.(item) ?? 0));
      const minimo = Math.max(0, e.minimoDe ? e.minimoDe(item) : Number(item.estoque_minimo) || 0);
      // A média do período observado (decisão 372); linhas de controle antigas, sem ela, usam a anual.
      const mediaMensal = c.mediaMensal ?? c.consumoAnual;
      // Do total mostrado (que pode diferir do estoque gravado do item), não do estoque do controle.
      const cobertura = mediaMensal > 0 ? Math.round(total / (mediaMensal / 30)) : null;
      const status = statusDoItemEpi({ total, minimo, cobertura }, e.parametros);
      const tamanho = e.tamanhoDe?.(item) ?? "";
      return {
        itemId: item.id,
        codigo: item.codigo_sku,
        descricao: tamanho ? `${item.nome} · Tamanho ${tamanho}` : item.nome,
        empresaId: item.empresa_id,
        subcategoriaId: item.subcategoria_id ?? null,
        ca: item.ca ?? null,
        novos: total - usados,
        usados,
        total,
        minimo,
        mediaMensal,
        cobertura,
        status,
        quantidadeSugerida: quantidadeParaComprar(
          { total, minimo, mediaMensal, status },
          e.parametros,
        ),
      };
    });
}

const norm = (t: string | null | undefined) =>
  (t ?? "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[̀-ͯ]/g, "");

export function filtrarSugestaoEpi<T extends Pick<LinhaSugestaoEpi, "empresaId" | "codigo" | "descricao"> & { ca?: string | null }>(
  linhas: T[],
  f: { empresaId?: string; palavra?: string },
): T[] {
  const palavra = norm(f.palavra).trim();
  return linhas.filter(
    (l) =>
      (!f.empresaId || l.empresaId === f.empresaId) &&
      (!palavra || norm(`${l.codigo} ${l.descricao} ${l.ca ?? ""}`).includes(palavra)),
  );
}

// Critérios do relatório: a subcategoria (vazia = todas) e os níveis de criticidade que a pessoa quer comprar.
export function itensDaCotacao(
  linhas: LinhaSugestaoEpi[],
  c: { subcategoriaId: string; niveis: StatusCriticidade[] },
): LinhaSugestaoEpi[] {
  // "sem-subcategoria" é a opção dos EPIs que não têm subcategoria.
  const daSubcategoria = (l: LinhaSugestaoEpi) =>
    !c.subcategoriaId ||
    (c.subcategoriaId === "sem-subcategoria"
      ? l.subcategoriaId === null
      : l.subcategoriaId === c.subcategoriaId);
  return linhas.filter(
    (l) => daSubcategoria(l) && l.status !== null && c.niveis.includes(l.status),
  );
}

export type LinhaCotacao = {
  codigo: string;
  descricao: string;
  ca: string;
  empresa: string;
  quantidade: number;
  estoque: number;
  status: string;
};
const COLUNAS_COTACAO = [
  "Código",
  "Descrição",
  "CA",
  "Empresa",
  "Quantidade a cotar",
  "Estoque atual",
  "Criticidade",
  "Preço unitário (R$)",
  "Prazo de entrega (dias)",
];
// Uniforme não tem CA: a cotação dele sai sem essa coluna (índice 2).
const semCaDe = <T,>(celulas: T[], comCa: boolean): T[] => (comCa ? celulas : celulas.filter((_, n) => n !== 2));
const celulasCotacao = (l: LinhaCotacao): string[] => [
  l.codigo,
  l.descricao,
  l.ca || "—",
  l.empresa,
  String(l.quantidade),
  String(l.estoque),
  l.status,
  "",
  "",
];

// PDF (visualizador do sistema): a lista com as duas últimas colunas em branco, para o fornecedor preencher o preço e o prazo.
export function montarCotacaoHtml(d: {
  linhas: LinhaCotacao[];
  criterio: string;
  empresa?: string;
  geradoEm?: Date | string;
  comCa?: boolean;
}): string {
  const comCa = d.comCa ?? true;
  return montarRelatorioTabelaHtml({
    titulo: "Cotação de preços",
    subtitulos: [d.criterio],
    ...(d.empresa ? { empresa: d.empresa } : {}),
    resumo: [
      ["Itens", String(d.linhas.length)],
      ["Unidades a cotar", String(d.linhas.reduce((t, l) => t + l.quantidade, 0))],
    ],
    colunas: COLUNAS_COTACAO.map((titulo, n) => ({ titulo, direita: n === 4 || n === 5 })).filter((_, n) => comCa || n !== 2),
    linhas: d.linhas.map((l) => semCaDe(celulasCotacao(l), comCa)),
    vazio: "Nenhum item selecionado.",
    ...(d.geradoEm ? { geradoEm: d.geradoEm } : {}),
  });
}

// Excel: tabela HTML salva como .xls, que o Excel abre direto (sem biblioteca); o texto passa por escaparHtml.
export function montarCotacaoExcel(linhas: LinhaCotacao[], comCa = true): string {
  const cabecalho = `<tr>${semCaDe(COLUNAS_COTACAO, comCa).map((c) => `<th>${escaparHtml(c)}</th>`).join("")}</tr>`;
  const corpo = linhas
    .map(
      (l) =>
        `<tr>${semCaDe(celulasCotacao(l), comCa)
          .map((v) => `<td>${escaparHtml(/^\s*[=+@-]/.test(v) ? `'${v}` : v)}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  return `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><title>Cotação de preços</title></head><body><table border="1">${cabecalho}${corpo}</table></body></html>`;
}

export const rotuloDoStatus = (s: StatusCriticidade | null) =>
  s ? STATUS_CRITICIDADE[s].rotulo : "Sem consumo";

// Os itens no mínimo ou abaixo (decisões 410 e 417), com a mesma regra da aba Estoque: saldo menor ou igual ao mínimo (sem mínimo, só o saldo zerado). Do mais distante do mínimo para o mais perto.
export const abaixoDoMinimo = <T extends Pick<LinhaSugestaoEpi, "total" | "minimo" | "descricao">>(linhas: T[]): T[] =>
  linhas
    .filter((l) => l.total <= l.minimo)
    .sort((a, b) => (a.minimo > 0 ? a.total / a.minimo : 0) - (b.minimo > 0 ? b.total / b.minimo : 0) || a.descricao.localeCompare(b.descricao, "pt-BR"));

// Os itens que pedem compra, do mais crítico ao menos: ruptura, comprar já e planejar; no mesmo status, o de menor cobertura primeiro.
export function itensQuePedemCompra(linhas: LinhaSugestaoEpi[]): LinhaSugestaoEpi[] {
  const ordem = (l: LinhaSugestaoEpi) => (l.status ? STATUS_QUE_PEDEM_COMPRA.indexOf(l.status) : 99);
  return linhas
    .filter((l) => l.status !== null && STATUS_QUE_PEDEM_COMPRA.includes(l.status))
    .sort((a, b) => ordem(a) - ordem(b) || (a.cobertura ?? Infinity) - (b.cobertura ?? Infinity) || a.descricao.localeCompare(b.descricao, "pt-BR"));
}
