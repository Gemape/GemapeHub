import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { compraDeOrigem, origemDaDevolucao, posseDoEmpregado } from "../src/lib/devolucao-estoque-epi.ts";
import { controleDeEstoque, sugestoesDeCompraEpi } from "../src/lib/epi-controle-estoque.ts";
import {
  PARAMETROS_COMPRA_PADRAO, lerMotivosBaixaEpi, lerMotivosDevolucaoEpi, lerParametrosCompraEpi, MOTIVOS_DEVOLUCAO_PADRAO, salvarMotivosBaixaEpi, salvarMotivosDevolucaoEpi,
  salvarParametrosCompraEpi, statusDeCriticidade,
} from "../src/lib/epi-parametros.ts";

const ler = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const memoria = () => { const d = {}; return { getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = v; } }; };

test("devolução: a compra de origem é a mais antiga do EPI no tamanho, e a movimentação mantém data, NF, fornecedor e CA", () => {
  const compras = [
    { id: "c2", item_id: "i1", tamanho_id: "m", data_compra: "2026-05-10", nota_fiscal: "200", fornecedor: "B", ca: "222" },
    { id: "c1", item_id: "i1", tamanho_id: "m", data_compra: "2026-03-01", nota_fiscal: "100", fornecedor: "A", ca: "111" },
    { id: "c3", item_id: "i1", tamanho_id: "g", data_compra: "2026-01-01", nota_fiscal: "300", fornecedor: "C", ca: "333" },
  ];
  assert.equal(compraDeOrigem(compras, "i1", "m")?.id, "c1");
  assert.equal(compraDeOrigem(compras, "i1", null)?.id, "c3", "sem tamanho vale a mais antiga do EPI");
  assert.equal(compraDeOrigem(compras, "i2", null), null);
  assert.deepEqual(origemDaDevolucao(compras[1]), { compra_origem_id: "c1", data_compra_origem: "2026-03-01", nota_fiscal_origem: "100", fornecedor_origem: "A", fornecedor_id_origem: null, ca_origem: "111" });
});

test("devolução: o funcionário só devolve o que tem em posse, por EPI e tamanho", () => {
  const movs = [
    { item_id: "i1", empregado_id: "e1", tipo_movimentacao: "Saida", quantidade: 3, data_movimentacao: "2026-06-01", tamanho_id: "m" },
    { item_id: "i1", empregado_id: "e1", tipo_movimentacao: "Devolucao", quantidade: 1, data_movimentacao: "2026-06-10", tamanho_id: "m" },
    { item_id: "i2", empregado_id: "e1", tipo_movimentacao: "Saida", quantidade: 1, data_movimentacao: "2026-06-02", tamanho_id: null },
    { item_id: "i2", empregado_id: "e1", tipo_movimentacao: "Devolucao", quantidade: 1, data_movimentacao: "2026-06-11", tamanho_id: null },
    { item_id: "i3", empregado_id: "e2", tipo_movimentacao: "Saida", quantidade: 5, data_movimentacao: "2026-06-03", tamanho_id: null },
  ];
  assert.deepEqual(posseDoEmpregado(movs, "e1"), [{ itemId: "i1", tamanhoId: "m", quantidade: 2 }]);
});

test("tabela de criticidade: Ruptura, Comprar já, Planejar, Estável e Excesso pelo TC contra o prazo de reposição", () => {
  const p = { ...PARAMETROS_COMPRA_PADRAO, prazoReposicao: 20, diasSeguranca: 15, diasPlanejamento: 30, limiteExcesso: 90 };
  const casos = [[19, "ruptura"], [20, "comprar_ja"], [35, "comprar_ja"], [36, "planejar"], [50, "planejar"], [51, "estavel"], [90, "estavel"], [91, "excesso"]];
  for (const [tc, esperado] of casos) assert.equal(statusDeCriticidade(tc, p), esperado, `TC ${tc}`);
});

