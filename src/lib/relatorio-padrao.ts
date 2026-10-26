// Padrão visual de todo relatório, check list e termo impresso do sistema (o do Relatório de Viagens): folha A4 com cabeçalho
// (logomarca, título, subtítulos e empresa), tabelas de cabeçalho azul, quadros de resumo e rodapé "Emitido em" com a numeração.
// Só gera texto; todo valor informado passa por escaparHtml antes de chegar aqui.
import { escaparHtml } from "./gemape.ts";

const TZ = "America/Sao_Paulo";

// A logomarca precisa de endereço completo: o relatório abre num visualizador, sem endereço base. Sem navegador (testes), sai sem imagem.
export function logoRelatorio(): string {
  if (typeof window === "undefined") return "";
  const base = (import.meta as { env?: Record<string, string | undefined> }).env?.["BASE_URL"] ?? "/";
  return `${window.location.origin}${base}logo-relatorio-viagens.png`;
}

export function emitidoEm(geradoEm: Date | string = new Date()): string {
  return new Date(geradoEm).toLocaleString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(", ", " ");
}

export const CSS_RELATORIO = `
          @page { size: A4; margin: 12mm 14mm 16mm; @bottom-right { content: counter(page) "/" counter(pages); font-size: 8pt; color: #64748b; } }
          * { box-sizing: border-box; }
          body { margin: 0; background: #e2e8f0; font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 10pt; line-height: 1.35; }
          .folha { width: 210mm; min-height: 297mm; margin: 8px auto; padding: 12mm 14mm 18mm; background: #fff; }
          .cabecalho { display: grid; grid-template-columns: 46mm 1fr 46mm; align-items: center; gap: 8px; border-bottom: 3px solid #0A007C; padding-bottom: 8px; margin-bottom: 10px; }
          .logo { max-width: 46mm; max-height: 26mm; object-fit: contain; }
          .titulos { text-align: center; }
          .titulo { font-size: 17pt; font-weight: bold; color: #0A007C; text-transform: uppercase; letter-spacing: .02em; }
          .sub { font-size: 10pt; color: #334155; margin-top: 2px; }
          .empresa { font-size: 8pt; color: #64748b; text-align: right; }
          .resumo { background: #f1f5f9; border-radius: 6px; padding: 6px 10px; margin-bottom: 10px; font-size: 9pt; }
          .grade { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px; }
          .campo { background: #f1f5f9; border-radius: 8px; padding: 6px 10px; }
          .campo .rotulo { display: block; font-size: 7.5pt; letter-spacing: .08em; text-transform: uppercase; color: #64748b; }
          .campo .conteudo { display: block; font-weight: bold; margin-top: 1px; }
          h2, h3 { color: #0A007C; }
          h2 { font-size: 12pt; margin: 14px 0 6px; }
          h3 { font-size: 11pt; margin: 12px 0 6px; }
          table.padrao { width: 100%; border-collapse: collapse; }
          table.padrao th { background: #0A007C; color: #fff; font-size: 8.5pt; text-align: left; padding: 5px 6px; }
          table.padrao td { padding: 4px 6px; border-bottom: 1px solid #e2e8f0; font-size: 9pt; vertical-align: top; }
          table.padrao tr { page-break-inside: avoid; }
          table.padrao tr.geral td { font-weight: bold; background: #f1f5f9; }
          .valor, .num { text-align: right; white-space: nowrap; }
          /* O cabeçalho da coluna numérica acompanha os valores (a regra th acima é mais específica que .num). */
          table.padrao th.num, table.padrao th.valor, .termo th.num, .termo th.valor { text-align: right; }
          .centro { text-align: center; }
          .vazio { text-align: center; color: #64748b; font-style: italic; padding: 16px; }
          .assinaturas { display: grid; grid-template-columns: repeat(var(--colunas, 2), 1fr); gap: 14mm; margin-top: 18mm; page-break-inside: avoid; }
          .assina { text-align: center; }
          .assina .traco { border-top: 1px solid #1e293b; margin-bottom: 3px; }
          .assina .nome { font-weight: bold; font-size: 9.5pt; }
          .assina .papel { font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: .06em; }
          .rodape { margin-top: 14px; padding-top: 6px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 8pt; text-align: right; }
          .texto p { margin: 0 0 8px; text-align: justify; }
          @media print {
            body { background: #fff; }
            .folha { width: auto; min-height: 0; margin: 0; padding: 0; }
            .no-print { display: none; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }`;

// Na tela, a folha ocupa toda a largura (consulta); ao imprimir continua A4.
export const CSS_LARGO = `
          @media screen {
            body { background: #fff; }
            .folha { width: auto; min-height: 100vh; margin: 0; padding: 8mm 12mm 12mm; }
            .grade { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
          }`;

