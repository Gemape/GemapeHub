import test from "node:test";
import assert from "node:assert/strict";

import {
  lerParametros,
  adicionarAcaoManutencaoVeiculo,
  renomearAcaoManutencaoVeiculo,
  removerAcaoManutencaoVeiculo,
  adicionarTipoOcorrenciaVeiculo,
  editarTipoOcorrenciaVeiculo,
  removerTipoOcorrenciaVeiculo,
  cadastrarPadraoVeiculos,
} from "../src/lib/parametros-base.ts";
import { ACOES_MANUTENCAO_PADRAO, TIPOS_OCORRENCIA_VEICULO_PADRAO } from "../src/lib/veiculos-padrao.ts";

const storage = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};

test("os padrões trazem as 5 ações e os 8 tipos de ocorrência pedidos, cada tipo com descrição", () => {
  assert.deepEqual(ACOES_MANUTENCAO_PADRAO, [
    "Troca de óleo do motor", "Troca de pneu", "Troca de filtro de óleo do motor", "Troca de filtro de ar", "Troca de filtro de combustível",
  ]);
  assert.deepEqual(TIPOS_OCORRENCIA_VEICULO_PADRAO.map((t) => t.nome), [
    "Furto", "Roubo", "Avaria em manobra", "Avaria por fator externo", "Avaria interna", "Infração de trânsito", "Sinistro com vítima", "Colisão em trânsito",
  ]);
  assert.ok(TIPOS_OCORRENCIA_VEICULO_PADRAO.every((t) => t.descricao.length > 10));
});

test("ações de manutenção: incluir, renomear e excluir, sem repetir o nome", () => {
  const s = storage();
  assert.deepEqual(lerParametros(s).acoesManutencaoVeiculo, []);
  const a = adicionarAcaoManutencaoVeiculo("Troca de pneu", s);
  assert.throws(() => adicionarAcaoManutencaoVeiculo("troca de PNEU", s), /já existe/i);
  renomearAcaoManutencaoVeiculo(a.id, "Troca de pneus", s);
  assert.equal(lerParametros(s).acoesManutencaoVeiculo[0].nome, "Troca de Pneus");
  removerAcaoManutencaoVeiculo(a.id, s);
  assert.deepEqual(lerParametros(s).acoesManutencaoVeiculo, []);
});

test("tipos de ocorrência: nome obrigatório e único, descrição editável, exclusão", () => {
  const s = storage();
  assert.throws(() => adicionarTipoOcorrenciaVeiculo("  ", "x", s), /nome/i);
  const t = adicionarTipoOcorrenciaVeiculo("Furto", "  Subtração do veículo   sem violência ", s);
  assert.equal(t.descricao, "Subtração do veículo sem violência");
  assert.throws(() => adicionarTipoOcorrenciaVeiculo("furto", "outra", s), /já existe/i);
  editarTipoOcorrenciaVeiculo(t.id, "Furto de veículo", "Subtração sem violência", s);
  const lido = lerParametros(s).tiposOcorrenciaVeiculo[0];
  assert.equal(lido.nome, "Furto de Veículo");
  assert.equal(lido.descricao, "Subtração sem violência");
  assert.throws(() => editarTipoOcorrenciaVeiculo("nao-existe", "x", "y", s), /não encontrad/i);
  removerTipoOcorrenciaVeiculo(t.id, s);
  assert.deepEqual(lerParametros(s).tiposOcorrenciaVeiculo, []);
});

test("cadastrar padrão inclui o que falta e não repete nem altera o que já existe", () => {
  const s = storage();
  adicionarAcaoManutencaoVeiculo("troca de pneu", s);
  adicionarTipoOcorrenciaVeiculo("Furto", "Minha descrição", s);
  const r = cadastrarPadraoVeiculos(s);
  assert.deepEqual(r, { acoes: 4, tipos: TIPOS_OCORRENCIA_VEICULO_PADRAO.length - 1 });
  const d = lerParametros(s);
  assert.equal(d.acoesManutencaoVeiculo.length, 5);
  assert.equal(d.tiposOcorrenciaVeiculo.find((t) => t.nome === "Furto").descricao, "Minha descrição");
  assert.deepEqual(cadastrarPadraoVeiculos(s), { acoes: 0, tipos: 0 });
});

test("dados antigos sem as novas listas continuam legíveis", () => {
  const s = storage();
  s.setItem("gemape-demo-parametros-base", JSON.stringify({ marcasVeiculo: [{ id: "m1", nome: "Fiat" }] }));
  const d = lerParametros(s);
  assert.deepEqual(d.acoesManutencaoVeiculo, []);
  assert.deepEqual(d.tiposOcorrenciaVeiculo, []);
  assert.equal(d.marcasVeiculo[0].nome, "Fiat");
});

import { readFileSync } from "node:fs";

test("Parâmetros > Veículos é um grupo com cadastro, ações de manutenção e tipos de ocorrência", () => {
  const menu = readFileSync("src/lib/menu-parametros.ts", "utf8");
  const sidebar = readFileSync("src/components/layout/AppSidebar.tsx", "utf8");
  for (const url of ["/cadastros/veiculos", "/cadastros/veiculos-acoes-manutencao", "/cadastros/veiculos-tipos-ocorrencia"]) {
    assert.ok(menu.includes(`url: "${url}"`), url);
  }
  assert.match(sidebar, /<MenuVeiculos pathname=\{pathname\} \/>/);
  assert.doesNotMatch(sidebar, /titulo: "Veículos", url: "\/cadastros\/veiculos"/);
});

test("as listas usam Clonar/Editar/Excluir, Cadastrar padrão, trava de duplo clique e não tocam o Supabase", () => {
  const tela = readFileSync("src/components/parametros/VeiculosListasParametros.tsx", "utf8");
  assert.match(tela, /<AcoesLinha/);
  assert.match(tela, /onClonar=/);
  assert.match(tela, /Cadastrar padrão/);
  assert.match(tela, /salvando\.current/);
  assert.doesNotMatch(tela, /supabase/i);
});
