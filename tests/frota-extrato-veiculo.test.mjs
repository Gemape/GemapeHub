import test from "node:test";
import assert from "node:assert/strict";

import {
  lerAbastecimentos, registrarAbastecimento, removerAbastecimento,
  lerManutencoes, registrarManutencao, removerManutencao,
} from "../src/lib/registros-veiculo.ts";
import { resumoManutencao, custoNaoNegativo } from "../src/lib/registros-veiculo.ts";
import { mediaKmPorLitro, kmAtualDoVeiculo, sugestoesPreventivas, somarMeses } from "../src/lib/extrato-veiculo.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const hoje = new Date(2026, 9, 5, 12);
// Manutenção (decisão 61): grupo (pai), ações (filhos), local e custos são sempre informados.
const ACOES = [{ id: "a1", subitens: [{ id: "s1", nome: "Troca de óleo" }, { id: "s2", nome: "Filtro" }] }, { id: "a2", subitens: [] }];
const EX = { acaoId: "a1", itens: [{ subitemId: "s1" }], local: "empresa", custoPecas: "0", custoMaoDeObra: "0" };

test("abastecimento valida veículo, data, km e litros e aceita vírgula decimal", () => {
  const ok = { veiculoId: "v1", data: "2026-10-01", hora: "08:30", km: "50.000", litros: "40,5", valor: "R$ 1.234,56" };
  const s = memoria();
  const r = registrarAbastecimento(ok, s, hoje);
  assert.equal(r.km, 50000);
  assert.equal(r.litros, 40.5);
  assert.equal(r.valor, 1234.56);
  assert.equal(r.hora, "08:30");
  assert.equal(lerAbastecimentos(s).length, 1);
  assert.throws(() => registrarAbastecimento({ ...ok, veiculoId: "" }, s, hoje), /veículo/i);
  assert.throws(() => registrarAbastecimento({ ...ok, data: "" }, s, hoje), /data/i);
  assert.throws(() => registrarAbastecimento({ ...ok, data: "2026-12-01" }, s, hoje), /futura/i);
  assert.throws(() => registrarAbastecimento({ ...ok, km: "abc" }, s, hoje), /km/i);
  assert.throws(() => registrarAbastecimento({ ...ok, hora: "08:00", valor: "200", litros: "0" }, s, hoje), /litros/i);
  assert.equal(lerAbastecimentos(s).length, 1);
});

test("abastecimento não aceita km fora da ordem das datas do mesmo veículo", () => {
  const s = memoria();
  registrarAbastecimento({ veiculoId: "v1", data: "2026-09-01", km: "1000", hora: "08:00", valor: "200", litros: "30" }, s, hoje);
  registrarAbastecimento({ veiculoId: "v1", data: "2026-10-01", km: "1500", hora: "08:00", valor: "200", litros: "30" }, s, hoje);
  assert.throws(() => registrarAbastecimento({ veiculoId: "v1", data: "2026-09-15", km: "900", hora: "08:00", valor: "200", litros: "30" }, s, hoje), /km/i);
  assert.throws(() => registrarAbastecimento({ veiculoId: "v1", data: "2026-09-15", km: "1600", hora: "08:00", valor: "200", litros: "30" }, s, hoje), /km/i);
  // manutenção também entra na conta do km
  registrarManutencao({ ...EX, veiculoId: "v1", data: "2026-09-20", km: "1200", tipo: "Corretiva", descricao: "Bateria" }, s, hoje, ACOES);
  assert.throws(() => registrarManutencao({ ...EX, veiculoId: "v1", data: "2026-09-25", km: "1100", tipo: "Corretiva", descricao: "x" }, s, hoje, ACOES), /km/i);
  assert.throws(() => registrarAbastecimento({ veiculoId: "v1", data: "2026-09-25", km: "1100", hora: "08:00", valor: "200", litros: "30" }, s, hoje), /km/i);
  // outro veículo não é afetado
  registrarAbastecimento({ veiculoId: "v2", data: "2026-09-15", km: "10", hora: "08:00", valor: "200", litros: "30" }, s, hoje);
  assert.equal(lerAbastecimentos(s).length, 3);
  assert.throws(() => registrarAbastecimento({ veiculoId: "v2", data: "2026-02-31", km: "10", hora: "08:00", valor: "200", litros: "30" }, s, hoje), /data/i);
});

