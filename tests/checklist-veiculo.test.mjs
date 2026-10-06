import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  lerChecklists, iniciarChecklist, avaliarItem, concluirChecklist, resolverPendencia, adicionarFotosItem, removerFotoItem,
  gruposAplicaveis, periodoAtual, situacaoPeriodica, resumoChecklist, pendenciasAbertas, excluirChecklistEmAndamento,
} from "../src/lib/checklist-veiculo.ts";
import { chaveDoTipoVeiculo } from "../src/lib/checklist-veiculos-padrao.ts";
import { lerOcorrenciasVeiculo } from "../src/lib/ocorrencias-veiculo.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const agora = new Date(2026, 9, 6, 14, 30); // terça, 06/10/2026
const GRUPOS = [
  { id: "g1", nome: "Carros · Exterior", itens: [{ id: "i1", nome: "Lataria" }, { id: "i2", nome: "Pneus" }], tiposVeiculo: ["carro"] },
  { id: "g2", nome: "Todos · Comuns", itens: [{ id: "i3", nome: "Limpeza" }], tiposVeiculo: ["*"] },
  { id: "g3", nome: "Motos", itens: [{ id: "i4", nome: "Corrente" }], tiposVeiculo: ["moto"] },
  { id: "g4", nome: "Vazio", itens: [], tiposVeiculo: ["*"] },
  { id: "g5", nome: "Sem tipo", itens: [{ id: "i5", nome: "X" }], tiposVeiculo: [] },
];
const base = (extra = {}) => ({
  veiculoId: "v1", veiculoRotulo: "GEM-2026 · Fiat · Strada", tipoVeiculo: "Carro", periodicidade: "Diário",
  responsavelId: "e1", responsavelNome: "Maria", grupos: gruposAplicaveis(GRUPOS, "carro"), ...extra,
});

test("grupos aplicáveis: os ligados ao tipo e os de todos; sem itens ou sem tipo ficam fora", () => {
  assert.deepEqual(gruposAplicaveis(GRUPOS, "carro").map((g) => g.id), ["g1", "g2"]);
  assert.deepEqual(gruposAplicaveis(GRUPOS, "moto").map((g) => g.id), ["g2", "g3"]);
  assert.deepEqual(gruposAplicaveis(GRUPOS, null).map((g) => g.id), ["g2"]);
});

test("iniciar: código sequencial, itens do tipo do veículo, periodicidade e responsável obrigatórios", () => {
  const s = memoria();
  assert.throws(() => iniciarChecklist(base({ veiculoId: "" }), s, agora), /veículo/i);
  assert.throws(() => iniciarChecklist(base({ periodicidade: null }), s, agora), /periodicidade/i);
  assert.throws(() => iniciarChecklist(base({ periodicidade: "Mensal" }), s, agora), /periodicidade/i);
  assert.throws(() => iniciarChecklist(base({ responsavelId: "" }), s, agora), /responsável/i);
  assert.throws(() => iniciarChecklist(base({ grupos: [] }), s, agora), /itens de check list/i);
  const c = iniciarChecklist(base(), s, agora);
  assert.equal(c.codigo, "CHK-0001");
  assert.equal(c.status, "Em andamento");
  assert.equal(c.data, "2026-10-06");
  assert.deepEqual(c.itens.map((i) => i.nome), ["Lataria", "Pneus", "Limpeza"]);
  assert.ok(c.itens.every((i) => i.avaliacao === null));
  assert.throws(() => iniciarChecklist(base(), s, agora), /em andamento/i);
  assert.equal(iniciarChecklist(base({ veiculoId: "v2" }), s, agora).codigo, "CHK-0002");
});

test("avaliar item: OK, NOK ou N.A. com observação; valor inválido é recusado", () => {
  const s = memoria();
  const c = iniciarChecklist(base(), s, agora);
  const [a, b] = c.itens;
  avaliarItem(c.id, a.id, { avaliacao: "OK", observacao: "" }, s);
  avaliarItem(c.id, b.id, { avaliacao: "NOK", observacao: "  Pneu   careca " }, s);
  const lido = lerChecklists(s)[0];
  assert.equal(lido.itens[0].avaliacao, "OK");
  assert.equal(lido.itens[1].observacao, "Pneu careca");
  assert.throws(() => avaliarItem(c.id, a.id, { avaliacao: "TALVEZ", observacao: "" }, s), /OK, NOK ou N.A./);
  assert.throws(() => avaliarItem(c.id, "x", { avaliacao: "OK", observacao: "" }, s), /não encontrado/i);
  avaliarItem(c.id, a.id, { avaliacao: null, observacao: "" }, s);
  assert.equal(lerChecklists(s)[0].itens[0].avaliacao, null);
});

