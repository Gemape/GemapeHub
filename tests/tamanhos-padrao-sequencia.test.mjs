import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  adicionarOpcao,
  cadastrarTamanhosPadrao,
  lerParametros,
} from "../src/lib/parametros-base.ts";
import { TAMANHOS_PADRAO, posicaoEmSequencia } from "../src/lib/tamanhos-padrao.ts";
import { tamanhosDoCadastro } from "../src/lib/estoque-tamanho.ts";

const storage = (inicial) => {
  const dados = new Map();
  if (inicial) dados.set("gemape-demo-parametros-base", JSON.stringify(inicial));
  return { getItem: (chave) => dados.get(chave) ?? null, setItem: (chave, valor) => dados.set(chave, valor) };
};
const nomes = (s) => lerParametros(s).tamanhos.map((t) => t.nome);

const LETRAS = ["Único", "PP", "P", "M", "G", "GG", "XG", "XGG", "G1", "G2", "G3", "G4"];
const NUMEROS = [
  ...[6, 7, 8, 9, 10, 11, 12],
  ...Array.from({ length: 16 }, (_, i) => 33 + i),
  ...[50, 52, 54, 56, 58, 60],
].map(String);

test("o cadastro padrão traz todas as letras e numerações possíveis, em sequência", () => {
  assert.deepEqual(TAMANHOS_PADRAO, [...LETRAS, ...NUMEROS]);
  assert.deepEqual(nomes(storage()), [...LETRAS, ...NUMEROS]);
  assert.equal(new Set(TAMANHOS_PADRAO.map((n) => n.toLowerCase())).size, TAMANHOS_PADRAO.length);
});

test("os ids antigos continuam os mesmos (as associações já gravadas seguem valendo)", () => {
  const ids = lerParametros(storage()).tamanhos.map((t) => t.id);
  for (const id of ["tam-unico", "tam-pp", "tam-p", "tam-m", "tam-g", "tam-gg", "tam-xgg", "tam-37", "tam-44"]) {
    assert.ok(ids.includes(id), id);
  }
});

test("tamanho novo entra na posição da sequência, não no fim", () => {
  const s = storage();
  adicionarOpcao("tamanhos", "49", s);
  adicionarOpcao("tamanhos", "5", s);
  adicionarOpcao("tamanhos", "PPP", s);
  adicionarOpcao("tamanhos", "Especial", s);
  const lista = nomes(s);
  assert.equal(lista[lista.indexOf("49") - 1], "48");
  assert.equal(lista[lista.indexOf("49") + 1], "50");
  assert.equal(lista[lista.indexOf("5") + 1], "6");
  assert.equal(lista[lista.indexOf("PPP") + 1], "PP");
  assert.equal(lista[lista.length - 1], "Especial");
});

test("a posição na sequência entende letras, números e o que não conhece", () => {
  const lista = [{ nome: "Único" }, { nome: "P" }, { nome: "M" }, { nome: "40" }, { nome: "Meu" }];
  assert.equal(posicaoEmSequencia(lista, "G"), 3);
  assert.equal(posicaoEmSequencia(lista, "38"), 3);
  assert.equal(posicaoEmSequencia(lista, "42"), 4);
  assert.equal(posicaoEmSequencia(lista, "Outro"), 5);
  assert.equal(posicaoEmSequencia(lista, "37,5"), 3);
});

test("cadastrar os tamanhos padrão completa a lista salva, sem repetir nem apagar", () => {
  const salvo = lerParametros(storage());
  salvo.tamanhos = [
    { id: "tam-m", nome: "M" },
    { id: "tam-40", nome: "40" },
    { id: "meu-1", nome: "Meu tamanho" },
  ];
  const s = storage(salvo);
  const adicionados = cadastrarTamanhosPadrao(s);
  assert.equal(adicionados, TAMANHOS_PADRAO.length - 2);
  const lista = nomes(s);
  assert.equal(lista.length, TAMANHOS_PADRAO.length + 1);
  assert.deepEqual(lista.filter((n) => n !== "Meu tamanho"), [...TAMANHOS_PADRAO]);
  assert.equal(lista[lista.length - 1], "Meu tamanho");
  // Os ids já gravados continuam, e o que já existia não ganha cópia.
  const ids = lerParametros(s).tamanhos.map((t) => t.id);
  assert.ok(ids.includes("tam-m") && ids.includes("tam-40") && ids.includes("meu-1"));
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(cadastrarTamanhosPadrao(s), 0);
});

test("não cria cópia de um tamanho que só difere na caixa das letras", () => {
  const salvo = lerParametros(storage());
  salvo.tamanhos = [{ id: "x1", nome: "xgg" }];
  const s = storage(salvo);
  cadastrarTamanhosPadrao(s);
  assert.equal(nomes(s).filter((n) => n.toLowerCase() === "xgg").length, 1);
});

test("a lista de EPI e Uniforme mostra os tamanhos escolhidos no cadastro, na ordem de Gerais", () => {
  const p = lerParametros(storage());
  const botina = { id: "e1", nome: "Botina", subcategoria_id: "sub-epi-botina" };
  assert.deepEqual(tamanhosDoCadastro(p, "epi", botina), ["37", "38", "39", "40", "41", "42", "43"]);
  assert.deepEqual(
    tamanhosDoCadastro(p, "epi", { ...botina, tamanhos_selecionados: ["tam-42", "tam-38"] }),
    ["38", "42"],
  );
  assert.deepEqual(tamanhosDoCadastro(p, "epi", { ...botina, tamanhos_selecionados: [] }), []);
  const semAssociacao = { id: "e2", nome: "Capacete", subcategoria_id: "sub-epi-capacete" };
  assert.deepEqual(tamanhosDoCadastro(p, "epi", semAssociacao), []);
});

test("tamanho desativado continua aparecendo na lista, marcado", () => {
  const p = lerParametros(storage());
  p.inativos = ["tam-40"];
  const botina = { id: "e1", nome: "Botina", subcategoria_id: "sub-epi-botina", tamanhos_selecionados: ["tam-40", "tam-41"] };
  assert.deepEqual(tamanhosDoCadastro(p, "epi", botina), ["40 (desativado)", "41"]);
});

test("a tela de cadastro tem a coluna Tamanhos e Gerais tem o botão de cadastrar os padrões", () => {
  const raiz = new URL("../src/", import.meta.url);
  const cadastro = readFileSync(new URL("components/modules/CadastroProduto.tsx", raiz), "utf8");
  assert.match(cadastro, /<TableHead>Tamanhos<\/TableHead>/);
  assert.match(cadastro, /tamanhosDoCadastro/);
  const gerais = readFileSync(new URL("routes/_authenticated/cadastros/gerais/tamanhos-unidades.tsx", raiz), "utf8");
  assert.match(gerais, /Cadastrar tamanhos padrão/);
  assert.match(gerais, /cadastrarTamanhosPadrao/);
});
