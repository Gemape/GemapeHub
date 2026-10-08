import test from "node:test";
import assert from "node:assert/strict";

import {
  lerParametros,
  adicionarAcaoManutencaoVeiculo,
  editarAcaoManutencaoVeiculo,
  removerAcaoManutencaoVeiculo,
  adicionarTipoOcorrenciaVeiculo,
  editarTipoOcorrenciaVeiculo,
  removerTipoOcorrenciaVeiculo,
  cadastrarPadraoVeiculos,
  situacaoPadraoAcoesManutencaoVeiculo,
  restaurarPadroesAcoesManutencaoVeiculo,
} from "../src/lib/parametros-base.ts";
import { ACOES_MANUTENCAO_PADRAO, TIPOS_OCORRENCIA_VEICULO_PADRAO } from "../src/lib/veiculos-padrao.ts";

const storage = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};

test("os padrões trazem os 7 grupos de manutenção com subitens e os 8 tipos de ocorrência com descrição", () => {
  assert.deepEqual(ACOES_MANUTENCAO_PADRAO.map((a) => a.nome), [
    "Revisão do Sistema de Lubrificação e Filtros",
    "Revisão do Sistema de Transmissão e Fluídos",
    "Manutenção do Sistema de Freios",
    "Manutenção de Pneus e Alinhamento",
    "Revisão de Suspensão e Direção",
    "Revisão do Sistema Elétrico e Iluminação",
    "Inspeção de Segurança e Correias",
  ]);
  assert.deepEqual(ACOES_MANUTENCAO_PADRAO.map((a) => a.subitens.length), [5, 4, 7, 6, 6, 5, 5]);
  assert.deepEqual(TIPOS_OCORRENCIA_VEICULO_PADRAO.map((t) => t.nome), [
    "Furto", "Roubo", "Avaria em manobra", "Avaria por fator externo", "Avaria interna", "Infração de trânsito", "Sinistro com vítima", "Colisão em trânsito",
  ]);
  assert.ok(TIPOS_OCORRENCIA_VEICULO_PADRAO.every((t) => t.descricao.length > 10));
});

test("ações de manutenção: pai com subitens, editar mantém o id de quem já existe, sem repetir nomes", () => {
  const s = storage();
  assert.deepEqual(lerParametros(s).acoesManutencaoVeiculo, []);
  const a = adicionarAcaoManutencaoVeiculo("Manutenção de pneus", ["Calibragem", " ", "Rodízio de pneus"], s);
  assert.deepEqual(a.subitens.map((i) => i.nome), ["Calibragem", "Rodízio de pneus"]);
  assert.throws(() => adicionarAcaoManutencaoVeiculo("manutenção de PNEUS", [], s), /já existe/i);
  assert.throws(() => adicionarAcaoManutencaoVeiculo("Outra", ["Molas", "molas"], s), /subitem repetido/i);
  const idCalibragem = a.subitens[0].id;
  editarAcaoManutencaoVeiculo(a.id, "Pneus", ["Calibragem", "Alinhamento 3D"], s);
  const lido = lerParametros(s).acoesManutencaoVeiculo[0];
  assert.equal(lido.nome, "Pneus");
  assert.deepEqual(lido.subitens.map((i) => i.nome), ["Calibragem", "Alinhamento 3D"]);
  assert.equal(lido.subitens[0].id, idCalibragem);
  assert.throws(() => editarAcaoManutencaoVeiculo("nao-existe", "x", [], s), /não encontrad/i);
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
  assert.equal(lido.nome, "Furto de veículo");
  assert.equal(lido.descricao, "Subtração sem violência");
  assert.throws(() => editarTipoOcorrenciaVeiculo("nao-existe", "x", "y", s), /não encontrad/i);
  removerTipoOcorrenciaVeiculo(t.id, s);
  assert.deepEqual(lerParametros(s).tiposOcorrenciaVeiculo, []);
});

test("cadastrar padrão inclui o que falta e não repete nem altera o que já existe", () => {
  const s = storage();
  adicionarAcaoManutencaoVeiculo("manutenção do sistema de freios", ["Meu subitem"], s);
  adicionarTipoOcorrenciaVeiculo("Furto", "Minha descrição", s);
  const r = cadastrarPadraoVeiculos(s);
  assert.deepEqual(r, { acoes: ACOES_MANUTENCAO_PADRAO.length - 1, tipos: TIPOS_OCORRENCIA_VEICULO_PADRAO.length - 1 });
  const d = lerParametros(s);
  assert.equal(d.acoesManutencaoVeiculo.length, ACOES_MANUTENCAO_PADRAO.length);
  assert.deepEqual(d.acoesManutencaoVeiculo.find((a) => /freios/i.test(a.nome)).subitens.map((i) => i.nome), ["Meu subitem"]);
  assert.equal(d.tiposOcorrenciaVeiculo.find((t) => t.nome === "Furto").descricao, "Minha descrição");
  assert.deepEqual(cadastrarPadraoVeiculos(s), { acoes: 0, tipos: 0 });
});

