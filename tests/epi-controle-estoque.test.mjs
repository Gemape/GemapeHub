import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  controleDeEstoque,
} from "../src/lib/epi-controle-estoque.ts";

const HOJE = "2026-04-10";
const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const memoria = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};
const item = (id, nome, atual, minimo) => ({ id, nome, estoque_atual: atual, estoque_minimo: minimo });
const mov = (item_id, tipo, quantidade, data) => ({ item_id, tipo_movimentacao: tipo, quantidade, data_movimentacao: data });

test("médias: mensal = saídas de 30 dias, trimestral = 90 dias ÷ 3, semestral = 180 ÷ 6, anual = 365 ÷ 12", () => {
  const [l] = controleDeEstoque([item("a", "Bota", 0, 0)], [mov("a", "Saida", 1, "2026-04-01")], HOJE);
  assert.equal(l.consumoMensal, 1);
  assert.ok(Math.abs(l.consumoTrimestral - 1 / 3) < 1e-9);
  assert.ok(Math.abs(l.consumoSemestral - 1 / 6) < 1e-9);
  assert.ok(Math.abs(l.consumoAnual - 1 / 12) < 1e-9);
  // Saída mais antiga entra só nas janelas maiores.
  const [m] = controleDeEstoque([item("a", "Bota", 0, 0)], [mov("a", "Saida", 6, "2025-12-01")], HOJE);
  assert.deepEqual([m.consumoMensal, m.consumoTrimestral, m.consumoSemestral, m.consumoAnual], [0, 0, 1, 0.5]);
  const [n] = controleDeEstoque([item("a", "Bota", 0, 0)], [mov("a", "Saida", 6, "2024-01-01")], HOJE);
  assert.equal(n.consumoAnual, 0);
});

test("cobertura em dias = estoque ÷ (média anual ÷ 30); sem consumo vira null", () => {
  const [l] = controleDeEstoque([item("a", "Bota", -1, 0)], [mov("a", "Saida", 2, "2026-03-01")], HOJE);
  assert.equal(l.cobertura, -180);
  const [m] = controleDeEstoque([item("a", "Luva", 2, 0)], [mov("a", "Saida", 8, "2026-03-01")], HOJE);
  assert.equal(m.cobertura, 90);
  assert.equal(controleDeEstoque([item("a", "Sem giro", 4, 2)], [], HOJE)[0].cobertura, null);
});

test("últimas e penúltimas entradas e saídas, por data", () => {
  const [l] = controleDeEstoque([item("a", "Capacete", 5, 1)], [
    mov("a", "Entrada", 10, "2026-01-05"), mov("a", "Entrada", 4, "2026-03-20"), mov("a", "Entrada", 2, "2025-11-01"),
    mov("a", "Saida", 1, "2026-02-02"), mov("a", "Devolucao", 1, "2026-03-30"),
  ], HOJE);
  assert.deepEqual([l.ultimaEntrada, l.penultimaEntrada], ["2026-03-20", "2026-01-05"]);
  assert.deepEqual([l.ultimaSaida, l.penultimaSaida], ["2026-02-02", null]);
});

test("as telas: estoque detalhado na aba Estoque e sugestão de compras na aba Compras, nos módulos de EPIs e de Uniformes", () => {
  assert.match(ler("components/modules/EstoqueModulo.tsx"), /modulo !== 'ferramenta' && <ControleEstoqueModulo modulo=\{modulo\}/);
  // No EPI a sugestão de compras é uma rotina própria, fora da Entrada no Estoque (decisão 327).
  assert.match(ler("components/modules/PaginaModulo.tsx"), /<TabsContent value="sugestao-compras"[^>]*>\s*<SugestaoComprasEpi \/>/);
  assert.doesNotMatch(ler("components/modules/EpiComprasModulo.tsx"), /SugestaoComprasModulo/);
  // Nos Uniformes a sugestão é a mesma tela do EPI, em Relatórios, e saiu da aba Compras.
  assert.match(ler("components/modules/PaginaModulo.tsx"), /<SugestaoComprasEpi modulo="uniforme" \/>/);
  assert.doesNotMatch(ler("components/modules/UniformesComprasModulo.tsx"), /Sugest/);
  const tela = ler("components/modules/ControleEstoqueModulo.tsx");
  for (const t of ["Média mensal", "Média trimestral", "Média semestral", "Média anual", "Última entrada", "Penúltima entrada", "Última saída", "Penúltima saída", "Cobertura \\(dias\\)"]) assert.match(tela, new RegExp(t));
  const sug = ler("components/modules/SugestaoComprasEpi.tsx");
  for (const t of ["Estoque total", "Status de criticidade", "Gerar relatório"]) assert.match(sug, new RegExp(t));
  assert.doesNotMatch(tela + sug, /dangerouslySetInnerHTML|innerHTML/);
});

