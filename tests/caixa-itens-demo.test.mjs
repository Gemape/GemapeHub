import test from "node:test";
import assert from "node:assert/strict";
import { demoSupabase } from "../src/integrations/supabase/demo-client.ts";

test("o demo inclui a ferramenta vinculada ao consultar itens da caixa", async () => {
  const ferramentaId = crypto.randomUUID();
  const caixaId = crypto.randomUUID();
  await demoSupabase.from("ferramentas").insert({
    id: ferramentaId,
    codigo_sku: "FER-0999",
    nome: "Furadeira de teste",
    marca: "Makita",
    modelo: "M-100",
    status: "Ativo",
  });
  await demoSupabase.from("caixa_ferramenta_itens").insert({
    caixa_id: caixaId,
    ferramenta_id: ferramentaId,
    quantidade: 1,
  });

  const { data, error } = await demoSupabase
    .from("caixa_ferramenta_itens")
    .select("*, ferramenta:ferramentas(*)")
    .eq("caixa_id", caixaId);

  assert.equal(error, null);
  assert.equal(data.length, 1);
  assert.equal(data[0].ferramenta?.codigo_sku, "FER-0999");
  assert.equal(data[0].ferramenta?.nome, "Furadeira de teste");
  assert.equal(data[0].ferramenta?.marca, "Makita");
});
