import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { dataLocalBrasilia, lerXmlNfe } from "../src/lib/nfe-xml.ts";
import { montarEntradas, prepararImportacao } from "../src/lib/importacao-nfe.ts";
import { demoSupabase } from "../src/integrations/supabase/demo-client.ts";

const XML = readFileSync(new URL("./fixtures/nfe-4.00-exemplo.xml", import.meta.url), "utf8");
const CHAVE = "35260912345678000190550010000012341000012345";

// ---------- Leitura do XML ----------

test("lê os dados da nota e dos itens de uma NF-e 4.00", () => {
  const nota = lerXmlNfe(XML);
  assert.equal(nota.chave, CHAVE);
  assert.equal(nota.numero, "1234");
  assert.equal(nota.serie, "1");
  assert.equal(nota.emitente.cnpj, "12345678000190");
  assert.equal(nota.emitente.nome, "Distribuidora Ficticia de Seguranca Ltda");
  assert.equal(nota.destinatario.cnpj, "00000000000100");
  assert.equal(nota.itens.length, 5);
  assert.deepEqual(nota.itens[0], {
    numero: 1, codigo: "LUV-778", descricao: "Luva nitrílica & látex", unidade: "PAR",
    quantidade: 10, valorUnitario: 8.5, valorTotal: 85,
  });
  assert.equal(nota.itens[2].descricao, 'Furadeira de impacto 1/2" 750W');
  assert.equal(nota.itens[4].quantidade, 2.5);
});

test("a data de emissão é a de Brasília, não a de UTC", () => {
  // 22:45 em Brasília de 29/09 já é 30/09 em UTC.
  assert.equal(lerXmlNfe(XML).dataEmissao, "2026-09-29");
  assert.equal(dataLocalBrasilia("2026-10-01T01:30:00Z"), "2026-09-30");
  assert.equal(dataLocalBrasilia("2026-10-01T01:30:00-03:00"), "2026-10-01");
  assert.equal(dataLocalBrasilia("2026-10-01"), "2026-10-01");
  assert.throws(() => dataLocalBrasilia("ontem"), /data de emissão/i);
});

test("recusa XML com DOCTYPE ou ENTITY", () => {
  const comDoctype = XML.replace("<nfeProc", '<!DOCTYPE nfeProc [<!ENTITY x "y">]>\n<nfeProc');
  assert.throws(() => lerXmlNfe(comDoctype), /DOCTYPE|ENTITY/);
  assert.throws(() => lerXmlNfe(XML.replace("Luva nitrílica &amp;", "Luva &x;")), /entidade/i);
  assert.throws(() => lerXmlNfe(XML.replace("Luva nitrílica &amp;", "Luva &toString;")), /entidade/i);
});

test("recusa arquivo que não é XML de NF-e", () => {
  assert.throws(() => lerXmlNfe("não é xml"), /XML/);
  assert.throws(() => lerXmlNfe("<nfeProc><NFe><infNFe>"), /XML/);
  assert.throws(() => lerXmlNfe("<pedido><numero>1</numero></pedido>"), /NF-e/);
  assert.throws(() => lerXmlNfe(XML.replace(/<det nItem="\d">[\s\S]*?<\/det>/g, "")), /item/i);
});

test("texto do XML é dado: marcação vira texto literal, sem ser interpretada", () => {
  const nota = lerXmlNfe(XML.replace("Camisa operacional azul", "&lt;img src=x onerror=alert(1)&gt;"));
  assert.equal(nota.itens[1].descricao, "<img src=x onerror=alert(1)>");
});

// ---------- Casamento e prévia ----------

