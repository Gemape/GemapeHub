import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { filtrarEstoqueEpi, linhasDeEstoqueEpi } from "../src/lib/estoque-epi-visao.ts";

const ler = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const item = { id: "i1", codigo_sku: "EPI-0001", nome: "Luva", empresa_id: "e1", ca: "999" };
const compras = [
  {
    id: "c1",
    item_id: "i1",
    tamanho_id: "m",
    data_compra: "2026-03-01",
    nota_fiscal: "100",
    fornecedor: "A",
    ca: "111",
    quantidade: 10,
  },
  {
    id: "c2",
    item_id: "i1",
    tamanho_id: "m",
    data_compra: "2026-06-01",
    nota_fiscal: "200",
    fornecedor: "B",
    ca: "111",
    quantidade: 5,
  },
];
const base = {
  itens: [item],
  compras,
  devolucoes: [],
  saldosDe: () => ({ m: 8 }),
  minimosDe: () => ({ m: 10 }),
  mediaMensalDe: () => 2.5,
};

test("compras de fornecedores diferentes somam num estoque só: uma linha por EPI e tamanho, com o total, os fornecedores e a média do EPI (decisão 408)", () => {
  const linhas = linhasDeEstoqueEpi(base);
  assert.equal(linhas.length, 1);
  const [l] = linhas;
  assert.deepEqual(
    [l.condicao, l.disponivel, l.tamanhoId, l.alerta, l.mediaMensal],
    ["novo", 8, "m", true, 2.5],
  );
  assert.deepEqual([l.fornecedores, l.notas, l.cas, l.dataCompra], [["B", "A"], ["200", "100"], ["111"], "2026-06-01"]);
  assert.equal(l.fornecedor, "B, A");
  // O saldo é o do produto, não o de cada compra: mais compras (de qualquer fornecedor) não criam outra linha.
  const maisUma = linhasDeEstoqueEpi({ ...base, compras: [...compras, { id: "c3", item_id: "i1", tamanho_id: "m", data_compra: "2026-07-01", nota_fiscal: "300", fornecedor: "C", ca: "111", quantidade: 20 }], saldosDe: () => ({ m: 28 }) });
  assert.deepEqual(maisUma.map((x) => [x.disponivel, x.fornecedores.length]), [[28, 3]]);
});

test("usados: vêm das devoluções, com a compra original, e saem do saldo dos novos", () => {
  const devolucoes = [
    {
      item_id: "i1",
      tamanho_id: "m",
      quantidade: 2,
      tipo_movimentacao: "Devolucao",
      condicao: "usado",
      compra_origem_id: "c1",
      data_compra_origem: "2026-03-01",
      nota_fiscal_origem: "100",
      fornecedor_origem: "A",
      ca_origem: "111",
    },
  ];
  const linhas = linhasDeEstoqueEpi({ ...base, devolucoes });
  const usados = linhas.filter((l) => l.condicao === "usado");
  const novos = linhas.filter((l) => l.condicao === "novo");
  assert.deepEqual(
    usados.map((l) => [l.nf, l.fornecedor, l.ca, l.dataCompra, l.disponivel]),
    [["100", "A", "111", "2026-03-01", 2]],
  );
  assert.equal(
    novos.reduce((t, l) => t + l.disponivel, 0),
    6,
    "8 no estoque menos 2 usados",
  );
  // Devolução fora do que existe no saldo não passa dele.
  const demais = linhasDeEstoqueEpi({ ...base, saldosDe: () => ({ m: 1 }), devolucoes });
  assert.equal(
    demais.filter((l) => l.condicao === "usado").reduce((t, l) => t + l.disponivel, 0),
    1,
  );
});

test("EPI zerado ou sem compra registrada continua aparecendo, para o alerta não sumir", () => {
  const zerado = linhasDeEstoqueEpi({ ...base, saldosDe: () => ({ m: 0 }), compras: [] });
  assert.deepEqual(
    zerado.map((l) => [l.condicao, l.dataCompra, l.disponivel, l.alerta]),
    [["novo", null, 0, true]],
  );
  const inicial = linhasDeEstoqueEpi({
    ...base,
    saldosDe: () => ({ "sem-tamanho": 7 }),
    minimosDe: () => ({ "sem-tamanho": 3 }),
    compras: [],
  });
  assert.deepEqual(
    inicial.map((l) => [l.tamanhoId, l.disponivel, l.ca, l.alerta]),
    [[null, 7, "999", false]],
  );
});

test("filtros: empresa, palavra-chave (inclusive tamanho), data da compra, fornecedor, CA e NF olham todas as compras que formam o estoque", () => {
  const linhas = linhasDeEstoqueEpi(base);
  const nome = (id) => (id === "m" ? "Médio" : "—");
  assert.equal(filtrarEstoqueEpi(linhas, { empresaId: "e2" }, nome).length, 0);
  assert.equal(filtrarEstoqueEpi(linhas, { palavra: "medio" }, nome).length, 1, "acento e caixa não atrapalham");
  assert.equal(filtrarEstoqueEpi(linhas, { dataInicio: "2026-05-01" }, nome).length, 1);
  assert.equal(filtrarEstoqueEpi(linhas, { dataInicio: "2026-07-01" }, nome).length, 0);
  assert.equal(filtrarEstoqueEpi(linhas, { fornecedor: "A" }, nome).length, 1);
  assert.equal(filtrarEstoqueEpi(linhas, { fornecedor: "Z" }, nome).length, 0);
  assert.equal(filtrarEstoqueEpi(linhas, { ca: "11" }, nome).length, 1);
  assert.equal(filtrarEstoqueEpi(linhas, { ca: "22" }, nome).length, 0);
  assert.equal(filtrarEstoqueEpi(linhas, { nf: "100" }, nome).length, 1);
  assert.equal(filtrarEstoqueEpi(linhas, { nf: "999" }, nome).length, 0);
});

