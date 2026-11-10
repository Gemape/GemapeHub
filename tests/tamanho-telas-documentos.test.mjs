import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

process.env.TZ = "America/Sao_Paulo";
const { lerXmlNfe } = await import("../src/lib/nfe-xml.ts");
const { montarEntradas, prepararImportacao } = await import("../src/lib/importacao-nfe.ts");
const { montarTermoEntregaEpiHtml } = await import("../src/lib/termo-entrega-epi-html.ts");
const { montarFichaEpiAvulsaHtml } = await import("../src/lib/ficha-epi-avulsa-html.ts");
const { montarTermoEntregaUniformeHtml } =
  await import("../src/lib/termo-entrega-uniforme-html.ts");
const { montarTermoBaixaUniformeHtml } = await import("../src/lib/termo-baixa-uniforme-html.ts");
const { linhaCsvHistorico } = await import("../src/lib/historico-movimentacoes.ts");

const ler = (relativo) => readFileSync(fileURLToPath(new URL(relativo, import.meta.url)), "utf8");
const perigoso = "<img src=x onerror=alert(1)>";
const escapado = "&lt;img src=x onerror=alert(1)&gt;";

// ---------- Importação do XML (decisão 23) ----------

const XML = ler("./fixtures/nfe-4.00-exemplo.xml");
const FORNECEDOR = {
  id: "forn-1",
  cnpj: "12.345.678/0001-90",
  nome_fantasia: "Distribuidora Ficticia",
};
const EMPRESA = { id: "empresa-demo", cnpj: "00.000.000/0001-00", nome_fantasia: "GEMAPE" };
const codigo = (tabela, codigo_produto, codigo_fornecedor) => ({
  id: `cf-${codigo_fornecedor}`,
  empresa_id: "empresa-demo",
  tabela,
  codigo_produto,
  nome_produto: "",
  fornecedor_id: FORNECEDOR.id,
  fornecedor_nome: "",
  codigo_fornecedor,
  ca: tabela === "epis" ? "1" : "",
});

test("item da nota casado com produto que controla tamanho fica pendente e não é gravado", () => {
  const previa = prepararImportacao({
    nota: lerXmlNfe(XML),
    empresas: [EMPRESA],
    fornecedores: [FORNECEDOR],
    codigosFabrica: [
      codigo("epis", "EPI-0007", "LUV-778"),
      codigo("uniformes", "UNI-0003", "CAM-01"),
    ],
    produtos: [
      {
        id: "epi-7",
        tabela: "epis",
        codigo_sku: "EPI-0007",
        nome: "Luva",
        empresa_id: "empresa-demo",
        controlaTamanho: true,
      },
      {
        id: "uni-3",
        tabela: "uniformes",
        codigo_sku: "UNI-0003",
        nome: "Camisa",
        empresa_id: "empresa-demo",
      },
    ],
    chavesImportadas: [],
  });
  assert.equal(previa.linhas[0].destino, null);
  assert.match(previa.linhas[0].pendencia, /EPI-0007.*tamanho/);
  assert.equal(previa.linhas[1].destino?.item_id, "uni-3", "produto sem tamanho segue como hoje");
  const entradas = montarEntradas(previa);
  assert.equal(entradas.compras_epis.length, 0);
  assert.equal(entradas.compras_uniformes.length, 1);
});

// ---------- Documentos: o tamanho aparece e é escapado ----------

const empresa = { razao_social: "GEMAPE", cnpj: "00", nome_fantasia: "GEMAPE" };
const empregado = { nome: "Ana", cpf: "000", matricula: "1" };

test("o tamanho aparece escapado no Termo de Entrega de EPI e na Ficha de EPI Avulsa", () => {
  const termo = montarTermoEntregaEpiHtml({
    empresa,
    empregado,
    data: "2026-10-01",
    linhas: [{ nome: "Botina", ca: "1", quantidade: 1, estado: "Novo", tamanho: `40 ${perigoso}` }],
  });
  assert.equal(termo.includes("<img"), false);
  assert.ok(termo.includes(`Botina (tam. 40 ${escapado})`));
  const ficha = montarFichaEpiAvulsaHtml({
    empresa,
    empregado,
    linhas: [
      {
        data: "2026-10-01",
        quantidade: 1,
        nome: "Botina",
        ca: "1",
        tipo: "Saida",
        tamanho: perigoso,
      },
    ],
  });
  assert.equal(ficha.includes("<img"), false);
  assert.ok(ficha.includes(`Botina (tam. ${escapado})`));
});