const EMPRESA = { id: "empresa-demo", cnpj: "00.000.000/0001-00", nome_fantasia: "GEMAPE" };
const OUTRA_EMPRESA = { id: "empresa-b", cnpj: "11.111.111/0001-11", nome_fantasia: "Outra" };
const FORNECEDOR = { id: "forn-1", cnpj: "12.345.678/0001-90", nome_fantasia: "Distribuidora Ficticia" };
const codigo = (empresa_id, tabela, codigo_produto, codigo_fornecedor) => ({
  id: `cf-${codigo_fornecedor}-${empresa_id}`, empresa_id, tabela, codigo_produto, nome_produto: "",
  fornecedor_id: FORNECEDOR.id, fornecedor_nome: "", codigo_fornecedor, ca: tabela === "epis" ? "12345" : "",
});
const CODIGOS = [
  codigo("empresa-demo", "epis", "EPI-0007", "luv-778"),
  codigo("empresa-demo", "uniformes", "UNI-0003", "CAM-01"),
  codigo("empresa-demo", "ferramentas", "FER-0009", "BOS-FUR"),
  // Mesmo código do fornecedor, mas de outra empresa: não vale para esta nota.
  codigo("empresa-b", "ferramentas", "FER-0001", "PAR-999"),
];
const PRODUTOS = [
  { id: "epi-7", tabela: "epis", codigo_sku: "EPI-0007", nome: "Luva nitrílica", empresa_id: "empresa-demo" },
  { id: "uni-3", tabela: "uniformes", codigo_sku: "UNI-0003", nome: "Camisa azul", empresa_id: "empresa-demo" },
  { id: "fer-9", tabela: "ferramentas", codigo_sku: "FER-0009", nome: "Furadeira", empresa_id: "empresa-demo" },
  { id: "fer-1b", tabela: "ferramentas", codigo_sku: "FER-0001", nome: "Parafusadeira", empresa_id: "empresa-b" },
];
const preparar = (extra = {}) => prepararImportacao({
  nota: lerXmlNfe(XML), empresas: [EMPRESA, OUTRA_EMPRESA], fornecedores: [FORNECEDOR],
  codigosFabrica: CODIGOS, produtos: PRODUTOS, chavesImportadas: [], ...extra,
});

test("cada item casado vai para o módulo do produto; os demais ficam como pendência", () => {
  const previa = preparar();
  assert.equal(previa.bloqueio, null);
  assert.equal(previa.empresa.id, "empresa-demo");
  assert.equal(previa.fornecedor.id, "forn-1");
  const destinos = previa.linhas.map((l) => l.destino && `${l.destino.modulo}:${l.destino.codigo}:${l.destino.item_id}`);
  assert.deepEqual(destinos, ["epi:EPI-0007:epi-7", "uniforme:UNI-0003:uni-3", "ferramenta:FER-0009:fer-9", null, null]);
  assert.match(previa.linhas[3].pendencia, /código de fábrica/i);
  assert.match(previa.linhas[4].pendencia, /fracionada/i);
  assert.equal(previa.linhas[0].pendencia, null);
});

test("fornecedor sem cadastro deixa todos os itens pendentes", () => {
  const previa = preparar({ fornecedores: [] });
  assert.equal(previa.bloqueio, null);
  assert.ok(previa.linhas.every((l) => l.destino === null && /fornecedor/i.test(l.pendencia)));
});

test("empresa destinatária sem cadastro ou nota já importada bloqueiam a importação", () => {
  assert.match(preparar({ empresas: [OUTRA_EMPRESA] }).bloqueio, /empresa/i);
  assert.match(preparar({ chavesImportadas: [CHAVE] }).bloqueio, /já foi importada/i);
});

test("produto do código de fábrica que não existe mais fica como pendência", () => {
  const previa = preparar({ produtos: PRODUTOS.filter((p) => p.id !== "uni-3") });
  assert.equal(previa.linhas[1].destino, null);
  assert.match(previa.linhas[1].pendencia, /UNI-0003/);
});

test("avisa quando o valor do item não confere com quantidade × valor unitário", () => {
  const nota = lerXmlNfe(XML.replace("<vProd>275.00</vProd>", "<vProd>300.00</vProd>"));
  const previa = preparar({ nota });
  assert.ok(previa.avisos.some((a) => /item 2/i.test(a)));
});

// ---------- Entradas a gravar ----------

test("EPI e uniforme viram compras com a data de emissão; ferramenta vira entrada com a origem", () => {
  const entradas = montarEntradas(preparar());
  assert.equal(entradas.chave, CHAVE);
  assert.deepEqual(entradas.compras_epis, [{
    empresa_id: "empresa-demo", item_id: "epi-7", fornecedor: "Distribuidora Ficticia",
    nota_fiscal: "1234", data_compra: "2026-09-29", quantidade: 10, valor_unitario: 8.5,
    observacao: `Importada do XML da NF-e 1234, série 1, item 1 (LUV-778). Chave ${CHAVE}.`,
  }]);
  assert.equal(entradas.compras_uniformes.length, 1);
  assert.equal(entradas.compras_uniformes[0].data_compra, "2026-09-29");
  assert.equal(entradas.movimentacoes.length, 1);
  const [mov] = entradas.movimentacoes;
  assert.equal(mov.modulo, "ferramenta");
  assert.equal(mov.tipo_movimentacao, "Entrada");
  assert.equal(mov.item_id, "fer-9");
  assert.equal(mov.quantidade, 2);
  assert.equal(mov.data_movimentacao, "2026-09-29");
  assert.match(mov.observacao, /NF-e 1234, série 1/);
  assert.match(mov.observacao, /Distribuidora Ficticia/);
  assert.match(mov.observacao, /R\$ 450,00/);
});

