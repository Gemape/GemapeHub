import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { ABAS_VIAGEM, abaDoModulo } from "../src/lib/menu-parametros.ts";
import { clientesVisitados, linhasDoRelatorio, montarRelatorioViagensHtml, totaisPorTipo } from "../src/lib/viagens-relatorio.ts";

const IMG = "data:image/webp;base64,AAAA";
let n = 0;
const lanc = ({ tipo = "Pedágio", data = "05/10/2026", hora = "10:00", quem = "Roberto (Oficina)", cliente, descricao, valor = "100,00", imagens = 0 } = {}) => {
  n += 1;
  const itens = [["q-04", quem], ["q-08", data], ["q-11", valor], ...(cliente ? [["q-07", cliente]] : []), ...(descricao ? [["q-09", descricao]] : [])]
    .map(([perguntaId, resposta]) => ({ perguntaId, titulo: perguntaId, resposta }));
  if (imagens) itens.push({ perguntaId: "q-12", titulo: "Foto", resposta: "foto.jpg", imagens: Array.from({ length: imagens }, (_, i) => ({ nome: `c${i}.webp`, dataUrl: IMG })) });
  return { id: `r${n}`, tipo, data: "2026-10-14", hora, itens };
};
const FILTRO = { empregado: null, de: "2026-10-01", ate: "2026-10-31" };
const base = (linhas, extra = {}) => ({
  empresa: "GEMAPE", empregado: null, de: "2026-10-01", ate: "2026-10-31", linhas, comprovantesPorPagina: 4,
  supervisor: "Carlos", diretor: "Marta", emitente: "Ana", geradoEm: "2026-10-14T15:00:00Z", logoUrl: "http://x/logo.png", ...extra,
});
const secoes = (html) => html.split('<section class="pagina">').length - 1;

test("filtro: período pela data da despesa, empregado ou todos, em ordem de ocorrência", () => {
  const lista = [
    lanc({ data: "20/10/2026", hora: "09:00" }), lanc({ data: "05/10/2026", hora: "11:00" }), lanc({ data: "05/10/2026", hora: "08:00" }),
    lanc({ data: "05/09/2026" }), lanc({ data: "06/10/2026", quem: "Wellington (Oficina)" }),
  ];
  const todos = linhasDoRelatorio(lista, FILTRO);
  assert.deepEqual(todos.map((l) => l.data), ["2026-10-05", "2026-10-05", "2026-10-06", "2026-10-20"]);
  assert.equal(linhasDoRelatorio(lista, { ...FILTRO, empregado: "Wellington" }).length, 1);
  assert.equal(linhasDoRelatorio(lista, { ...FILTRO, de: "2026-10-06", ate: "2026-10-06" }).length, 1);
});

test("clientes visitados sem repetir e totais por tipo", () => {
  const linhas = linhasDoRelatorio([
    lanc({ cliente: "Beta Ltda", tipo: "Pedágio", valor: "10,00" }), lanc({ cliente: "Alfa SA", tipo: "Pedágio", valor: "5,50" }),
    lanc({ cliente: "Beta Ltda", tipo: "Hospedagem", valor: "200,00" }), lanc({ tipo: "Hospedagem", valor: "" }),
  ], FILTRO);
  assert.deepEqual(clientesVisitados(linhas), ["Alfa SA", "Beta Ltda"]);
  assert.deepEqual(totaisPorTipo(linhas).map((t) => [t.tipo, t.quantidade, t.total]), [["Hospedagem", 2, 200], ["Pedágio", 2, 15.5]]);
});

test("documento: logo à esquerda, título, empregado ou todos, período, clientes e assinaturas lado a lado", () => {
  const linhas = linhasDoRelatorio([lanc({ cliente: "Alfa SA", descricao: "Almoço" })], FILTRO);
  const html = montarRelatorioViagensHtml(base(linhas));
  assert.match(html, /<img class="logo" src="http:\/\/x\/logo.png"/);
  assert.match(html, /Relatório de Viagens/);
  assert.match(html, /Todos os empregados/);
  assert.match(html, /Período: 01\/10\/2026 a 31\/10\/2026/);
  assert.match(html, /Clientes visitados:<\/strong> Alfa SA/);
  assert.match(html, /grid-template-columns: repeat\(3, 1fr\)/);
  for (const nome of ["Ana", "Carlos", "Marta", "Emitente", "Supervisor", "Diretor"]) assert.match(html, new RegExp(nome));
  assert.match(montarRelatorioViagensHtml(base(linhas, { empregado: "Roberto" })), /<div class="sub">Roberto<\/div>/);
  assert.equal((html.match(/class="assina"/g) ?? []).length, 3);
});

test("sem cliente informado aparece 'Clientes não informados'; sem despesas, mensagem e nenhuma linha em branco", () => {
  const semCliente = montarRelatorioViagensHtml(base(linhasDoRelatorio([lanc()], FILTRO)));
  assert.match(semCliente, /Clientes não informados/);
  const vazio = montarRelatorioViagensHtml(base([]));
  assert.match(vazio, /Nenhuma despesa lançada no período/);
  assert.doesNotMatch(vazio, /<tbody><\/tbody>/);
  assert.doesNotMatch(semCliente, /<tr><td><\/td>/);
});