test("a aba Estoque do EPI é a consulta nova, com os botões Novos e Usados e as colunas na ordem pedida", () => {
  assert.match(
    ler("components/modules/PaginaModulo.tsx"),
    /modulo === "epi" \|\| modulo === "uniforme" \? <EstoqueEpiModulo modulo=\{modulo\} \/> : <EstoqueModulo modulo=\{modulo\} \/>/,
  );
  const tela = ler("components/modules/EstoqueEpiModulo.tsx");
  assert.match(tela, /aria-pressed=\{condicao === c\}/);
  const colunas = [
    "Código",
    "Item",
    "Empresa",
    "CA",
    "Tamanho",
    "Estoque mínimo",
    "Quantidade disponível",
    "Alerta",
    "Média de consumo mensal",
  ];
  const ordem = colunas.map((c) =>
    tela.indexOf(
      `<TableHead>${c}</TableHead>`,
    ),
  );
  assert.ok(
    ordem.every((n, i) => n > 0 && (i === 0 || n > ordem[i - 1])),
    `ordem das colunas: ${ordem}`,
  );
});

test('devolução gravada com tamanho explícito "sem-tamanho" conta como usado do EPI sem tamanho', () => {
  const devolucoes = [
    {
      item_id: "i1",
      tamanho_id: "sem-tamanho",
      quantidade: 2,
      tipo_movimentacao: "Devolucao",
      condicao: "usado",
      compra_origem_id: "c1",
      data_compra_origem: "2026-03-01",
    },
  ];
  const linhas = linhasDeEstoqueEpi({
    ...base,
    compras: [],
    saldosDe: () => ({ "sem-tamanho": 5 }),
    minimosDe: () => ({}),
    devolucoes,
  });
  assert.deepEqual(
    linhas.map((l) => [l.condicao, l.disponivel]),
    [
      ["usado", 2],
      ["novo", 3],
    ],
  );
});

test("alerta vale quando o saldo do tamanho é <= mínimo (e zerado alerta mesmo sem mínimo); a linha soma as compras e mostra o saldo recebido", () => {
  const compras2 = [
    { id: "a", item_id: "i1", tamanho_id: "m", data_compra: "2026-03-01", fornecedor: "A", quantidade: 10 },
    { id: "b", item_id: "i1", tamanho_id: "m", data_compra: "2026-04-01", fornecedor: "B", quantidade: 6 },
  ];
  const entregues = 4;
  const saldo = compras2.reduce((t, c) => t + c.quantidade, 0) - entregues; // 12 (o saldo real vem de saldosDeEpi; aqui entra pronto)
  const linhaCom = (minimo, s = saldo) => {
    const [l] = linhasDeEstoqueEpi({ ...base, compras: compras2, saldosDe: () => ({ m: s }), minimosDe: () => ({ m: minimo }) });
    return l;
  };
  assert.equal(linhaCom(5).disponivel, 12, "10 + 6 − 4");
  assert.equal(linhaCom(5).alerta, false, "12 > 5");
  assert.equal(linhaCom(12).alerta, true, "12 <= 12 já alerta");
  assert.equal(linhaCom(13).alerta, true);
  assert.equal(linhaCom(0, 0).alerta, true, "zerado alerta mesmo sem mínimo");
  assert.equal(linhaCom(0).alerta, false, "sem mínimo e com saldo não alerta");
});

test("CA do cadastro do item não vira CA de compra: só aparece quando nenhuma compra trouxe CA", () => {
  const semCa = (id, data) => ({ id, item_id: "i1", tamanho_id: "m", data_compra: data, fornecedor: "A", quantidade: 5 });
  const misto = linhasDeEstoqueEpi({ ...base, compras: [compras[0], semCa("x", "2026-07-01")], saldosDe: () => ({ m: 15 }) });
  assert.equal(misto.length, 1);
  assert.deepEqual(misto[0].cas, ["111"], "a compra sem CA não puxa o CA do cadastro quando outra compra tem CA");
  const nenhuma = linhasDeEstoqueEpi({ ...base, compras: [semCa("x", "2026-07-01")], saldosDe: () => ({ m: 5 }) });
  assert.deepEqual(nenhuma[0].cas, ["999"], "sem CA em nenhuma compra, vale o do cadastro");
});

test("uma linha por código + empresa + tamanho: fornecedores e CAs diferentes somam na mesma linha e aparecem listados", () => {
  const c = (id, forn, ca, q, data) => ({ id, item_id: "i1", tamanho_id: "m", data_compra: data, nota_fiscal: `NF-${id}`, fornecedor: forn, ca, quantidade: q });
  const linhas = linhasDeEstoqueEpi({ ...base, compras: [c("1", "A", "111", 5, "2026-01-01"), c("2", "B", "222", 5, "2026-02-01")], saldosDe: () => ({ m: 10 }) });
  assert.equal(linhas.length, 1);
  assert.deepEqual([linhas[0].disponivel, linhas[0].fornecedores, linhas[0].cas], [10, ["B", "A"], ["222", "111"]]);
});