test("não monta entradas com a importação bloqueada ou sem nenhum item casado", () => {
  assert.throws(() => montarEntradas(preparar({ chavesImportadas: [CHAVE] })), /já foi importada/i);
  assert.throws(() => montarEntradas(preparar({ fornecedores: [] })), /nenhum item/i);
});

// ---------- Gravação atômica no modo demonstração ----------

async function estoque(tabela, id) {
  const { data } = await demoSupabase.from(tabela).select("*").eq("id", id).single();
  return data.estoque_atual;
}

test("grava as entradas dos três módulos de uma vez e recusa a mesma nota de novo", async () => {
  for (const p of PRODUTOS.slice(0, 3)) {
    await demoSupabase.from(p.tabela).insert({ id: p.id, empresa_id: p.empresa_id, nome: p.nome, codigo_sku: p.codigo_sku, estoque_atual: 1 });
  }
  const entradas = montarEntradas(preparar());
  const { error } = await demoSupabase.rpc("importar_nota_fiscal", { p_entradas: entradas });
  assert.equal(error, null);
  assert.equal(await estoque("epis", "epi-7"), 11);
  assert.equal(await estoque("uniformes", "uni-3"), 6);
  assert.equal(await estoque("ferramentas", "fer-9"), 3);
  const { data: compras } = await demoSupabase.from("compras_epis").select("*").eq("item_id", "epi-7");
  assert.equal(compras[0].data_compra, "2026-09-29");
  assert.equal(compras[0].valor_total, 85);
  const { data: movs } = await demoSupabase.from("movimentacoes").select("*").eq("item_id", "fer-9");
  assert.equal(movs.length, 1);
  const { data: notas } = await demoSupabase.from("notas_fiscais_importadas").select("*").eq("chave", CHAVE);
  assert.equal(notas.length, 1);

  const repetida = await demoSupabase.rpc("importar_nota_fiscal", { p_entradas: entradas });
  assert.match(repetida.error.message, /já foi importada/i);
  assert.equal(await estoque("epis", "epi-7"), 11);
});

test("se uma parte falhar, nada da nota é gravado", async () => {
  await demoSupabase.from("epis").insert({ id: "epi-rb", empresa_id: "empresa-demo", nome: "Luva", codigo_sku: "EPI-0100", estoque_atual: 0 });
  await demoSupabase.from("ferramentas").insert({ id: "fer-rb", empresa_id: "empresa-demo", nome: "Serra", codigo_sku: "FER-0100", estoque_atual: 0 });
  const chave = "35260912345678000190550010000099991000099999";
  const entradas = {
    chave, numero: "9999", serie: "1", data_emissao: "2026-09-29", fornecedor_id: "forn-1", empresa_id: "empresa-demo",
    compras_epis: [{ empresa_id: "empresa-demo", item_id: "epi-rb", fornecedor: "X", nota_fiscal: "9999", data_compra: "2026-09-29", quantidade: 4, valor_unitario: 1, observacao: "" }],
    compras_uniformes: [],
    // Quantidade inválida na última parte: a compra de EPI já validada também não pode ficar.
    movimentacoes: [{ modulo: "ferramenta", tipo_movimentacao: "Entrada", item_id: "fer-rb", empresa_id: "empresa-demo", quantidade: 0, data_movimentacao: "2026-09-29", observacao: "" }],
  };
  const { error } = await demoSupabase.rpc("importar_nota_fiscal", { p_entradas: entradas });
  assert.ok(error);
  assert.equal(await estoque("epis", "epi-rb"), 0);
  const { data: compras } = await demoSupabase.from("compras_epis").select("*").eq("item_id", "epi-rb");
  assert.equal(compras.length, 0);
  const { data: notas } = await demoSupabase.from("notas_fiscais_importadas").select("*").eq("chave", chave);
  assert.equal(notas.length, 0);
});

// ---------- Achados do code review ----------

test("recusa datas de emissão impossíveis", () => {
  for (const data of ["2026-13-01", "0000-00-00", "2026-02-30", "2026-02-30T10:00:00-03:00", "2026-09-29T24:00:00-03:00"]) {
    assert.throws(() => dataLocalBrasilia(data), /data de emissão/i, data);
  }
  assert.equal(dataLocalBrasilia("2028-02-29T10:00:00-03:00"), "2028-02-29");
});

