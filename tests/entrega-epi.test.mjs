import test from "node:test";
import assert from "node:assert/strict";
import { demoSupabase } from "../src/integrations/supabase/demo-client.ts";
import {
  alertaMinimoEpi, emPosseEpi, empregadoPodeReceberEpi, lerHistoricoEpiPorItem, linhasDaFichaEpi, proximoCodigoMovimentacao,
  registrarDevolucaoEpi, registrarEntregaEpi,
} from "../src/lib/entrega-epi.ts";
import { lerHistoricoEpiEmpregado } from "../src/lib/historico-epi-empregado.ts";
import { montarFichaEpiAvulsaHtml } from "../src/lib/ficha-epi-avulsa-html.ts";
import { empresasParaEscolha } from "../src/lib/empresas.ts";

const novoEpi = async (extra = {}) => {
  const empresa = crypto.randomUUID();
  const id = crypto.randomUUID();
  const item = { id, empresa_id: empresa, nome: "Luva de raspa", codigo_sku: "EPI-0001", estoque_atual: 10, estoque_minimo: 3, status: "ativo", ...extra };
  await demoSupabase.from("epis").insert(item);
  return { empresa, id, item };
};
const saldo = async (id) => (await demoSupabase.from("epis").select("*").eq("id", id)).data[0].estoque_atual;
const movs = async (empresa) => (await demoSupabase.from("movimentacoes").select("*").eq("empresa_id", empresa)).data;
const pessoa = { id: "ana", nome: "Ana", data_demissao: null };

test("entrega baixa o saldo e ganha código ENT automático", async () => {
  const { empresa, id } = await novoEpi();
  const r = await registrarEntregaEpi(demoSupabase, { empresaId: empresa, empregado: pessoa, linhas: [{ item_id: id, quantidade: 4 }], data: "2026-10-16", observacao: "primeira entrega" });
  assert.equal(await saldo(id), 6);
  assert.equal(r.saldoApos[id], 6);
  const [m] = await movs(empresa);
  assert.equal(m.tipo_movimentacao, "Saida");
  assert.match(m.codigo_movimentacao, /^ENT-\d{4}$/);
  assert.equal(m.observacao, "Primeira entrega");
});

test("entrega maior que o saldo é bloqueada e não grava nada", async () => {
  const { empresa, id } = await novoEpi({ estoque_atual: 2 });
  await assert.rejects(() => registrarEntregaEpi(demoSupabase, { empresaId: empresa, empregado: pessoa, linhas: [{ item_id: id, quantidade: 3 }], data: "2026-10-16" }), /passa do estoque/);
  assert.equal(await saldo(id), 2);
  assert.equal((await movs(empresa)).length, 0);
  await assert.rejects(() => registrarEntregaEpi(demoSupabase, { empresaId: empresa, empregado: pessoa, linhas: [{ item_id: id, quantidade: 0 }], data: "2026-10-16" }), /maior que zero/);
});

test("operação atômica: um item acima do saldo impede a entrega dos outros", async () => {
  const a = await novoEpi({ estoque_atual: 5 });
  const b = crypto.randomUUID();
  await demoSupabase.from("epis").insert({ id: b, empresa_id: a.empresa, nome: "Óculos", codigo_sku: "EPI-0002", estoque_atual: 1, estoque_minimo: 0, status: "ativo" });
  await assert.rejects(() => registrarEntregaEpi(demoSupabase, { empresaId: a.empresa, empregado: pessoa, linhas: [{ item_id: a.id, quantidade: 2 }, { item_id: b, quantidade: 2 }], data: "2026-10-16" }));
  assert.equal(await saldo(a.id), 5);
  assert.equal(await saldo(b), 1);
  assert.equal((await movs(a.empresa)).length, 0);
});

test("empregado demitido ou inativo e EPI inativo não recebem entrega", async () => {
  const { empresa, id } = await novoEpi();
  await assert.rejects(() => registrarEntregaEpi(demoSupabase, { empresaId: empresa, empregado: { ...pessoa, data_demissao: "2020-01-01" }, linhas: [{ item_id: id, quantidade: 1 }], data: "2026-10-16" }), /demitido/);
  assert.match(empregadoPodeReceberEpi({ ...pessoa, ativo: false }) ?? "", /inativo/);
  assert.equal(empregadoPodeReceberEpi(pessoa), null);
  const inativo = await novoEpi({ status: "inativo" });
  await assert.rejects(() => registrarEntregaEpi(demoSupabase, { empresaId: inativo.empresa, empregado: pessoa, linhas: [{ item_id: inativo.id, quantidade: 1 }], data: "2026-10-16" }), /inativo/);
});

test("devolução só Administrador, soma ao saldo e guarda código DEV e responsável", async () => {
  const { empresa, id } = await novoEpi();
  await registrarEntregaEpi(demoSupabase, { empresaId: empresa, empregado: pessoa, linhas: [{ item_id: id, quantidade: 5 }], data: "2026-10-16" });
  const base = { empresaId: empresa, empregado: pessoa, linhas: [{ item_id: id, quantidade: 2 }], data: "2026-10-17", responsavel: "Paula" };
  await assert.rejects(() => registrarDevolucaoEpi(demoSupabase, { ...base, administrador: false }), /Administrador/);
  assert.equal(await saldo(id), 5);
  const r = await registrarDevolucaoEpi(demoSupabase, { ...base, administrador: true });
  assert.equal(await saldo(id), 7);
  assert.equal(r.saldoApos[id], 7);
  const dev = (await movs(empresa)).find((m) => m.tipo_movimentacao === "Devolucao");
  assert.match(dev.codigo_movimentacao, /^DEV-\d{4}$/);
  assert.equal(dev.responsavel_nome, "Paula");
});