test("concluir só com todos os itens avaliados e cada NOK com observação", () => {
  const s = memoria();
  const c = iniciarChecklist(base(), s, agora);
  const [a, b, d] = c.itens;
  avaliarItem(c.id, a.id, { avaliacao: "OK", observacao: "" }, s);
  assert.throws(() => concluirChecklist(c.id, s, agora), /faltam 2/);
  avaliarItem(c.id, b.id, { avaliacao: "NOK", observacao: "" }, s);
  avaliarItem(c.id, d.id, { avaliacao: "N.A.", observacao: "" }, s);
  assert.throws(() => concluirChecklist(c.id, s, agora), /Descreva o problema.*Pneus/);
  assert.equal(lerChecklists(s)[0].status, "Em andamento");
  assert.equal(lerOcorrenciasVeiculo(s).length, 0);
});

test("NOK gera ocorrência Aberta e pendência no check list; OK e N.A. não geram nada", () => {
  const s = memoria();
  const c = iniciarChecklist(base(), s, agora);
  const [a, b, d] = c.itens;
  avaliarItem(c.id, a.id, { avaliacao: "OK", observacao: "" }, s);
  avaliarItem(c.id, b.id, { avaliacao: "NOK", observacao: "Careca no eixo traseiro" }, s);
  avaliarItem(c.id, d.id, { avaliacao: "N.A.", observacao: "Não se aplica" }, s);
  const feito = concluirChecklist(c.id, s, agora);
  assert.equal(feito.status, "Concluído");
  assert.ok(feito.concluidoEm);
  const oco = lerOcorrenciasVeiculo(s);
  assert.equal(oco.length, 1);
  assert.equal(oco[0].status, "Aberta");
  assert.equal(oco[0].veiculoId, "v1");
  assert.equal(oco[0].condutorId, "e1");
  assert.equal(oco[0].tipoNome, "Item reprovado no check list");
  assert.equal(oco[0].ocorridoEm, "2026-10-06T14:30");
  assert.match(oco[0].descricao, /CHK-0001.*Pneus.*Careca no eixo traseiro/);
  const lido = lerChecklists(s)[0];
  assert.equal(lido.itens[1].ocorrenciaCodigo, oco[0].codigo);
  assert.equal(lido.itens[0].ocorrenciaId, null);
  assert.equal(lido.itens[2].ocorrenciaId, null);
  assert.deepEqual(resumoChecklist(lido), { total: 3, avaliados: 3, ok: 1, nok: 1, na: 1, pendenciasAbertas: 1 });
  assert.throws(() => concluirChecklist(c.id, s, agora), /já foi concluído/i);
  assert.throws(() => avaliarItem(c.id, a.id, { avaliacao: "NOK", observacao: "x" }, s), /concluído/i);
});

test("a segunda ocorrência continua a sequência do módulo de ocorrências", () => {
  const s = memoria();
  const c1 = iniciarChecklist(base(), s, agora);
  c1.itens.forEach((i) => avaliarItem(c1.id, i.id, { avaliacao: "NOK", observacao: "ruim" }, s));
  concluirChecklist(c1.id, s, agora);
  assert.deepEqual(lerOcorrenciasVeiculo(s).map((o) => o.codigo), ["OCO-0001", "OCO-0002", "OCO-0003"]);
  const c2 = iniciarChecklist(base(), s, agora);
  c2.itens.forEach((i) => avaliarItem(c2.id, i.id, { avaliacao: "NOK", observacao: "ruim" }, s));
  concluirChecklist(c2.id, s, agora);
  assert.equal(lerOcorrenciasVeiculo(s).at(-1).codigo, "OCO-0006");
});