test("quantidade e valores só em notação decimal simples", () => {
  assert.throws(() => lerXmlNfe(XML.replace("<qCom>10.0000</qCom>", "<qCom>0x10</qCom>")), /quantidade inválido/);
  assert.throws(() => lerXmlNfe(XML.replace("<qCom>10.0000</qCom>", "<qCom>1e3</qCom>")), /quantidade inválido/);
  assert.throws(() => lerXmlNfe(XML.replace("<vProd>85.00</vProd>", "<vProd>Infinity</vProd>")), /valor total inválido/);
});

test("recusa caracteres de controle e surrogates em entidades numéricas", () => {
  for (const ent of ["&#0;", "&#xD800;", "&#1;"]) {
    assert.throws(() => lerXmlNfe(XML.replace("LUV-778</cProd>", `LUV${ent}778</cProd>`)), /entidade/i, ent);
  }
  assert.equal(lerXmlNfe(XML.replace("Luva nitrílica &amp;", "Luva&#9;nitrílica &amp;")).itens[0].descricao, "Luva\tnitrílica & látex");
});

test("recusa XML malformado que antes passava", () => {
  const casos = {
    "prefixos trocados": XML.replace("<cProd>CAM-01</cProd>", "<a:cProd>CAM-01</b:cProd>"),
    "< dentro de atributo": XML.replace('<det nItem="2">', '<det nItem="2" x="a<b">'),
    "atributo repetido": XML.replace('<det nItem="2">', '<det nItem="2" nItem="3">'),
    "CDATA fora da raiz": XML + "<![CDATA[x]]>",
  };
  for (const [nome, xml] of Object.entries(casos)) assert.throws(() => lerXmlNfe(xml), /XML/, nome);
});

test("recusa itens com numeração repetida", () => {
  assert.throws(() => lerXmlNfe(XML.replace('<det nItem="2">', '<det nItem="1">')), /item 1.*repetid/i);
});

test("observação da entrada de ferramenta respeita o limite de 500 caracteres do banco", () => {
  const longo = "X".repeat(600);
  const nota = lerXmlNfe(XML.replace("<cProd>BOS-FUR</cProd>", `<cProd>${longo}</cProd>`));
  const codigos = CODIGOS.map((c) => (c.codigo_fornecedor === "BOS-FUR" ? { ...c, codigo_fornecedor: longo } : c));
  const entradas = montarEntradas(preparar({ nota, codigosFabrica: codigos }));
  assert.ok(entradas.movimentacoes[0].observacao.length <= 500);
  assert.ok(entradas.compras_epis[0].observacao.length <= 500);
});

test("a operação do demo recusa importação vazia, quantidade fracionada e produto de outra empresa", async () => {
  await demoSupabase.from("epis").insert({ id: "epi-val", empresa_id: "empresa-demo", nome: "Luva", codigo_sku: "EPI-0200", estoque_atual: 0 });
  await demoSupabase.from("epis").insert({ id: "epi-outra", empresa_id: "empresa-b", nome: "Luva", codigo_sku: "EPI-0201", estoque_atual: 0 });
  const base = (n, extra) => ({
    chave: `352609123456780001905500100000${String(n).padStart(4, "0")}1000099999`, numero: String(n), serie: "1",
    data_emissao: "2026-09-29", fornecedor_id: "forn-1", empresa_id: "empresa-demo",
    compras_epis: [], compras_uniformes: [], movimentacoes: [], ...extra,
  });
  const compra = (item_id, quantidade) => ({ empresa_id: "empresa-demo", item_id, fornecedor: "X", nota_fiscal: "1", data_compra: "2026-09-29", quantidade, valor_unitario: 1, observacao: "" });
  const casos = [
    base(1, {}),
    base(2, { compras_epis: [compra("epi-val", 2.5)] }),
    base(3, { compras_epis: [compra("epi-outra", 1)] }),
  ];
  for (const entradas of casos) {
    const { error } = await demoSupabase.rpc("importar_nota_fiscal", { p_entradas: entradas });
    assert.ok(error, entradas.numero);
    const { data: notas } = await demoSupabase.from("notas_fiscais_importadas").select("*").eq("chave", entradas.chave);
    assert.equal(notas.length, 0);
  }
  assert.equal(await estoque("epis", "epi-val"), 0);
  assert.equal(await estoque("epis", "epi-outra"), 0);
});
