import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { demoSupabase } from "../src/integrations/supabase/demo-client.ts";
import { hojeLocal, prepararEmpregado } from "../src/lib/empregados.ts";
import { lerMovimentacoesRelatorio } from "../src/lib/relatorios-historico.ts";
import { montarFichaEpiAvulsaHtml } from "../src/lib/ficha-epi-avulsa-html.ts";

const fonte = (c) => readFileSync(new URL(`../${c}`, import.meta.url), "utf8");

test("hoje é a data de Brasília, qualquer que seja o fuso do dispositivo", () => {
  assert.equal(hojeLocal(new Date("2026-10-15T02:00:00Z")), "2026-10-14");
  assert.equal(hojeLocal(new Date("2026-10-15T03:00:00Z")), "2026-10-15");
  assert.equal(hojeLocal(new Date("2026-01-01T01:30:00Z")), "2025-12-31");
});

test("editar empregado sem CPF antigo não aceita CPF em branco", () => {
  const base = { nome: "Maria Silva", cpf: "", matricula: "", empresa_id: "e1", email: "", data_admissao: "2026-01-01", data_demissao: "" };
  assert.throws(() => prepararEmpregado(base, [], { id: "x", cpf: null, matricula: null }), /CPF inválido/);
  assert.throws(() => prepararEmpregado(base, [], { id: "x", cpf: "", matricula: null }), /CPF inválido/);
});

test("o demo aceita lte e a busca com or/ilike nas colunas pedidas", async () => {
  const marca = `rev-${crypto.randomUUID()}`;
  await demoSupabase.from("movimentacoes").insert([
    { id: crypto.randomUUID(), modulo: "revisao", tipo_movimentacao: "Entrada", quantidade: 0, data_movimentacao: "2026-10-01", obs: marca },
    { id: crypto.randomUUID(), modulo: "revisao", tipo_movimentacao: "Entrada", quantidade: 0, data_movimentacao: "2026-10-20", obs: marca },
  ]);
  const ate = await lerMovimentacoesRelatorio(demoSupabase, { modulo: "revisao", ate: "2026-10-10" });
  assert.deepEqual(ate.map((m) => m.data_movimentacao), ["2026-10-01"]);
  const { data } = await demoSupabase.from("fornecedores").select("*").or("razao_social.ilike.%zzz-inexistente%,nome_fantasia.ilike.%zzz-inexistente%");
  assert.deepEqual(data, []);
});

test("ficha de EPI avulsa mostra baixa com o motivo, e entrega só para fornecimento", () => {
  const html = montarFichaEpiAvulsaHtml({
    empresa: { razao_social: "GEMAPE", cnpj: "" },
    empregado: { nome: "Ana", cpf: "" },
    linhas: [
      { data: "2026-10-01", quantidade: 1, nome: "Luva", tipo: "Saida" },
      { data: "2026-10-02", quantidade: 1, nome: "Luva", tipo: "Saida", baixaMotivo: "Perda <b>" },
      { data: "2026-10-03", quantidade: 1, nome: "Luva", tipo: "Devolucao" },
    ],
  });
  assert.match(html, />ENTREGA</);
  assert.match(html, /BAIXA \(Perda &lt;b&gt;\)/);
  assert.match(html, />DEVOLUÇÃO</);
});

test("telas corrigidas na revisão geral", () => {
  const caixa = fonte("src/components/modules/CaixasFerramentasModulo.tsx");
  assert.match(caixa, /ferramentasEmOutraCaixa\(/);
  assert.match(caixa, /ferramentasComEmpregadoRemovidas\(/);
  assert.match(fonte("src/lib/empresa-context.tsx"), /setEmpresaId\(TODAS\)/);
  for (const f of ["EpiTermoEntrega", "UniformesTermoEntrega", "UniformesTermoBaixa"]) assert.match(fonte(`src/components/modules/${f}.tsx`), /Informe a data da/, f);
  for (const f of ["EpiRelatorioBaixa", "UniformesRelatorioBaixa"]) {
    const s = fonte(`src/components/modules/${f}.tsx`);
    assert.doesNotMatch(s, /Valor: "R\$ 0,00"/, f);
    assert.match(s, /ehBaixa\(m\)/, f);
  }
  for (const f of ["EpiRelatorioFuncionario", "UniformesRelatorioFuncionario"]) assert.match(fonte(`src/components/modules/${f}.tsx`), /ehBaixa\(/, f);
  assert.match(fonte("src/components/modules/VeiculosCadastroModulo.tsx"), /base\?\.empresa_id \|\| empresaPadrao/);
  assert.match(fonte("src/components/modules/ChecklistVeiculoModulo.tsx"), /p\.checklist\.periodicidade === per/);
});
