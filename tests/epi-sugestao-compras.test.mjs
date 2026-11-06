import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { condicaoDoStatus, PARAMETROS_COMPRA_PADRAO, textoDoPontoDePedido } from "../src/lib/epi-parametros.ts";


test("o status de criticidade tem legenda sempre visível e balão ao passar o mouse (decisão 354)", () => {
  const tela = readFileSync(new URL("../src/components/modules/SugestaoComprasEpi.tsx", import.meta.url), "utf8");
  assert.match(tela, /<LegendaStatusCompra parametros=\{parametrosCompra\} \/>/, "a legenda fica acima da tabela");
  assert.equal((tela.match(/<EtiquetaStatusCompra status=\{l\.status\} parametros=\{parametrosCompra\} \/>/g) ?? []).length, 2, "a tabela e a lista do relatório usam a etiqueta com balão");
  const legenda = readFileSync(new URL("../src/components/modules/LegendaStatusCompra.tsx", import.meta.url), "utf8");
  assert.match(legenda, /TooltipContent/);
  assert.match(legenda, /STATUS_CRITICIDADE\[n\]\.significado/, "a legenda usa o significado de Parâmetros Específicos");
  assert.match(legenda, /Sem consumo registrado/);
});

test("a condição lógica de cada status muda com o método: tempo de cobertura ou estoque mínimo (decisão 355)", () => {
  const cob = { ...PARAMETROS_COMPRA_PADRAO, metodo: "cobertura", prazoReposicao: 30, diasSeguranca: 15, diasPlanejamento: 30, limiteExcesso: 90 };
  assert.equal(condicaoDoStatus("ruptura", cob).formula, "TC < TR");
  assert.equal(condicaoDoStatus("ruptura", cob).calculo, "TC < 30 dias");
  assert.equal(condicaoDoStatus("comprar_ja", cob).calculo, "TC ≥ 30 e TC ≤ 45 dias");
  assert.equal(condicaoDoStatus("planejar", cob).calculo, "TC > 45 e TC ≤ 60 dias");
  assert.equal(condicaoDoStatus("estavel", cob).calculo, "TC > 60 e TC ≤ 90 dias");
  assert.equal(condicaoDoStatus("excesso", cob).calculo, "TC > 90 dias");
  assert.match(textoDoPontoDePedido(cob), /TR \(prazo de reposição, 30 dias\) \+ 15 dias de segurança = 45 dias/);
  const min = { ...cob, metodo: "minimo" };
  assert.equal(condicaoDoStatus("ruptura", min).formula, "Estoque total = 0");
  assert.equal(condicaoDoStatus("comprar_ja", min).formula, "0 < Estoque total < Mínimo");
  assert.equal(condicaoDoStatus("planejar", min).formula, "Estoque total = Mínimo (Mínimo > 0)");
  assert.match(condicaoDoStatus("excesso", min).formula, /Estoque total > Mínimo e TC > 90/);
  assert.match(textoDoPontoDePedido(min), /estoque mínimo/);
});

test("Parâmetros Específicos de EPI: tabela com a condição lógica ao lado da tag e vai e volta com a Sugestão de Compras (decisão 355)", () => {
  const tela = readFileSync(new URL("../src/components/parametros/ParametrosEpi.tsx", import.meta.url), "utf8");
  assert.match(tela, /Condição lógica \(gatilho\)/);
  assert.match(tela, /condicaoDoStatus\(st, emUso\)/, "a tabela segue o método e os dias que estão na tela");
  assert.match(tela, /Voltar para Sugestão de Compras/);
  assert.match(tela, /if \(voltarParaSugestao\) voltar\(\)/, "salvar os parâmetros da sugestão volta a ela");
  assert.match(readFileSync(new URL("../src/components/modules/SugestaoComprasEpi.tsx", import.meta.url), "utf8"), /voltar: modulo === "epi" \? "sugestao-compras" : "sugestao-uniformes" \}/);
});

const memoriaTextos = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};