test("remover abastecimento e manutenção", () => {
  const s = memoria();
  const a = registrarAbastecimento({ veiculoId: "v1", data: "2026-10-01", km: "1000", hora: "08:00", valor: "200", litros: "30" }, s, hoje);
  removerAbastecimento(a.id, s);
  assert.equal(lerAbastecimentos(s).length, 0);
  const m = registrarManutencao({ ...EX, veiculoId: "v1", data: "2026-10-01", km: "1000", tipo: "Corretiva", descricao: "Troca de pastilha" }, s, hoje, ACOES);
  removerManutencao(m.id, s);
  assert.equal(lerManutencoes(s).length, 0);
});

test("manutenção: tipo, grupo (pai), ações (filhos), local e custos", () => {
  const s = memoria();
  const base = { ...EX, veiculoId: "v1", data: "2026-10-01", km: "1000", tipo: "Preventiva" };
  assert.throws(() => registrarManutencao({ ...base, tipo: "Outra" }, s, hoje, ACOES), /tipo/i);
  assert.throws(() => registrarManutencao({ ...base, acaoId: "" }, s, hoje, ACOES), /grupo/i);
  assert.throws(() => registrarManutencao({ ...base, acaoId: "zz" }, s, hoje, ACOES), /grupo/i);
  assert.throws(() => registrarManutencao({ ...base, itens: [] }, s, hoje, ACOES), /ação/i);
  assert.throws(() => registrarManutencao({ ...base, itens: [{ subitemId: "x" }] }, s, hoje, ACOES), /ação/i);
  assert.throws(() => registrarManutencao({ ...base, itens: [{ subitemId: "s1" }, { subitemId: "s1" }] }, s, hoje, ACOES), /repetida/i);
  assert.throws(() => registrarManutencao({ ...base, local: "" }, s, hoje, ACOES), /local/i);
  assert.throws(() => registrarManutencao({ ...base, local: "terceiro", localNome: " " }, s, hoje, ACOES), /local/i);
  assert.throws(() => registrarManutencao({ ...base, custoPecas: "" }, s, hoje, ACOES), /peças/i);
  assert.throws(() => registrarManutencao({ ...base, custoMaoDeObra: "abc" }, s, hoje, ACOES), /mão de obra/i);
  assert.throws(() => registrarManutencao({ ...base, custoPecas: "-5" }, s, hoje, ACOES), /peças/i);
  assert.equal(lerManutencoes(s).length, 0);
});

test("manutenção corretiva pede a descrição; preventiva não guarda descrição", () => {
  const s = memoria();
  const base = { ...EX, veiculoId: "v1", data: "2026-10-01", km: "1000" };
  assert.throws(() => registrarManutencao({ ...base, tipo: "Corretiva", descricao: " " }, s, hoje, ACOES), /descri/i);
  const c = registrarManutencao({ ...base, tipo: "Corretiva", descricao: "Barulho   no freio" }, s, hoje, ACOES);
  assert.equal(c.descricao, "Barulho no freio");
  const p = registrarManutencao({ ...base, km: "1100", tipo: "Preventiva", descricao: "ignorada" }, s, hoje, ACOES);
  assert.equal(p.descricao, "");
  assert.equal(lerManutencoes(s).length, 2);
});

test("manutenção guarda grupo, ações com observação livre, local e custos com total", () => {
  const s = memoria();
  const m = registrarManutencao({
    veiculoId: "v1", data: "2026-10-01", km: "1000", tipo: "Preventiva", acaoId: "a1",
    itens: [{ subitemId: "s1", observacao: "  óleo 5W30  " }, { subitemId: "s2" }],
    local: "terceiro", localNome: "Oficina do Zé", custoPecas: "R$ 1.234,50", custoMaoDeObra: "200",
  }, s, hoje, ACOES);
  assert.deepEqual(m.itens, [
    { subitemId: "s1", nome: "Troca de óleo", observacao: "óleo 5W30" },
    { subitemId: "s2", nome: "Filtro", observacao: "" },
  ]);
  assert.equal(m.local, "terceiro");
  assert.equal(m.localNome, "Oficina do Zé");
  assert.equal(m.custoPecas, 1234.5);
  assert.equal(m.custoMaoDeObra, 200);
  assert.equal(m.custoTotal, 1434.5);
  const e = registrarManutencao({ ...EX, veiculoId: "v1", data: "2026-10-02", km: "1010", tipo: "Corretiva", descricao: "x", local: "empresa", localNome: "ignorado" }, s, hoje, ACOES);
  assert.equal(e.localNome, "");
  assert.equal(e.custoTotal, 0);
});

