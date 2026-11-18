import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reporFerramentaNaCaixa } from "../src/lib/movimentacoes-caixa.ts";
import { situacaoDaVistoria } from "../src/lib/situacao-vistoria.ts";
import { montarTermoReposicaoHtml } from "../src/lib/termo-reposicao-html.ts";

const le = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const base = {
  antigaId: "a", novaId: "b", nomeNova: "Chave nova", quantidade: 1, motivo: "Desgaste Natural", data: "2026-11-18",
  empresaDaCaixa: "e1", empresaDaNova: "e1", itensDaCaixa: [{ ferramenta_id: "a", quantidade: 2, observacao: "" }, { ferramenta_id: "c", quantidade: 1, observacao: "" }],
  novaEmOutraCaixa: null, semCaixaDaNova: 3, saldoEstoqueDaAntiga: 5,
};

test("a reposição baixa a antiga e entrega a nova; a linha some quando zera e soma quando a nova já está na caixa", () => {
  assert.deepEqual(reporFerramentaNaCaixa(base).itens.map((i) => [i.ferramenta_id, i.quantidade]), [["a", 1], ["c", 1], ["b", 1]]);
  assert.deepEqual(reporFerramentaNaCaixa({ ...base, quantidade: 2 }).itens.map((i) => i.ferramenta_id), ["c", "b"]);
  assert.deepEqual(reporFerramentaNaCaixa({ ...base, novaId: "c" }).itens.map((i) => [i.ferramenta_id, i.quantidade]), [["a", 1], ["c", 2]]);
  // a mesma ferramenta, outra unidade: a quantidade na caixa fica igual
  assert.deepEqual(reporFerramentaNaCaixa({ ...base, novaId: "a" }).itens.map((i) => [i.ferramenta_id, i.quantidade]), [["a", 2], ["c", 1]]);
});

test("a reposição recusa o que não fecha", () => {
  const erro = (o) => reporFerramentaNaCaixa({ ...base, ...o }).erro;
  assert.match(erro({ antigaId: "" }), /que sai/);
  assert.match(erro({ novaId: "" }), /nova/);
  assert.match(erro({ quantidade: 0 }), /quantidade/);
  assert.match(erro({ motivo: "" }), /motivo/);
  assert.match(erro({ antigaId: "x" }), /não está na caixa/);
  assert.match(erro({ quantidade: 3 }), /guardada na caixa/);
  assert.match(erro({ saldoEstoqueDaAntiga: 0 }), /estoque tem 0/);
  assert.match(erro({ empresaDaNova: "e2" }), /outra empresa/);
  assert.match(erro({ novaEmOutraCaixa: "CX-0009" }), /CX-0009/);
  assert.match(erro({ semCaixaDaNova: 0 }), /fora das caixas/);
});

test("situação da vistoria: em dia, pendente dentro do prazo, vencida depois e sem escalonamento", () => {
  const d = { mesBase: 3, periodicidade: "Trimestral", prazoDias: 5 };
  // ciclo de março: previsto em 01/03, limite 06/03
  assert.deepEqual(situacaoDaVistoria({ ...d, hoje: "2026-03-04", ultimaVistoria: null }), { situacao: "Pendente", previstaEm: "2026-03-01", limite: "2026-03-06" });
  assert.equal(situacaoDaVistoria({ ...d, hoje: "2026-03-06", ultimaVistoria: null }).situacao, "Pendente");
  assert.equal(situacaoDaVistoria({ ...d, hoje: "2026-03-07", ultimaVistoria: null }).situacao, "Vencida");
  assert.equal(situacaoDaVistoria({ ...d, hoje: "2026-03-20", ultimaVistoria: "2026-03-10" }).situacao, "Em dia");
  // a vistoria do ciclo anterior (dezembro) não vale para o de março
  assert.equal(situacaoDaVistoria({ ...d, hoje: "2026-04-20", ultimaVistoria: "2025-12-15" }).situacao, "Vencida");
  // entre ciclos vale o último que começou: em maio ainda é o de março
  assert.equal(situacaoDaVistoria({ ...d, hoje: "2026-05-30", ultimaVistoria: "2026-03-02" }).situacao, "Em dia");
  assert.equal(situacaoDaVistoria({ ...d, hoje: "2026-01-10", ultimaVistoria: null }).previstaEm, "2025-12-01");
  assert.equal(situacaoDaVistoria({ ...d, mesBase: undefined, hoje: "2026-03-04", ultimaVistoria: null }).situacao, "Sem escalonamento");
  assert.equal(situacaoDaVistoria({ ...d, prazoDias: 0, hoje: "2026-03-02", ultimaVistoria: null }).situacao, "Vencida");
});

test("o termo de reposição usa o texto cadastrado, marca a ferramenta reposta e escapa o que foi digitado", () => {
  const dados = { empresa: { razao_social: "ACME Ltda", cnpj: "12345678000195" }, empregado: { nome: "Ana <b>", cpf: "111" }, caixaCodigo: "CX-0001", data: "2026-11-18", linhas: [{ codigo: "F1", nome: "Chave <i>", quantidade: 2, reposta: true }, { codigo: "F2", nome: "Alicate", quantidade: 1, reposta: false }] };
  const html = montarTermoReposicaoHtml(dados);
  assert.match(html, /a reposição de ferramentas para a caixa sob minha responsabilidade/);
  assert.match(html, /<strong>Reposta<\/strong>/);
  assert.doesNotMatch(html, /Ana <b>|Chave <i>/);
  assert.match(montarTermoReposicaoHtml({ ...dados, texto: "Reposição na {caixa}.\n\n{tabela}" }), /Reposição na <strong>CX-0001<\/strong>\.[\s\S]*<table>/);
});

test("a tela de Reposição está em Movimentações e a de Escalonamento mostra a situação", () => {
  assert.match(le("src/components/modules/FerramentasMovimentacoes.tsx"), /id: "reposicao"[\s\S]*<FerramentasReposicaoCaixa \/>/);
  const r = le("src/components/modules/FerramentasReposicaoCaixa.tsx");
  assert.match(r, /salvarCaixa\.mutate\([\s\S]*onSuccess: \(\) => \{[\s\S]*registrar\.mutate[\s\S]*abrirTermo/);
  assert.match(r, /lerTextosTermos\(\)\.reposicao/);
  assert.match(le("src/components/modules/FerramentasEscalonamentoVistorias.tsx"), /situacaoDaVistoria\(/);
});