test("os textos do termo e da ficha de EPI se editam em Parâmetros Específicos e saem nos documentos (decisão 356)", async () => {
  const { lerTextosDocumentosEpi, salvarTextosDocumentosEpi, TEXTOS_DOCUMENTOS_PADRAO } = await import("../src/lib/epi-parametros.ts");
  const { montarTermoEntregaEpiHtml } = await import("../src/lib/termo-entrega-epi-html.ts");
  const { montarFichaEpiAvulsaHtml } = await import("../src/lib/ficha-epi-avulsa-html.ts");
  // Sem nada guardado valem os textos padrão, que são os do pedido.
  assert.deepEqual(lerTextosDocumentosEpi(memoriaTextos()), TEXTOS_DOCUMENTOS_PADRAO);
  assert.match(TEXTOS_DOCUMENTOS_PADRAO.termoDeclaracao, /^Declaro ter recebido da empresa \{empresa\}, os Equipamentos de Proteção Individual/);
  assert.match(TEXTOS_DOCUMENTOS_PADRAO.fichaDeclaracao, /^Declaro que recebi da empresa os Equipamentos/);
  const s = memoriaTextos();
  salvarTextosDocumentosEpi({ termoDeclaracao: "  Recebi de {empresa} os EPIs <b>.  ", termoCiencia: "Ciente.", fichaDeclaracao: "Ficha nova." }, s);
  assert.equal(lerTextosDocumentosEpi(s).termoDeclaracao, "Recebi de {empresa} os EPIs <b>.");
  assert.throws(() => salvarTextosDocumentosEpi({ ...TEXTOS_DOCUMENTOS_PADRAO, termoCiencia: "  " }, s), /Preencha os três textos/);
  assert.throws(() => salvarTextosDocumentosEpi({ ...TEXTOS_DOCUMENTOS_PADRAO, fichaDeclaracao: "x".repeat(1501) }, s), /até 1500/);
  assert.deepEqual(lerTextosDocumentosEpi({ getItem: () => "{ruim", setItem() {} }), TEXTOS_DOCUMENTOS_PADRAO, "texto guardado ilegível volta ao padrão");
  const textos = lerTextosDocumentosEpi(s);
  const termo = montarTermoEntregaEpiHtml({ empresa: { razao_social: "Gemape & Cia", cnpj: "", nome_fantasia: "Gemape" }, empregado: { nome: "Ana", cpf: "x" }, data: "2026-10-01", linhas: [], textos });
  assert.match(termo, /Recebi de <strong>Gemape &amp; Cia<\/strong> os EPIs &lt;b&gt;\./, "{empresa} vira o nome em negrito e o resto é escapado");
  assert.match(termo, /Ciente\./);
  assert.doesNotMatch(termo, /Declaro ter recebido/);
  const ficha = montarFichaEpiAvulsaHtml({ empresa: { razao_social: "Gemape", cnpj: "" }, empregado: { nome: "Ana", cpf: "x" }, linhas: [], textos });
  assert.match(ficha, /Ficha nova\./);
  // Sem textos passados (e sem armazenamento no teste) os documentos saem com os padrão.
  assert.match(montarTermoEntregaEpiHtml({ empresa: { razao_social: "Acme", cnpj: "", nome_fantasia: "Acme" }, empregado: { nome: "Ana", cpf: "x" }, data: "2026-10-01", linhas: [] }), /Declaro ter recebido da empresa <strong>Acme<\/strong>, os Equipamentos/);
});

test("a busca do EPI na compra não envia o formulário com Enter e a legenda só mostra Sem consumo no método por cobertura", () => {
  const busca = readFileSync(new URL("../src/components/modules/BuscaEpiCompra.tsx", import.meta.url), "utf8");
  assert.match(busca, /e\.key === "Enter"\) e\.preventDefault\(\)/);
  const legenda = readFileSync(new URL("../src/components/modules/LegendaStatusCompra.tsx", import.meta.url), "utf8");
  assert.match(legenda, /parametros\?\.metodo !== "minimo" &&/);
});
