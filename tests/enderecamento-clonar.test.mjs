import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { lerParametros, salvarEnderecamentoCategoria } from "../src/lib/parametros-base.ts";
import { montarClonagemEndereco } from "../src/lib/enderecamento-categoria.ts";

const storage = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const s = storage();
salvarEnderecamentoCategoria("cat-epi", "opcional", s);
salvarEnderecamentoCategoria("cat-uniformes", "opcional", s);
const dados = lerParametros(s);

const PRODUTOS = [
  { tabela: "epis", codigo_sku: "EPI-0001", nome: "Luva P", empresa_id: "a" },
  { tabela: "epis", codigo_sku: "EPI-0002", nome: "Luva M", empresa_id: "a" },
  { tabela: "epis", codigo_sku: "EPI-0003", nome: "Luva G", empresa_id: "b" },
  { tabela: "uniformes", codigo_sku: "UNI-0001", nome: "Camisa", empresa_id: "a" },
  { tabela: "ferramentas", codigo_sku: "FER-0001", nome: "Chave", empresa_id: "a" },
];
const ENDERECOS = [
  { id: "e1", empresa_id: "a", codigo_produto: "EPI-0001", rua: "A", prateleira: "3", apartamento: "2" },
  { id: "e2", empresa_id: "a", codigo_produto: "UNI-0001", rua: "B", prateleira: "1", apartamento: "1" },
];
const destino = { tabela: "epis", codigo_sku: "EPI-0002", empresa_id: "a" };
const clonar = (extra = {}) =>
  montarClonagemEndereco({ destino, codigoOrigem: "EPI-0001", produtos: PRODUTOS, enderecos: ENDERECOS, dados, ...extra });

test("clonar copia rua, número e apartamento do item de origem para o destino", () => {
  assert.deepEqual(clonar(), {
    empresa_id: "a", codigo_produto: "EPI-0002", rua: "A", prateleira: "3", apartamento: "2",
  });
});

test("o código de origem não diferencia maiúsculas e ignora espaços", () => {
  assert.equal(clonar({ codigoOrigem: "  epi-0001 " }).rua, "A");
});

test("clonar exige o código de origem e recusa a origem igual ao destino", () => {
  assert.throws(() => clonar({ codigoOrigem: "  " }), /Informe o código do item de origem/);
  assert.throws(() => clonar({ codigoOrigem: "EPI-0002" }), /mesmo item/);
});

test("a origem precisa existir na empresa do destino e na mesma categoria", () => {
  assert.throws(() => clonar({ codigoOrigem: "EPI-9999" }), /não encontrado/);
  assert.throws(() => clonar({ codigoOrigem: "EPI-0003" }), /não encontrado/); // outra empresa
  assert.throws(() => clonar({ codigoOrigem: "UNI-0001" }), /mesma categoria/);
});

test("a origem precisa ter endereço e o destino não pode ter este endereço", () => {
  assert.throws(() => clonar({ enderecos: [] }), /não tem endereço/);
  const jaTem = [...ENDERECOS, { id: "e3", empresa_id: "a", codigo_produto: "EPI-0002", rua: "a", prateleira: "3", apartamento: "2" }];
  assert.throws(() => clonar({ enderecos: jaTem }), /já está neste endereço/);
});

test("categoria que não usa endereçamento não recebe clone", () => {
  assert.throws(
    () => clonar({ destino: { tabela: "ferramentas", codigo_sku: "FER-0001", empresa_id: "a" }, codigoOrigem: "FER-0002" }),
    /não usa endereçamento/,
  );
});

test("a tela tem o botão Clonar com a pergunta do código de origem e trava o clique repetido", () => {
  const tela = readFileSync(new URL("../src/components/modules/EnderecamentoModulo.tsx", import.meta.url), "utf8");
  assert.match(tela, /montarClonagemEndereco/);
  assert.match(tela, />Clonar</);
  assert.match(tela, /código do item de origem/i);
  assert.match(tela, /disabled=\{!origemClone \|\| salvar\.isPending\}/);
  assert.match(tela, /clonandoAgora\.current/);
});

test("origem com mais de um endereço copia o primeiro", () => {
  const extra = [{ id: "e0", empresa_id: "a", codigo_produto: "EPI-0001", rua: "Z", prateleira: "9", apartamento: "9" }];
  const copia = clonar({ enderecos: [...ENDERECOS, ...extra] });
  assert.equal(copia.rua, "A");
});
