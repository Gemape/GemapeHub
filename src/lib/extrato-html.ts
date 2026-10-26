// HTML do extrato do veículo (decisão 57) e do equipamento, aberto no visualizador do sistema para imprimir ou salvar em PDF, no padrão visual dos
// relatórios (relatorio-padrao.ts). Só monta o texto: as contas (km atual, média, custos, sugestões) vêm prontas da tela. Todo texto passa por escaparHtml.
import { escaparHtml } from "./gemape.ts";
import { cabecalhoRelatorio, campoRelatorio, paginaRelatorio } from "./relatorio-padrao.ts";

// Célula comum (texto) ou situação com ponto colorido, como nos indicadores da tela.
export type Cor = "vermelho" | "amarelo" | "verde" | "cinza";
export type Celula = string | { texto: string; cor: Cor };
export type TabelaExtrato = { titulo: string; colunas: { titulo: string; direita?: boolean }[]; linhas: Celula[][]; vazio: string; nota?: string };

export type DadosExtrato = {
  titulo: string;
  assunto: string;
  subtitulo?: string;
  empresa: string;
  // Quadros de resumo do topo (rótulo e valor), em até três colunas.
  // O terceiro item colore o valor do quadro (ex.: preventivas vencidas em vermelho).
  resumo: [string, string, Cor?][];
  tabelas: TabelaExtrato[];
  geradoEm?: Date | string;
};

const COR: Record<Cor, string> = { vermelho: "#dc2626", amarelo: "#d97706", verde: "#15803d", cinza: "#64748b" };
const celula = (c: Celula, classe: string) => {
  if (typeof c === "string") return `<td${classe}>${escaparHtml(c)}</td>`;
  const negrito = c.cor === "vermelho" || c.cor === "amarelo" ? "font-weight: bold;" : "";
  return `<td${classe}><span class="ponto" style="background: ${COR[c.cor]};"></span><span style="color: ${COR[c.cor]}; ${negrito}">${escaparHtml(c.texto)}</span></td>`;
};
const tabela = (t: TabelaExtrato) => {
  const direita = (n: number) => (t.colunas[n]?.direita ? ' class="num"' : "");
  const corpo = t.linhas.length === 0
    ? `<tr><td colspan="${t.colunas.length}" class="vazio">${escaparHtml(t.vazio)}</td></tr>`
    : t.linhas.map((l) => `<tr>${l.map((v, n) => celula(v, direita(n))).join("")}</tr>`).join("");
  return `<h3>${escaparHtml(t.titulo)}</h3>
    <table class="padrao"><thead><tr>${t.colunas.map((c) => `<th${c.direita ? ' class="num"' : ""}>${escaparHtml(c.titulo)}</th>`).join("")}</tr></thead><tbody>${corpo}</tbody></table>
    ${t.nota ? `<p class="nota">${escaparHtml(t.nota)}</p>` : ""}`;
};

export function montarExtratoHtml(d: DadosExtrato): string {
  return paginaRelatorio({
    titulo: `${d.titulo} - ${d.assunto}`,
    ...(d.geradoEm ? { geradoEm: d.geradoEm } : {}),
    cabecalho: cabecalhoRelatorio({ titulo: d.titulo, subtitulos: [d.assunto, d.subtitulo], empresa: d.empresa }),
    larga: true,
    css: ".nota { font-size: 8pt; color: #64748b; margin: 4px 0 0; } .ponto { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: -1px; } .grade .campo.vermelho .conteudo { color: #dc2626; }",
    corpo: `
      <div class="grade">
        ${d.resumo.map(([r, v, cor]) => (cor ? campoRelatorio(r, v).replace('class="campo"', `class="campo ${cor}"`) : campoRelatorio(r, v))).join("")}
      </div>
      ${d.tabelas.map(tabela).join("")}`,
  });
}
