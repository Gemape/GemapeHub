import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  movimentacoesDaCaixa,
  caixaDaUltimaEntrega,
  controleDaFerramenta,
  disponivelNaCaixa,
  linhaCsvCaixa,
  validarFerramentasDaCaixa,
  ferramentasComEmpregadoRemovidas,
  validarBaixaDaCaixa,
  ocorrenciasDaCaixa,
  ferramentasEmOutraCaixa,
  validarTransferenciaDeCaixa,
} from "../src/lib/controle-caixa.ts";

const mov = (o) => ({ modulo: "ferramenta", tipo_movimentacao: "Saida", item_id: "f1", empregado_id: "e1", motivo_baixa: "Fornecimento ao Empregado", quantidade: 1, data_movimentacao: "2026-10-01", observacao: null, ...o });

test("movimentacoesDaCaixa usa a caixa gravada e, sem caixa, as ferramentas cadastradas nela", () => {
  const lista = [
    mov({ id: "a", item_id: "f2" }),
    mov({ id: "b", item_id: "f9" }),
    mov({ id: "c", modulo: "epi", item_id: "f1" }),
    mov({ id: "d", item_id: "f1", caixa_id: "cx1" }),
    mov({ id: "e", item_id: "f1", caixa_id: "cx2" }),
    mov({ id: "f", item_id: "f9", caixa_id: "cx1" }),
  ];
  assert.deepEqual(movimentacoesDaCaixa(lista, "cx1", ["f1", "f2"]).map((m) => m.id), ["a", "d", "f"]);
  assert.deepEqual(movimentacoesDaCaixa(lista, "cx2", ["f1"]).map((m) => m.id), ["e"]);
});

test("caixaDaUltimaEntrega devolve a caixa da entrega mais recente do empregado, ignorando baixa e outras pessoas", () => {
  const lista = [
    mov({ caixa_id: "cx1", data_movimentacao: "2026-10-01" }),
    mov({ caixa_id: "cx2", data_movimentacao: "2026-10-05" }),
    mov({ caixa_id: "cx3", data_movimentacao: "2026-10-09", motivo_baixa: "Quebra" }),
    mov({ caixa_id: "cx4", data_movimentacao: "2026-10-09", empregado_id: "e2" }),
    mov({ caixa_id: null, data_movimentacao: "2026-10-10" }),
  ];
  assert.equal(caixaDaUltimaEntrega(lista, "e1", "f1"), "cx2");
  assert.equal(caixaDaUltimaEntrega(lista, "e1", "outra"), null);
});

test("controleDaFerramenta soma entregas, devoluções e baixas e não fica negativo", () => {
  const lista = [
    mov({ quantidade: 3 }),
    mov({ tipo_movimentacao: "Devolucao", motivo_baixa: null, quantidade: 1 }),
    mov({ motivo_baixa: "Quebra", quantidade: 1 }),
    mov({ motivo_baixa: "Perda", quantidade: 2, empregado_id: null }),
    mov({ item_id: "outra", quantidade: 9 }),
  ];
  assert.deepEqual(controleDaFerramenta(lista, "f1"), { entregue: 3, devolvido: 1, baixado: 1, baixadoDaCaixa: 2, comEmpregado: 1 });
  assert.equal(controleDaFerramenta([mov({ tipo_movimentacao: "Devolucao", quantidade: 5 })], "f1").comEmpregado, 0);
});

test("disponivelNaCaixa desconta o que está com empregados, sem ficar negativo", () => {
  assert.equal(disponivelNaCaixa(5, 2), 3);
  assert.equal(disponivelNaCaixa(1, 4), 0);
  assert.equal(disponivelNaCaixa(5, 2, 2), 1);
});

const nome = (id) => id.toUpperCase();

test("validarFerramentasDaCaixa exige ferramenta, quantidade inteira e não deixa baixar abaixo do que está com empregado", () => {
  const fora = (id) => (id === "f1" ? 2 : 0);
  assert.match(validarFerramentasDaCaixa([], fora, nome), /pelo menos uma/);
  assert.match(validarFerramentasDaCaixa([{ ferramenta_id: "f2", quantidade: 1 }, { ferramenta_id: "f2", quantidade: 1 }], fora, nome), /repetida/);
  assert.match(validarFerramentasDaCaixa([{ ferramenta_id: "f2", quantidade: 0 }], fora, nome), /quantidade/);
  assert.match(validarFerramentasDaCaixa([{ ferramenta_id: "f1", quantidade: 1 }], fora, nome), /com empregado/);
  assert.equal(validarFerramentasDaCaixa([{ ferramenta_id: "f1", quantidade: 2 }, { ferramenta_id: "f2", quantidade: 1 }], fora, nome), null);
});