test("pendência NOK fica aberta até ser resolvida com descrição, só depois de concluído", () => {
  const s = memoria();
  const c = iniciarChecklist(base(), s, agora);
  const [a, b, d] = c.itens;
  avaliarItem(c.id, a.id, { avaliacao: "OK", observacao: "" }, s);
  avaliarItem(c.id, b.id, { avaliacao: "NOK", observacao: "Careca" }, s);
  avaliarItem(c.id, d.id, { avaliacao: "OK", observacao: "" }, s);
  assert.throws(() => resolverPendencia(c.id, b.id, "trocado", s, agora), /conclua/i);
  concluirChecklist(c.id, s, agora);
  assert.equal(pendenciasAbertas(lerChecklists(s)).length, 1);
  assert.equal(pendenciasAbertas(lerChecklists(s), "outro").length, 0);
  assert.throws(() => resolverPendencia(c.id, b.id, "  ", s, agora), /descreva/i);
  assert.throws(() => resolverPendencia(c.id, a.id, "ok", s, agora), /NOK/);
  resolverPendencia(c.id, b.id, "Pneus trocados na oficina", s, agora);
  assert.equal(pendenciasAbertas(lerChecklists(s)).length, 0);
  assert.equal(resumoChecklist(lerChecklists(s)[0]).pendenciasAbertas, 0);
  assert.equal(lerChecklists(s)[0].itens[1].resolucao.descricao, "Pneus trocados na oficina");
  assert.throws(() => resolverPendencia(c.id, b.id, "de novo", s, agora), /já foi resolvida/i);
});

test("fotos do item: até 3, só imagens, e só em check list em andamento", () => {
  const s = memoria();
  const c = iniciarChecklist(base(), s, agora);
  const [a] = c.itens;
  const foto = "data:image/jpeg;base64,AAAA";
  adicionarFotosItem(c.id, a.id, [foto, foto], s);
  assert.throws(() => adicionarFotosItem(c.id, a.id, [foto, foto], s), /no máximo 3/i);
  assert.throws(() => adicionarFotosItem(c.id, a.id, ["http://x/y.png"], s), /imagem/i);
  removerFotoItem(c.id, a.id, 0, s);
  assert.equal(lerChecklists(s)[0].itens[0].fotos.length, 1);
  assert.throws(() => removerFotoItem(c.id, a.id, 5, s), /não encontrada/i);
  excluirChecklistEmAndamento(c.id, s);
  assert.equal(lerChecklists(s).length, 0);
});

test("periodicidade: diário vale o dia; semanal vai de segunda a domingo", () => {
  assert.deepEqual(periodoAtual("Diário", "2026-10-06"), { inicio: "2026-10-06", fim: "2026-10-06" });
  assert.deepEqual(periodoAtual("Semanal", "2026-10-06"), { inicio: "2026-10-05", fim: "2026-10-11" });
  assert.deepEqual(periodoAtual("Semanal", "2026-10-11"), { inicio: "2026-10-05", fim: "2026-10-11" });
  assert.deepEqual(periodoAtual("Semanal", "2026-10-05"), { inicio: "2026-10-05", fim: "2026-10-11" });
  assert.deepEqual(periodoAtual("Semanal", "2026-10-12"), { inicio: "2026-10-12", fim: "2026-10-18" });
  const feito = (data) => ({ data, status: "Concluído" });
  assert.equal(situacaoPeriodica("Diário", [feito("2026-10-06")], "2026-10-06"), "em_dia");
  assert.equal(situacaoPeriodica("Diário", [feito("2026-10-05")], "2026-10-06"), "pendente");
  assert.equal(situacaoPeriodica("Semanal", [feito("2026-10-05")], "2026-10-09"), "em_dia");
  assert.equal(situacaoPeriodica("Semanal", [feito("2026-10-04")], "2026-10-09"), "pendente");
  assert.equal(situacaoPeriodica("Diário", [{ data: "2026-10-06", status: "Em andamento" }], "2026-10-06"), "em_andamento");
  assert.equal(situacaoPeriodica("Diário", [], "2026-10-06"), "pendente");
});

test("dados ilegíveis não são sobrescritos", () => {
  const s = memoria();
  s.setItem("gemape-demo-checklists-veiculo", "{quebrado");
  assert.throws(() => iniciarChecklist(base(), s, agora), /não puderam ser lidos/i);
  assert.equal(s.getItem("gemape-demo-checklists-veiculo"), "{quebrado");
});

