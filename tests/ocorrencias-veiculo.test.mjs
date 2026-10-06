import test from "node:test";
import assert from "node:assert/strict";

import {
  lerOcorrenciasVeiculo, registrarOcorrenciaVeiculo, salvarTratativa, adicionarFotosOcorrencia,
  removerFotoOcorrencia, contarPorStatus, MAX_FOTOS,
} from "../src/lib/ocorrencias-veiculo.ts";
import { dimensoesReduzidas } from "../src/lib/imagem.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const agora = new Date(2026, 9, 6, 14, 30);
const entrada = {
  veiculoId: "v1", tipoId: "t1", data: "2026-10-05", hora: "09:15", local: "BR-116, km 40",
  condutorId: "e1", danoEmpresa: true, danoTerceiros: false, descricao: "Colisão leve na traseira", fotos: [],
};
const tipos = [{ id: "t1", nome: "Colisão" }];
const foto = "data:image/jpeg;base64,AAAA";

test("nova ocorrência: código sequencial, data e hora do cadastro e status Aberta", () => {
  const s = memoria();
  const a = registrarOcorrenciaVeiculo(entrada, s, agora, tipos);
  const b = registrarOcorrenciaVeiculo({ ...entrada, descricao: "Outra" }, s, agora, tipos);
  assert.equal(a.codigo, "OCO-0001");
  assert.equal(b.codigo, "OCO-0002");
  assert.equal(a.status, "Aberta");
  assert.equal(a.tipoNome, "Colisão");
  assert.equal(a.cadastradaEm, agora.toISOString());
  assert.equal(a.ocorridoEm, "2026-10-05T09:15");
  assert.equal(a.tratativa, null);
  assert.equal(lerOcorrenciasVeiculo(s).length, 2);
});

test("nova ocorrência valida veículo, tipo, data e hora do ocorrido, local, condutor e descrição", () => {
  const s = memoria();
  const r = (mudanca, erro) => assert.throws(() => registrarOcorrenciaVeiculo({ ...entrada, ...mudanca }, s, agora, tipos), erro);
  r({ veiculoId: "" }, /veículo/i);
  r({ tipoId: "" }, /tipo/i);
  r({ tipoId: "zz" }, /tipo/i);
  r({ data: "" }, /data/i);
  r({ data: "2026-10-07" }, /futura/i);
  r({ data: "2026-10-06", hora: "18:00" }, /futura/i);
  r({ hora: "" }, /hora/i);
  r({ local: " " }, /local/i);
  r({ condutorId: "" }, /condutor/i);
  r({ descricao: "" }, /descri/i);
  r({ fotos: ["http://x/y.png"] }, /foto/i);
  r({ fotos: Array(MAX_FOTOS + 1).fill(foto) }, /fotos/i);
  assert.equal(lerOcorrenciasVeiculo(s).length, 0);
});

test("tratativa: salvar deixa Em tratativa, registra data e hora e pode ser editada de novo", () => {
  const s = memoria();
  const o = registrarOcorrenciaVeiculo(entrada, s, agora, tipos);
  const dados = {
    responsavelId: "e2", descricaoEmpresa: "Funilaria e pintura", descricaoTerceiros: "", custoEmpresa: "R$ 1.500,50",
    pagamentoTerceiros: "Terceiro pagou a franquia", seguradora: "nao",
  };
  const t1 = salvarTratativa(o.id, dados, { encerrar: false, isAdmin: false }, s, new Date(2026, 9, 6, 15, 0));
  assert.equal(t1.status, "Em tratativa");
  assert.equal(t1.tratativa.custoEmpresa, 1500.5);
  assert.equal(t1.tratativa.seguradora, false);
  const registrada = t1.tratativa.registradaEm;
  const t2 = salvarTratativa(o.id, { ...dados, custoEmpresa: "2000", seguradora: "sim" }, { encerrar: false, isAdmin: false }, s, new Date(2026, 9, 7, 9, 0));
  assert.equal(t2.status, "Em tratativa");
  assert.equal(t2.tratativa.registradaEm, registrada);
  assert.notEqual(t2.tratativa.atualizadaEm, registrada);
  assert.equal(t2.tratativa.seguradora, true);
});

test("tratativa valida responsável, custo, seguradora e a descrição de cada veículo com dano", () => {
  const s = memoria();
  const o = registrarOcorrenciaVeiculo({ ...entrada, danoTerceiros: true }, s, agora, tipos);
  const ok = { responsavelId: "e2", descricaoEmpresa: "A", descricaoTerceiros: "B", custoEmpresa: "0", pagamentoTerceiros: "", seguradora: "nao" };
  const r = (mudanca, erro) => assert.throws(() => salvarTratativa(o.id, { ...ok, ...mudanca }, { encerrar: false, isAdmin: false }, s, agora), erro);
  r({ responsavelId: "" }, /responsável/i);
  r({ descricaoEmpresa: "" }, /empresa/i);
  r({ descricaoTerceiros: "" }, /terceiros/i);
  r({ custoEmpresa: "" }, /custo/i);
  r({ custoEmpresa: "abc" }, /custo/i);
  r({ seguradora: "" }, /seguradora/i);
  assert.equal(lerOcorrenciasVeiculo(s)[0].status, "Aberta");
  assert.equal(salvarTratativa(o.id, ok, { encerrar: false, isAdmin: false }, s, agora).tratativa.custoEmpresa, 0);
});

