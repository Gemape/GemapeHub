import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  compraDeOrigem,
  origemDaDevolucao,
  posseDoEmpregado,
} from "../src/lib/devolucao-estoque-epi.ts";
import {
  PARAMETROS_COMPRA_PADRAO,
  lerMotivosBaixaEpi,
  lerMotivosDevolucaoEpi,
  lerParametrosCompraEpi,
  MOTIVOS_DEVOLUCAO_PADRAO,
  salvarMotivosBaixaEpi,
  salvarMotivosDevolucaoEpi,
  salvarParametrosCompraEpi,
  statusDeCriticidade,
} from "../src/lib/epi-parametros.ts";

const ler = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const memoria = () => {
  const d = {};
  return {
    getItem: (k) => d[k] ?? null,
    setItem: (k, v) => {
      d[k] = v;
    },
  };
};

test("devolução: a compra de origem é a mais antiga do EPI no tamanho, e a movimentação mantém data, NF, fornecedor e CA", () => {
  const compras = [
    {
      id: "c2",
      item_id: "i1",
      tamanho_id: "m",
      data_compra: "2026-05-10",
      nota_fiscal: "200",
      fornecedor: "B",
      ca: "222",
    },
    {
      id: "c1",
      item_id: "i1",
      tamanho_id: "m",
      data_compra: "2026-03-01",
      nota_fiscal: "100",
      fornecedor: "A",
      ca: "111",
    },
    {
      id: "c3",
      item_id: "i1",
      tamanho_id: "g",
      data_compra: "2026-01-01",
      nota_fiscal: "300",
      fornecedor: "C",
      ca: "333",
    },
  ];
  assert.equal(compraDeOrigem(compras, "i1", "m")?.id, "c1");
  assert.equal(
    compraDeOrigem(compras, "i1", null)?.id,
    "c3",
    "sem tamanho vale a mais antiga do EPI",
  );
  assert.equal(compraDeOrigem(compras, "i2", null), null);
  assert.deepEqual(origemDaDevolucao(compras[1]), {
    compra_origem_id: "c1",
    data_compra_origem: "2026-03-01",
    nota_fiscal_origem: "100",
    fornecedor_origem: "A",
    fornecedor_id_origem: null,
    ca_origem: "111",
  });
});

test("devolução: o funcionário só devolve o que tem em posse, por EPI e tamanho", () => {
  const movs = [
    {
      item_id: "i1",
      empregado_id: "e1",
      tipo_movimentacao: "Saida",
      quantidade: 3,
      data_movimentacao: "2026-06-01",
      tamanho_id: "m",
    },
    {
      item_id: "i1",
      empregado_id: "e1",
      tipo_movimentacao: "Devolucao",
      quantidade: 1,
      data_movimentacao: "2026-06-10",
      tamanho_id: "m",
    },
    {
      item_id: "i2",
      empregado_id: "e1",
      tipo_movimentacao: "Saida",
      quantidade: 1,
      data_movimentacao: "2026-06-02",
      tamanho_id: null,
    },
    {
      item_id: "i2",
      empregado_id: "e1",
      tipo_movimentacao: "Devolucao",
      quantidade: 1,
      data_movimentacao: "2026-06-11",
      tamanho_id: null,
    },
    {
      item_id: "i3",
      empregado_id: "e2",
      tipo_movimentacao: "Saida",
      quantidade: 5,
      data_movimentacao: "2026-06-03",
      tamanho_id: null,
    },
  ];
  assert.deepEqual(posseDoEmpregado(movs, "e1"), [{ itemId: "i1", tamanhoId: "m", quantidade: 2 }]);
});

test("tabela de criticidade: Ruptura, Comprar já, Planejar, Estável e Excesso pelo TC contra o prazo de reposição", () => {
  const p = {
    ...PARAMETROS_COMPRA_PADRAO,
    prazoReposicao: 20,
    diasSeguranca: 15,
    diasPlanejamento: 30,
    limiteExcesso: 90,
  };
  const casos = [
    [19, "ruptura"],
    [20, "comprar_ja"],
    [35, "comprar_ja"],
    [36, "planejar"],
    [50, "planejar"],
    [51, "estavel"],
    [90, "estavel"],
    [91, "excesso"],
  ];
  for (const [tc, esperado] of casos)
    assert.equal(statusDeCriticidade(tc, p), esperado, `TC ${tc}`);
});

test("parâmetros do EPI: padrão, gravação, validação e as listas de motivos", () => {
  const s = memoria();
  assert.deepEqual(lerParametrosCompraEpi(s), PARAMETROS_COMPRA_PADRAO);
  salvarParametrosCompraEpi(
    { ...PARAMETROS_COMPRA_PADRAO, metodo: "minimo", prazoReposicao: 12 },
    s,
  );
  assert.equal(lerParametrosCompraEpi(s).metodo, "minimo");
  assert.throws(
    () => salvarParametrosCompraEpi({ ...PARAMETROS_COMPRA_PADRAO, prazoReposicao: -1 }, s),
    /inteiros/,
  );
  assert.throws(
    () =>
      salvarParametrosCompraEpi(
        { ...PARAMETROS_COMPRA_PADRAO, diasSeguranca: 40, diasPlanejamento: 30 },
        s,
      ),
    /planejamento/,
  );
  assert.throws(
    () =>
      salvarParametrosCompraEpi(
        { ...PARAMETROS_COMPRA_PADRAO, metodo: "cobertura", diasCobertura: 0 },
        s,
      ),
    /1 dia/,
  );
  assert.deepEqual(lerMotivosDevolucaoEpi(memoria()), [...MOTIVOS_DEVOLUCAO_PADRAO]);
  assert.deepEqual(salvarMotivosDevolucaoEpi(["  Fim  de uso ", "fim de uso", "Troca"], s), [
    "Fim de uso",
    "fim de uso",
    "Troca",
  ]);
  assert.deepEqual(lerMotivosDevolucaoEpi(s), ["Fim de uso", "fim de uso", "Troca"]);
  assert.throws(() => salvarMotivosBaixaEpi(["", "  "], s), /pelo menos um/);
  assert.ok(lerMotivosBaixaEpi(memoria()).includes("Quebra"));
});

