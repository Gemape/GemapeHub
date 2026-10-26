import test, { before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { demoSupabase } from "../src/integrations/supabase/demo-client.ts";

// O sistema começa sem empresas: o estoque do catálogo nasce em cada empresa cadastrada, então o teste cadastra uma.
before(async () => {
  await demoSupabase.from("empresas").insert({ id: "empresa-do-teste", nome_fantasia: "Empresa do teste", razao_social: "Empresa do teste Ltda", cnpj: "00.000.000/0001-00", status: "Ativa" });
});
import {
  TABELAS_UNIFORME,
  editarEpiCatalogo,
  excluirEpiCatalogo,
  montarClonagemEpi,
  montarNovoEpi,
  sincronizarEstoqueEpis,
} from "../src/lib/epi-catalogo.ts";

let contador = 0;
const novo = (extra = {}) => ({
  id: crypto.randomUUID(), codigo_sku: `UNI-9${String(++contador).padStart(3, "0")}`, nome: `Camisa ${crypto.randomUUID()}`,
  categoria: "Camisa", subcategoria_id: "sub-uniformes-camisa", unidade_id: null, unidade_medida: null,
  tamanho_id: "t-m", estoque_minimo: 4, status: "Ativo", ...extra,
});

test("gravar um uniforme no catálogo cria o estoque de cada empresa, com saldo zero e o mínimo", async () => {
  const u = novo();
  const { error } = await demoSupabase.from("uniformes_catalogo").insert(u);
  assert.equal(error, null);
  const { data } = await demoSupabase.from("uniformes").select("*").eq("catalogo_id", u.id);
  const { data: empresas } = await demoSupabase.from("empresas").select("*");
  assert.equal(data.length, empresas.length);
  assert.ok(data.every((l) => l.estoque_atual === 0 && l.estoque_minimo === 4 && l.codigo_sku === u.codigo_sku));
  assert.deepEqual(data[0].tamanhos_selecionados, ["t-m"]);
  // O catálogo de EPI não é tocado.
  const { data: epis } = await demoSupabase.from("epis").select("*").eq("catalogo_id", u.id);
  assert.equal(epis.length, 0);
});

test("o catálogo de uniforme recusa o mesmo uniforme no mesmo tamanho e o mesmo código", async () => {
  const u = novo();
  await demoSupabase.from("uniformes_catalogo").insert(u);
  const repetido = await demoSupabase.from("uniformes_catalogo").insert(novo({ nome: u.nome.toUpperCase() }));
  assert.match(String(repetido.error?.message), /Este uniforme já está cadastrado neste tamanho/);
  const mesmoCodigo = await demoSupabase.from("uniformes_catalogo").insert(novo({ codigo_sku: u.codigo_sku, tamanho_id: "t-g" }));
  assert.match(String(mesmoCodigo.error?.message), /código/i);
  const outroTamanho = await demoSupabase.from("uniformes_catalogo").insert(novo({ nome: u.nome, tamanho_id: "t-g" }));
  assert.equal(outroTamanho.error, null);
});

test("editar e excluir uniforme pelas operações do catálogo; a exclusão direta é recusada", async () => {
  const u = novo();
  await demoSupabase.from("uniformes_catalogo").insert(u);
  const direto = await demoSupabase.from("uniformes_catalogo").delete().eq("id", u.id);
  assert.match(String(direto.error?.message), /Uniforme do catálogo não pode ser excluído direto/);
  const edicao = await demoSupabase.rpc("editar_uniforme_catalogo", { p_id: u.id, p_valores: { nome: "Camisa polo azul", estoque_minimo: "7" } });
  assert.equal(edicao.error, null);
  const { data } = await demoSupabase.from("uniformes").select("*").eq("catalogo_id", u.id);
  assert.ok(data.every((l) => l.nome === "Camisa polo azul" && l.estoque_minimo === 7));
  const exclusao = await demoSupabase.rpc("excluir_uniforme_catalogo", { p_id: u.id });
  assert.equal(exclusao.error, null);
  const { data: depois } = await demoSupabase.from("uniformes").select("*").eq("catalogo_id", u.id);
  assert.equal(depois.length, 0);
});

test("as funções do catálogo falam em uniforme quando recebem as tabelas de uniforme", () => {
  const dados = { empresas: [{ id: "e1" }], uniformes_catalogo: [{ id: "c1", codigo_sku: "UNI-0001", nome: "Camisa", tamanho_id: "t-m", estoque_minimo: 2 }], uniformes: [] };
  assert.equal(sincronizarEstoqueEpis(dados, () => "x", "agora", TABELAS_UNIFORME), true);
  assert.equal(dados.uniformes.length, 1);
  assert.equal(dados.epis, undefined);
  assert.equal(editarEpiCatalogo(dados, "nao-existe", { nome: "x", estoque_minimo: 1 }, TABELAS_UNIFORME).erro, "Uniforme não encontrado.");
  dados.uniformes[0].estoque_atual = 3;
  assert.match(excluirEpiCatalogo(dados, "c1", TABELAS_UNIFORME).erro, /^Este uniforme tem saldo/);
  const base = { subcategoria: { id: "s", nome: "Camisa" }, unidade: null, tamanhoId: "t-m", minimo: 1, catalogo: dados.uniformes_catalogo, codigo: "UNI-0002", pedeTamanho: true, nomeProduto: "uniforme" };
  assert.throws(() => montarNovoEpi({ ...base, nome: "camisa" }), /Já existe um uniforme com esta descrição/);
  assert.throws(() => montarClonagemEpi({ origem: dados.uniformes_catalogo[0], tamanhoId: "t-m", minimo: 1, catalogo: dados.uniformes_catalogo, codigo: "UNI-0003", nomeProduto: "uniforme" }), /Este uniforme já está cadastrado neste tamanho/);
});

test("Cadastrar Uniforme: tela do catálogo, menu em Parâmetros e endereço antigo redirecionado", () => {
  const tela = readFileSync("src/components/modules/CadastroUniforme.tsx", "utf8");
  assert.match(tela, /uniformes_catalogo/);
  assert.match(tela, /editar_uniforme_catalogo/);
  assert.match(tela, /<AcoesLinha/);
  assert.match(tela, /Novo uniforme/);
  assert.doesNotMatch(tela, /epis_catalogo|"epis"/);
  const menu = readFileSync("src/lib/menu-parametros.ts", "utf8");
  assert.match(menu, /url: "\/uniformes-cadastrar"/);
  const sidebar = readFileSync("src/components/layout/AppSidebar.tsx", "utf8");
  assert.match(sidebar, /<MenuUniformes pathname=\{pathname\} \/>/);
  assert.doesNotMatch(sidebar, /url: "\/cadastros\/uniformes"/);
});
