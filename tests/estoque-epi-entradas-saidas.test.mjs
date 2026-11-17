import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { demoSupabase } from "../src/integrations/supabase/demo-client.ts";
import { registrarDevolucaoEpi, registrarEntregaEpi } from "../src/lib/entrega-epi.ts";
import { compraDeOrigem, origemDaLinhaDeDevolucao } from "../src/lib/devolucao-estoque-epi.ts";
import { linhasDeEstoqueEpi } from "../src/lib/estoque-epi-visao.ts";

const pessoa = { id: "ana", nome: "Ana", data_demissao: null };
const novoEpi = async () => {
  const empresa = crypto.randomUUID();
  const id = crypto.randomUUID();
  await demoSupabase.from("epis").insert({ id, empresa_id: empresa, nome: "Luva de raspa", codigo_sku: "EPI-0001", ca: "123", estoque_atual: 0, estoque_minimo: 3, status: "ativo" });
  return { empresa, id };
};
const lerItem = async (id) => (await demoSupabase.from("epis").select("*").eq("id", id)).data[0];
const lerCompras = async (empresa) => (await demoSupabase.from("compras_epis").select("*").eq("empresa_id", empresa)).data;
const lerMovs = async (empresa) => (await demoSupabase.from("movimentacoes").select("*").eq("empresa_id", empresa)).data;
const visao = async (empresa, id) => {
  const item = await lerItem(id);
  return linhasDeEstoqueEpi({
    itens: [item], compras: await lerCompras(empresa), devolucoes: await lerMovs(empresa),
    saldosDe: () => ({ "sem-tamanho": Number(item.estoque_atual) }), minimosDe: () => ({ "sem-tamanho": 3 }), mediaMensalDe: () => 0,
  });
};
const total = (linhas, condicao) => linhas.filter((l) => l.condicao === condicao).reduce((t, l) => t + l.disponivel, 0);

test("o estoque acompanha as entradas e saídas: compra soma, entrega dá baixa, devolução entra como usado", async () => {
  const { empresa, id } = await novoEpi();
  // Compra: soma no estoque de novos.
  await demoSupabase.from("compras_epis").insert({ empresa_id: empresa, item_id: id, fornecedor: "Segura Mais", nota_fiscal: "NF-1", ca: "123", data_compra: "2026-10-01", quantidade: 10, valor_unitario: 5 });
  assert.equal((await lerItem(id)).estoque_atual, 10);
  let v = await visao(empresa, id);
  assert.equal(total(v, "novo"), 10);
  assert.equal(total(v, "usado"), 0);
  // Entrega: dá baixa.
  await registrarEntregaEpi(demoSupabase, { empresaId: empresa, empregado: pessoa, linhas: [{ item_id: id, quantidade: 4 }], data: "2026-10-16", responsavel: "Almoxarife Teste" });
  assert.equal((await lerItem(id)).estoque_atual, 6);
  assert.equal(total(await visao(empresa, id), "novo"), 6);
  // Devolução com a origem da compra: volta ao estoque como usado, sem mexer nos novos.
  const origem = origemDaLinhaDeDevolucao(await lerCompras(empresa), await lerItem(id), null);
  assert.equal(origem.nota_fiscal_origem, "NF-1");
  await registrarDevolucaoEpi(demoSupabase, { empresaId: empresa, empregado: pessoa, linhas: [{ item_id: id, quantidade: 3, origem }], data: "2026-10-20", administrador: true, responsavel: "Almoxarifado" });
  assert.equal((await lerItem(id)).estoque_atual, 9);
  v = await visao(empresa, id);
  assert.equal(total(v, "usado"), 3, "a devolução aparece em Usados");
  assert.equal(total(v, "novo"), 6, "e os novos seguem iguais");
  assert.equal(v.find((l) => l.condicao === "usado").nf, "NF-1");
});

test("devolução sem a origem entraria como novo: por isso toda devolução de EPI leva a origem (ou null) e vira usada", async () => {
  const { empresa, id } = await novoEpi();
  await demoSupabase.from("compras_epis").insert({ empresa_id: empresa, item_id: id, fornecedor: "Segura Mais", nota_fiscal: "NF-1", ca: "123", data_compra: "2026-10-01", quantidade: 5, valor_unitario: 5 });
  await registrarEntregaEpi(demoSupabase, { empresaId: empresa, empregado: pessoa, linhas: [{ item_id: id, quantidade: 2 }], data: "2026-10-16", responsavel: "Almoxarife Teste" });
  // origem: null (nunca houve compra registrada) ainda marca a unidade como usada.
  await registrarDevolucaoEpi(demoSupabase, { empresaId: empresa, empregado: pessoa, linhas: [{ item_id: id, quantidade: 2, origem: null }], data: "2026-10-20", administrador: true, responsavel: "Almoxarifado" });
  const [devolucao] = (await lerMovs(empresa)).filter((m) => m.tipo_movimentacao === "Devolucao");
  assert.equal(devolucao.condicao, "usado");
  assert.equal(total(await visao(empresa, id), "usado"), 2);
});

