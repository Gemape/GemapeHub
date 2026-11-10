import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { controleDeEstoque } from "../src/lib/epi-controle-estoque.ts";
import { PARAMETROS_COMPRA_PADRAO } from "../src/lib/epi-parametros.ts";
import {
  filtrarSugestaoEpi,
  itensDaCotacao,
  linhasDaSugestaoEpi,
  montarCotacaoExcel,
  montarCotacaoHtml,
  quantidadeParaComprar,
  statusDoItemEpi,
} from "../src/lib/sugestao-epi.ts";

const ler = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const P = {
  ...PARAMETROS_COMPRA_PADRAO,
  metodo: "cobertura",
  prazoReposicao: 20,
  diasSeguranca: 15,
  diasPlanejamento: 30,
  limiteExcesso: 90,
  diasCobertura: 60,
};
// Consumo de 1 por dia (360 saídas em 12 meses = 30 por mês).
const itens = [
  {
    id: "a",
    codigo_sku: "EPI-1",
    nome: "Luva",
    empresa_id: "e1",
    subcategoria_id: "luvas",
    estoque_atual: 20,
    estoque_minimo: 2,
  }, // cobertura 20 dias: comprar já
  {
    id: "b",
    codigo_sku: "EPI-2",
    nome: "Capacete",
    empresa_id: "e2",
    subcategoria_id: "capacetes",
    estoque_atual: 90,
    estoque_minimo: 2,
  }, // 90 dias: estável
  {
    id: "c",
    codigo_sku: "EPI-3",
    nome: "Botina",
    empresa_id: "e1",
    subcategoria_id: "botinas",
    estoque_atual: 10,
    estoque_minimo: 2,
  }, // 10 dias: ruptura
  {
    id: "d",
    codigo_sku: "EPI-4",
    nome: "Óculos",
    empresa_id: "e1",
    subcategoria_id: "luvas",
    estoque_atual: 5,
    estoque_minimo: 1,
  }, // sem consumo
];
const movs = [
  // Os EPIs têm um ano de histórico (a primeira entrada é de um ano antes), então a média mensal é o consumo de 365 dias ÷ 12.
  ...["a", "b", "c"].map((id) => ({ item_id: id, tipo_movimentacao: "Entrada", quantidade: 400, data_movimentacao: "2025-10-01" })),
  ...["a", "b", "c"].map((id) => ({
    item_id: id,
    tipo_movimentacao: "Saida",
    quantidade: 360,
    data_movimentacao: "2026-06-01",
  })),
];
// Os usados vêm de fora (da mesma conta da aba Estoque): aqui, 5 unidades usadas da luva.
const linhas = linhasDaSugestaoEpi({
  itens,
  controle: controleDeEstoque(itens, movs, "2026-10-29"),
  parametros: P,
  usadosDe: (i) => (i.id === "a" ? 5 : 0),
});
const por = (id) => linhas.find((l) => l.itemId === id);

test("novos e usados somam como um estoque só, com média de consumo, cobertura e status pelos parâmetros", () => {
  const a = por("a");
  assert.deepEqual(
    [a.novos, a.usados, a.total, a.mediaMensal, a.cobertura, a.status],
    [15, 5, 20, 30, 20, "comprar_ja"],
  );
  assert.equal(por("b").status, "estavel");
  assert.equal(por("c").status, "ruptura");
  assert.deepEqual(
    [por("d").cobertura, por("d").status],
    [null, null],
    "sem consumo não tem como medir",
  );
});

test("quantidade para comprar: cobre o prazo de reposição mais a cobertura desejada, só para quem pede compra", () => {
  // 1 por dia × (60 + 20) = 80, menos 20 em estoque.
  assert.equal(por("a").quantidadeSugerida, 60);
  assert.equal(por("b").quantidadeSugerida, 0);
  assert.equal(
    quantidadeParaComprar({ total: 0, minimo: 0, mediaMensal: 0, status: "ruptura" }, P),
    1,
  );
});

test("método do estoque mínimo: sem estoque é ruptura, abaixo do mínimo comprar já, no mínimo planejar, acima estável ou excesso", () => {
  const m = { ...P, metodo: "minimo" };
  assert.equal(statusDoItemEpi({ total: 0, minimo: 5, cobertura: null }, m), "ruptura");
  assert.equal(statusDoItemEpi({ total: 3, minimo: 5, cobertura: 10 }, m), "comprar_ja");
  assert.equal(statusDoItemEpi({ total: 5, minimo: 5, cobertura: 10 }, m), "planejar");
  assert.equal(statusDoItemEpi({ total: 9, minimo: 5, cobertura: 50 }, m), "estavel");
  assert.equal(statusDoItemEpi({ total: 90, minimo: 5, cobertura: 200 }, m), "excesso");
});

