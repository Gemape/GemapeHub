import test from "node:test";
import assert from "node:assert/strict";
import { demoSupabase } from "../src/integrations/supabase/demo-client.ts";
import {
  empregadoDoTermo,
  validarSaidaDeUniformes,
  validarTermoVistoria,
} from "../src/lib/termos-atomicos.ts";

const uniformes = [
  { id: "camisa", nome: "Camisa", estoque_atual: 3 },
  { id: "calca", nome: "Calça", estoque_atual: 1 },
];

test("entrega de uniforme não passa do estoque disponível de cada item", () => {
  assert.equal(
    validarSaidaDeUniformes([{ item_id: "camisa", quantidade: 3 }], uniformes, "entrega"),
    null,
  );
  assert.equal(
    validarSaidaDeUniformes([{ item_id: "calca", quantidade: 2 }], uniformes, "entrega"),
    "A entrega de 2 unidade(s) de Calça passa do estoque disponível (1).",
  );
  // A soma das linhas do mesmo uniforme conta contra o estoque.
  assert.match(
    validarSaidaDeUniformes(
      [
        { item_id: "camisa", quantidade: 2 },
        { item_id: "camisa", quantidade: 2 },
      ],
      uniformes,
      "entrega",
    ),
    /A entrega de 4 unidade\(s\) de Camisa passa do estoque disponível \(3\)/,
  );
});

test("baixa de uniforme também não passa do estoque disponível", () => {
  assert.equal(
    validarSaidaDeUniformes([{ item_id: "calca", quantidade: 5 }], uniformes, "baixa"),
    "A baixa de 5 unidade(s) de Calça passa do estoque disponível (1).",
  );
  assert.equal(
    validarSaidaDeUniformes([{ item_id: "calca", quantidade: 1 }], uniformes, "baixa"),
    null,
  );
});

test("termo de uniforme exige linhas com uniforme e quantidade inteira", () => {
  assert.match(validarSaidaDeUniformes([], uniformes, "entrega"), /pelo menos um uniforme/);
  assert.match(
    validarSaidaDeUniformes([{ item_id: "", quantidade: 1 }], uniformes, "entrega"),
    /Selecione o uniforme/,
  );
  assert.match(
    validarSaidaDeUniformes([{ item_id: "camisa", quantidade: 0 }], uniformes, "baixa"),
    /quantidade/i,
  );
  assert.match(
    validarSaidaDeUniformes([{ item_id: "camisa", quantidade: 1.5 }], uniformes, "baixa"),
    /quantidade/i,
  );
});

test("vistoria confere as linhas, mas não o estoque (ela não o altera)", () => {
  assert.equal(validarTermoVistoria([{ item_id: "furadeira", quantidade: 50 }]), null);
  assert.match(validarTermoVistoria([]), /pelo menos uma ferramenta/);
  assert.match(validarTermoVistoria([{ item_id: "", quantidade: 1 }]), /Selecione a ferramenta/);
  assert.match(validarTermoVistoria([{ item_id: "furadeira", quantidade: 0 }]), /quantidade/i);
});

test('"Nenhum / Empresa" grava o termo sem empregado', () => {
  assert.equal(empregadoDoTermo("todas"), null);
  assert.equal(empregadoDoTermo(""), null);
  assert.equal(empregadoDoTermo("pessoa"), "pessoa");
});

test("termo de uniforme gravado de uma vez: se uma linha falha, nenhuma entra", async () => {
  const camisa = crypto.randomUUID();
  const calca = crypto.randomUUID();
  await demoSupabase.from("uniformes").insert([
    { id: camisa, empresa_id: "emp-a", nome: "Camisa", estoque_atual: 3 },
    { id: calca, empresa_id: "emp-a", nome: "Calça", estoque_atual: 1 },
  ]);
  const linha = (item, quantidade) => ({
    modulo: "uniforme",
    tipo_movimentacao: "Saida",
    item_id: item,
    quantidade,
    empresa_id: "emp-a",
    empregado_id: "pessoa",
    data_movimentacao: "2026-09-30",
  });
  const { error } = await demoSupabase
    .from("movimentacoes")
    .insert([linha(camisa, 2), linha(calca, 2)]);
  assert.match(error?.message ?? "", /Estoque insuficiente/);
  const estoque = async (id) =>
    (await demoSupabase.from("uniformes").select("*").eq("id", id).single()).data.estoque_atual;
  assert.equal(await estoque(camisa), 3);
  assert.equal(await estoque(calca), 1);
  for (const id of [camisa, calca]) {
    const { data } = await demoSupabase.from("movimentacoes").select("*").eq("item_id", id);
    assert.equal(data.length, 0);
  }
});
