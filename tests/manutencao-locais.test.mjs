import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { editarManutencao, locaisDaManutencao, registrarManutencao, rotuloDoLocal } from "../src/lib/registros-veiculo.ts";
import { pontosDeAtencao } from "../src/lib/extrato-veiculo.ts";
import { montarManutencaoHtml } from "../src/lib/manutencao-relatorio-html.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const hoje = new Date(2026, 9, 13, 12);
const ACOES = [{ id: "a1", nome: "Freios", subitens: [{ id: "s1", nome: "Pastilha" }, { id: "s2", nome: "Disco" }, { id: "s3", nome: "Fluido" }] }];
const base = { veiculoId: "v1", data: "2026-10-10", km: "1000", tipo: "Preventiva", grupos: [{ acaoId: "a1", itens: [{ subitemId: "s1" }] }] };
const gemape = { local: "empresa", descricao: "Troca da pastilha", condicaoPagamento: "", custoPecas: "100", custoMaoDeObra: "50" };
const oficina = { local: "terceiro", nome: " Oficina  Central ", descricao: "Retífica", condicaoPagamento: "30 dias", custoPecas: "1.000,50", custoMaoDeObra: "200" };

test("dec 161: a manutenção guarda cada local com custos próprios e soma o total", () => {
  const m = registrarManutencao({ ...base, locais: [gemape, oficina, { ...oficina, nome: "Concessionária", custoPecas: "0", custoMaoDeObra: "10" }] }, memoria(), hoje, ACOES);
  assert.equal(m.locais.length, 3);
  assert.deepEqual(m.locais[1], { local: "terceiro", nome: "Oficina Central", descricao: "Retífica", condicaoPagamento: "30 dias", custoPecas: 1000.5, custoMaoDeObra: 200, custoTotal: 1200.5 });
  assert.equal(m.custoPecas, 1100.5);
  assert.equal(m.custoMaoDeObra, 260);
  assert.equal(m.custoTotal, 1360.5);
  assert.equal(m.local, "empresa");
});

test("dec 161: validações dos locais", () => {
  const tenta = (locais) => () => registrarManutencao({ ...base, locais }, memoria(), hoje, ACOES);
  assert.throws(tenta([]), /Informe o local da manutenção/);
  assert.throws(tenta([gemape, gemape]), /só pode ter um local na própria empresa/);
  assert.throws(tenta([{ ...oficina, nome: " " }]), /Informe o local de terceiro/);
  assert.throws(tenta([gemape, { ...oficina, custoPecas: "" }]), /custo das peças de Oficina Central/);
  assert.throws(tenta([{ ...gemape, custoMaoDeObra: "x" }]), /custo da mão de obra/);
});

test("dec 161: o formato antigo (um local, custos no registro) continua valendo e vira um local", () => {
  const s = memoria();
  const m = registrarManutencao({ ...base, local: "terceiro", localNome: "Oficina", custoPecas: "10", custoMaoDeObra: "5" }, s, hoje, ACOES);
  assert.equal(m.locais.length, 1);
  assert.equal(m.custoTotal, 15);
  const antigo = { local: "terceiro", localNome: "Oficina", custoPecas: 10, custoMaoDeObra: 5, custoTotal: 15 };
  assert.deepEqual(locaisDaManutencao(antigo), [{ local: "terceiro", nome: "Oficina", descricao: "", condicaoPagamento: "", custoPecas: 10, custoMaoDeObra: 5, custoTotal: 15 }]);
  assert.deepEqual(locaisDaManutencao({}), []);
  assert.equal(rotuloDoLocal({ local: "terceiro", nome: "Oficina" }), "Terceiro: Oficina");
  assert.equal(rotuloDoLocal({ local: "empresa", nome: "" }), "Na própria empresa");
});

test("dec 161: editar troca os locais", () => {
  const s = memoria();
  const m = registrarManutencao({ ...base, locais: [gemape] }, s, hoje, ACOES);
  const e = editarManutencao(m.id, { ...base, locais: [oficina] }, s, hoje, ACOES);
  assert.equal(e.locais.length, 1);
  assert.equal(e.locais[0].nome, "Oficina Central");
  assert.equal(e.custoTotal, 1200.5);
});

