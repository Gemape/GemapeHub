import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { aceitaDestino, destinoPergunta, destinosDoTipo, gravarDestino, pendencias } from "../src/lib/questionario-destinos.ts";
import { ID_HABILITADOS, estadoPadrao, gravarEstado, lerEstado, questionarioDoTipo, salvarPergunta, tiposDeDespesa } from "../src/lib/questionario-despesas.ts";

const ler = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};

test("o Questionário de Despesas e os Parâmetros Específicos estão em Parâmetros > Viagens, no menu lateral e no cartão de Viagens", () => {
  const menu = ler("lib/menu-parametros.ts");
  assert.match(menu, /export const MENU_VIAGENS/);
  assert.match(menu, /"\/cadastros\/viagens-especificos"/);
  assert.match(ler("components/layout/AppSidebar.tsx"), /<MenuViagens pathname=\{pathname\} \/>/);
  assert.match(ler("lib/inicio.ts"), /\.\.\.dosItens\(MENU_VIAGENS\)/);
  assert.match(ler("lib/permissoes-demo.ts"), /"\/cadastros\/viagens-especificos"/);
  assert.match(ler("routes/_authenticated/cadastros/viagens-especificos.tsx"), /HabilitarEmpregadosViagens/);
});

test("a caixa dupla lista todos os empregados ativos à esquerda, move para a direita só quem for habilitado e só grava ao salvar", () => {
  const tela = ler("components/parametros/HabilitarEmpregadosViagens.tsx");
  assert.match(tela, /empregados\.filter\(\(e\) => empregadoAtivo\(e\)\)/);
  assert.match(tela, /\.filter\(\(e\) => !jaHabilitado\.has\(e\.id\) && !jaHabilitado\.has\(normalizar\(e\.nome\)\)\)/);
  for (const rotulo of ["Habilitar os empregados marcados", "Habilitar todos os empregados da lista", "Tirar os habilitados marcados", "Tirar todos os habilitados da lista"]) assert.ok(tela.includes(rotulo), rotulo);
  assert.match(tela, /salvarPergunta\(estado, \{ \.\.\.q04, habilitados \}\)/);
  assert.match(tela, /disabled=\{!alterado\}/);
  assert.match(tela, /AREAS_VIAGEM\.map/);
});

test("salvar a pergunta de quem está lançando com a lista habilitada guarda os empregados e as áreas", () => {
  const s = memoria();
  gravarEstado(estadoPadrao(), s);
  const e = lerEstado(s);
  const q04 = e.perguntas.find((p) => p.id === ID_HABILITADOS);
  const lista = [{ empregadoId: "e1", nome: "Ana", area: "Oficina" }, { empregadoId: "e2", nome: "Bruno", area: "PCM" }];
  salvarPergunta(e, { ...q04, habilitados: lista }, s);
  assert.deepEqual(lerEstado(s).perguntas.find((p) => p.id === ID_HABILITADOS).habilitados, lista);
});

test("cada resposta pode ramificar para uma pergunta mais adiante, e excluir a resposta leva a ramificação junto", () => {
  const s = memoria();
  gravarEstado(estadoPadrao(), s);
  let e = lerEstado(s);
  const tipo = tiposDeDespesa(e).find((t) => questionarioDoTipo(e, t).some((id) => aceitaDestino(e.perguntas.find((p) => p.id === id))));
  assert.ok(tipo, "há um tipo com pergunta que ramifica");
  const ids = questionarioDoTipo(e, tipo);
  const origem = ids.map((id) => e.perguntas.find((p) => p.id === id)).find((p) => aceitaDestino(p) && p.opcoes.length >= 2 && ids.indexOf(p.id) < ids.length - 1);
  assert.ok(origem, "pergunta com ao menos duas respostas e uma pergunta depois dela");
  const destino = ids[ids.length - 1];
  const opcao = origem.opcoes[0];
  e = gravarDestino(e, tipo, origem.id, opcao, destinoPergunta(destino), s);
  assert.equal(destinosDoTipo(e, tipo)[origem.id][opcao], destinoPergunta(destino));
  // Excluir a resposta: primeiro tira a ramificação, depois a opção; nada fica pendente.
  e = gravarDestino(e, tipo, origem.id, opcao, null, s);
  e = salvarPergunta(e, { ...origem, opcoes: origem.opcoes.filter((o) => o !== opcao) }, s);
  assert.equal(e.perguntas.find((p) => p.id === origem.id).opcoes.includes(opcao), false);
  assert.deepEqual(pendencias(e, tipo), []);
  // Resposta nova também pode ser cadastrada.
  e = salvarPergunta(e, { ...e.perguntas.find((p) => p.id === origem.id), opcoes: [...e.perguntas.find((p) => p.id === origem.id).opcoes, "Resposta nova"] }, s);
  assert.ok(e.perguntas.find((p) => p.id === origem.id).opcoes.includes("Resposta nova"));
});

test("o card da pergunta mostra todas as respostas com ramificação e excluir, para quem pode alterar", () => {
  const c = ler("components/parametros/QuestionarioDespesasConstrutor.tsx");
  assert.match(c, /function OpcoesDaPergunta\(/);
  assert.match(c, /canWrite && !travada && aceitaCondicao\(p\) \? \(\s*<OpcoesDaPergunta/);
  for (const t of ["Continuar para a próxima pergunta", "Ir para a próxima seção", "Encerrar o formulário", "Excluir a resposta"]) assert.ok(c.includes(t), t);
  assert.match(c, /gravarDestino\(estado, tipoAtual, p\.id, opcao, valor === SEM_DESTINO \? null : valor, rascunho\)/);
  assert.match(c, /Excluir a resposta "\$\{opcao\}"/);
});

test("o painel de Viagens tem o seletor de período também nos resultados dos técnicos e não mostra o valor total no painel geral", () => {
  const painel = ler("components/modules/ViagensPainel.tsx");
  assert.match(painel, /\{seletorPeriodo\("indicadores"\)\}/);
  assert.match(painel, /\{seletorPeriodo\("tecnicos"\)\}/);
  assert.doesNotMatch(painel, /Custo total/);
  assert.doesNotMatch(painel, /formatarMoeda/);
  assert.doesNotMatch(painel, /valorTotal/);
  // O valor do empregado só aparece ao clicar no nome, no extrato.
  assert.match(painel, /setExtratoDe\(r\.nome\)/);
  assert.match(ler("components/modules/ViagensExtrato.tsx"), /Custo total/);
});