test("devolução não passa do que o empregado tem em posse", async () => {
  const { empresa, id } = await novoEpi();
  await registrarEntregaEpi(demoSupabase, { empresaId: empresa, empregado: pessoa, linhas: [{ item_id: id, quantidade: 2 }], data: "2026-10-16" });
  await assert.rejects(() => registrarDevolucaoEpi(demoSupabase, { empresaId: empresa, empregado: pessoa, linhas: [{ item_id: id, quantidade: 3 }], data: "2026-10-17", responsavel: "Paula", administrador: true }), /em posse/);
  const hist = (await movs(empresa));
  assert.equal(emPosseEpi(hist, "ana", id, null), 2);
});

test("códigos seguem sigla + numeração sem repetir, com numerações separadas", () => {
  assert.equal(proximoCodigoMovimentacao("ENT", []), "ENT-0001");
  assert.equal(proximoCodigoMovimentacao("ENT", ["ENT-0001", "DEV-0009", "ENT-0007", null, "xx"]), "ENT-0008");
  assert.equal(proximoCodigoMovimentacao("DEV", ["ENT-0001", "DEV-0009"]), "DEV-0010");
});

test("alerta dispara quando o saldo chega ao mínimo e a entrega avisa", async () => {
  assert.equal(alertaMinimoEpi(4, 3), false);
  assert.equal(alertaMinimoEpi(3, 3), true);
  assert.equal(alertaMinimoEpi(0, 0), true);
  const { empresa, id } = await novoEpi({ estoque_atual: 5, estoque_minimo: 3 });
  const r = await registrarEntregaEpi(demoSupabase, { empresaId: empresa, empregado: pessoa, linhas: [{ item_id: id, quantidade: 2 }], data: "2026-10-16" });
  assert.deepEqual(r.alertas.map((a) => [a.itemId, a.saldo, a.minimo]), [[id, 3, 3]]);
});

test("ficha reflete entregas e devoluções com código e responsável, e escapa texto", async () => {
  const { empresa, id } = await novoEpi();
  const ana = { id: "ana-ficha", nome: "Ana", data_demissao: null };
  await registrarEntregaEpi(demoSupabase, { empresaId: empresa, empregado: ana, linhas: [{ item_id: id, quantidade: 3 }], data: "2026-10-16" });
  await registrarDevolucaoEpi(demoSupabase, { empresaId: empresa, empregado: ana, linhas: [{ item_id: id, quantidade: 1 }], data: "2026-10-18", responsavel: "<b>Paula</b>", administrador: true });
  const hist = await lerHistoricoEpiEmpregado(demoSupabase, { empregadoId: "ana-ficha", empresaId: empresa, comTamanho: true });
  const linhas = linhasDaFichaEpi(hist, [{ id, nome: "Luva de raspa", ca: "123" }], () => undefined);
  assert.deepEqual(linhas.map((l) => [l.tipo, l.quantidade, /^(ENT|DEV)-\d{4}$/.test(l.codigo)]), [["Devolucao", 1, true], ["Saida", 3, true]]);
  assert.equal(linhas[0].responsavel, "<b>Paula</b>");
  const html = montarFichaEpiAvulsaHtml({ empresa: { razao_social: "X", cnpj: "" }, empregado: { nome: "Ana", cpf: "1" }, linhas });
  assert.match(html, /DEV-\d{4}/);
  assert.match(html, /&lt;b&gt;Paula&lt;\/b&gt;/);
  assert.doesNotMatch(html, /<b>Paula/);
});

test("histórico completo por EPI é lido além de 1000 linhas", async () => {
  const { empresa, id } = await novoEpi({ estoque_atual: 5000 });
  await demoSupabase.from("movimentacoes").insert(Array.from({ length: 1205 }, () => ({ modulo: "epi", tipo_movimentacao: "Saida", quantidade: 1, item_id: id, empresa_id: empresa, empregado_id: "x", data_movimentacao: "2026-10-01" })));
  const todas = await lerHistoricoEpiPorItem(demoSupabase, { empresaId: empresa, itemId: id });
  assert.equal(todas.length, 1205);
  const deUm = await lerHistoricoEpiPorItem(demoSupabase, { empresaId: empresa, itemId: id, empregadoId: "nenhum" });
  assert.equal(deUm.length, 0);
});

test("empresa inativa não aparece na escolha da rotina", () => {
  const lista = empresasParaEscolha([{ id: "1", status: "Ativa" }, { id: "2", status: "Inativa" }]);
  assert.deepEqual(lista.map((e) => e.id), ["1"]);
});

test("devolução de EPI que ficou inativo depois da entrega é aceita", async () => {
  const { empresa, id } = await novoEpi();
  await registrarEntregaEpi(demoSupabase, { empresaId: empresa, empregado: pessoa, linhas: [{ item_id: id, quantidade: 2 }], data: "2026-10-16" });
  await demoSupabase.from("epis").update({ status: "inativo" }).eq("id", id);
  await registrarDevolucaoEpi(demoSupabase, { empresaId: empresa, empregado: pessoa, linhas: [{ item_id: id, quantidade: 2 }], data: "2026-10-16", administrador: true, responsavel: "Admin" });
  assert.equal(await saldo(id), 10);
});