test("descrição só aparece quando existe e todo texto é escapado", () => {
  const sem = montarRelatorioViagensHtml(base(linhasDoRelatorio([lanc()], FILTRO)));
  assert.doesNotMatch(sem, /class="desc"/);
  const com = montarRelatorioViagensHtml(base(linhasDoRelatorio([lanc({ descricao: "<b>x</b>", cliente: "A&B" })], FILTRO), { supervisor: '"><script>' }));
  assert.match(com, /class="desc"/);
  assert.doesNotMatch(com, /<b>x<\/b>|<script>/);
  assert.match(com, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.match(com, /A&amp;B/);
});

test("quadro por tipo com total geral e valor em reais", () => {
  const html = montarRelatorioViagensHtml(base(linhasDoRelatorio([lanc({ tipo: "Pedágio", valor: "10,00" }), lanc({ tipo: "Hospedagem", valor: "1.200,50" })], FILTRO)));
  assert.match(html, /Total por tipo de despesa/);
  assert.match(html, /Total geral/);
  assert.match(html, /R\$\s1\.210,50/);
});

test("muitas despesas viram várias páginas numeradas 01/NN, com cabeçalho só na primeira e nenhuma linha cortada", () => {
  const linhas = linhasDoRelatorio(Array.from({ length: 70 }, (_, i) => lanc({ descricao: i % 3 === 0 ? "Descrição um pouco mais longa do gasto do dia ".repeat(2) : undefined })), FILTRO);
  const html = montarRelatorioViagensHtml(base(linhas));
  const total = secoes(html);
  assert.ok(total >= 3);
  assert.match(html, new RegExp(`01/${String(total).padStart(2, "0")}`));
  assert.match(html, new RegExp(`${String(total).padStart(2, "0")}/${String(total).padStart(2, "0")}`));
  assert.equal((html.match(/class="cabecalho"/g) ?? []).length, 1);
  assert.equal((html.match(/<tr><td>05\/10\/2026/g) ?? []).length, 70);
  assert.equal((html.match(/class="assinaturas"/g) ?? []).length, 1);
});

test("página única quando cabe: 01/01", () => {
  const html = montarRelatorioViagensHtml(base(linhasDoRelatorio([lanc()], FILTRO)));
  assert.equal(secoes(html), 1);
  assert.match(html, /01\/01/);
});

test("comprovantes em sequência, 4, 2 ou 1 por página, na ordem do relatório", () => {
  const linhas = linhasDoRelatorio([lanc({ imagens: 2, data: "06/10/2026" }), lanc({ imagens: 3, data: "05/10/2026" })], FILTRO);
  const figuras = (h) => (h.match(/<figure>/g) ?? []).length;
  for (const [porPagina, paginasComprovantes] of [[4, 2], [2, 3], [1, 5]]) {
    const html = montarRelatorioViagensHtml(base(linhas, { comprovantesPorPagina: porPagina }));
    assert.equal(figuras(html), 5);
    assert.equal((html.match(/class="comprovantes c/g) ?? []).length, paginasComprovantes);
    assert.match(html, new RegExp(`class="comprovantes c${porPagina}"`));
    assert.equal(secoes(html), 1 + paginasComprovantes);
  }
  const html = montarRelatorioViagensHtml(base(linhas));
  assert.ok(html.indexOf("05/10/2026 · Pedágio") < html.indexOf("06/10/2026 · Pedágio", html.indexOf("<figure>")));
});

test("só imagens de verdade entram nos comprovantes", () => {
  const l = lanc({ imagens: 1 });
  l.itens.find((i) => i.imagens).imagens.push({ nome: "x", dataUrl: "javascript:alert(1)" });
  const linhas = linhasDoRelatorio([l], FILTRO);
  assert.equal(linhas[0].imagens.length, 1);
});

test("menu Viagens ganha o submenu Relatório e a tela usa o visualizador do sistema", () => {
  assert.deepEqual(ABAS_VIAGEM.map((a) => a.aba), ["painel", "relatorio"]);
  assert.equal(abaDoModulo("viagem", "relatorio"), "relatorio");
  const t = readFileSync("src/components/modules/ViagensRelatorio.tsx", "utf8");
  assert.match(t, /abrirDocumento/);
  assert.match(t, /Comprovantes por página/);
  assert.match(readFileSync("src/routes/_authenticated/viagens.tsx", "utf8"), /ViagensRelatorio/);
});

test("cliente de nome longo conta mais altura e empurra linhas para a página seguinte", () => {
  const longo = "Cliente com razão social muito extensa para quebrar em várias linhas na coluna ".repeat(2);
  const curtas = linhasDoRelatorio(Array.from({ length: 40 }, () => lanc({ cliente: "Alfa" })), FILTRO);
  const compridas = linhasDoRelatorio(Array.from({ length: 40 }, () => lanc({ cliente: longo })), FILTRO);
  assert.ok(secoes(montarRelatorioViagensHtml(base(compridas))) > secoes(montarRelatorioViagensHtml(base(curtas))));
});

test("dec 215: Conferido (PCM ou Administrativo) sai no documento só quando escolhido, e o botão de Parâmetros > Clientes saiu da Conferência", () => {
  const linhas = linhasDoRelatorio([lanc({ cliente: "Alfa SA" })], FILTRO);
  assert.doesNotMatch(montarRelatorioViagensHtml(base(linhas)), /Conferido:/);
  assert.match(montarRelatorioViagensHtml(base(linhas, { conferido: "PCM" })), /Conferido:<\/strong> PCM/);
  assert.match(montarRelatorioViagensHtml(base(linhas, { conferido: "<b>x" })), /Conferido:<\/strong> &lt;b&gt;x/);
  const f = readFileSync(new URL("../src/components/modules/ViagensRelatorio.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(f, /Abrir Parâmetros/);
  assert.match(f, /Conferido:/);
  assert.match(f, /\["PCM", "Administrativo"\]/);
});