test("grupo sem ações cadastradas não exige ação", () => {
  const s = memoria();
  const m = registrarManutencao({ ...EX, veiculoId: "v1", data: "2026-10-01", km: "1000", tipo: "Preventiva", acaoId: "a2", itens: [] }, s, hoje, ACOES);
  assert.deepEqual(m.itens, []);
});

test("a tela de manutenção tem o fluxo da decisão 61 e continua sem Supabase", () => {
  const tela = ["ManutencaoVeiculoModulo", "NovaManutencaoDialog"].map((n) => readFileSync(`src/components/modules/${n}.tsx`, "utf8")).join("\n");
  assert.match(tela, /Cadastrar nova manutenção/);
  assert.match(tela, /Observação/);
  assert.match(tela, /das peças/i);
  assert.match(tela, /mão de obra/i);
  assert.match(tela, /Terceiro/);
  assert.doesNotMatch(tela, /supabase\.(from|rpc)/);
});

test("média km/L usa a distância entre o primeiro e o último abastecimento e os litros dos seguintes", () => {
  assert.equal(mediaKmPorLitro([]), null);
  assert.equal(mediaKmPorLitro([{ km: 1000, litros: 40 }]), null);
  const lista = [{ km: 1500, litros: 40 }, { km: 1000, litros: 50 }, { km: 2000, litros: 25 }];
  // (2000 - 1000) / (40 + 25)
  assert.equal(Math.round(mediaKmPorLitro(lista) * 100) / 100, 15.38);
});

test("km atual é o maior entre o cadastro, os abastecimentos e as manutenções", () => {
  assert.equal(kmAtualDoVeiculo(25000, [{ km: 26000 }], [{ km: 27000 }]), 27000);
  assert.equal(kmAtualDoVeiculo(30000, [{ km: 26000 }], []), 30000);
});

test("somar meses mantém o dia ou usa o último dia do mês", () => {
  assert.equal(somarMeses("2026-02-01", 12), "2027-02-01");
  assert.equal(somarMeses("2026-08-31", 6), "2027-02-28");
});

const acoes = [{ id: "a1", nome: "Revisão de lubrificação" }, { id: "a2", nome: "Freios" }, { id: "a3", nome: "Pneus" }, { id: "a4", nome: "Correia" }];
const plano = { veiculoId: "v1", atualizadoEm: "", itens: [
  { acaoId: "a1", km: 15000, meses: 12 }, { acaoId: "a2", km: 10000, meses: 6 },
  { acaoId: "a3", km: 20000, meses: 24 }, { acaoId: "a4", km: 40000, meses: 24 },
] };

test("sugestões: vencida por tempo, atenção por km, em dia e sem registro, vencidas primeiro", () => {
  const manutencoes = [
    { acaoId: "a1", data: "2026-02-01", km: 100000, tipo: "Preventiva" },
    { acaoId: "a2", data: "2026-03-10", km: 50000, tipo: "Preventiva" },
    { acaoId: "a3", data: "2026-09-01", km: 114000, tipo: "Preventiva" },
    { acaoId: "a2", data: "2025-01-01", km: 40000, tipo: "Preventiva" },
    { acaoId: null, data: "2026-10-01", km: 114500, tipo: "Corretiva" },
  ];
  const r = sugestoesPreventivas({ plano, acoes, manutencoes, kmAtual: 114500, hoje: "2026-10-05" });
  const por = Object.fromEntries(r.map((s) => [s.acaoId, s]));
  assert.equal(por.a1.status, "atencao"); // faltam 500 km de 15.000
  assert.equal(por.a1.proximoKm, 115000);
  assert.equal(por.a1.proximaData, "2027-02-01");
  assert.equal(por.a2.status, "vencida"); // 6 meses desde 10/03 = 10/09
  assert.equal(por.a2.proximaData, "2026-09-10");
  assert.equal(por.a2.ultima.km, 50000); // a mais recente
  assert.equal(por.a3.status, "em_dia");
  assert.equal(por.a4.status, "sem_registro");
  assert.equal(r[0].acaoId, "a2"); // vencidas primeiro
  assert.deepEqual(r.map((s) => s.acaoId), ["a2", "a1", "a4", "a3"]); // sem registro antes de em dia
});