export function cabecalhoRelatorio(c: { titulo: string; subtitulos?: (string | null | undefined)[]; empresa?: string | null | undefined; logoUrl?: string | undefined }): string {
  const logo = c.logoUrl ?? logoRelatorio();
  return `
    <div class="cabecalho">
      ${logo ? `<img class="logo" src="${escaparHtml(logo)}" alt="Logomarca" />` : "<div></div>"}
      <div class="titulos">
        <div class="titulo">${escaparHtml(c.titulo)}</div>
        ${(c.subtitulos ?? []).filter(Boolean).map((s) => `<div class="sub">${escaparHtml(s)}</div>`).join("")}
      </div>
      <div class="empresa">${escaparHtml(c.empresa ?? "")}</div>
    </div>`;
}

export const campoRelatorio = (rotulo: string, valor: string) => `<div class="campo"><span class="rotulo">${escaparHtml(rotulo)}</span><span class="conteudo">${escaparHtml(valor)}</span></div>`;

export const assinaturaRelatorio = (papel: string, nome = "") => `<div class="assina"><div class="traco"></div>${nome ? `<div class="nome">${escaparHtml(nome)}</div>` : ""}<div class="papel">${escaparHtml(papel)}</div></div>`;

export const BOTAO_IMPRIMIR = (texto = "Imprimir ou salvar em PDF") => `<div class="no-print" style="margin: 16px 0 24px; text-align: center;"><button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">${escaparHtml(texto)}</button></div>`;

// Monta o documento: cabeçalho, corpo e rodapé no padrão. `css` acrescenta só o que é próprio do relatório.
export function paginaRelatorio(p: { titulo: string; cabecalho: string; corpo: string; css?: string; geradoEm?: Date | string; botao?: string; larga?: boolean }): string {
  return `
    <html>
      <head>
        <title>${escaparHtml(p.titulo)}</title>
        <style>${CSS_RELATORIO}
${p.larga ? CSS_LARGO : ""}
${p.css ?? ""}
        </style>
      </head>
      <body>
        <div class="folha">
          ${p.cabecalho}
          ${p.corpo}
          <div class="rodape">Emitido em ${escaparHtml(emitidoEm(p.geradoEm))}</div>
        </div>
        ${p.botao ?? BOTAO_IMPRIMIR()}
      </body>
    </html>`;
}

// Termos e fichas (texto corrido, tabela e assinaturas) usam o mesmo padrão: o conteúdo vem dentro de <div class="termo">.
export const CSS_TERMO = `
          .termo table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          .termo th { background: #0A007C; color: #fff; font-size: 8.5pt; text-align: left; padding: 5px 6px; }
          .termo td { padding: 5px 6px; border-bottom: 1px solid #e2e8f0; font-size: 9pt; vertical-align: top; }
          .termo tr { page-break-inside: avoid; }
          .termo p { margin: 0 0 8px; text-align: justify; }
          .termo .signatures { display: flex; justify-content: space-between; gap: 14mm; margin-top: 18mm; page-break-inside: avoid; }
          .termo .sig-box { flex: 1; border-top: 1px solid #1e293b; text-align: center; padding-top: 4px; font-size: 9.5pt; }
          .termo .total-box { text-align: right; font-weight: bold; font-size: 12pt; margin-top: 10px; }
          .termo .info { background: #f1f5f9; border-radius: 6px; padding: 6px 10px; margin-bottom: 10px; }
          .termo .nota { font-size: 8pt; color: #475569; }`;

// Relatório simples de uma tabela (histórico, baixas): cabeçalho, quadro de resumo, tabela e rodapé no padrão.
export function montarRelatorioTabelaHtml(d: {
  titulo: string;
  subtitulos?: (string | null | undefined)[];
  empresa?: string | null | undefined;
  resumo?: [string, string][];
  colunas: { titulo: string; direita?: boolean }[];
  linhas: string[][];
  vazio: string;
  geradoEm?: Date | string;
}): string {
  const direita = (n: number) => (d.colunas[n]?.direita ? ' class="num"' : "");
  const corpo = d.linhas.length === 0
    ? `<tr><td colspan="${d.colunas.length}" class="vazio">${escaparHtml(d.vazio)}</td></tr>`
    : d.linhas.map((l) => `<tr>${l.map((v, n) => `<td${direita(n)}>${escaparHtml(v)}</td>`).join("")}</tr>`).join("");
  const resumo = d.resumo?.length ? `<div class="resumo">${d.resumo.map(([r, v]) => `<strong>${escaparHtml(r)}:</strong> ${escaparHtml(v)}`).join(" &nbsp;·&nbsp; ")}</div>` : "";
  return paginaRelatorio({
    titulo: d.titulo,
    ...(d.geradoEm ? { geradoEm: d.geradoEm } : {}),
    cabecalho: cabecalhoRelatorio({ titulo: d.titulo, subtitulos: d.subtitulos ?? [], empresa: d.empresa }),
    corpo: `${resumo}<table class="padrao"><thead><tr>${d.colunas.map((c) => `<th${c.direita ? ' class="num"' : ""}>${escaparHtml(c.titulo)}</th>`).join("")}</tr></thead><tbody>${corpo}</tbody></table>`,
  });
}
