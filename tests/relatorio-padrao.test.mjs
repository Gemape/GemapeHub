import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { montarRelatorioTabelaHtml, paginaRelatorio, cabecalhoRelatorio } from "../src/lib/relatorio-padrao.ts";
import { montarFrotaHtml } from "../src/lib/frota-relatorio-html.ts";
import { montarChecklistHtml } from "../src/lib/checklist-veiculo-html.ts";
import { montarTermoEntregaEpiHtml } from "../src/lib/termo-entrega-epi-html.ts";
import { montarFichaEpiAvulsaHtml } from "../src/lib/ficha-epi-avulsa-html.ts";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const perigoso = "<script>alert(1)</script>";

const noPadrao = (html) => {
  assert.match(html, /<div class="cabecalho">/, "cabeçalho com logo, título e empresa");
  assert.match(html, /<div class="rodape">Emitido em \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}<\/div>/, "rodapé Emitido em");
  assert.match(html, /#0A007C/, "azul do padrão");
  assert.doesNotMatch(html, /border: 1px solid #000/, "sem as bordas pretas antigas");
};

test("o padrão monta cabeçalho, corpo e rodapé e escapa o que vem de fora", () => {
  const html = montarRelatorioTabelaHtml({
    titulo: `Histórico ${perigoso}`, subtitulos: [perigoso], empresa: perigoso, resumo: [["Total", perigoso]],
    colunas: [{ titulo: "Nome" }, { titulo: "Qtd", direita: true }], linhas: [[perigoso, "2"]], vazio: "Nada.",
  });
  noPadrao(html);
  assert.ok(!html.includes(perigoso), "texto informado escapado");
  assert.match(html, /<th class="num">Qtd<\/th>/);
  assert.match(html, /<td class="num">2<\/td>/);
  const vazio = montarRelatorioTabelaHtml({ titulo: "T", colunas: [{ titulo: "A" }, { titulo: "B" }], linhas: [], vazio: "Nada." });
  assert.match(vazio, /<td colspan="2" class="vazio">Nada\.<\/td>/);
});

test("a logomarca só entra com endereço completo e é escapada", () => {
  assert.doesNotMatch(cabecalhoRelatorio({ titulo: "T" }), /<img/, "sem navegador, sem imagem");
  const c = cabecalhoRelatorio({ titulo: "T", logoUrl: 'http://x/"><b>.png' });
  assert.match(c, /<img class="logo" src="http:\/\/x\/&quot;&gt;&lt;b&gt;\.png"/);
  assert.match(paginaRelatorio({ titulo: "T", cabecalho: c, corpo: "" }), /@page \{ size: A4/);
});

test("check list, frota, termo e ficha saem no mesmo padrão do Relatório de Viagens", () => {
  noPadrao(montarFrotaHtml({ empresa: "GEMAPE", geradoEm: "2026-10-07T13:00:00Z", busca: "", linhas: [] }));
  noPadrao(montarChecklistHtml({ codigo: "CHK-0001", veiculoRotulo: "ABC", tipoVeiculo: "Carro", periodicidade: "Diária", data: "2026-10-07", responsavelNome: "Ana", status: "Concluído", concluidoEm: null, itens: [] }, "GEMAPE"));
  noPadrao(montarTermoEntregaEpiHtml({ empresa: { razao_social: "GEMAPE", cnpj: "1", nome_fantasia: "G" }, empregado: { nome: "Ana", cpf: "1" }, data: "2026-09-30", linhas: [] }));
  noPadrao(montarFichaEpiAvulsaHtml({ empresa: { razao_social: "GEMAPE", cnpj: "1" }, empregado: { nome: "Ana", cpf: "1" }, linhas: [] }));
});

test("nenhum relatório, termo ou check list monta o próprio layout: todos usam o padrão", () => {
  for (const arq of [
    "lib/checklist-veiculo-html.ts", "lib/frota-relatorio-html.ts", "lib/manutencao-relatorio-html.ts", "lib/ficha-epi-avulsa-html.ts",
    "lib/termo-entrega-epi-html.ts", "lib/termo-baixa-uniforme-html.ts", "lib/termo-entrega-uniforme-html.ts", "lib/termo-responsabilidade-html.ts", "lib/termo-vistoria-html.ts",
    "components/modules/FerramentasTermoEncerramento.tsx",
  ]) {
    const fonte = ler(arq);
    assert.match(fonte, /paginaRelatorio\(/, arq);
    assert.doesNotMatch(fonte, /<style>|<html>/, `${arq} não tem mais estilo próprio`);
  }
  for (const arq of ["EpiRelatorioBaixa", "EpiRelatorioFuncionario", "UniformesRelatorioBaixa", "UniformesRelatorioFuncionario"]) {
    const fonte = ler(`components/modules/${arq}.tsx`);
    assert.doesNotMatch(fonte, /window\.print\(\)/, `${arq}: o Imprimir abre o relatório no padrão, não imprime a tela`);
    assert.match(fonte, /montarRelatorioTabelaHtml\(/, arq);
  }
  // O Relatório de Viagens é a referência: a mesma cor do cabeçalho.
  assert.match(ler("lib/viagens-relatorio.ts"), /border-bottom: 3px solid #0A007C/);
  assert.match(ler("lib/relatorio-padrao.ts"), /border-bottom: 3px solid #0A007C/);
});

test("todos os relatórios e termos saem com as <div> fechadas na ordem e o rodapé dentro da folha", async () => {
  const { montarTermoBaixaUniformeHtml } = await import("../src/lib/termo-baixa-uniforme-html.ts");
  const { montarTermoEntregaUniformeHtml } = await import("../src/lib/termo-entrega-uniforme-html.ts");
  const { montarTermoResponsabilidadeHtml } = await import("../src/lib/termo-responsabilidade-html.ts");
  const { montarTermoVistoriaHtml } = await import("../src/lib/termo-vistoria-html.ts");
  const emp = { razao_social: "G", cnpj: "1", nome_fantasia: "G" };
  const htmls = [
    montarTermoEntregaEpiHtml({ empresa: emp, empregado: { nome: "A", cpf: "1" }, data: "2026-09-30", linhas: [] }),
    montarTermoBaixaUniformeHtml({ empresa: emp, empregado: { nome: "A" }, data: "2026-09-30", motivo: "m", onus: "o", linhas: [] }),
    montarTermoEntregaUniformeHtml({ empresa: emp, empregado: { nome: "A", cpf: "1" }, data: "2026-09-30", linhas: [] }),
    montarTermoResponsabilidadeHtml({ empresa: emp, empregado: { nome: "A", cpf: "1" }, data: "2026-09-30", linhas: [] }),
    montarTermoVistoriaHtml({ empresa: emp, caixa: { codigo: "CX-0001" }, responsavel: "A", data: "2026-09-30", linhas: [] }),
    montarFichaEpiAvulsaHtml({ empresa: { razao_social: "G", cnpj: "1" }, empregado: { nome: "A", cpf: "1" }, linhas: [] }),
  ];
  for (const h of htmls) {
    const corpo = h.slice(h.indexOf('<div class="folha">'), h.indexOf('class="no-print"'));
    assert.equal((corpo.match(/<div/g) ?? []).length, (corpo.match(/<\/div>/g) ?? []).length + 1, "uma <div> aberta (a folha) até o fim do corpo");
    assert.ok(corpo.indexOf('class="rodape"') > corpo.indexOf('class="termo"'), "o rodapé vem depois do conteúdo");
    assert.match(h, /<div class="termo">[\s\S]*<\/div>\s*<div class="rodape">/, "o conteúdo fecha antes do rodapé");
  }
});