test("Uniformes segue o EPI: mesmos nomes de submenu, aba Entrega Uniforme, e a entrega serve aos dois módulos", async () => {
  const { ABAS_EPI: SO_MODULO, ABAS_EPI_RELATORIOS, ABAS_UNIFORME: UNIFORME_SO_MODULO, ABAS_UNIFORME_RELATORIOS } = await import("../src/lib/menu-parametros.ts");
  // No EPI, Histórico do empregado, Baixar Definitivas e Sugestão de Compras ficam em Relatórios (decisão 359).
  const ABAS_EPI = [...SO_MODULO, ...ABAS_EPI_RELATORIOS];
  // Nos Uniformes, Histórico do empregado e Baixar Definitivas também ficam em Relatórios (decisão 364).
  const ABAS_UNIFORME = [...UNIFORME_SO_MODULO, ...ABAS_UNIFORME_RELATORIOS];
  const titulos = (abas) => abas.map((a) => a.titulo);
  for (const t of ["Dashboard", "Estoque", "Histórico do empregado", "Baixar Definitivas", "Termo de Entrega", "Ocorrências"]) {
    assert.ok(titulos(ABAS_EPI).includes(t) && titulos(ABAS_UNIFORME).includes(t), t);
  }
  // No EPI, Compras virou Entrada no Estoque e a Sugestão de Compras ganhou a sua aba (decisão 327); os uniformes também têm Entrada no Estoque e Sugestão de Compras (mesma lógica do EPI).
  assert.ok(titulos(ABAS_EPI).includes("Entrada no Estoque") && titulos(ABAS_EPI).includes("Sugestão de Compras") && !titulos(ABAS_EPI).includes("Compras"));
  assert.ok(titulos(ABAS_UNIFORME).includes("Entrada no Estoque") && titulos(ABAS_UNIFORME).includes("Sugestão de Compras") && !titulos(ABAS_UNIFORME).includes("Compras"));
  assert.ok(titulos(ABAS_EPI).includes("Entrega EPI") && titulos(ABAS_UNIFORME).includes("Entrega Uniforme"));
  assert.ok(!titulos(ABAS_UNIFORME).includes("Movimentações"), "Movimentações saiu dos uniformes");
  const pagina = ler("components/modules/PaginaModulo.tsx");
  assert.match(pagina, /<TabsContent value="entrega"[^>]*>\s*<UniformesEntrega \/>/);
  const entrega = ler("components/modules/EpiEntrega.tsx");
  assert.match(entrega, /export const UniformesEntrega = \(\) => <EntregaModulo modulo="uniforme" \/>/);
  assert.match(entrega, /useItens\(modulo,/);
  assert.match(entrega, /montarTermoEntregaUniformeHtml/);
});

test("entrega e devolução de uniforme: grava no módulo uniforme, confere os itens da tabela de uniformes e usa as palavras do módulo", async () => {
  const { registrarEntregaEpi, registrarDevolucaoEpi, lerHistoricoEpiPorItem } = await import("../src/lib/entrega-epi.ts");
  const itens = [{ id: "u1", nome: "Camisa G", estoque_atual: 5, estoque_minimo: 1 }];
  const gravado = [];
  const cliente = {
    from: (tabela) => {
      const consulta = {
        tabela, filtros: {},
        select() { return consulta; },
        eq(c, v) { consulta.filtros[c] = v; return consulta; },
        order() { return consulta; },
        range() { return Promise.resolve({ data: tabela === "uniformes" ? itens : [], error: null }); },
        insert(linhas) { gravado.push(...linhas); return Promise.resolve({ error: null }); },
        then(res) { return Promise.resolve({ data: tabela === "uniformes" ? itens : [], error: null }).then(res); },
      };
      return consulta;
    },
  };
  const empregado = { id: "e1", nome: "Maria", data_demissao: null, ativo: true };
  const r = await registrarEntregaEpi(cliente, { empresaId: "emp", empregado, linhas: [{ item_id: "u1", quantidade: 2 }], data: "2026-04-10", modulo: "uniforme", comCodigo: false });
  assert.equal(r.codigos.length, 0);
  assert.equal(gravado[0].modulo, "uniforme");
  await assert.rejects(() => registrarEntregaEpi(cliente, { empresaId: "emp", empregado, linhas: [{ item_id: "u1", quantidade: 9 }], data: "2026-04-10", modulo: "uniforme", comCodigo: false }), /uniforme|Camisa G/);
  await assert.rejects(() => registrarEntregaEpi(cliente, { empresaId: "emp", empregado, linhas: [{ item_id: "nao", quantidade: 1 }], data: "2026-04-10", modulo: "uniforme", comCodigo: false }), /O uniforme escolhido não existe/);
  await assert.rejects(() => registrarDevolucaoEpi(cliente, { empresaId: "emp", empregado, linhas: [{ item_id: "u1", quantidade: 1 }], data: "2026-04-10", modulo: "uniforme", administrador: false, responsavel: "x" }), /devolução de uniforme/);
  assert.deepEqual(await lerHistoricoEpiPorItem(cliente, { empresaId: "emp", modulo: "uniforme" }), []);
});

// ---------- correções do code review ----------
test("item inativo fica fora do controle e da sugestão de compras", () => {
  const itens = [{ id: "a", nome: "Antigo", estoque_atual: 0, estoque_minimo: 2, status: "Inativo" }, item("b", "Ativo", 0, 2)];
  const linhas = controleDeEstoque(itens, [], HOJE);
  assert.deepEqual(linhas.map((l) => l.nome), ["Ativo"]);
});

test("devolução volta ao estoque: sai do consumo da mesma janela e o consumo nunca fica negativo", () => {
  const movs = [mov("a", "Saida", 10, "2026-04-01"), mov("a", "Devolucao", 8, "2026-04-05")];
  const [l] = controleDeEstoque([item("a", "Luva", 5, 0)], movs, HOJE);
  assert.equal(l.consumoMensal, 2);
  assert.ok(Math.abs(l.consumoAnual - 2 / 12) < 1e-9);
  const [m] = controleDeEstoque([item("a", "Luva", 5, 0)], [mov("a", "Devolucao", 3, "2026-04-05")], HOJE);
  assert.equal(m.consumoMensal, 0);
});

test("a linha leva a empresa do item, e muitos movimentos de um item são lidos sem recopiar a lista", () => {
  const [l] = controleDeEstoque([{ ...item("a", "Luva", 1, 0), empresa_id: "emp-1" }], [], HOJE);
  assert.equal(l.empresaId, "emp-1");
  const muitos = Array.from({ length: 50_000 }, (_, n) => mov("a", "Saida", 1, n % 2 ? "2026-04-01" : "2026-03-01"));
  const inicio = Date.now();
  const [g] = controleDeEstoque([item("a", "Luva", 1, 0)], muitos, HOJE);
  assert.ok(Date.now() - inicio < 2000, "leitura linear");
  assert.equal(g.consumoAnual, 50_000 / 12);
  assert.match(ler("components/modules/ControleEstoqueModulo.tsx"), /comEmpresa && <TableHead>Empresa<\/TableHead>/);
});

test("grupo personalizado: nomes por veículo ou equipamento, e o que é de outro não se confunde", async () => {
  const { nomeGrupoPersonalizado, ehGrupoPersonalizado, ehPersonalizadoDe } = await import("../src/lib/grupo-personalizado.ts");
  assert.equal(nomeGrupoPersonalizado("ABC-1234"), "Personalizado · ABC-1234");
  assert.equal(nomeGrupoPersonalizado("ABC-1234", true), "Avulso · Personalizado · ABC-1234");
  assert.ok(ehGrupoPersonalizado("Personalizado · X") && ehGrupoPersonalizado("Avulso · Personalizado · X") && !ehGrupoPersonalizado("Avulso · Pneus e rodas"));
  assert.ok(ehPersonalizadoDe("Personalizado · ABC-1234", "ABC-1234"));
  assert.ok(ehPersonalizadoDe("Avulso · Personalizado · ABC-1234 (3)", "ABC-1234"), "sufixo de versões antigas");
  assert.ok(!ehPersonalizadoDe("Personalizado · ABC-12345", "ABC-1234"));
  assert.ok(!ehPersonalizadoDe("Personalizado · ABC-1234 (x)", "ABC-1234"));
  assert.match(ler("components/parametros/AssociarChecklistVeiculo.tsx"), /filter\(\(g\) => !ehGrupoPersonalizado\(g\.nome\)\)/);
  assert.match(ler("components/parametros/ChecklistEquipamento.tsx"), /filter\(\(g\) => !ehGrupoPersonalizado\(g\.nome\)\)/);
});

test("editor de itens: apagar o único item mantém a linha, há limite de tamanho e a entrega não tem mais mensagem duplicada", () => {
  const editor = ler("components/parametros/EditorItensChecklist.tsx");
  assert.match(editor, /proximas\.length === 1 && proximas\[0\] === "" \? " "/);
  assert.match(editor, /LIMITE_GRUPO = 5000/);
  assert.match(editor, /maxLength=\{LIMITE_ITEM\}/);
  const entrega = ler("lib/entrega-epi.ts");
  assert.doesNotMatch(entrega, /artigo|MENSAGEM_SO_ADMIN/);
});

test("média mensal da Sugestão e do Estoque: o consumo de 365 dias ÷ os meses realmente observados (1 a 12), não sempre ÷ 12", () => {
  // Dois meses de histórico (primeira entrada há 60 dias) e 6 unidades entregues: 3 por mês, não 0,5.
  const a = controleDeEstoque([item("a", "Bota", 4, 0)], [mov("a", "Entrada", 10, "2026-02-09"), mov("a", "Saida", 6, "2026-03-20")], HOJE);
  assert.equal(a[0].mediaMensal, 3);
  assert.equal(a[0].consumoAnual, 0.5, "a média anual da planilha segue como era");
  // Menos de um mês de histórico vale um mês (a média não explode com uma entrega de ontem).
  const b = controleDeEstoque([item("b", "Luva", 4, 0)], [mov("b", "Saida", 2, "2026-04-09")], HOJE);
  assert.equal(b[0].mediaMensal, 2);
  // Um ano de histórico (ou mais) volta a ser consumo ÷ 12, igual ao anual.
  const c = controleDeEstoque([item("c", "Capacete", 4, 0)], [mov("c", "Entrada", 50, "2025-01-01"), mov("c", "Saida", 12, "2026-01-10")], HOJE);
  assert.equal(c[0].mediaMensal, 1);
  assert.equal(c[0].mediaMensal, c[0].consumoAnual);
  // A devolução da mesma janela sai do consumo e a primeira devolução também conta como histórico.
  const d = controleDeEstoque([item("d", "Óculos", 4, 0)], [mov("d", "Saida", 6, "2026-03-20"), mov("d", "Devolucao", 2, "2026-03-25"), mov("d", "Entrada", 10, "2026-02-09")], HOJE);
  assert.equal(d[0].mediaMensal, 2);
  // Sem nenhuma movimentação, sem consumo.
  assert.equal(controleDeEstoque([item("e", "Máscara", 4, 0)], [], HOJE)[0].mediaMensal, 0);
});

test("a Sugestão de Compras e o Estoque usam a mesma média mensal", () => {
  assert.match(ler("lib/sugestao-epi.ts"), /const mediaMensal = c\.mediaMensal \?\? c\.consumoAnual;/);
  assert.match(ler("components/modules/EstoqueEpiModulo.tsx"), /\.map\(\(l\) => \[l\.itemId, l\.mediaMensal\]\)/);
});
