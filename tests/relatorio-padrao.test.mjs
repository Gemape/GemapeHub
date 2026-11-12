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
    "lib/checklist-veiculo-html.ts", "lib/extrato-html.ts", "lib/frota-relatorio-html.ts", "lib/manutencao-relatorio-html.ts", "lib/ficha-epi-avulsa-html.ts",
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

test("o extrato do veículo e o do equipamento abrem o relatório direto, em tela cheia, no padrão, com a situação colorida", async () => {
  const { montarExtratoHtml } = await import("../src/lib/extrato-html.ts");
  const html = montarExtratoHtml({
    titulo: "Extrato do veículo", assunto: `TST1A23 ${perigoso}`, empresa: "Gemape Máquinas", resumo: [["Km atual", "50.000"], ["Média de consumo", "—"], ["Preventivas vencidas", "2", "vermelho"]],
    tabelas: [
      { titulo: "Manutenções realizadas", vazio: "Nenhuma.", colunas: [{ titulo: "Data" }, { titulo: "Km", direita: true }], linhas: [["26/10/2026", "50.000"]] },
      { titulo: "Preventivas", vazio: "Nenhuma.", colunas: [{ titulo: "Ação" }, { titulo: "Situação" }], linhas: [["Óleo", { texto: "Vencida · Vencida por km", cor: "vermelho" }], ["Freios", { texto: "Sem registro", cor: "cinza" }]] },
      { titulo: "Ocorrências", vazio: "Nenhuma ocorrência registrada.", colunas: [{ titulo: "Data" }], linhas: [], nota: "Nota." },
    ],
  });
  noPadrao(html);
  assert.ok(!html.includes(perigoso));
  assert.match(html, /<div class="campo vermelho"><span class="rotulo">Preventivas vencidas<\/span><span class="conteudo">2<\/span>/);
  assert.match(html, /<td class="num">50\.000<\/td>/);
  assert.match(html, /<td><span class="ponto" style="background: #dc2626;"><\/span><span style="color: #dc2626; font-weight: bold;">Vencida · Vencida por km<\/span><\/td>/);
  assert.match(html, /<span class="ponto" style="background: #64748b;"><\/span><span style="color: #64748b; ">Sem registro/);
  assert.match(html, /<td colspan="1" class="vazio">Nenhuma ocorrência registrada\.<\/td>/);
  assert.match(html, /@media screen \{[\s\S]*\.folha \{ width: auto; min-height: 100vh/, "na tela a folha ocupa a largura toda; ao imprimir segue A4");
  // Extrato (equipamento) abre o relatório na hora, em tela cheia. O do veículo passa por uma janela com período e atalhos (decisão 296) e abre o relatório em tela cheia.
  const veiculo = ler("components/modules/ExtratoVeiculo.tsx");
  assert.match(veiculo, /imprimirDocumento\(html\)/);
  assert.match(veiculo, /<Dialog open=\{!!veiculo\} onOpenChange/, "o extrato do veículo é uma tela, que só vira PDF no botão Gerar PDF (decisão 331)");
  // O Extrato do equipamento é uma tela como a do veículo (decisão 394): o PDF só sai no botão Gerar PDF.
  const equip = ler("components/modules/equipamento/InventarioEquipamentoModulo.tsx");
  assert.match(equip, /onClick=\{\(\) => setExtratoDe\(e\)\}>Extrato<\/Button>/);
  const extratoEq = ler("components/modules/equipamento/ExtratoEquipamento.tsx");
  assert.match(extratoEq, /imprimirDocumento\(html\)/);
  assert.match(extratoEq, /<Dialog open=\{!!equipamento\} onOpenChange/);
  for (const secao of ['"Abastecimentos"', '"Manutenções"', '"Ocorrências"', '"Check lists"']) assert.ok(extratoEq.includes(`titulo: ${secao}`), secao);
  for (const secao of ["preventivas sugeridas", "Manutenções realizadas", "Itens não realizados em atenção", "Histórico de abastecimentos", "Ocorrências"]) assert.ok(veiculo.split(`titulo: "`).some((t) => t.includes(secao)), secao);
  // No visualizador em tela cheia o botão de imprimir se chama Gerar PDF.
  const visualizador = ler("components/layout/VisualizadorDocumento.tsx");
  assert.match(visualizador, /documento\?\.telaCheia \? "Gerar PDF" : "Imprimir"/);
  assert.match(visualizador, /h-\[96vh\] w-\[98vw\] max-w-none/);
});

test("o título das colunas numéricas fica alinhado à direita, junto com os valores", async () => {
  const { CSS_RELATORIO } = await import("../src/lib/relatorio-padrao.ts");
  assert.match(CSS_RELATORIO, /table\.padrao th\.num[^{]*\{ text-align: right; \}/);
  assert.match(CSS_RELATORIO, /\.valor, \.num \{ text-align: right/);
  const html = montarRelatorioTabelaHtml({ titulo: "T", colunas: [{ titulo: "Nome" }, { titulo: "Km", direita: true }], linhas: [["a", "1"]], vazio: "" });
  assert.match(html, /<th class="num">Km<\/th>/);
  assert.match(html, /<td class="num">1<\/td>/);
});

test("Abastecimento de veículos tem o botão Relatório (decisão 378): relatório por veículo, no padrão, com os mesmos filtros da tela", () => {
  const tela = ler("components/modules/AbastecimentoVeiculoModulo.tsx");
  assert.match(tela, /<Button variant="outline" onClick=\{\(\) => setRelatorioAberto\(true\)\}[^>]*>Relatório<\/Button>/);
  assert.match(tela, /montarExtratoHtml\(\{\s*titulo: "Relatório de abastecimento"/);
  assert.match(tela, /telaCheia: true/);
  assert.match(tela, /grupos\s*=\s*veiculos\s*\.filter\(\(v\) => linhas\.some/, "um quadro por veículo, só dos que têm abastecimento no filtro");
  assert.match(tela, /Total: \$\{g\.dele\.length\} abastecimento\(s\)/);
  for (const coluna of ["Data e hora", "Km rodados", "Litros", "Valor", "R$/L", "Km/L"]) assert.ok(tela.includes(`titulo: "${coluna}"`), coluna);
  assert.match(tela, /<EscolherCamposRelatorio/, "a janela de personalização das colunas e opções");
  assert.match(tela, /cols\.map\(\(c\) => \(\{ titulo: c\.titulo/, "só as colunas marcadas saem");
  assert.match(tela, /comResumo/);
  assert.match(tela, /comTotais/);
});

test("Abastecimento de equipamentos tem o mesmo Gerar PDF: relatório por equipamento, no padrão, com os filtros da tela", () => {
  const tela = ler("components/modules/equipamento/AbastecimentoEquipamentoModulo.tsx");
  assert.match(tela, /<Button variant="outline" onClick=\{gerarRelatorio\}[^>]*>Gerar PDF<\/Button>/);
  assert.match(tela, /montarExtratoHtml\(\{\s*titulo: "Relatório de abastecimento"/);
  assert.match(tela, /telaCheia: true/);
  assert.match(tela, /equipamentos\s*\.filter\(\(e\) => linhas\.some/, "um quadro por equipamento, só dos que têm abastecimento no filtro");
  assert.match(tela, /Total: \$\{g\.dele\.length\} abastecimento\(s\)/);
  for (const coluna of ["Data e hora", "Horímetro", "Horas trabalhadas", "Litros", "Valor", "R$/L", "L/h"]) assert.ok(tela.includes(`titulo: "${coluna}"`), coluna);
});

test("o anexo de fotos (ocorrências e check lists de veículos e equipamentos) tem Tirar foto, que abre a câmera do celular, além de Anexar fotos", () => {
  const botao = ler("components/modules/FotosOcorrencia.tsx");
  assert.match(botao, /<input ref=\{entrada\} type="file" accept="image\/\*" multiple hidden/, "a galeria continua, com várias fotos");
  assert.match(botao, /<input ref=\{camera\} type="file" accept="image\/\*" capture="environment" hidden onChange=\{\(e\) => void escolher\(e\)\}/, "câmera de trás do celular");
  assert.match(botao, /onClick=\{\(\) => camera\.current\?\.click\(\)\}>\s*Tirar foto/);
  // Os dois caminhos passam pela mesma redução e pelo mesmo limite de fotos.
  assert.equal((botao.match(/onChange=\{\(e\) => void escolher\(e\)\}/g) ?? []).length, 2);
  for (const arq of ["components/modules/equipamento/OcorrenciasEquipamentoModulo.tsx", "components/modules/OcorrenciasVeiculoModulo.tsx", "components/modules/ChecklistVeiculoModulo.tsx", "components/modules/equipamento/ChecklistEquipamentoModulo.tsx"]) {
    assert.match(ler(arq), /<BotaoAnexarFotos/, arq);
  }
});

test("celular: o cabeçalho da tela, as janelas e os relatórios se ajustam à tela estreita", async () => {
  const rota = ler("routes/_authenticated/route.tsx");
  assert.match(rota, /grid-cols-1 [^"]*md:grid-cols-\[1fr_auto\]/, "cabeçalho em uma coluna no celular");
  assert.match(rota, /md:sticky md:top-0/, "só fixa no topo a partir de md");
  assert.match(rota, /grid grid-cols-2 items-center gap-2 md:flex/, "controles em duas colunas no celular");
  assert.match(rota, /w-full min-w-0 sm:w-\[210px\]/, "o filtro de empresa não força a largura");
  assert.match(ler("components/layout/ConfiguracoesDemo.tsx"), /w-full min-w-0 text-xs sm:w-56/);
  assert.match(ler("components/ui/dialog.tsx"), /max-h-\[100dvh\] gap-4 overflow-x-hidden overflow-y-auto/, "toda janela rola na tela pequena, com o rodapé fixo embaixo");
  const { CSS_RELATORIO } = await import("../src/lib/relatorio-padrao.ts");
  assert.match(CSS_RELATORIO, /@media screen and \(max-width: 640px\)[\s\S]*\.cabecalho \{ grid-template-columns: 1fr/);
  assert.match(CSS_RELATORIO, /table\.padrao, \.termo table \{ display: block; overflow-x: auto; \}/);
});

test("celular: indicadores em duas colunas, cartões menores e botões das janelas lado a lado", () => {
  // O card de indicador é o mesmo em todo o sistema (decisão 324): o StatCard usa o Cartao da Frota, menor no celular.
  assert.match(ler("components/StatCard.tsx"), /<Cartao titulo=\{titulo\}/);
  const cartao = ler("components/modules/CartoesIndicadoresFrota.tsx");
  assert.match(cartao, /p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4/, "menos espaço interno no celular");
  assert.match(cartao, /break-words font-display text-2xl font-bold leading-none tracking-tight sm:text-3xl/);
  assert.match(cartao, /size-8 shrink-0 items-center justify-center rounded-full shadow-md ring-4 sm:size-10/, "o ícone é menor no celular, para sobrar largura ao texto");
  for (const arq of ["components/modules/ChecklistPainelMensal.tsx", "routes/_authenticated/dashboard.tsx", "components/modules/DashboardModulo.tsx", "components/modules/AbastecimentoVeiculoModulo.tsx", "components/modules/equipamento/InventarioEquipamentoModulo.tsx"]) {
    assert.match(ler(arq), /<GradeDeCartoes/, `${arq}: a grade padrão de cartões`);
  }
  assert.match(ler("components/GradeDeCartoes.tsx"), /4: "grid-cols-2 lg:grid-cols-4"/, "duas colunas no celular");
  assert.match(ler("components/ui/dialog.tsx"), /max-sm:flex-row-reverse max-sm:flex-wrap max-sm:\[&>\*\]:min-w-\[7rem\] max-sm:\[&>\*\]:flex-1/, "Salvar e Cancelar lado a lado");
});

test("celular: o último cartão de uma fileira de três ocupa a linha toda, sem meia linha vazia; o valor longo quebra dentro do cartão", () => {
  for (const arq of ["components/modules/EpiRelatorioBaixa.tsx", "components/modules/UniformesRelatorioBaixa.tsx", "components/modules/equipamento/AbastecimentoEquipamentoModulo.tsx", "components/modules/equipamento/ManutencaoEquipamentoModulo.tsx"]) {
    assert.match(ler(arq), /<GradeDeCartoes colunas=\{[34]\}( classe="[^"]*")?>/, arq);
  }
  assert.match(ler("components/GradeDeCartoes.tsx"), /sm:grid-cols-3 lg:grid-cols-4 max-sm:\[&>\*:last-child:nth-child\(odd\)\]:col-span-2/);
  assert.match(ler("components/modules/CartoesIndicadoresFrota.tsx"), /break-words font-display text-2xl font-bold/);
  for (const arq of ["components/modules/EpiRelatorioBaixa.tsx", "components/modules/UniformesRelatorioBaixa.tsx", "components/modules/EpiRelatorioFuncionario.tsx", "components/modules/UniformesRelatorioFuncionario.tsx", "components/modules/equipamento/AbastecimentoEquipamentoModulo.tsx", "components/modules/equipamento/ManutencaoEquipamentoModulo.tsx"]) {
    assert.match(ler(arq), /<GradeDeCartoes/, `${arq}: a grade padrão de cartões`);
  }
});

test("Novo check list: o responsável da associação vale mesmo quando a associação foi criada depois de escolher o equipamento ou o veículo (janela ao lado)", () => {
  for (const arq of ["components/modules/equipamento/ChecklistEquipamentoModulo.tsx", "components/modules/ChecklistVeiculoModulo.tsx"]) {
    const tela = ler(arq);
    assert.match(tela, /const idResponsavel = \(!avulsoNovo && responsavelDaAssociacaoAtivo && associacaoEscolhida\?\.responsavel\?\.id\) \|\| responsavelId;/, `${arq}: o responsável da associação vale`);
    assert.match(tela, /responsavelId: idResponsavel,?/, `${arq}: o envio usa o responsável efetivo`);
    // O campo só aparece quando a associação não define o responsável; nesse caso o estado local é o que vale.
    assert.match(tela, /!avulsoNovo && tipoEscolhido && !responsavelDaAssociacaoAtivo/, `${arq}: o campo fica escondido só quando o responsável da associação pode responder`);
  }
});

test("telas de check list menos poluídas: sem associação escondidos, primeiras linhas e Mostrar todas, mais recentes primeiro", () => {
  for (const [arq, itens] of [["components/modules/equipamento/ChecklistEquipamentoModulo.tsx", "equipamentos"]]) {
    const tela = ler(arq);
    assert.match(tela, /const \[semAssociacao, setSemAssociacao\] = useState\(false\)/, `${arq}: sem associação começa escondido`);
    assert.ok(tela.includes(`${itens}DaSituacao = ${itens}.filter((`), `${arq}: a situação só lista quem tem associação`);
    assert.ok(tela.includes(`${itens}SemAssociacao > 0 && <Button`) && tela.includes("sem associação ({"), `${arq}: botão para mostrar os sem associação`);
    assert.match(tela, /lista\.slice\(0, 10\)/, `${arq}: só as dez primeiras da lista`);
    assert.match(tela, /Mostrar todos os \$\{lista\.length\} check lists/);
  }
  const painel = ler("components/modules/ChecklistPainelMensal.tsx");
  assert.match(painel, /const LINHAS_VISIVEIS = 8/);
  assert.match(painel, /ordenadas\.slice\(0, LINHAS_VISIVEIS\)/);
  assert.match(painel, /const ordenadas = todos \? \[\.\.\.linhas\]\.sort\(\(a, b\) => b\.fim\.localeCompare\(a\.fim\) \|\| a\.veiculoRotulo\.localeCompare\(b\.veiculoRotulo\)\) : linhas/, "em todos os períodos, o prazo mais recente primeiro e o rótulo de A a Z");
  assert.match(painel, /Mostrar todas as \$\{ordenadas\.length\} linhas/);
});
