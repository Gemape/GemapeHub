import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { lerXmlNfe } from "../src/lib/nfe-xml.ts";
import { prepararImportacao } from "../src/lib/importacao-nfe.ts";
import { lerParametros, salvarCodigoFabrica } from "../src/lib/parametros-base.ts";
import { associarItemNfe, prepararAssociacoes } from "../src/lib/associacao-nfe.ts";
import { demoSupabase } from "../src/integrations/supabase/demo-client.ts";

const XML = readFileSync(new URL("./fixtures/nfe-4.00-exemplo.xml", import.meta.url), "utf8");
const NOTA = lerXmlNfe(XML);

const EMPRESA = { id: "empresa-demo", cnpj: "00.000.000/0001-00", nome_fantasia: "GEMAPE" };
const OUTRA_EMPRESA = { id: "empresa-b", cnpj: "11.111.111/0001-11", nome_fantasia: "Outra" };
const FORNECEDOR = { id: "forn-1", cnpj: "12.345.678/0001-90", nome_fantasia: "Distribuidora Ficticia" };
const PRODUTOS = [
  { id: "epi-7", tabela: "epis", codigo_sku: "EPI-0007", nome: "Luva nitrílica", empresa_id: "empresa-demo" },
  { id: "uni-3", tabela: "uniformes", codigo_sku: "UNI-0003", nome: "Camisa azul", empresa_id: "empresa-demo" },
  { id: "fer-9", tabela: "ferramentas", codigo_sku: "FER-0009", nome: "Furadeira", empresa_id: "empresa-demo" },
  { id: "fer-1b", tabela: "ferramentas", codigo_sku: "FER-0001", nome: "Parafusadeira", empresa_id: "empresa-b" },
];

const storage = () => {
  const dados = new Map();
  return { getItem: (chave) => dados.get(chave) ?? null, setItem: (chave, valor) => dados.set(chave, valor) };
};
const preparar = (s, extra = {}) =>
  prepararAssociacoes({
    nota: NOTA,
    empresas: [EMPRESA, OUTRA_EMPRESA],
    fornecedores: [FORNECEDOR],
    codigosFabrica: lerParametros(s).codigosFabrica,
    produtos: PRODUTOS,
    ...extra,
  });
const linhaDo = (previa, codigo) => previa.linhas.find((l) => l.codigo === codigo);

test("importar o XML lista os itens da nota com código e descrição do fornecedor", () => {
  const previa = preparar(storage());
  assert.equal(previa.bloqueio, null);
  assert.equal(previa.fornecedor.id, "forn-1");
  assert.equal(previa.empresa.id, "empresa-demo");
  // O item 5 repete o código LUV-778 do item 1: uma associação vale para os dois.
  assert.deepEqual(previa.linhas.map((l) => l.codigo), ["LUV-778", "CAM-01", "BOS-FUR", "PAR-999"]);
  assert.deepEqual(linhaDo(previa, "LUV-778").itens, [1, 5]);
  assert.equal(linhaDo(previa, "LUV-778").descricao, "Luva nitrílica & látex");
  assert.equal(linhaDo(previa, "BOS-FUR").descricao, 'Furadeira de impacto 1/2" 750W');
  assert.ok(previa.linhas.every((l) => l.status === "pendente" && l.associacao === null));
});

test("associar grava a associação com fornecedor, empresa e produto escolhidos", () => {
  const s = storage();
  const salva = associarItemNfe({ previa: preparar(s), codigo: "BOS-FUR", produto: PRODUTOS[2], storage: s });
  assert.equal(salva.codigo_fornecedor, "BOS-FUR");
  assert.equal(salva.codigo_produto, "FER-0009");
  assert.equal(salva.tabela, "ferramentas");
  assert.equal(salva.empresa_id, "empresa-demo");
  assert.equal(salva.fornecedor_id, "forn-1");
  assert.equal(salva.fornecedor_nome, "Distribuidora Ficticia");
  assert.equal(salva.nome_produto, "Furadeira");
  assert.equal(salva.ca, "");
  assert.equal(lerParametros(s).codigosFabrica.length, 1);
});

test("item associado aparece como vinculado e o novo continua pendente", () => {
  const s = storage();
  associarItemNfe({ previa: preparar(s), codigo: "CAM-01", produto: PRODUTOS[1], storage: s });
  const previa = preparar(s);
  const vinculada = linhaDo(previa, "CAM-01");
  assert.equal(vinculada.status, "vinculado");
  assert.equal(vinculada.produto.codigo_sku, "UNI-0003");
  assert.equal(linhaDo(previa, "PAR-999").status, "pendente");
  // Código com outra caixa do mesmo texto também é o mesmo código.
  assert.equal(preparar(s, { nota: { ...NOTA, itens: [{ ...NOTA.itens[1], codigo: "cam-01" }] } }).linhas[0].status, "vinculado");
});

