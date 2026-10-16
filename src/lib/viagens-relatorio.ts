// Relatório de Viagens (dec 180): despesas lançadas pelos empregados num período, com quadro por tipo, assinaturas e
// os comprovantes (1, 2 ou 4 por página). Abre no visualizador do sistema para imprimir ou salvar em PDF; todo texto
// informado passa por escaparHtml. Fase 1: lê os lançamentos do navegador (modo demonstração).
import { escaparHtml } from "./gemape.ts";
import type { RespostaRegistrada } from "./respostas-despesas.ts";
import { dadosDoLancamento, formatarMoeda, SEM_CLIENTE_VINCULADO } from "./viagens.ts";

export type FiltroRelatorio = { empregado: string | null; de: string; ate: string };
export type ComprovantesPorPagina = 1 | 2 | 4;

export type LinhaRelatorio = {
  data: string;
  tipo: string;
  cliente: string | null;
  responsavel: string | null;
  descricao: string | null;
  valor: number | null;
  imagens: { nome: string; dataUrl: string }[];
};

const dataBr = (iso: string): string => iso.split("-").reverse().join("/");

// Lançamentos do período (pela data da despesa; sem ela, pela do registro), de um empregado ou de todos, em ordem de ocorrência.
export function linhasDoRelatorio(lista: readonly RespostaRegistrada[], f: FiltroRelatorio): LinhaRelatorio[] {
  return lista
    .map((r) => ({ r, d: dadosDoLancamento(r) }))
    .map(({ r, d }) => ({ r, d, data: d.dataDespesa ?? r.data }))
    .filter(({ d, data }) => data >= f.de && data <= f.ate && (f.empregado === null || d.responsavel === f.empregado))
    .sort((a, b) => a.data.localeCompare(b.data) || a.r.hora.localeCompare(b.r.hora) || a.r.id.localeCompare(b.r.id))
    .map(({ r, d, data }) => ({
      data, tipo: d.tipo, cliente: d.cliente, responsavel: d.responsavel, descricao: d.descricao, valor: d.valor,
      imagens: r.itens.flatMap((i) => i.imagens ?? []).filter((i) => i.dataUrl.startsWith("data:image/")),
    }));
}

// Linhas do relatório de despesas escolhidas pelo id (relatório salvo), em ordem de ocorrência.
export function linhasDasDespesas(lista: readonly RespostaRegistrada[], ids: readonly string[]): LinhaRelatorio[] {
  const escolhidas = new Set(ids);
  const itens = lista.filter((r) => escolhidas.has(r.id));
  const datas = itens.map((r) => dadosDoLancamento(r).dataDespesa ?? r.data).sort();
  if (itens.length === 0) return [];
  return linhasDoRelatorio(itens, { empregado: null, de: datas[0]!, ate: datas[datas.length - 1]! });
}

// Clientes visitados no período, sem repetir e em ordem alfabética.
export const clientesVisitados = (linhas: readonly LinhaRelatorio[]): string[] =>
  [...new Set(linhas.map((l) => l.cliente).filter((c): c is string => !!c && c !== SEM_CLIENTE_VINCULADO))].sort((a, b) => a.localeCompare(b, "pt-BR"));

export type TotalPorTipo = { tipo: string; quantidade: number; total: number };
export function totaisPorTipo(linhas: readonly LinhaRelatorio[]): TotalPorTipo[] {
  const mapa = new Map<string, TotalPorTipo>();
  for (const l of linhas) {
    const atual = mapa.get(l.tipo) ?? { tipo: l.tipo, quantidade: 0, total: 0 };
    atual.quantidade += 1;
    atual.total += l.valor ?? 0;
    mapa.set(l.tipo, atual);
  }
  return [...mapa.values()].sort((a, b) => a.tipo.localeCompare(b.tipo, "pt-BR"));
}

