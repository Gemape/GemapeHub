import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { demoSupabase } from "../src/integrations/supabase/demo-client.ts";
import {
  TOTAL_CAIXAS,
  caixasHabilitadas,
  codigoCaixa,
  numeroDaCaixa,
  numerosDisponiveis,
  rotuloNumeroCaixa,
  validarHabilitacao,
  validarNumeroCaixa,
} from "../src/lib/caixas-habilitadas.ts";
import { lerParametros, salvarCaixasHabilitadas } from "../src/lib/parametros-base.ts";

const storage = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};

const caixa = (id, numero, extra = {}) => ({
  id,
  nome: `Caixa ${numero}`,
  codigo: numero ? codigoCaixa(numero) : null,
  codigo_num: numero,
  ...extra,
});

test("caixas numeradas de 01 a 100, com código CX-0001 a CX-0100", () => {
  assert.equal(TOTAL_CAIXAS, 100);
  assert.equal(codigoCaixa(1), "CX-0001");
  assert.equal(codigoCaixa(100), "CX-0100");
  assert.equal(rotuloNumeroCaixa(7), "07");
  assert.equal(rotuloNumeroCaixa(100), "100");
  assert.equal(numeroDaCaixa({ codigo_num: 12, codigo: "CX-0012" }), 12);
  // Caixa antiga sem codigo_num: o número vem do código.
  assert.equal(numeroDaCaixa({ codigo_num: null, codigo: "CX-0034" }), 34);
  assert.equal(numeroDaCaixa({ codigo_num: null, codigo: null }), null);
  assert.equal(numeroDaCaixa({ codigo_num: 150, codigo: "CX-0150" }), null);
});

test("a habilitação só aceita números de 1 a 100", () => {
  assert.equal(validarHabilitacao([1, 2, 100], []), null);
  assert.match(validarHabilitacao([0], []), /1 a 100/);
  assert.match(validarHabilitacao([101], []), /1 a 100/);
  assert.match(validarHabilitacao([2.5], []), /1 a 100/);
});

test("não desabilita uma caixa já cadastrada", () => {
  const cadastradas = [caixa("a", 5, { nome: "Kit Elétrica" })];
  assert.equal(validarHabilitacao([5, 6], cadastradas), null);
  assert.equal(
    validarHabilitacao([6], cadastradas),
    "A caixa CX-0005 está cadastrada e não pode ser desabilitada. Exclua a caixa antes.",
  );
});

test("salvar a habilitação grava de uma vez, em ordem e sem repetição", () => {
  const s = storage();
  assert.deepEqual(lerParametros(s).caixasHabilitadas, []);
  salvarCaixasHabilitadas([3, 1, 3, 2], [], s);
  assert.deepEqual(lerParametros(s).caixasHabilitadas, [1, 2, 3]);
  // Recusada: nada muda.
  assert.throws(() => salvarCaixasHabilitadas([1], [caixa("x", 2)], s), /CX-0002/);
  assert.deepEqual(lerParametros(s).caixasHabilitadas, [1, 2, 3]);
});

test("sem conseguir ler as caixas cadastradas, a habilitação não é gravada", () => {
  const s = storage();
  salvarCaixasHabilitadas([1, 2], [], s);
  assert.throws(() => salvarCaixasHabilitadas([1], null, s), /Não foi possível ler as caixas/);
  assert.deepEqual(lerParametros(s).caixasHabilitadas, [1, 2]);
});

test("o cadastro de caixa oferece só números habilitados e livres", () => {
  const cadastradas = [caixa("a", 1), caixa("b", 3)];
  assert.deepEqual(numerosDisponiveis([1, 2, 3, 4], cadastradas), [2, 4]);
  // Na edição, o número da própria caixa continua disponível.
  assert.deepEqual(numerosDisponiveis([1, 2, 3, 4], cadastradas, "b"), [2, 3, 4]);
});

test("número da caixa: obrigatório, habilitado e sem repetir", () => {
  const cadastradas = [caixa("a", 1)];
  assert.match(validarNumeroCaixa(null, [1, 2], cadastradas), /número da caixa/i);
  assert.match(validarNumeroCaixa(5, [1, 2], cadastradas), /CX-0005 não está habilitada/);
  assert.match(validarNumeroCaixa(1, [1, 2], cadastradas), /Já existe a caixa CX-0001/);
  assert.equal(validarNumeroCaixa(1, [1, 2], cadastradas, "a"), null);
  assert.equal(validarNumeroCaixa(2, [1, 2], cadastradas), null);
});

test("as listas de escolha mostram só caixas habilitadas, em ordem de número", () => {
  const lista = [caixa("c", 9), caixa("a", 2), caixa("b", 4), caixa("sem", null)];
  assert.deepEqual(
    caixasHabilitadas(lista, [2, 9]).map((c) => c.id),
    ["a", "c"],
  );
});

test("o demo recusa duas caixas com o mesmo código, como o banco", async () => {
  const numero = 90 + Math.floor(Math.random() * 10);
  const valores = (nome) => ({
    empresa_id: "emp-a",
    nome,
    codigo: codigoCaixa(numero),
    codigo_num: numero,
    status: "Ativa",
  });
  const primeira = await demoSupabase.rpc("salvar_caixa", {
    p_id: null,
    p_valores: valores("Primeira"),
    p_itens: [],
  });
  assert.equal(primeira.error, null);
  const segunda = await demoSupabase.rpc("salvar_caixa", {
    p_id: null,
    p_valores: valores("Segunda"),
    p_itens: [{ ferramenta_id: "f", quantidade: 1, observacao: "" }],
  });
  assert.match(segunda.error?.message ?? "", /CX-00/);
  const { data } = await demoSupabase
    .from("caixas_ferramentas")
    .select("*")
    .eq("codigo", codigoCaixa(numero));
  assert.deepEqual(
    data.map((c) => c.nome),
    ["Primeira"],
  );
  // Editar a própria caixa mantendo o número é permitido.
  const edicao = await demoSupabase.rpc("salvar_caixa", {
    p_id: primeira.data,
    p_valores: { ...valores("Primeira editada") },
    p_itens: [],
  });
  assert.equal(edicao.error, null);
});

test("termos e aba Caixas escolhem só entre caixas habilitadas", () => {
  for (const nome of [
    "FerramentasTermoResponsabilidade",
    "FerramentasTermoVistoria",
    "FerramentasCaixasModulo",
  ]) {
    const fonte = readFileSync(
      new URL(`../src/components/modules/${nome}.tsx`, import.meta.url),
      "utf8",
    );
    assert.ok(fonte.includes("caixasHabilitadas("), `${nome} não filtra as caixas habilitadas`);
  }
});