test("a associação vale para as próximas notas do mesmo fornecedor", () => {
  const s = storage();
  associarItemNfe({ previa: preparar(s), codigo: "CAM-01", produto: PRODUTOS[1], storage: s });
  const proxima = { ...NOTA, chave: "9".repeat(44), numero: "4321", itens: [{ ...NOTA.itens[1], numero: 1, quantidade: 3 }] };
  assert.equal(preparar(s, { nota: proxima }).linhas[0].status, "vinculado");
});

test("EPI exige o CA da nota; os outros módulos ignoram o CA", () => {
  const s = storage();
  assert.throws(() => associarItemNfe({ previa: preparar(s), codigo: "LUV-778", produto: PRODUTOS[0], storage: s }), /CA/);
  assert.equal(lerParametros(s).codigosFabrica.length, 0);
  const salva = associarItemNfe({ previa: preparar(s), codigo: "LUV-778", produto: PRODUTOS[0], ca: " 12345 ", storage: s });
  assert.equal(salva.ca, "12345");
  const uniforme = associarItemNfe({ previa: preparar(s), codigo: "CAM-01", produto: PRODUTOS[1], ca: "999", storage: s });
  assert.equal(uniforme.ca, "");
});

test("recusa produto de outra empresa, código fora da nota e item já vinculado", () => {
  const s = storage();
  assert.throws(
    () => associarItemNfe({ previa: preparar(s), codigo: "PAR-999", produto: PRODUTOS[3], storage: s }),
    /empresa/i,
  );
  assert.throws(
    () => associarItemNfe({ previa: preparar(s), codigo: "XXX-1", produto: PRODUTOS[2], storage: s }),
    /não está na nota/i,
  );
  associarItemNfe({ previa: preparar(s), codigo: "BOS-FUR", produto: PRODUTOS[2], storage: s });
  assert.throws(
    () => associarItemNfe({ previa: preparar(s), codigo: "BOS-FUR", produto: PRODUTOS[2], storage: s }),
    /já está vinculado/i,
  );
  assert.equal(lerParametros(s).codigosFabrica.length, 1);
});

test("empresa ou fornecedor sem cadastro bloqueiam a associação", () => {
  const s = storage();
  const semFornecedor = preparar(s, { fornecedores: [] });
  assert.match(semFornecedor.bloqueio, /Fornecedores/);
  assert.throws(
    () => associarItemNfe({ previa: semFornecedor, codigo: "BOS-FUR", produto: PRODUTOS[2], storage: s }),
    /Fornecedores/,
  );
  const semEmpresa = preparar(s, { empresas: [OUTRA_EMPRESA] });
  assert.match(semEmpresa.bloqueio, /empresa/i);
  assert.throws(
    () => associarItemNfe({ previa: semEmpresa, codigo: "BOS-FUR", produto: PRODUTOS[2], storage: s }),
    /empresa/i,
  );
  assert.equal(lerParametros(s).codigosFabrica.length, 0);
});

test("associação cujo produto foi apagado pede nova escolha e troca a associação, sem duplicar", () => {
  const s = storage();
  associarItemNfe({ previa: preparar(s), codigo: "BOS-FUR", produto: PRODUTOS[2], storage: s });
  const semProduto = preparar(s, { produtos: PRODUTOS.filter((p) => p.id !== "fer-9") });
  const linha = linhaDo(semProduto, "BOS-FUR");
  assert.equal(linha.status, "reassociar");
  assert.match(linha.motivo, /FER-0009/);
  const novoProduto = { id: "fer-10", tabela: "ferramentas", codigo_sku: "FER-0010", nome: "Furadeira nova", empresa_id: "empresa-demo" };
  associarItemNfe({
    previa: preparar(s, { produtos: [...PRODUTOS.filter((p) => p.id !== "fer-9"), novoProduto] }),
    codigo: "BOS-FUR",
    produto: novoProduto,
    storage: s,
  });
  const todas = lerParametros(s).codigosFabrica;
  assert.equal(todas.length, 1);
  assert.equal(todas[0].codigo_produto, "FER-0010");
});

test("a tela do código de fábrica só cria associações: não mexe em estoque nem em notas", async () => {
  await demoSupabase.from("epis").insert({ id: "epi-7", empresa_id: "empresa-demo", nome: "Luva", codigo_sku: "EPI-0007", estoque_atual: 4 });
  await demoSupabase.from("ferramentas").insert({ id: "fer-9", empresa_id: "empresa-demo", nome: "Furadeira", codigo_sku: "FER-0009", estoque_atual: 2 });
  const s = storage();
  associarItemNfe({ previa: preparar(s), codigo: "LUV-778", produto: PRODUTOS[0], ca: "12345", storage: s });
  associarItemNfe({ previa: preparar(s), codigo: "BOS-FUR", produto: PRODUTOS[2], storage: s });
  const estoque = async (tabela, id) =>
    (await demoSupabase.from(tabela).select("*").eq("id", id).single()).data.estoque_atual;
  assert.equal(await estoque("epis", "epi-7"), 4);
  assert.equal(await estoque("ferramentas", "fer-9"), 2);
  for (const tabela of ["compras_epis", "compras_uniformes", "movimentacoes", "notas_fiscais_importadas"]) {
    const { data } = await demoSupabase.from(tabela).select("*");
    assert.equal((data ?? []).length, 0, tabela);
  }
});