test("filtros por empresa e palavra-chave; a cotação pega a subcategoria e os níveis de criticidade escolhidos", () => {
  assert.deepEqual(
    filtrarSugestaoEpi(linhas, { empresaId: "e2" }).map((l) => l.itemId),
    ["b"],
  );
  assert.deepEqual(
    filtrarSugestaoEpi(linhas, { palavra: "oculos" }).map((l) => l.itemId),
    ["d"],
    "sem acento",
  );
  const niveis = ["ruptura", "comprar_ja"];
  assert.deepEqual(
    itensDaCotacao(linhas, { subcategoriaId: "", niveis })
      .map((l) => l.itemId)
      .sort(),
    ["a", "c"],
  );
  assert.deepEqual(
    itensDaCotacao(linhas, { subcategoriaId: "luvas", niveis }).map((l) => l.itemId),
    ["a"],
  );
  assert.deepEqual(
    itensDaCotacao(linhas, { subcategoriaId: "", niveis: ["estavel"] }).map((l) => l.itemId),
    ["b"],
  );
});

test("a cotação de preços sai em PDF (HTML do padrão) e em Excel, com preço e prazo em branco e o texto escapado", () => {
  const linhasCotacao = [
    {
      codigo: "EPI-1",
      descricao: "Luva <b>X</b>",
      ca: "123",
      empresa: "Gemape",
      quantidade: 60,
      estoque: 20,
      status: "Comprar já",
    },
  ];
  const html = montarCotacaoHtml({ linhas: linhasCotacao, criterio: "Subcategoria: luvas" });
  assert.match(html, /Cotação de preços/);
  assert.match(html, /Luva &lt;b&gt;X&lt;\/b&gt;/);
  assert.match(html, /Preço unitário \(R\$\)/);
  const xls = montarCotacaoExcel(linhasCotacao);
  assert.match(xls, /<table border="1"><tr><th>Código<\/th>/);
  assert.match(xls, /<td>60<\/td><td>20<\/td><td>Comprar já<\/td><td><\/td><td><\/td>/);
});

test("a aba Sugestão de Compras do EPI tem as colunas na ordem pedida, o botão Gerar relatório e o fluxo de subcategoria, criticidade e seleção", () => {
  assert.match(
    ler("components/modules/PaginaModulo.tsx"),
    /<TabsContent value="sugestao-compras"[^>]*>\s*<SugestaoComprasEpi \/>/,
  );
  const tela = ler("components/modules/SugestaoComprasEpi.tsx");
  const colunas = [
    "Descrição",
    "Empresa",
    "Estoque novos",
    "Estoque usados",
    "Estoque total",
    "Média de consumo mensal",
    "Tempo de cobertura (dias)",
    "Status de criticidade",
  ];
  const ordem = colunas.map((c) => tela.indexOf(`>${c}</TableHead>`));
  assert.ok(
    ordem.every((n, i) => n > 0 && (i === 0 || n > ordem[i - 1])),
    `ordem das colunas: ${ordem}`,
  );
  assert.match(
    tela,
    /<Button\s+type="button"\s+onClick=\{abrirRelatorio\}>\s*Gerar relatório\s*<\/Button>/,
  );
  for (const t of [
    "Subcategoria",
    "Nível de criticidade que quero comprar",
    "Selecionar todos",
    "Gerar PDF",
    "Gerar Excel",
  ])
    assert.ok(tela.includes(t), t);
});

test("o Dashboard lista só o que pede compra, do mais crítico ao menos, e dentro do status o de menor cobertura primeiro", async () => {
  const { itensQuePedemCompra } = await import("../src/lib/sugestao-epi.ts");
  const l = (itemId, status, cobertura) => ({ itemId, descricao: itemId, status, cobertura });
  const ordem = itensQuePedemCompra([l("estavel", "estavel", 300), l("planejar", "planejar", 60), l("semConsumo", null, null), l("comprar2", "comprar_ja", 40), l("ruptura", "ruptura", 5), l("comprar1", "comprar_ja", 20)]).map((x) => x.itemId);
  assert.deepEqual(ordem, ["ruptura", "comprar1", "comprar2", "planejar"]);
});