test("sem dano de veículo da empresa a descrição da empresa não é exigida", () => {
  const s = memoria();
  const o = registrarOcorrenciaVeiculo({ ...entrada, danoEmpresa: false, danoTerceiros: false }, s, agora, tipos);
  const t = salvarTratativa(o.id, { responsavelId: "e2", descricaoEmpresa: "", descricaoTerceiros: "", custoEmpresa: "0", pagamentoTerceiros: "", seguradora: "nao" }, { encerrar: false, isAdmin: false }, s, agora);
  assert.equal(t.status, "Em tratativa");
});

test("encerrar fecha a tratativa; só o Administrador edita depois, e ela continua encerrada", () => {
  const s = memoria();
  const o = registrarOcorrenciaVeiculo(entrada, s, agora, tipos);
  const dados = { responsavelId: "e2", descricaoEmpresa: "Reparo", descricaoTerceiros: "", custoEmpresa: "100", pagamentoTerceiros: "", seguradora: "nao" };
  const enc = salvarTratativa(o.id, dados, { encerrar: true, isAdmin: false }, s, agora);
  assert.equal(enc.status, "Encerrada");
  assert.ok(enc.encerradaEm);
  assert.throws(() => salvarTratativa(o.id, { ...dados, custoEmpresa: "200" }, { encerrar: false, isAdmin: false }, s, agora), /encerrada/i);
  assert.throws(() => adicionarFotosOcorrencia(o.id, [foto], { isAdmin: false }, s), /encerrada/i);
  const editada = salvarTratativa(o.id, { ...dados, custoEmpresa: "200" }, { encerrar: false, isAdmin: true }, s, agora);
  assert.equal(editada.status, "Encerrada");
  assert.equal(editada.tratativa.custoEmpresa, 200);
  assert.equal(adicionarFotosOcorrencia(o.id, [foto], { isAdmin: true }, s).fotos.length, 1);
});

test("fotos: anexa depois de cadastrar, respeita o limite e remove", () => {
  const s = memoria();
  const o = registrarOcorrenciaVeiculo({ ...entrada, fotos: [foto] }, s, agora, tipos);
  assert.equal(o.fotos.length, 1);
  const a = adicionarFotosOcorrencia(o.id, [foto, foto], { isAdmin: false }, s);
  assert.equal(a.fotos.length, 3);
  assert.throws(() => adicionarFotosOcorrencia(o.id, Array(MAX_FOTOS).fill(foto), { isAdmin: false }, s), /fotos/i);
  assert.throws(() => adicionarFotosOcorrencia(o.id, ["texto"], { isAdmin: false }, s), /foto/i);
  assert.equal(removerFotoOcorrencia(o.id, 0, { isAdmin: false }, s).fotos.length, 2);
});

test("contar por status", () => {
  const lista = [{ status: "Aberta" }, { status: "Aberta" }, { status: "Encerrada" }];
  assert.deepEqual(contarPorStatus(lista), { Aberta: 2, "Em tratativa": 0, Encerrada: 1 });
});

test("a foto é reduzida mantendo a proporção e nunca ampliada", () => {
  assert.deepEqual(dimensoesReduzidas(4000, 3000, 1024), { largura: 1024, altura: 768 });
  assert.deepEqual(dimensoesReduzidas(3000, 4000, 1024), { largura: 768, altura: 1024 });
  assert.deepEqual(dimensoesReduzidas(800, 600, 1024), { largura: 800, altura: 600 });
});

test("a tela nova é ligada na rota só em demonstração, sem Supabase, e o extrato usa a mesma loja", async () => {
  const { readFileSync } = await import("node:fs");
  const rota = readFileSync("src/routes/_authenticated/veiculos.tsx", "utf8");
  assert.match(rota, /MODO_DEMO \? <OcorrenciasVeiculoModulo \/> : <OcorrenciasModulo/);
  assert.doesNotMatch(readFileSync("src/lib/ocorrencias-veiculo.ts", "utf8"), /supabase/i);
  assert.match(readFileSync("src/components/modules/ExtratoVeiculo.tsx", "utf8"), /useOcorrenciasVeiculo/);
  const tela = readFileSync("src/components/modules/OcorrenciasVeiculoModulo.tsx", "utf8");
  assert.match(tela, /AlertDialog/);
  assert.match(tela, /Encerrar tratativa/);
});