export const SEM_TECNICO = "Sem técnico responsável";
export type TotalPorTecnico = { tecnico: string; quantidade: number; total: number };
// Gasto por técnico responsável (relatório de todos os empregados); lançamento sem responsável fica em SEM_TECNICO, por último.
export function totaisPorTecnico(linhas: readonly LinhaRelatorio[]): TotalPorTecnico[] {
  const mapa = new Map<string, TotalPorTecnico>();
  for (const l of linhas) {
    const tecnico = l.responsavel?.trim() || SEM_TECNICO;
    const atual = mapa.get(tecnico) ?? { tecnico, quantidade: 0, total: 0 };
    atual.quantidade += 1;
    atual.total += l.valor ?? 0;
    mapa.set(tecnico, atual);
  }
  const peso = (t: string) => (t === SEM_TECNICO ? 1 : 0);
  return [...mapa.values()].sort((a, b) => peso(a.tecnico) - peso(b.tecnico) || a.tecnico.localeCompare(b.tecnico, "pt-BR"));
}

// Alturas aproximadas em milímetros para distribuir o conteúdo nas páginas A4 (estimativa com folga).
const ALTURA_UTIL = 250;
const H = { cabecalho: 48, linhaClientes: 5, blocoClientes: 14, tituloTabela: 10, linha: 6.8, linhaDescricao: 4.6, tituloQuadro: 14, linhaQuadro: 6.4, assinaturas: 42 };
const linhasDeTexto = (texto: string, porLinha: number) => Math.max(1, Math.ceil(texto.length / porLinha));

export type DadosRelatorio = {
  empresa: string;
  empregado: string | null;
  de: string;
  ate: string;
  linhas: LinhaRelatorio[];
  comprovantesPorPagina: ComprovantesPorPagina;
  supervisor: string;
  diretor: string;
  conferido?: string;
  emitente: string;
  geradoEm: string;
  logoUrl: string;
};

const TZ = "America/Sao_Paulo";
const dois = (n: number) => String(n).padStart(2, "0");