test("ferramentasComEmpregadoRemovidas barra tirar da caixa o que está com empregado", () => {
  const fora = (id) => (id === "f1" ? 1 : 0);
  assert.match(ferramentasComEmpregadoRemovidas([{ ferramenta_id: "f1" }], [], fora, nome), /devolução/);
  assert.equal(ferramentasComEmpregadoRemovidas([{ ferramenta_id: "f2" }], [], fora, nome), null);
  assert.equal(ferramentasComEmpregadoRemovidas([{ ferramenta_id: "f1" }], [{ ferramenta_id: "f1" }], fora, nome), null);
});

test("validarBaixaDaCaixa limita a baixa ao guardado na caixa ou ao que está com o empregado", () => {
  const ok = { ferramentaId: "f1", quantidade: 1, motivo: "Quebra", data: "2026-10-08", disponivel: 2, comEmpregado: 1, empregadoId: null };
  assert.equal(validarBaixaDaCaixa(ok), null);
  assert.match(validarBaixaDaCaixa({ ...ok, quantidade: 3 }), /guardada na caixa/);
  assert.match(validarBaixaDaCaixa({ ...ok, quantidade: 2, empregadoId: "e1" }), /com empregado/);
  assert.match(validarBaixaDaCaixa({ ...ok, motivo: "" }), /motivo/);
  assert.match(validarBaixaDaCaixa({ ...ok, quantidade: 1.5 }), /inteiro/);
});

test("ocorrenciasDaCaixa usa a caixa gravada e, sem caixa, as ferramentas cadastradas nela", () => {
  const lista = [
    { id: "a", item_id: "f1" },
    { id: "b", item_id: "f9" },
    { id: "c", item_id: "f1", caixa_id: "cx2" },
    { id: "d", item_id: "f9", caixa_id: "cx1" },
    { id: "e", item_id: null },
  ];
  assert.deepEqual(ocorrenciasDaCaixa(lista, "cx1", ["f1"]).map((o) => o.id), ["a", "d"]);
});

test("linhaCsvCaixa traz caixa, código, ferramenta e empregado", () => {
  const linha = linhaCsvCaixa(mov({ quantidade: 2 }), {
    caixa: "CX-0001",
    ferramentas: [{ id: "f1", codigo_sku: "FER-0001", nome: "Martelo" }],
    nomeEmpregado: () => "Ana",
  });
  assert.equal(linha.Caixa, "CX-0001");
  assert.equal(linha.Codigo, "FER-0001");
  assert.equal(linha.Ferramenta, "Martelo");
  assert.equal(linha.Empregado, "Ana");
  assert.equal(linha.Tipo, "Saída (entrega)");
});