test("dec 161: ações não realizadas só valem com observação, do grupo e sem estar marcadas como feitas", () => {
  const entrada = (naoRealizados) => ({ ...base, locais: [gemape], grupos: [{ acaoId: "a1", itens: [{ subitemId: "s1" }], naoRealizados }] });
  const m = registrarManutencao(entrada([{ subitemId: "s2", observacao: " rever em 5 mil km " }, { subitemId: "s3", observacao: "  " }]), memoria(), hoje, ACOES);
  assert.deepEqual(m.grupos[0].naoRealizados, [{ subitemId: "s2", nome: "Disco", observacao: "rever em 5 mil km" }]);
  const semObs = registrarManutencao(entrada([]), memoria(), hoje, ACOES);
  assert.equal(semObs.grupos[0].naoRealizados, undefined);
  assert.throws(() => registrarManutencao(entrada([{ subitemId: "s1", observacao: "x" }]), memoria(), hoje, ACOES), /marcada como feita e como não realizada/);
  assert.throws(() => registrarManutencao(entrada([{ subitemId: "zz", observacao: "x" }]), memoria(), hoje, ACOES), /não pertence ao grupo/);
  assert.throws(() => registrarManutencao(entrada([{ subitemId: "s2", observacao: "x" }, { subitemId: "s2", observacao: "y" }]), memoria(), hoje, ACOES), /repetida/);
});

test("dec 161: o extrato lista os itens não realizados e tira da lista o que uma manutenção posterior fez", () => {
  const grupo = (itens, naoRealizados) => ({ acaoId: "a1", nome: "Freios", itens: itens.map((subitemId) => ({ subitemId })), ...(naoRealizados ? { naoRealizados } : {}) });
  const nr = [{ subitemId: "s2", nome: "Disco", observacao: "Desgaste no limite" }, { subitemId: "s3", nome: "Fluido", observacao: "Escuro" }];
  const m1 = { id: "m1", data: "2026-09-01", km: 1000, grupos: [grupo(["s1"], nr)] };
  const m2 = { id: "m2", data: "2026-10-01", km: 5000, grupos: [grupo(["s2"])] };
  const lista = pontosDeAtencao([m1, m2], (id) => (id === "a1" ? "Freios novo" : undefined));
  assert.deepEqual(lista.map((p) => [p.item, p.grupo, p.observacao, p.km]), [["Fluido", "Freios novo", "Escuro", 1000]]);
  assert.equal(pontosDeAtencao([m1], () => undefined)[0].grupo, "Freios");
  assert.equal(pontosDeAtencao([], () => undefined).length, 0);
});

test("dec 161: o relatório mostra o custo de cada local, a condição de pagamento, os itens não feitos e escapa o texto", () => {
  const m = registrarManutencao({
    ...base,
    locais: [gemape, { ...oficina, descricao: "<b>x</b>" }],
    grupos: [{ acaoId: "a1", itens: [{ subitemId: "s1" }], naoRealizados: [{ subitemId: "s2", observacao: "<i>rever</i>" }] }],
  }, memoria(), hoje, ACOES);
  const html = montarManutencaoHtml(m, { empresa: "GEMAPE", veiculo: "ABC-1234", nomeGrupo: () => "Freios" });
  assert.match(html, /Custos por local/);
  assert.match(html, /Oficina Central/);
  assert.match(html, /Pagamento combinado:<\/strong> 30 dias/);
  assert.match(html, /Total do local/);
  assert.match(html, /Total da manutenção/);
  assert.match(html, /não realizado/);
  assert.ok(!html.includes("<b>x</b>") && !html.includes("<i>rever</i>"));
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
});

test("dec 161: a tela tem vários locais, botões de adicionar e observação do item não feito", () => {
  const tela = readFileSync(new URL("../src/components/modules/ManutencaoVeiculoModulo.tsx", import.meta.url), "utf8");
  assert.match(tela, /Adicionar terceiro/);
  assert.match(tela, /Adicionar local na Gemape/);
  assert.match(tela, /Condição de pagamento combinada/);
  assert.match(tela, /Custo total da manutenção/);
  assert.match(tela, /Observação do item não feito/);
  assert.doesNotMatch(tela, /RadioGroup/);
  const extrato = readFileSync(new URL("../src/components/modules/ExtratoVeiculo.tsx", import.meta.url), "utf8");
  assert.match(extrato, /Itens não realizados em atenção/);
});