test("a tela: Entrada no Estoque com Devolução ao lado de Registrar Compra, campos obrigatórios, links de cadastro e Sugestão de Compras fora dela", async () => {
  const { ABAS_EPI, ABAS_EPI_RELATORIOS } = await import("../src/lib/menu-parametros.ts");
  assert.deepEqual(
    [...ABAS_EPI, ...ABAS_EPI_RELATORIOS].filter((a) => a.aba === "compras" || a.aba === "sugestao-compras").map(
      (a) => a.titulo,
    ),
    ["Entrada no Estoque", "Sugestão de Compras"],
  );
  const compras = ler("components/modules/EpiComprasModulo.tsx");
  assert.match(
    compras,
    /Registrar Compra<\/Button>\s*<Button requiresWrite onClick=\{\(\) => setDevolucaoAberta\(true\)\}>Devolução<\/Button>/,
  );
  assert.match(compras, /Informe a nota fiscal\./);
  assert.match(compras, /Informe o CA do EPI\./);
  assert.match(compras, /href="\/cadastros\/epi"[^>]*>Cadastrar EPI/);
  assert.match(compras, /Código \{itens\.find/);
  const dev = ler("components/modules/DevolucaoEpiDialog.tsx");
  assert.ok(
    dev.indexOf("Funcionário") < dev.indexOf("em posse de {empregado.nome}"),
    "o funcionário é a primeira pergunta",
  );
  assert.match(dev, /registrarDevolucaoEpi/);
  assert.match(dev, /lerMotivosDevolucaoEpi/);
  assert.match(
    ler("components/parametros/ParametrosEpi.tsx"),
    /Motivos de baixa definitiva[\s\S]*Motivos de devolução ao estoque[\s\S]*<SugestaoDeCompra modulo="epi"/,
  );
  assert.match(
    ler("routes/_authenticated/cadastros/gerais/categorias.tsx"),
    /categoria\.id === "cat-epi" && <ParametrosEpi voltarParaSugestao=\{voltar === "sugestao-compras"\} \/>/,
  );
  assert.match(ler("integrations/supabase/demo-client.ts"), /m\.condicao === "usado" && delta > 0/);
});

test("Registrar Compra: depois da empresa, busca por palavra-chave do EPI, em código + descrição + tamanho (decisão 351); o motivo da devolução vem de Parâmetros > EPI", () => {
  const compras = readFileSync(new URL("../src/components/modules/EpiComprasModulo.tsx", import.meta.url), "utf8");
  assert.match(compras, /<BuscaEpiCompra[\s\S]*itens=\{itens\.filter\(\(i\) => i\.empresa_id === empresaCompra\)\}/, "a lista é só dos EPIs da empresa escolhida");
  assert.match(compras, /<input type="hidden" name="item_id" value=\{itemSel\} \/>/);
  const busca = readFileSync(new URL("../src/components/modules/BuscaEpiCompra.tsx", import.meta.url), "utf8");
  assert.match(busca, /combinaBuscaTolerante\(busca, o\.codigo, o\.descricao, o\.rotuloTamanho, o\.ca\)/);
  assert.match(busca, /opcoesTamanhoEntrada\(parametros, "epi", i\)/, "uma linha por tamanho autorizado");
  const devolucao = readFileSync(new URL("../src/components/modules/DevolucaoEpiDialog.tsx", import.meta.url), "utf8");
  assert.match(devolucao, /lerMotivosDevolucaoEpi\(\)/);
  assert.match(readFileSync(new URL("../src/components/parametros/ParametrosEpi.tsx", import.meta.url), "utf8"), /salvarMotivosDevolucaoEpi/);
});

test("a compra informa o código do produto e o estoque alimentado; compras de fornecedores diferentes somam num estoque só do item (decisão 352)", () => {
  const compras = readFileSync(new URL("../src/components/modules/EpiComprasModulo.tsx", import.meta.url), "utf8");
  assert.match(compras, /<TableHead title="Estoque que a compra alimentou[^"]*">Estoque<\/TableHead>\s*<TableHead>Código<\/TableHead>/);
  assert.match(compras, /Esta compra alimenta o estoque[\s\S]*compras de qualquer fornecedor somam no mesmo saldo/);
  assert.match(compras, /Estoque a alimentar \(empresa\)/);
  assert.match(compras, /Código: itens\.find\(\(i\) => i\.id === c\.item_id\)\?\.codigo_sku/, "o CSV também leva o código");
  // O estoque é do item (e da empresa), não do fornecedor: o demo soma toda compra na entrada do item, qualquer que seja o fornecedor.
  const demo = readFileSync(new URL("../src/integrations/supabase/demo-client.ts", import.meta.url), "utf8");
  assert.match(demo, /item_id: c\.item_id, empresa_id: c\.empresa_id/);
  assert.doesNotMatch(demo.slice(demo.indexOf("const registrarCompras"), demo.indexOf("const importarNotaFiscal")), /fornecedor_id|c\.fornecedor\b[^ ]*\s*===/);
});