test("sugestões vencida por km mesmo antes da data", () => {
  const manutencoes = [{ acaoId: "a1", data: "2026-09-01", km: 100000, tipo: "Preventiva" }];
  const r = sugestoesPreventivas({ plano: { ...plano, itens: [plano.itens[0]] }, acoes, manutencoes, kmAtual: 115000, hoje: "2026-10-05" });
  assert.equal(r[0].status, "vencida");
  assert.match(r[0].motivo, /km/i);
});

test("sem plano não há sugestões; ação removida de Parâmetros é ignorada", () => {
  assert.deepEqual(sugestoesPreventivas({ plano: null, acoes, manutencoes: [], kmAtual: 0, hoje: "2026-10-05" }), []);
  const r = sugestoesPreventivas({ plano: { ...plano, itens: [{ acaoId: "zz", km: 1, meses: 1 }] }, acoes, manutencoes: [], kmAtual: 0, hoje: "2026-10-05" });
  assert.deepEqual(r, []);
});

import { readFileSync } from "node:fs";
const fonte = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");

test("Veículos tem Frota com extrato, Abastecimento e Manutenção, e o cadastro fica em Parâmetros", () => {
  const rota = fonte("routes/_authenticated/veiculos.tsx");
  for (const nome of ["FrotaModulo", "AbastecimentoVeiculoModulo", "ManutencaoVeiculoModulo"]) assert.match(rota, new RegExp(nome));
  assert.doesNotMatch(rota, /VeiculosCadastroModulo/);
  assert.match(fonte("components/modules/FrotaModulo.tsx"), /ExtratoVeiculo/);
  const extrato = fonte("components/modules/ExtratoVeiculo.tsx");
  for (const t of ["Manutenções preventivas sugeridas", "Manutenções realizadas", "Histórico de abastecimentos", "Ocorrências", "Média de consumo"]) assert.ok(extrato.includes(t), t);
});

test("excluir abastecimento e manutenção só aparece para o Administrador", () => {
  for (const c of ["AbastecimentoVeiculoModulo", "ManutencaoVeiculoModulo"]) assert.match(fonte(`components/modules/${c}.tsx`), /isAdmin &&/);
});


import { ultimoAbastecimentoDoVeiculo, historicoAbastecimentos } from "../src/lib/extrato-veiculo.ts";

test("mesmo dia: o km acompanha a hora, e km igual ao anterior é aceito", () => {
  const s = memoria();
  const base = { veiculoId: "v1", data: "2026-10-01", valor: "100", litros: "10" };
  registrarAbastecimento({ ...base, hora: "08:00", km: "1000" }, s, hoje);
  registrarAbastecimento({ ...base, hora: "18:00", km: "1300" }, s, hoje);
  assert.throws(() => registrarAbastecimento({ ...base, hora: "12:00", km: "900" }, s, hoje), /km/i);
  assert.throws(() => registrarAbastecimento({ ...base, hora: "12:00", km: "1400" }, s, hoje), /km/i);
  registrarAbastecimento({ ...base, hora: "12:00", km: "1000" }, s, hoje);
  assert.equal(lerAbastecimentos(s).length, 3);
});

test("último abastecimento do veículo traz o km mais recente por data e hora", () => {
  const lista = [
    { veiculoId: "v1", data: "2026-10-01", hora: "08:00", km: 1000 },
    { veiculoId: "v1", data: "2026-10-01", hora: "18:00", km: 1300 },
    { veiculoId: "v1", data: "2026-09-30", hora: "23:00", km: 900 },
    { veiculoId: "v2", data: "2026-10-04", hora: "10:00", km: 50 },
    { veiculoId: "v1", data: "2026-08-01", km: 400 }, // registro antigo, sem hora
  ];
  assert.equal(ultimoAbastecimentoDoVeiculo(lista, "v1").km, 1300);
  assert.equal(ultimoAbastecimentoDoVeiculo(lista, "v3"), null);
});