test("a origem da devolução é a compra mais antiga do EPI no tamanho, e vazia sem compra", () => {
  const compras = [
    { id: "c2", item_id: "e1", tamanho_id: "t40", data_compra: "2026-10-05", nota_fiscal: "NF-2", fornecedor: "B" },
    { id: "c1", item_id: "e1", tamanho_id: "t40", data_compra: "2026-09-01", nota_fiscal: "NF-1", fornecedor: "A", ca: "55" },
    { id: "c3", item_id: "e1", tamanho_id: "t42", data_compra: "2026-08-01", nota_fiscal: "NF-0" },
  ];
  assert.equal(compraDeOrigem(compras, "e1", "t40").id, "c1");
  assert.equal(origemDaLinhaDeDevolucao(compras, { id: "e1", ca: "99" }, "t40").nota_fiscal_origem, "NF-1");
  // "sem-tamanho" (como a devolução grava) vale como sem tamanho: qualquer compra do EPI, a mais antiga.
  assert.equal(origemDaLinhaDeDevolucao(compras, { id: "e1" }, "sem-tamanho").compra_origem_id, "c3");
  assert.equal(origemDaLinhaDeDevolucao(compras, { id: "e9" }, null), null);
  // O CA do cadastro vale quando a compra não guardou o CA.
  assert.equal(origemDaLinhaDeDevolucao(compras, { id: "e1", ca: "99" }, "t42").ca_origem, "99");
});

test("a tela Entrega leva a origem da compra na devolução de EPI e de uniforme", () => {
  const t = readFileSync(new URL("../src/components/modules/EpiEntrega.tsx", import.meta.url), "utf8");
  assert.match(t, /import \{ origemDaLinhaDeDevolucao \} from "@\/lib\/devolucao-estoque-epi"/);
  assert.match(t, /const \{ data: comprasEpi = \[\] \} = useComprasEpis\(empresaSel \|\| TODAS, "", modulo === "epi"\)/);
  assert.match(t, /useComprasUniformes\(empresaSel \|\| TODAS, "", modulo === "uniforme"\)/);
  assert.match(t, /devolucao && item \? \{ origem: origemDaLinhaDeDevolucao\(comprasOrigem,/);
});

// ---------- Uniformes: mesma lógica de estoque do EPI (decisão 374) ----------

test("Uniformes: o Estoque é a consulta de Novos e Usados e a devolução entra como usado, sem CA", () => {
  const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
  const estoque = ler("components/modules/EstoqueEpiModulo.tsx");
  assert.match(estoque, /EstoqueEpiModulo\(\{ modulo = "epi"/);
  assert.match(estoque, /saldosDeEpi\(parametros, porId\.get\(id\)!, modulo\)/);
  assert.match(estoque, /modulo === "epi" && <TableHead>CA<\/TableHead>/);
  const dev = ler("components/modules/DevolucaoEpiDialog.tsx");
  assert.match(dev, /modulo,\n\s+comCodigo/);
  assert.match(dev, /soEmpregadosDeUniforme/);
  const unif = ler("components/modules/UniformesComprasModulo.tsx");
  assert.match(unif, /<DevolucaoEpiDialog modulo="uniforme"/);
  assert.match(unif, /<EntradasDeUsados modulo="uniforme"/);
});

test("Uniformes: devolução vira estoque usado com a origem da compra e a entrega baixa o saldo por tamanho", async () => {
  const { demoSupabase } = await import("../src/integrations/supabase/demo-client.ts");
  const { origemDaLinhaDeDevolucao } = await import("../src/lib/devolucao-estoque-epi.ts");
  const { linhasDeEstoqueEpi } = await import("../src/lib/estoque-epi-visao.ts");
  const item = { id: "u1", nome: "Camisa", codigo_sku: "UNI-1", estoque_atual: 7, estoque_minimo: 1, empresa_id: "e1" };
  const compra = { id: "cu1", item_id: "u1", tamanho_id: null, data_compra: "2026-01-10", nota_fiscal: "55", fornecedor: "Têxtil", quantidade: 10, created_at: "2026-01-10" };
  const origem = origemDaLinhaDeDevolucao([compra], item, "sem-tamanho");
  assert.equal(origem?.nota_fiscal_origem, "55");
  const devolucao = { id: "m1", item_id: "u1", empresa_id: "e1", tipo_movimentacao: "Devolucao", condicao: "usado", quantidade: 2, tamanho_id: null, data_compra_origem: origem.data_compra_origem, nota_fiscal_origem: "55", fornecedor_origem: "Têxtil" };
  const linhas = linhasDeEstoqueEpi({ itens: [item], compras: [compra], devolucoes: [devolucao], saldosDe: () => ({ "sem-tamanho": 7 }), minimosDe: () => ({ "sem-tamanho": 1 }), mediaMensalDe: () => 0 });
  assert.equal(linhas.filter((l) => l.condicao === "usado").reduce((t, l) => t + l.disponivel, 0), 2);
  assert.equal(linhas.filter((l) => l.condicao === "novo").reduce((t, l) => t + l.disponivel, 0), 5);
  assert.ok(demoSupabase);
});