test("o tamanho aparece escapado nos termos de entrega e de baixa de uniforme", () => {
  const entrega = montarTermoEntregaUniformeHtml({
    empresa,
    empregado,
    data: "2026-10-01",
    linhas: [
      { nome: "Camisa", marca: "", modelo: "", quantidade: 1, estado: "Novo", tamanho: perigoso },
    ],
  });
  assert.equal(entrega.includes("<img"), false);
  assert.ok(entrega.includes(`Camisa (tam. ${escapado})`));
  const baixa = montarTermoBaixaUniformeHtml({
    empresa,
    empregado,
    data: "2026-10-01",
    motivo: "Desgaste",
    onus: "Da Empresa",
    linhas: [{ nome: "Camisa", quantidade: 1, estado: "Usado", tamanho: "M" }],
  });
  assert.ok(baixa.includes("Camisa (tam. M)"));
  // Sem tamanho, a descrição continua como antes.
  const semTamanho = montarTermoEntregaEpiHtml({
    empresa,
    empregado,
    data: "2026-10-01",
    linhas: [{ nome: "Capacete", ca: "1", quantidade: 1, estado: "Novo" }],
  });
  assert.equal(semTamanho.includes("tam."), false);
});

test("o CSV do histórico tem a coluna Tamanho", () => {
  const linha = linhaCsvHistorico(
    {
      item_id: "b",
      veiculo_id: null,
      empregado_id: null,
      tipo_movimentacao: "Saida",
      motivo_baixa: null,
      quantidade: 1,
      onus_baixa: null,
      tipo_vistoria: null,
      sinalizar_ocorrencia: false,
      tipo_ocorrencia: null,
      conducao_ocorrencia: null,
      data_movimentacao: "2026-10-01",
      observacao: null,
      tamanho_id: "tam-40",
    },
    {
      itens: [{ id: "b", codigo_sku: "EPI-0002", nome: "Botina" }],
      veiculos: [],
      nomeEmpregado: () => "—",
      nomeTamanho: () => "40",
    },
  );
  assert.equal(linha.Tamanho, "40");
});

// ---------- Telas ----------

const fonte = (relativo) => ler(`../src/${relativo}`);

test("o cadastro escolhe a unidade; o módulo configura o mínimo por tamanho", () => {
  const tela = fonte("components/modules/CadastroProduto.tsx");
  assert.match(tela, /unidadesAutorizadasDoProduto/);
  assert.match(tela, /htmlFor="unidade_id"/);
  assert.doesNotMatch(tela, /minimos_tamanho/);
  assert.doesNotMatch(tela, /resumoEstoquePorTamanho|alertasPorTamanho/);
  const estoque = fonte("components/modules/EstoqueModulo.tsx");
  assert.match(estoque, /estadoEstoqueModulo/);
  assert.match(estoque, /prepararMinimoUnico/);
  // A edição nunca envia o saldo por tamanho: só o gatilho mexe nele.
  assert.equal(/valores\[?["']?saldos_tamanho/.test(tela), false);
});

test("compras, termos e movimentações escolhem o tamanho e mostram o tamanho", () => {
  // Os termos de entrega de EPI e de uniforme só documentam (decisão 415): escolhem o tamanho para o documento, sem gravar movimento.
  assert.match(fonte("components/modules/EpiTermoEntrega.tsx"), /SeletorTamanho/);
  // O termo de uniforme não escolhe tamanho: usa o cadastrado no uniforme e o mostra na descrição.
  assert.doesNotMatch(fonte("components/modules/UniformesTermoEntrega.tsx"), /SeletorTamanho/);
  assert.match(fonte("components/modules/UniformesTermoEntrega.tsx"), /descricaoDoUniforme\(u\)/);
  for (const arquivo of [
    "components/modules/EpiComprasModulo.tsx",
    "components/modules/UniformesComprasModulo.tsx",
    "components/modules/UniformesTermoBaixa.tsx",
    "components/modules/MovimentacoesModulo.tsx",
  ]) {
    const tela = fonte(arquivo);
    assert.match(tela, /SeletorTamanho/, arquivo);
    assert.match(tela, /tamanho_id/, arquivo);
  }
  for (const arquivo of [
    "components/modules/EpiRelatorioFuncionario.tsx",
    "components/modules/UniformesRelatorioFuncionario.tsx",
    "components/modules/EpiRelatorioBaixa.tsx",
    "components/modules/UniformesRelatorioBaixa.tsx",
    "components/modules/EpiFichaEpiAvulsa.tsx",
  ]) {
    assert.match(fonte(arquivo), /nomeTamanho/, arquivo);
  }
});

test("o Dashboard alerta o estoque baixo por tamanho e reabrir a movimentação volta para Saída", () => {
  const dashboard = fonte("routes/_authenticated/dashboard.tsx");
  assert.match(dashboard, /alertasDeMinimoEpi/);
  assert.match(dashboard, /TAMANHO_DISPONIVEL/, "colunas novas só no modo demonstração");
  const movimentacoes = fonte("components/modules/MovimentacoesModulo.tsx");
  assert.match(movimentacoes, /setTipoMovimentacao\("Saida"\);\s*setAberto\(true\)/);
});
