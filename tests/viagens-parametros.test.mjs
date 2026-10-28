import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { OPCAO_QUALQUER, aceitaDestino, aceitaDestinoPorOpcao, destinoDaResposta, destinoPergunta, destinosDoTipo, gravarDestino, pendencias, semDestinosDaOpcao } from "../src/lib/questionario-destinos.ts";
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
  const tela = ler("components/parametros/CaixaDuplaEmpregados.tsx");
  assert.match(ler("components/parametros/HabilitarEmpregadosViagens.tsx"), /salvarPergunta\(estado, \{ \.\.\.q04, habilitados \}\)/);
  assert.match(tela, /empregados\.filter\(\(e\) => empregadoAtivo\(e\)\)/);
  assert.match(tela, /\.filter\(\(e\) => !jaHabilitado\.has\(e\.id\) && !jaHabilitado\.has\(normalizar\(e\.nome\)\)\)/);
  for (const rotulo of ["Habilitar os empregados marcados", "Habilitar todos os empregados da lista", "Tirar os habilitados marcados", "Tirar todos os habilitados da lista"]) assert.ok(tela.includes(rotulo), rotulo);
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

test("em todos os módulos o título da página é o nome da aba aberta, e as páginas de Parâmetros não repetem o nome do módulo no alto (decisão 301)", async () => {
  const { tituloDaAba } = await import("../src/lib/menu-parametros.ts");
  assert.equal(tituloDaAba("veiculo", "frota"), "Frota");
  assert.equal(tituloDaAba("veiculo", "checklist"), "Check list");
  assert.equal(tituloDaAba("viagem", "relatorio"), "Relatório");
  assert.equal(tituloDaAba("equipamento", "indicadores"), "Indicadores");
  assert.equal(tituloDaAba("veiculo", "aba-que-nao-existe"), "Frota", "aba inválida: vale a primeira");
  for (const f of ["routes/_authenticated/veiculos.tsx", "routes/_authenticated/equipamentos.tsx", "routes/_authenticated/viagens.tsx", "components/modules/PaginaModulo.tsx"]) {
    assert.match(ler(f), /<h1 className="text-2xl font-bold">\{tituloDaAba\(/, f);
  }
  const antigos = /text-eyebrow">Parâmetros (&gt;|·) |eyebrow = "Parâmetros > |const CAMINHO = "Parâmetros >/;
  for (const f of [
    "components/parametros/AssociarChecklistVeiculo.tsx", "components/parametros/ChecklistParametros.tsx", "components/parametros/ManutencaoParametros.tsx",
    "components/parametros/PlanoManutencaoVeiculo.tsx", "components/parametros/VeiculosListasParametros.tsx", "components/parametros/ChecklistEquipamento.tsx",
    "components/parametros/EquipamentosEspecificos.tsx", "components/parametros/ManutencaoEquipamento.tsx", "components/parametros/CaixaDuplaEmpregados.tsx",
    "routes/_authenticated/cadastros/equipamentos.tsx", "routes/_authenticated/cadastros/ferramentas.tsx", "routes/_authenticated/caixas-ferramentas.tsx",
    "routes/_authenticated/epi-cadastrar.tsx", "routes/_authenticated/epi-ficha.tsx", "routes/_authenticated/uniformes-cadastrar.tsx",
  ]) assert.doesNotMatch(ler(f), antigos, f);
});

test("excluir uma resposta tira a ramificação dela de todos os questionários, até do que já não tem a pergunta, sem gravar nada no meio", () => {
  const e = { ...estadoPadrao(), destinos: { "Tipo A": { "q-x": { "Sim": "encerrar", "Não": "pergunta:q-y" } }, "Tipo B": { "q-x": { "Sim": "encerrar" }, "q-z": { "Ok": "encerrar" } } } };
  const novo = semDestinosDaOpcao(e, "q-x", "Sim");
  assert.deepEqual(novo.destinos, { "Tipo A": { "q-x": { "Não": "pergunta:q-y" } }, "Tipo B": { "q-z": { "Ok": "encerrar" } } });
  assert.equal(e.destinos["Tipo B"]["q-x"]["Sim"], "encerrar", "o estado de entrada não muda");
  assert.equal(semDestinosDaOpcao(estadoPadrao(), "q-x", "Sim").destinos, estadoPadrao().destinos);
  assert.match(ler("components/parametros/QuestionarioDespesasConstrutor.tsx"), /salvarPergunta\(semDestinosDaOpcao\(estado, p\.id, opcao\)/);
});

test("a lista do check list periódico mostra, como Sem previsão, o que não casa com nenhuma previsão", () => {
  const listas = ler("components/modules/ChecklistListasVeiculo.tsx");
  assert.match(listas, /const semPrevisao = checklists/);
  assert.match(listas, /!usados\.has\(c\.id\)/);
  assert.match(listas, />Sem previsão</);
});

test("a caixa dupla compara os habilitados sem depender da ordem e o construtor do questionário não edita mais a lista", () => {
  const caixa = ler("components/parametros/CaixaDuplaEmpregados.tsx");
  assert.match(caixa, /const assinatura = \(l: Habilitado\[\]\) => JSON\.stringify\(l\.map\(\(h\) => \[chaveDe\(h\), h\.area\]\)\.sort\(\)\)/);
  assert.doesNotMatch(ler("components/parametros/QuestionarioDespesasConstrutor.tsx"), /AdicionarHabilitado/);
});

test("o texto pequeno do alto de toda página é o nome do card, por qualquer caminho de acesso (decisão 303)", async () => {
  const { areaDaRota } = await import("../src/lib/inicio.ts");
  const card = (url, search = {}) => areaDaRota(url, search, true)?.cartao.titulo;
  assert.equal(card("/uniformes", { aba: "estoque" }), "Uniformes");
  assert.equal(card("/veiculos", { aba: "frota" }), "Veículos");
  assert.equal(card("/cadastros/veiculos-manutencao"), "Veículos");
  assert.equal(card("/viagens", { aba: "painel" }), "Viagens");
  assert.equal(card("/cadastros/viagens-especificos"), "Viagens");
  assert.equal(card("/equipamentos", { aba: "indicadores" }), "Equipamentos");
  assert.equal(card("/cadastros/equipamentos"), "Equipamentos");
  assert.equal(card("/epi-cadastrar"), "EPIs");
  assert.equal(card("/cadastros/gerais/codigo-produto"), "Gerais");
  // Telas repetidas em mais de um card se resolvem pelo ?de=
  assert.equal(card("/cadastros/gerais/categorias", { de: "veiculos" }), "Veículos");
  for (const f of ["components/modules/PaginaModulo.tsx", "routes/_authenticated/veiculos.tsx", "routes/_authenticated/equipamentos.tsx", "routes/_authenticated/viagens.tsx", "components/parametros/Cabecalho.tsx", "components/parametros/CaixaDuplaEmpregados.tsx"]) {
    assert.match(ler(f), /<EyebrowDoCard fallback=/, f);
  }
});

test("Parâmetros Específicos de Veículos tem a mesma caixa dupla de Viagens, com lista própria e a área de cada empregado (decisão 308)", async () => {
  const { lerEmpregadosDeVeiculos, salvarEmpregadosDeVeiculos, soEmpregadosDeVeiculos } = await import("../src/lib/empregados-veiculos.ts");
  const s = memoria();
  assert.deepEqual(lerEmpregadosDeVeiculos(s), []);
  const lista = [{ empregadoId: "e1", nome: "Ana", area: "Oficina" }, { empregadoId: null, nome: "Bruno", area: "PCM" }];
  salvarEmpregadosDeVeiculos(lista, s);
  assert.deepEqual(lerEmpregadosDeVeiculos(s), lista);
  assert.throws(() => salvarEmpregadosDeVeiculos([{ empregadoId: "e2", nome: "Carlos", area: "Outra" }], s), /inválidos/);
  s.setItem("gemape-demo-veiculos-empregados", "{ lixo");
  assert.deepEqual(lerEmpregadosDeVeiculos(s), [], "ilegível volta à lista vazia");
  // Lista vazia não restringe; com lista, só entram os escolhidos (pelo id ou, sem vínculo, pelo nome).
  const todos = [{ id: "e1", nome: "Ana" }, { id: "e2", nome: "Bruno" }, { id: "e3", nome: "Carlos" }];
  assert.equal(soEmpregadosDeVeiculos(todos, memoria()).length, 3);
  salvarEmpregadosDeVeiculos(lista, s);
  assert.deepEqual(soEmpregadosDeVeiculos(todos, s).map((e) => e.id), ["e1", "e2"]);
  // A de Viagens é outra lista: guardada na pergunta do questionário, não nesta chave.
  assert.doesNotMatch(ler("components/parametros/HabilitarEmpregadosViagens.tsx"), /empregados-veiculos/);
  assert.match(ler("components/parametros/HabilitarEmpregadosVeiculos.tsx"), /<CaixaDuplaEmpregados[\s\S]*secao/);
  assert.match(ler("routes/_authenticated/cadastros/gerais/categorias.tsx"), /categoria\.id === "cat-veiculos" && <HabilitarEmpregadosVeiculos \/>/);
  for (const f of ["components/modules/ChecklistVeiculoModulo.tsx", "components/parametros/AssociarChecklistVeiculo.tsx", "components/modules/OcorrenciasVeiculoModulo.tsx", "components/modules/VeiculosCadastroModulo.tsx"]) {
    assert.match(ler(f), /soEmpregadosDeVeiculos\(/, f);
  }
});

import { perguntasVisiveis } from "../src/lib/questionario-respostas.ts";

test("toda pergunta pode ramificar, menos a de tipos de despesa: por resposta quando há opções, ou depois da pergunta para qualquer resposta (decisão 311)", () => {
  const e = estadoPadrao();
  const semTipo = e.perguntas.filter((p) => p.id !== "q-03");
  assert.ok(semTipo.length > 10);
  assert.ok(semTipo.every((p) => aceitaDestino(p)), "todas as outras perguntas ramificam");
  assert.equal(aceitaDestino(e.perguntas.find((p) => p.id === "q-03")), false);
  // Há perguntas de todos os tipos que não ramificam por resposta: elas usam o destino para qualquer resposta.
  const semOpcoes = semTipo.filter((p) => !aceitaDestinoPorOpcao(p));
  assert.ok(semOpcoes.length > 0 && semOpcoes.some((p) => p.tipo === "upload") && semOpcoes.some((p) => p.tipo === "data"));
  // O destino da resposta vale primeiro; o de qualquer resposta cobre as demais respostas (e as perguntas sem opções).
  const lista = e.perguntas.find((p) => aceitaDestinoPorOpcao(p));
  const opcao = lista.opcoes[0];
  const destinos = { [opcao]: "encerrar", [OPCAO_QUALQUER]: "pergunta:q-x" };
  assert.equal(destinoDaResposta(destinos, lista, opcao), "encerrar");
  assert.equal(destinoDaResposta(destinos, lista, "outra"), "pergunta:q-x");
  assert.equal(destinoDaResposta({ [OPCAO_QUALQUER]: "encerrar" }, semOpcoes[0], "qualquer coisa"), "encerrar");
  assert.equal(destinoDaResposta(undefined, lista, opcao), undefined);
});

test("o destino para qualquer resposta é gravado, não gera ação requerida e muda o fluxo do formulário", () => {
  const s = memoria();
  gravarEstado(estadoPadrao(), s);
  let e = lerEstado(s);
  const tipo = tiposDeDespesa(e)[0];
  const ids = questionarioDoTipo(e, tipo);
  const semOpcoes = ids.map((id) => e.perguntas.find((p) => p.id === id)).filter((p) => p.id !== "q-03" && !aceitaDestinoPorOpcao(p));
  assert.ok(semOpcoes.length > 0);
  const origem = semOpcoes[0];
  const pos = ids.indexOf(origem.id);
  assert.ok(pos >= 0 && pos < ids.length - 1);
  e = gravarDestino(e, tipo, origem.id, OPCAO_QUALQUER, "encerrar", s);
  assert.equal(destinosDoTipo(e, tipo)[origem.id][OPCAO_QUALQUER], "encerrar");
  assert.deepEqual(pendencias(e, tipo), [], "qualquer resposta não depende de opção existente");
  // Encerra o formulário logo depois da pergunta, seja qual for a resposta.
  const visiveis = perguntasVisiveis(e, tipo, {}).map((p) => p.id);
  assert.equal(visiveis.at(-1), origem.id);
  // Por resposta continua exigindo uma pergunta com opções escritas.
  assert.throws(() => gravarDestino(e, tipo, origem.id, "Sim", "encerrar", s), /não ramifica por resposta/);
  assert.throws(() => gravarDestino(e, tipo, "q-03", OPCAO_QUALQUER, "encerrar", s), /não ramifica/);
  // Tirar o destino volta ao fluxo normal.
  e = gravarDestino(e, tipo, origem.id, OPCAO_QUALQUER, null, s);
  assert.equal(destinosDoTipo(e, tipo)[origem.id], undefined);
  assert.ok(perguntasVisiveis(e, tipo, {}).length > visiveis.length);
});

test("o card de toda pergunta tem a ramificação: por resposta ou Depois desta pergunta", () => {
  const c = ler("components/parametros/QuestionarioDespesasConstrutor.tsx");
  assert.match(c, /canWrite && !fixa && \(travada \|\| !aceitaDestinoPorOpcao\(p\) \|\| destinosDoTipo\(estado, tipoAtual\)\[id\]\?\.\[OPCAO_QUALQUER\] !== undefined\) && \(\s*<DestinoDaPergunta/);
  assert.match(c, /onDestino=\{\(valor\) => mudarDestino\(p, OPCAO_QUALQUER, valor\)\}/);
  assert.match(c, /ramifica=\{aceitaDestinoPorOpcao\(p\)\}/);
  assert.match(c, /Depois desta pergunta/);
  assert.match(c, /cada tipo tem o seu próprio questionário/);
});

import { podarOcultas, chaveOutro } from "../src/lib/questionario-respostas.ts";
import { ID_NOME_EMPREGADO, ID_PCM_RESPONDE, ID_TECNICO_RESPONSAVEL, OPCAO_AVULSO, OPCAO_NAO_CONFORMIDADE } from "../src/lib/questionario-despesas.ts";

test("PCM responde decide qual pergunta aparece: Técnico que não lançou (não conformidade) ou Nome do empregado (avulso); a escondida perde a resposta (decisão 313)", () => {
  const e = estadoPadrao();
  const tipo = "Alimentação";
  const ID_NAO_LANCOU = ID_TECNICO_RESPONSAVEL; // "Técnico que não lançou a despesa" (q-14) só abre pela não conformidade
  // Quem lança pelo PCM (pergunta 04 = área PCM) abre PCM responde.
  const base = { "q-04": "Fulano de Tal (PCM)" };
  const visiveis = (r) => perguntasVisiveis(e, tipo, r).map((p) => p.id);
  const semResposta = visiveis(base);
  assert.ok(!semResposta.includes(ID_NOME_EMPREGADO) && !semResposta.includes(ID_NAO_LANCOU), "sem escolher em PCM responde nenhuma das duas aparece");
  const naoConformidade = visiveis({ ...base, [ID_PCM_RESPONDE]: OPCAO_NAO_CONFORMIDADE });
  assert.ok(naoConformidade.includes(ID_NAO_LANCOU) && !naoConformidade.includes(ID_NOME_EMPREGADO));
  const avulso = visiveis({ ...base, [ID_PCM_RESPONDE]: OPCAO_AVULSO });
  assert.ok(avulso.includes(ID_NOME_EMPREGADO) && !avulso.includes(ID_NAO_LANCOU));

  // Trocar a opção limpa a resposta da pergunta que ficou escondida (inclusive o texto do "Outro"), sem mexer no resto.
  const antes = { ...base, [ID_PCM_RESPONDE]: OPCAO_AVULSO, [ID_NOME_EMPREGADO]: "Maria", [ID_NAO_LANCOU]: ["Roberto"], [chaveOutro(ID_NAO_LANCOU)]: "texto" };
  const depois = podarOcultas(e, tipo, antes);
  assert.equal(depois[ID_NOME_EMPREGADO], "Maria");
  assert.equal(depois[ID_NAO_LANCOU], undefined);
  assert.equal(depois[chaveOutro(ID_NAO_LANCOU)], undefined);
  assert.equal(depois[ID_PCM_RESPONDE], OPCAO_AVULSO);
  const virou = podarOcultas(e, tipo, { ...depois, [ID_PCM_RESPONDE]: OPCAO_NAO_CONFORMIDADE });
  assert.equal(virou[ID_NOME_EMPREGADO], undefined, "ao virar não conformidade, o nome do empregado do avulso some");
  // Sem nada a podar, devolve o mesmo objeto (o formulário não entra em ciclo de atualização).
  assert.equal(podarOcultas(e, tipo, depois), depois);
});

test("a Unidade da Federação, que é travada e tem opções, também tem a ramificação Depois desta pergunta", () => {
  const c = ler("components/parametros/QuestionarioDespesasConstrutor.tsx");
  assert.match(c, /\(travada \|\| !aceitaDestinoPorOpcao\(p\) \|\|/);
  assert.match(ler("components/parametros/QuestionarioFormulario.tsx"), /setRespostas\(\(r\) => podarOcultas\(estado, tipo, r\)\)/);
});