export function montarRelatorioViagensHtml(d: DadosRelatorio): string {
  const clientes = clientesVisitados(d.linhas);
  const totais = totaisPorTipo(d.linhas);
  const todos = d.empregado === null;
  const porTecnico = todos ? totaisPorTecnico(d.linhas) : [];
  const totalGeral = d.linhas.reduce((s, l) => s + (l.valor ?? 0), 0);
  const moeda = (v: number | null) => (v === null ? "—" : escaparHtml(formatarMoeda(v)));
  const quando = new Date(d.geradoEm).toLocaleString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(", ", " ");

  const cabecalho = `
    <div class="cabecalho">
      <img class="logo" src="${escaparHtml(d.logoUrl)}" alt="Logomarca" />
      <div class="titulos">
        <div class="titulo">Relatório de Viagens</div>
        <div class="sub">${escaparHtml(d.empregado ?? "Todos os empregados")}</div>
        <div class="sub">Período: ${escaparHtml(dataBr(d.de))} a ${escaparHtml(dataBr(d.ate))}</div>
      </div>
      <div class="empresa">${escaparHtml(d.empresa)}</div>
    </div>`;
  const blocoClientes = `
    <div class="clientes"><strong>Clientes visitados:</strong> ${clientes.length ? escaparHtml(clientes.join(" · ")) : `<em>Clientes não informados</em>`}</div>${d.conferido ? `<div class="clientes"><strong>Conferido:</strong> ${escaparHtml(d.conferido)}</div>` : ""}`;
  const topoTabela = `<table class="despesas"><thead><tr><th>Data</th><th>Tipo</th>${todos ? "<th>Técnico</th>" : ""}<th>Cliente</th><th class="valor">Valor</th></tr></thead><tbody>`;
  const linhaHtml = (l: LinhaRelatorio) => `
    <tr><td>${escaparHtml(dataBr(l.data))}</td><td>${escaparHtml(l.tipo)}</td>${todos ? `<td>${escaparHtml(l.responsavel?.trim() || SEM_TECNICO)}</td>` : ""}<td>${l.cliente ? escaparHtml(l.cliente) : "<em>Não informado</em>"}</td><td class="valor">${moeda(l.valor)}</td></tr>${l.descricao ? `<tr class="desc"><td colspan="${todos ? 5 : 4}">${escaparHtml(l.descricao)}</td></tr>` : ""}`;
  // Cliente e tipo longos quebram em mais de uma linha: a altura estimada acompanha a coluna que mais quebra.
  const alturaLinha = (l: LinhaRelatorio) => {
    const linhasPrincipais = Math.max(1, Math.ceil((l.cliente ?? "Não informado").length / 30), Math.ceil(l.tipo.length / 22), todos ? Math.ceil((l.responsavel?.trim() || SEM_TECNICO).length / 22) : 1);
    return H.linha + H.linhaDescricao * (linhasPrincipais - 1) + (l.descricao ? H.linhaDescricao * linhasDeTexto(l.descricao, 80) : 0);
  };

  const quadro = totais.length === 0 ? "" : `
    <div class="quadro"><h3>Total por tipo de despesa</h3>
      <table><thead><tr><th>Tipo</th><th class="num">Lançamentos</th><th class="valor">Total</th></tr></thead><tbody>
        ${totais.map((t) => `<tr><td>${escaparHtml(t.tipo)}</td><td class="num">${t.quantidade}</td><td class="valor">${moeda(t.total)}</td></tr>`).join("")}
        <tr class="geral"><td>Total geral</td><td class="num">${d.linhas.length}</td><td class="valor">${moeda(totalGeral)}</td></tr>
      </tbody></table></div>`;
  const quadroTecnico = porTecnico.length === 0 ? "" : `
    <div class="quadro"><h3>Gasto por técnico responsável</h3>
      <table><thead><tr><th>Técnico responsável</th><th class="num">Lançamentos</th><th class="valor">Total</th></tr></thead><tbody>
        ${porTecnico.map((t) => `<tr><td>${escaparHtml(t.tecnico)}</td><td class="num">${t.quantidade}</td><td class="valor">${moeda(t.total)}</td></tr>`).join("")}
        <tr class="geral"><td>Total geral</td><td class="num">${d.linhas.length}</td><td class="valor">${moeda(totalGeral)}</td></tr>
      </tbody></table></div>`;
  const assinatura = (rotulo: string, nome: string) => `<div class="assina"><div class="traco"></div><div class="nome">${escaparHtml(nome || "—")}</div><div class="papel">${escaparHtml(rotulo)}</div></div>`;
  const assinaturas = `<div class="assinaturas">${assinatura("Emitente", d.emitente)}${assinatura("Supervisor", d.supervisor)}${assinatura("Diretor", d.diretor)}</div>`;

  // Distribui o cabeçalho, as despesas, o quadro e as assinaturas nas páginas; linha e bloco nunca ficam cortados.
  const paginas: string[] = [];
  let atual = cabecalho + blocoClientes;
  let usado = H.cabecalho + H.blocoClientes + (d.conferido ? H.linhaClientes : 0) + H.linhaClientes * linhasDeTexto(clientes.join(" · "), 95);
  const fechar = () => { paginas.push(atual); atual = ""; usado = 0; };
  if (d.linhas.length === 0) {
    atual += `<p class="vazio">Nenhuma despesa lançada no período.</p>`;
    usado += 12;
  } else {
    atual += topoTabela;
    usado += H.tituloTabela;
    for (const l of d.linhas) {
      const altura = alturaLinha(l);
      if (usado + altura > ALTURA_UTIL) {
        atual += "</tbody></table>";
        fechar();
        atual = `${topoTabela}`;
        usado = H.tituloTabela;
      }
      atual += linhaHtml(l);
      usado += altura;
    }
    atual += "</tbody></table>";
    const alturaQuadro = H.tituloQuadro + H.linhaQuadro * (totais.length + 2);
    if (usado + alturaQuadro > ALTURA_UTIL) fechar();
    atual += quadro;
    usado += alturaQuadro;
    if (quadroTecnico) {
      const alturaTecnico = H.tituloQuadro + H.linhaQuadro * (porTecnico.length + 2);
      if (usado + alturaTecnico > ALTURA_UTIL) fechar();
      atual += quadroTecnico;
      usado += alturaTecnico;
    }
  }
  if (usado + H.assinaturas > ALTURA_UTIL) fechar();
  atual += assinaturas;
  fechar();

  // Comprovantes na ordem das despesas, 1, 2 ou 4 por página.
  const comprovantes = d.linhas.flatMap((l) => l.imagens.map((i) => ({ i, legenda: `${dataBr(l.data)} · ${l.tipo}${l.cliente ? ` · ${l.cliente}` : ""}${l.valor !== null ? ` · ${formatarMoeda(l.valor)}` : ""}` })));
  for (let i = 0; i < comprovantes.length; i += d.comprovantesPorPagina) {
    const grupo = comprovantes.slice(i, i + d.comprovantesPorPagina);
    paginas.push(`<h3 class="titulo-comprovantes">Comprovantes</h3><div class="comprovantes c${d.comprovantesPorPagina}">${grupo
      .map((c) => `<figure><img src="${escaparHtml(c.i.dataUrl)}" alt="${escaparHtml(c.i.nome)}" /><figcaption>${escaparHtml(c.legenda)}</figcaption></figure>`).join("")}</div>`);
  }

  const total = paginas.length;
  const corpo = paginas
    .map((conteudo, n) => `<section class="pagina">${conteudo}<div class="rodape"><span>Emitido em ${escaparHtml(quando)}</span><span>${dois(n + 1)}/${dois(total)}</span></div></section>`)
    .join("");

  return `
    <html>
      <head>
        <title>Relatório de Viagens</title>
        <style>
          @page { size: A4; margin: 0; }
          * { box-sizing: border-box; }
          body { margin: 0; background: #e2e8f0; font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 10pt; }
          .pagina { position: relative; width: 210mm; height: 297mm; margin: 8px auto; padding: 12mm 14mm 18mm; background: #fff; overflow: hidden; page-break-after: always; }
          .cabecalho { display: grid; grid-template-columns: 46mm 1fr 46mm; align-items: center; gap: 8px; border-bottom: 3px solid #0A007C; padding-bottom: 8px; margin-bottom: 10px; }
          .logo { max-width: 46mm; max-height: 26mm; object-fit: contain; }
          .titulos { text-align: center; }
          .titulo { font-size: 17pt; font-weight: bold; color: #0A007C; text-transform: uppercase; letter-spacing: .02em; }
          .sub { font-size: 10pt; color: #334155; margin-top: 2px; }
          .empresa { font-size: 8pt; color: #64748b; text-align: right; }
          .clientes { background: #f1f5f9; border-radius: 6px; padding: 6px 10px; margin-bottom: 10px; font-size: 9pt; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #0A007C; color: #fff; font-size: 8.5pt; text-align: left; padding: 5px 6px; }
          td { padding: 4px 6px; border-bottom: 1px solid #e2e8f0; font-size: 9pt; vertical-align: top; }
          .valor { text-align: right; white-space: nowrap; }
          .num { text-align: right; }
          tr.desc td { color: #64748b; font-size: 8pt; border-bottom: 1px solid #e2e8f0; padding-top: 0; }
          .quadro { margin-top: 12px; }
          .quadro h3 { margin: 0 0 6px; font-size: 11pt; color: #0A007C; }
          tr.geral td { font-weight: bold; background: #f1f5f9; }
          .assinaturas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14mm; margin-top: 14mm; }
          .assina { text-align: center; }
          .traco { border-top: 1px solid #1e293b; margin-bottom: 3px; }
          .nome { font-weight: bold; font-size: 9.5pt; }
          .papel { font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: .06em; }
          .vazio { text-align: center; color: #64748b; font-style: italic; padding: 16px; }
          .titulo-comprovantes { margin: 0 0 8px; font-size: 12pt; color: #0A007C; }
          .comprovantes { display: grid; gap: 8mm; height: 245mm; }
          .comprovantes.c1 { grid-template-columns: 1fr; grid-template-rows: 1fr; }
          .comprovantes.c2 { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; }
          .comprovantes.c4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
          figure { margin: 0; display: flex; flex-direction: column; min-height: 0; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px; }
          figure img { flex: 1; min-height: 0; width: 100%; object-fit: contain; }
          figcaption { font-size: 8pt; color: #475569; text-align: center; padding-top: 3px; }
          .rodape { position: absolute; left: 14mm; right: 14mm; bottom: 8mm; display: flex; justify-content: space-between; color: #64748b; font-size: 8pt; border-top: 1px solid #e2e8f0; padding-top: 4px; }
          @media print { body { background: #fff; } .pagina { margin: 0; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none; } }
        </style>
      </head>
      <body>${corpo}</body>
    </html>`;
}