test("ações salvas sem subitens (versão anterior) passam a ter lista vazia", () => {
  const s = storage();
  s.setItem("gemape-demo-parametros-base", JSON.stringify({ acoesManutencaoVeiculo: [{ id: "a1", nome: "Troca de pneu" }] }));
  assert.deepEqual(lerParametros(s).acoesManutencaoVeiculo[0].subitens, []);
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

test("registrar manutenção do veículo: escolhe o pai, marca os filhos, só no modo demonstração", () => {
  const tela = readFileSync("src/components/modules/MovimentacoesModulo.tsx", "utf8");
  const seletor = readFileSync("src/components/modules/SeletorAcaoManutencao.tsx", "utf8");
  assert.match(tela, /ehVeiculo && MODO_DEMO/);
  assert.match(tela, /Marque ao menos um subitem/);
  assert.match(tela, /acaoManut\.subitens\.length > 0/);
  assert.match(tela, /subitens_manutencao/);
  assert.match(seletor, /<Checkbox/);
  assert.match(seletor, /acao\.subitens\.map/);
});

test("restaurar padrão inicial das ações: situação, só os marcados, id mantido, excluída recadastrada (decisão 111)", () => {
  const s = storage();
  assert.equal(situacaoPadraoAcoesManutencaoVeiculo(s).length, ACOES_MANUTENCAO_PADRAO.length);
  assert.ok(situacaoPadraoAcoesManutencaoVeiculo(s).every((a) => a.situacao === "ausente"));
  cadastrarPadraoVeiculos(s);
  assert.ok(situacaoPadraoAcoesManutencaoVeiculo(s).every((a) => a.situacao === "igual"));
  const [a, b, c] = lerParametros(s).acoesManutencaoVeiculo;
  editarAcaoManutencaoVeiculo(a.id, a.nome, ["Só um subitem", a.subitens[0].nome], s);
  editarAcaoManutencaoVeiculo(c.id, c.nome, ["Outro"], s);
  removerAcaoManutencaoVeiculo(b.id, s);
  const sit = Object.fromEntries(situacaoPadraoAcoesManutencaoVeiculo(s).map((x) => [x.nome, x.situacao]));
  assert.equal(sit[a.nome], "alterado");
  assert.equal(sit[b.nome], "ausente");
  const r = restaurarPadroesAcoesManutencaoVeiculo([a.nome.toLowerCase(), b.nome], s);
  assert.deepEqual(r, { restaurados: 1, criados: 1 });
  const lido = lerParametros(s).acoesManutencaoVeiculo;
  const depoisA = lido.find((x) => x.id === a.id);
  assert.deepEqual(depoisA.subitens.map((i) => i.nome), a.subitens.map((i) => i.nome));
  assert.equal(depoisA.subitens[0].id, a.subitens[0].id);
  assert.ok(lido.some((x) => x.nome === b.nome));
  assert.deepEqual(lido.find((x) => x.id === c.id).subitens.map((i) => i.nome), ["Outro"]);
});

test("restaurar padrão inicial das ações é tudo ou nada e só aceita ações do padrão", () => {
  const s = storage();
  cadastrarPadraoVeiculos(s);
  const meu = adicionarAcaoManutencaoVeiculo("Minha ação", ["Item"], s);
  const [a] = lerParametros(s).acoesManutencaoVeiculo;
  editarAcaoManutencaoVeiculo(a.id, a.nome, ["Só um"], s);
  assert.throws(() => restaurarPadroesAcoesManutencaoVeiculo([], s), /ao menos um/i);
  assert.throws(() => restaurarPadroesAcoesManutencaoVeiculo([a.nome, "Minha ação"], s), /não faz parte do padrão/i);
  const lido = lerParametros(s).acoesManutencaoVeiculo;
  assert.deepEqual(lido.find((x) => x.id === a.id).subitens.map((i) => i.nome), ["Só um"]);
  assert.ok(lido.some((x) => x.id === meu.id));
});

test("a lista Ações de manutenção tem o botão Restaurar padrão inicial (decisão 111)", () => {
  const lista = readFileSync(new URL("../src/components/parametros/VeiculosListasParametros.tsx", import.meta.url), "utf8");
  assert.match(lista, /acaoExtra=\{<RestaurarPadraoAcoes \/>\}/);
  assert.match(lista, /restaurar=\{restaurarPadroesAcoesManutencaoVeiculo\}/);
  assert.match(lista, /if \(!confirm\(aviso\)\) return;/);
});