test("entrega, vistoria e devolução gravam a caixa só no modo demonstração (decisão 103)", () => {
  const ler = (n) => readFileSync(new URL(`../src/components/modules/${n}.tsx`, import.meta.url), "utf8");
  assert.match(ler("FerramentasTermoResponsabilidade"), /\.\.\.\(MODO_DEMO \? \{ caixa_id: caixaSel \|\| null \} : \{\}\)/);
  assert.match(ler("FerramentasTermoVistoria"), /\.\.\.\(MODO_DEMO \? \{ caixa_id: caixaSel \|\| null \} : \{\}\)/);
  const enc = ler("FerramentasTermoEncerramento");
  assert.match(enc, /caixaDaUltimaEntrega\(entregas, empregadoId, item\.item_id\)/);
  assert.match(enc, /MODO_DEMO \? \{ caixa_id:/);
});

test("a tela Número da caixa mostra controle por ferramenta e histórico de movimentações (decisão 101)", () => {
  const f = readFileSync(new URL("../src/components/modules/FerramentasCaixasModulo.tsx", import.meta.url), "utf8");
  assert.match(f, /lerMovimentacoesRelatorio\(supabase, \{ modulo: "ferramenta"/);
  assert.match(f, /movimentacoesDaCaixa\(movimentacoes, caixa\.id,/);
  assert.match(f, /controleDaFerramenta\(historico,/);
  assert.match(f, /controleDaFerramenta\(/);
  for (const c of ["Com empregado", "Disponível", "Histórico de movimentações"]) assert.ok(f.includes(c), c);
});

test("Número da caixa tem gestão: ferramentas, baixa, ocorrência, só pelo número (decisão 104)", () => {
  const ler = (n) => readFileSync(new URL(`../src/components/modules/${n}.tsx`, import.meta.url), "utf8");
  const f = ler("FerramentasCaixasModulo");
  for (const c of ["Vincular ferramentas", "Dar baixa", "Registrar ocorrência", "Ocorrências da caixa", "Baixado"]) assert.ok(f.includes(c), c);
  assert.match(f, /ocorrenciasDaCaixa\(todasOcorrencias, caixa\.id,/);
  assert.doesNotMatch(f, /caixa\.nome/);
  assert.match(f, /numerosDisponiveis\(habilitadas, caixasDeTodas\)/);
  assert.match(ler("CaixaGestaoDialogs"), /historico\.filter\(\(m\) => m\.empregado_id === empregado\)/);
  assert.match(f, /function CaixaSemCadastro/);
  const d = ler("CaixaGestaoDialogs");
  assert.match(d, /\.\.\.\(MODO_DEMO \? \{ caixa_id: caixa\.id \} : \{\}\)/);
  assert.match(d, /tipo_ocorrencia: "Ferramenta"/);
  assert.match(d, /useSalvarCaixa\(\)/);
  const cad = ler("CaixasFerramentasModulo");
  assert.doesNotMatch(cad, /name="nome"/);
  assert.match(cad, /nome: codigoCaixa\(numero\)/);
});

test("uma ferramenta só pode estar em uma caixa (decisão 106)", () => {
  const outras = [{ caixa_id: "cx2", ferramenta_id: "f1" }];
  const codigo = (id) => id.toUpperCase();
  assert.match(ferramentasEmOutraCaixa([{ ferramenta_id: "f1" }], outras, "cx1", nome, codigo), /já está na caixa CX2.*baixa ou transfira/);
  assert.equal(ferramentasEmOutraCaixa([{ ferramenta_id: "f9" }], outras, "cx1", nome, codigo), null);
  assert.equal(ferramentasEmOutraCaixa([{ ferramenta_id: "f1" }], outras, "cx2", nome, codigo), null);
});

test("validarTransferenciaDeCaixa exige destino diferente, ferramenta guardada e fora do destino", () => {
  const ok = { ferramentaId: "f1", destinoId: "cx2", origemId: "cx1", comEmpregado: 0, jaNoDestino: false };
  assert.equal(validarTransferenciaDeCaixa(ok), null);
  assert.match(validarTransferenciaDeCaixa({ ...ok, destinoId: "" }), /destino/);
  assert.match(validarTransferenciaDeCaixa({ ...ok, destinoId: "cx1" }), /outra/);
  assert.match(validarTransferenciaDeCaixa({ ...ok, comEmpregado: 1 }), /devolução/);
  assert.match(validarTransferenciaDeCaixa({ ...ok, jaNoDestino: true }), /já está/);
});

test("a transferência aparece no histórico da caixa de origem e da de destino", () => {
  const t = mov({ id: "t", tipo_movimentacao: "Transferencia", motivo_baixa: null, empregado_id: null, caixa_id: "cx2", origem_local: "CX-0001", destino_local: "CX-0002" });
  assert.deepEqual(movimentacoesDaCaixa([t], "cx1", [], "CX-0001").map((m) => m.id), ["t"]);
  assert.deepEqual(movimentacoesDaCaixa([t], "cx2", ["f1"], "CX-0002").map((m) => m.id), ["t"]);
  assert.deepEqual(movimentacoesDaCaixa([t], "cx3", ["f1"], "CX-0003").map((m) => m.id), []);
});

test("Vincular bloqueia ferramenta de outra caixa e Transferir existe na tela (decisão 106)", () => {
  const ler = (n) => readFileSync(new URL(`../src/components/modules/${n}.tsx`, import.meta.url), "utf8");
  const d = ler("CaixaGestaoDialogs");
  assert.match(d, /disabled=\{!!emOutra\}/);
  assert.match(d, /<ItensModulo modulo="ferramenta" \/>/);
  assert.match(d, /Voltar ao vínculo/);
  assert.match(d, /ferramentasEmOutraCaixa\(/);
  assert.match(d, /tipo_movimentacao: "Transferencia"/);
  assert.match(ler("FerramentasCaixasModulo"), /DialogTransferirCaixa/);
});