test("a lib não toca o Supabase", () => {
  assert.doesNotMatch(readFileSync("src/lib/checklist-veiculo.ts", "utf8"), /supabase/i);
});

test("se o check list não puder ser gravado, as ocorrências recém-criadas são desfeitas", () => {
  const s = memoria();
  const c = iniciarChecklist(base(), s, agora);
  c.itens.forEach((i) => avaliarItem(c.id, i.id, { avaliacao: "NOK", observacao: "ruim" }, s));
  const quebrado = { getItem: s.getItem, setItem: (k, v) => { if (k.includes("checklists")) throw new Error("falhou"); s.setItem(k, v); } };
  assert.throws(() => concluirChecklist(c.id, quebrado, agora), /falhou/);
  assert.equal(lerOcorrenciasVeiculo(s).length, 0);
  assert.equal(lerChecklists(s)[0].status, "Em andamento");
});

test("relatório em PDF: traz todos os itens e escapa todo texto informado", async () => {
  const { montarChecklistHtml } = await import("../src/lib/checklist-veiculo-html.ts");
  const s = memoria();
  const c = iniciarChecklist(base({ veiculoRotulo: "<b>Placa</b>", responsavelNome: "Ana <script>x</script>" }), s, agora);
  avaliarItem(c.id, c.itens[0].id, { avaliacao: "NOK", observacao: "<img src=x onerror=alert(1)>" }, s);
  adicionarFotosItem(c.id, c.itens[0].id, ["data:image/jpeg;base64,AAAA"], s);
  avaliarItem(c.id, c.itens[1].id, { avaliacao: "OK", observacao: "" }, s);
  avaliarItem(c.id, c.itens[2].id, { avaliacao: "N.A.", observacao: "" }, s);
  const feito = concluirChecklist(c.id, s, agora);
  const html = montarChecklistHtml(feito, "Empresa <i>Teste</i>");
  for (const nome of ["Lataria", "Pneus", "Limpeza", "Carros · Exterior", "Todos · Comuns", "CHK-0001"]) assert.ok(html.includes(nome), nome);
  assert.doesNotMatch(html, /<script>x|<b>Placa|<img src=x|<i>Teste/);
  assert.match(html, /&lt;script&gt;x/);
  assert.match(html, /src="data:image\/jpeg;base64,AAAA"/);
  assert.match(html, /1 pendência\(s\) aberta\(s\)/);
  assert.match(html, /OCO-0001/);
});

test("a tela fica em Veículos > Check list, com PDF, confirmação ao concluir e periodicidade no cadastro do veículo", () => {
  const menu = readFileSync("src/lib/menu-parametros.ts", "utf8");
  assert.match(menu, /aba: "checklist", titulo: "Check list"/);
  assert.match(readFileSync("src/routes/_authenticated/veiculos.tsx", "utf8"), /MODO_DEMO \? <ChecklistVeiculoModulo/);
  const tela = readFileSync("src/components/modules/ChecklistVeiculoModulo.tsx", "utf8");
  assert.match(tela, /AlertDialog/);
  assert.match(tela, /Gerar PDF/);
  assert.match(tela, /montarChecklistHtml/);
  assert.match(tela, /Resolver pendência/);
  assert.doesNotMatch(tela, /supabase\.(from|rpc)/);
  const cadastro = readFileSync("src/components/modules/VeiculosCadastroModulo.tsx", "utf8");
  assert.match(cadastro, /Periodicidade do check list/);
  assert.match(cadastro, /periodicidade_checklist/);
});

test("situação periódica vale pelo dia da conclusão e tipos soltos são reconhecidos", () => {
  // iniciado ontem, concluído hoje (Brasília): em dia no diário de hoje
  const c = { data: "2026-10-05", status: "Concluído", concluidoEm: "2026-10-06T15:00:00.000Z" };
  assert.equal(situacaoPeriodica("Diário", [c], "2026-10-06"), "em_dia");
  assert.equal(chaveDoTipoVeiculo("Cavalo mecânico"), "pesado");
  assert.equal(chaveDoTipoVeiculo("Carreta"), "pesado");
  assert.equal(chaveDoTipoVeiculo("Caminhonete"), "suv");
  assert.equal(chaveDoTipoVeiculo("Caminhão"), "leve");
});
