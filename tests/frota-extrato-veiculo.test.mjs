import test from "node:test";
import assert from "node:assert/strict";

import {
  lerAbastecimentos, registrarAbastecimento, removerAbastecimento,
  lerManutencoes, registrarManutencao, removerManutencao,
} from "../src/lib/registros-veiculo.ts";
import { mediaKmPorLitro, kmAtualDoVeiculo, sugestoesPreventivas, somarMeses } from "../src/lib/extrato-veiculo.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const hoje = new Date(2026, 9, 5, 12);

test("abastecimento valida veículo, data, km e litros e aceita vírgula decimal", () => {
  const s = memoria();
  const ok = { veiculoId: "v1", data: "2026-10-01", km: "50.000", litros: "40,5" };
  const r = registrarAbastecimento(ok, s, hoje);
  assert.equal(r.km, 50000);
  assert.equal(r.litros, 40.5);
  assert.equal(lerAbastecimentos(s).length, 1);
  assert.throws(() => registrarAbastecimento({ ...ok, veiculoId: "" }, s, hoje), /veículo/i);
  assert.throws(() => registrarAbastecimento({ ...ok, data: "" }, s, hoje), /data/i);
  assert.throws(() => registrarAbastecimento({ ...ok, data: "2026-12-01" }, s, hoje), /futura/i);
  assert.throws(() => registrarAbastecimento({ ...ok, km: "abc" }, s, hoje), /km/i);
  assert.throws(() => registrarAbastecimento({ ...ok, litros: "0" }, s, hoje), /litros/i);
  assert.equal(lerAbastecimentos(s).length, 1);
});

test("abastecimento não aceita km fora da ordem das datas do mesmo veículo", () => {
  const s = memoria();
  registrarAbastecimento({ veiculoId: "v1", data: "2026-09-01", km: "1000", litros: "30" }, s, hoje);
  registrarAbastecimento({ veiculoId: "v1", data: "2026-10-01", km: "1500", litros: "30" }, s, hoje);
  assert.throws(() => registrarAbastecimento({ veiculoId: "v1", data: "2026-09-15", km: "900", litros: "30" }, s, hoje), /km/i);
  assert.throws(() => registrarAbastecimento({ veiculoId: "v1", data: "2026-09-15", km: "1600", litros: "30" }, s, hoje), /km/i);
  // manutenção também entra na conta do km
  registrarManutencao({ veiculoId: "v1", data: "2026-09-20", km: "1200", tipo: "Corretiva", descricao: "Bateria" }, s, hoje);
  assert.throws(() => registrarManutencao({ veiculoId: "v1", data: "2026-09-25", km: "1100", tipo: "Corretiva", descricao: "x" }, s, hoje), /km/i);
  assert.throws(() => registrarAbastecimento({ veiculoId: "v1", data: "2026-09-25", km: "1100", litros: "30" }, s, hoje), /km/i);
  // outro veículo não é afetado
  registrarAbastecimento({ veiculoId: "v2", data: "2026-09-15", km: "10", litros: "30" }, s, hoje);
  assert.equal(lerAbastecimentos(s).length, 3);
  assert.throws(() => registrarAbastecimento({ veiculoId: "v2", data: "2026-02-31", km: "10", litros: "30" }, s, hoje), /data/i);
});

test("remover abastecimento e manutenção", () => {
  const s = memoria();
  const a = registrarAbastecimento({ veiculoId: "v1", data: "2026-10-01", km: "1000", litros: "30" }, s, hoje);
  removerAbastecimento(a.id, s);
  assert.equal(lerAbastecimentos(s).length, 0);
  const m = registrarManutencao({ veiculoId: "v1", data: "2026-10-01", km: "1000", tipo: "Corretiva", descricao: "Troca de pastilha" }, s, hoje);
  removerManutencao(m.id, s);
  assert.equal(lerManutencoes(s).length, 0);
});

test("manutenção preventiva pede a ação; corretiva pede a descrição", () => {
  const s = memoria();
  const base = { veiculoId: "v1", data: "2026-10-01", km: "1000" };
  assert.throws(() => registrarManutencao({ ...base, tipo: "Preventiva" }, s, hoje, ["a1"]), /ação/i);
  assert.throws(() => registrarManutencao({ ...base, tipo: "Preventiva", acaoId: "zz" }, s, hoje, ["a1"]), /ação/i);
  assert.throws(() => registrarManutencao({ ...base, tipo: "Corretiva", descricao: " " }, s, hoje), /descri/i);
  assert.throws(() => registrarManutencao({ ...base, tipo: "Outra" }, s, hoje), /tipo/i);
  const p = registrarManutencao({ ...base, tipo: "Preventiva", acaoId: "a1" }, s, hoje, ["a1"]);
  assert.equal(p.tipo, "Preventiva");
  assert.equal(p.acaoId, "a1");
  assert.equal(lerManutencoes(s).length, 1);
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