test("a entrada da nota no módulo casa os itens com as associações criadas na tela", () => {
  const s = storage();
  associarItemNfe({ previa: preparar(s), codigo: "LUV-778", produto: PRODUTOS[0], ca: "12345", storage: s });
  associarItemNfe({ previa: preparar(s), codigo: "BOS-FUR", produto: PRODUTOS[2], storage: s });
  const importacao = prepararImportacao({
    nota: NOTA,
    empresas: [EMPRESA],
    fornecedores: [FORNECEDOR],
    codigosFabrica: lerParametros(s).codigosFabrica,
    produtos: PRODUTOS,
    chavesImportadas: [],
  });
  const destinos = importacao.linhas.map((l) => l.destino && l.destino.codigo);
  assert.deepEqual(destinos, ["EPI-0007", null, "FER-0009", null, null]);
});

test("item sem associação na entrada do módulo continua pendente e indica onde associar", () => {
  const s = storage();
  salvarCodigoFabrica(
    { empresa_id: "empresa-demo", tabela: "epis", codigo_produto: "EPI-0007", nome_produto: "Luva", fornecedor_id: "forn-1", fornecedor_nome: "X", codigo_fornecedor: "LUV-778", ca: "1" },
    undefined,
    s,
  );
  const importacao = prepararImportacao({
    nota: NOTA,
    empresas: [EMPRESA],
    fornecedores: [FORNECEDOR],
    codigosFabrica: lerParametros(s).codigosFabrica,
    produtos: PRODUTOS,
    chavesImportadas: [],
  });
  const camisa = importacao.linhas[1];
  assert.equal(camisa.destino, null);
  assert.match(camisa.pendencia, /CAM-01/);
  assert.match(camisa.pendencia, /Cadastros > Gerais > Código de fábrica/);
});

test("a tela Código de fábrica não oferece importar XML e mantém associação manual", () => {
  const raiz = new URL("../src/", import.meta.url);
  const tela = readFileSync(new URL("routes/_authenticated/cadastros/gerais/codigo-fabrica.tsx", raiz), "utf8");
  assert.doesNotMatch(tela, /ImportarNfeCodigoFabrica|Importar NF-e \(XML\)/);
  assert.match(tela, /Nova associação/);
  const leitor = readFileSync(new URL("components/parametros/ImportarNfeCodigoFabrica.tsx", raiz), "utf8");
  assert.match(leitor, /Importar NF-e \(XML\)/);
  assert.match(leitor, /lerXmlNfe/);
  assert.doesNotMatch(leitor, /importar_nota_fiscal|\.rpc\(|montarEntradas|compras_epis|movimentacoes/);
});

test("associar confere de novo se fornecedor e produto ainda existem", () => {
  const s = storage();
  const previa = preparar(s);
  assert.throws(
    () => associarItemNfe({ previa, codigo: "BOS-FUR", produto: PRODUTOS[2], storage: s, fornecedoresAtuais: [] }),
    /fornecedor.*não está mais cadastrado/i,
  );
  assert.throws(
    () => associarItemNfe({ previa, codigo: "BOS-FUR", produto: PRODUTOS[2], storage: s, produtosAtuais: [PRODUTOS[0]] }),
    /FER-0009.*não está mais cadastrado/,
  );
  assert.equal(lerParametros(s).codigosFabrica.length, 0);
  const ok = associarItemNfe({
    previa,
    codigo: "BOS-FUR",
    produto: PRODUTOS[2],
    storage: s,
    fornecedoresAtuais: [FORNECEDOR],
    produtosAtuais: PRODUTOS,
  });
  assert.equal(ok.codigo_produto, "FER-0009");
});

test("códigos que só diferem na pontuação não repetem o id dos campos", () => {
  const raiz = new URL("../src/", import.meta.url);
  const fonte = readFileSync(new URL("components/parametros/ImportarNfeCodigoFabrica.tsx", raiz), "utf8");
  assert.match(fonte, /useId\(\)/);
  assert.doesNotMatch(fonte, /replace\(\/\[\^a-zA-Z0-9_-\]\/g/);
});

test("falha ao carregar os produtos mostra erro e não monta a prévia", () => {
  const raiz = new URL("../src/", import.meta.url);
  const fonte = readFileSync(new URL("components/parametros/ImportarNfeCodigoFabrica.tsx", raiz), "utf8");
  assert.match(fonte, /const \{ data: produtosLidos, error: erroProdutos \} = await refetch\(\)/);
  assert.match(fonte, /Não foi possível carregar os produtos/);
  assert.doesNotMatch(fonte, /travado/);
  assert.match(fonte, /rotulo=\{`Produto para o código/);
});