test("histórico calcula km rodados, km/L do trecho e R$/L, do mais recente ao mais antigo", () => {
  const lista = [
    { id: "a", veiculoId: "v1", data: "2026-09-01", hora: "08:00", km: 1000, litros: 40, valor: 240 },
    { id: "b", veiculoId: "v1", data: "2026-10-01", hora: "08:00", km: 1400, litros: 20, valor: 130 },
    { id: "c", veiculoId: "v1", data: "2026-09-15", km: 1200, litros: 25 }, // sem hora e sem valor (registro antigo)
  ];
  const h = historicoAbastecimentos(lista);
  assert.deepEqual(h.map((x) => x.id), ["b", "c", "a"]);
  assert.equal(h[0].kmRodados, 200);
  assert.equal(h[0].kmPorLitro, 10);
  assert.equal(h[0].precoLitro, 6.5);
  assert.equal(h[1].kmRodados, 200);
  assert.equal(h[1].precoLitro, null);
  assert.equal(h[2].kmRodados, null);
  assert.equal(h[2].kmPorLitro, null);
  assert.equal(h[2].precoLitro, 6);
});

test("manutenção no mesmo dia de um abastecimento aceita qualquer km; mesmo veículo, data e hora repetidos são recusados", () => {
  const s = memoria();
  registrarAbastecimento({ veiculoId: "v1", data: "2026-10-01", hora: "08:00", km: "1300", litros: "10", valor: "100" }, s, hoje);
  registrarManutencao({ ...EX, veiculoId: "v1", data: "2026-10-01", km: "1400", tipo: "Corretiva", descricao: "Bateria" }, s, hoje, ACOES);
  registrarAbastecimento({ veiculoId: "v1", data: "2026-10-01", hora: "06:00", km: "1000", litros: "10", valor: "100" }, s, hoje);
  // dias diferentes continuam conferidos, e a mensagem diz qual registro impede
  assert.throws(() => registrarManutencao({ ...EX, veiculoId: "v1", data: "2026-10-02", km: "1200", tipo: "Corretiva", descricao: "x" }, s, hoje, ACOES), /há um de [\d.]+ km em 01\/10\/2026/);
  assert.throws(() => registrarAbastecimento({ veiculoId: "v1", data: "2026-10-01", hora: "08:00", km: "1300", litros: "10", valor: "100" }, s, hoje), /mesma data e hora|nesta data e hora/i);
});

test("custos: ponto sem vírgula é decimal, 0 vale, teto de 999.999,99; resumo de registro antigo", () => {
  assert.equal(custoNaoNegativo("12.5"), 12.5);
  assert.equal(custoNaoNegativo("1.234,56"), 1234.56);
  assert.equal(custoNaoNegativo("1.500"), null);
  assert.equal(custoNaoNegativo("0"), 0);
  assert.equal(custoNaoNegativo("999.999,99"), 999999.99);
  assert.equal(custoNaoNegativo("1.000.000,00"), null);
  assert.equal(custoNaoNegativo(""), null);
  const antigo = { id: "x", veiculoId: "v1", data: "2026-01-01", km: 1, tipo: "Corretiva", acaoId: null, descricao: "Bateria", criadoEm: "" };
  assert.equal(resumoManutencao(antigo, undefined), "Bateria");
  assert.equal(resumoManutencao({ ...antigo, tipo: "Preventiva", acaoId: "a1", descricao: "" }, "Freios"), "Freios");
  assert.equal(resumoManutencao({ ...antigo, acaoId: "a1", itens: [{ subitemId: "s1", nome: "Pastilha", observacao: "" }] }, "Freios"), "Freios: Pastilha · Bateria");
});

test("corretiva com grupo não zera o prazo da preventiva do plano", () => {
  const plano = { veiculoId: "v1", itens: [{ acaoId: "a1", km: 10000, meses: 6 }] };
  const acoes = [{ id: "a1", nome: "Óleo", subitens: [] }];
  const base = { plano, acoes, kmAtual: 20000, hoje: "2026-10-05" };
  const prev = { acaoId: "a1", data: "2026-01-01", km: 5000, tipo: "Preventiva" };
  const so = sugestoesPreventivas({ ...base, manutencoes: [prev] });
  const com = sugestoesPreventivas({ ...base, manutencoes: [prev, { acaoId: "a1", data: "2026-10-01", km: 19000, tipo: "Corretiva" }] });
  assert.deepEqual(com, so);
});