test("sugestão do EPI: pelo tempo de cobertura entram Ruptura, Comprar já e Planejar; pelo estoque mínimo, o item no mínimo ou abaixo", () => {
  // Consumo de 30 por mês (1 por dia): 360 saídas nos últimos 12 meses.
  const itens = [
    { id: "a", nome: "A", estoque_atual: 20, estoque_minimo: 5 }, // cobertura 20 dias
    { id: "b", nome: "B", estoque_atual: 90, estoque_minimo: 5 }, // cobertura 90 dias
    { id: "c", nome: "C", estoque_atual: 40, estoque_minimo: 40 }, // no mínimo
  ];
  const movs = itens.flatMap((i) => [{ item_id: i.id, tipo_movimentacao: "Saida", quantidade: 360, data_movimentacao: "2026-06-01" }]);
  const linhas = controleDeEstoque(itens, movs, "2026-10-29");
  const cob = sugestoesDeCompraEpi(linhas, { ...PARAMETROS_COMPRA_PADRAO, metodo: "cobertura", prazoReposicao: 20, diasCobertura: 60 });
  assert.deepEqual(cob.map((s) => [s.nome, s.status, s.prioridade]), [["A", "comprar_ja", "2-ALTA"], ["C", "planejar", "3-MÉDIA"]], "B tem 90 dias de cobertura: estável, fora da sugestão");
  const min = sugestoesDeCompraEpi(linhas, { ...PARAMETROS_COMPRA_PADRAO, metodo: "minimo", prazoReposicao: 20 });
  assert.deepEqual(min.map((s) => [s.nome, s.prioridade]), [["C", "2-ALTA"]]);
  assert.ok(min[0].quantidade >= 1);
});

test("parâmetros do EPI: padrão, gravação, validação e as listas de motivos", () => {
  const s = memoria();
  assert.deepEqual(lerParametrosCompraEpi(s), PARAMETROS_COMPRA_PADRAO);
  salvarParametrosCompraEpi({ ...PARAMETROS_COMPRA_PADRAO, metodo: "minimo", prazoReposicao: 12 }, s);
  assert.equal(lerParametrosCompraEpi(s).metodo, "minimo");
  assert.throws(() => salvarParametrosCompraEpi({ ...PARAMETROS_COMPRA_PADRAO, prazoReposicao: -1 }, s), /inteiros/);
  assert.throws(() => salvarParametrosCompraEpi({ ...PARAMETROS_COMPRA_PADRAO, diasSeguranca: 40, diasPlanejamento: 30 }, s), /planejamento/);
  assert.throws(() => salvarParametrosCompraEpi({ ...PARAMETROS_COMPRA_PADRAO, metodo: "cobertura", diasCobertura: 0 }, s), /1 dia/);
  assert.deepEqual(lerMotivosDevolucaoEpi(memoria()), [...MOTIVOS_DEVOLUCAO_PADRAO]);
  assert.deepEqual(salvarMotivosDevolucaoEpi(["  Fim  de uso ", "fim de uso", "Troca"], s), ["Fim de uso", "fim de uso", "Troca"]);
  assert.deepEqual(lerMotivosDevolucaoEpi(s), ["Fim de uso", "fim de uso", "Troca"]);
  assert.throws(() => salvarMotivosBaixaEpi(["", "  "], s), /pelo menos um/);
  assert.ok(lerMotivosBaixaEpi(memoria()).includes("Quebra"));
});

test("a tela: Entrada no Estoque com Devolução ao lado de Registrar Compra, campos obrigatórios, links de cadastro e Sugestão de Compras fora dela", async () => {
  const { ABAS_EPI } = await import("../src/lib/menu-parametros.ts");
  assert.deepEqual(ABAS_EPI.filter((a) => a.aba === "compras" || a.aba === "sugestao-compras").map((a) => a.titulo), ["Entrada no Estoque", "Sugestão de Compras"]);
  const compras = ler("components/modules/EpiComprasModulo.tsx");
  assert.match(compras, /Registrar Compra<\/Button>\s*<Button requiresWrite variant="outline" onClick=\{\(\) => setDevolucaoAberta\(true\)\}>Devolução<\/Button>/);
  assert.match(compras, /Informe a nota fiscal\./);
  assert.match(compras, /Informe o CA do EPI\./);
  assert.match(compras, /href="\/cadastros\/epi"[^>]*>Cadastrar EPI/);
  assert.match(compras, /Código \{itens\.find/);
  const dev = ler("components/modules/DevolucaoEpiDialog.tsx");
  assert.ok(dev.indexOf("Funcionário") < dev.indexOf("EPIs em posse de"), "o funcionário é a primeira pergunta");
  assert.match(dev, /registrarDevolucaoEpi/);
  assert.match(dev, /lerMotivosDevolucaoEpi/);
  assert.match(ler("components/parametros/ParametrosEpi.tsx"), /Motivos de baixa definitiva[\s\S]*Motivos de devolução ao estoque[\s\S]*Sugestão de compra/);
  assert.match(ler("routes/_authenticated/cadastros/gerais/categorias.tsx"), /categoria\.id === "cat-epi" && <ParametrosEpi \/>/);
  assert.match(ler("integrations/supabase/demo-client.ts"), /m\.condicao === "usado" && delta > 0/);
});
