import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  AREAS_UNIFORME_PADRAO, lerAreasUniforme, lerEmpregadosDeUniforme, salvarAreasUniforme, salvarEmpregadosDeUniforme, soEmpregadosDeUniforme,
} from "../src/lib/empregados-uniforme.ts";
import { lerEmpregadosDeEpi, salvarEmpregadosDeEpi, soEmpregadosDeEpi } from "../src/lib/empregados-epi.ts";
import { ABAS_UNIFORME, ABAS_UNIFORME_RELATORIOS, abaDoModulo } from "../src/lib/menu-parametros.ts";
import { montarTermoEntregaUniformeHtml, observacaoEntregaUniforme } from "../src/lib/termo-entrega-uniforme-html.ts";

const le = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => void dados.set(c, v), dados };
};
const maria = { id: "e1", nome: "Maria Souza" };
const joao = { id: "e2", nome: "João Lima" };

test("habilitados dos Uniformes: lista própria, com áreas próprias, independente da do EPI", () => {
  const s = memoria();
  assert.deepEqual(lerAreasUniforme(s), [...AREAS_UNIFORME_PADRAO]);
  salvarEmpregadosDeUniforme([{ empregadoId: "e2", nome: "João Lima", area: "Pintor" }], s);
  assert.deepEqual(soEmpregadosDeUniforme([maria, joao], s), [joao]);
  // O EPI não é afetado: continua sem restrição.
  assert.deepEqual(lerEmpregadosDeEpi(s), []);
  assert.deepEqual(soEmpregadosDeEpi([maria, joao], s), [maria, joao]);
  assert.ok(s.getItem("gemape-demo-uniforme-empregados"));
  assert.equal(s.getItem("gemape-demo-epi-empregados"), null);
});

test("nos Uniformes, lista vazia oferece todos, e uma área em uso não sai da lista", () => {
  const s = memoria();
  assert.deepEqual(soEmpregadosDeUniforme([maria, joao], s), [maria, joao]);
  salvarEmpregadosDeUniforme([{ empregadoId: "e1", nome: "Maria Souza", area: "Pintor" }], s);
  assert.throws(() => salvarAreasUniforme(AREAS_UNIFORME_PADRAO.filter((a) => a !== "Pintor"), s), /Pintor/);
  assert.throws(() => salvarEmpregadosDeUniforme([{ empregadoId: "e1", nome: "Maria Souza", area: "Astronauta" }], s), /área/i);
  const salvas = salvarAreasUniforme([...AREAS_UNIFORME_PADRAO, "Estoquista"], s);
  assert.ok(salvas.includes("Estoquista"));
});

test("a lista dos Uniformes e a do EPI não se misturam ao acrescentar áreas", () => {
  const s = memoria();
  salvarAreasUniforme([...AREAS_UNIFORME_PADRAO, "Estoquista"], s);
  assert.throws(() => salvarEmpregadosDeEpi([{ empregadoId: "e1", nome: "Maria Souza", area: "Estoquista" }], s), /área/i);
});

test("Uniformes > Relatórios traz Histórico do empregado e Baixar Definitivas, só lá, junto da Sugestão de Compras", async () => {
  assert.deepEqual(ABAS_UNIFORME_RELATORIOS.map((a) => a.titulo), ["Sugestão de Compras", "Histórico do empregado", "Baixar Definitivas"]);
  assert.deepEqual(ABAS_UNIFORME_RELATORIOS.map((a) => a.aba), ["sugestao-compras", "historico", "baixas"]);
  const modulo = ABAS_UNIFORME.map((a) => a.aba);
  for (const a of ["sugestao-compras", "historico", "baixas"]) assert.ok(!modulo.includes(a), a);
  assert.ok(modulo.includes("termo-baixa") && modulo.includes("termo-entrega") && !modulo.includes("movimentacoes"), "Movimentações saiu dos Uniformes");
  assert.equal(ABAS_UNIFORME.find((a) => a.aba === "compras").titulo, "Entrada no Estoque");
  for (const a of ["sugestao-compras", "historico", "baixas"]) assert.equal(abaDoModulo("uniforme", a), a);
  const { GRUPOS_INICIO, areaDaRota } = await import("../src/lib/inicio.ts");
  const card = GRUPOS_INICIO.flatMap((g) => g.cartoes).find((c) => c.titulo === "Uniformes");
  assert.deepEqual(card.itens.filter((i) => i.secao === "Relatórios").map((i) => i.titulo), ["Sugestão de Compras", "Histórico do empregado", "Baixar Definitivas"]);
  assert.equal(areaDaRota("/uniformes", { aba: "historico" }, true).atual.secao, "Relatórios");
  assert.equal(areaDaRota("/uniformes", { aba: "entrega" }, true).atual.secao, "Módulo");
});

test("o Termo de Entrega de Uniforme sai com o nome completo de quem entrega e de quem recebe", () => {
  const base = { empresa: { razao_social: "Gemape Ltda", cnpj: "1", nome_fantasia: "Gemape" }, empregado: { nome: "Ana Paula Souza", cpf: "1" }, data: "2026-10-01", linhas: [] };
  const html = montarTermoEntregaUniformeHtml({ ...base, responsavel: { nome: "Carlos Eduardo Menezes" } });
  assert.match(html, /Entregue por:<\/strong> Carlos Eduardo Menezes/);
  assert.match(html, /<strong>Carlos Eduardo Menezes<\/strong><br>Responsável pela entrega<br>Gemape/);
  assert.match(html, /<strong>Ana Paula Souza<\/strong><br>Empregado\(a\)/);
  const escapado = montarTermoEntregaUniformeHtml({ ...base, responsavel: { nome: "<script>x</script> & Cia" } });
  assert.doesNotMatch(escapado, /<script>x/);
  assert.match(escapado, /&lt;script&gt;x&lt;\/script&gt; &amp; Cia/);
  // Sem responsável, o termo sai como antes.
  const antigo = montarTermoEntregaUniformeHtml(base);
  assert.doesNotMatch(antigo, /Entregue por/);
  assert.match(antigo, /<strong>Responsável<\/strong><br>Gemape/);
});

test("a observação gravada em cada saída de uniforme traz quem entregou, para o histórico mostrar", () => {
  assert.equal(observacaoEntregaUniforme("Novo", "  Carlos   Menezes "), "Entrega de uniforme via termo - Estado: Novo - Entregue por Carlos Menezes");
  assert.equal(observacaoEntregaUniforme("Usado", ""), "Entrega de uniforme via termo - Estado: Usado");
  assert.equal(observacaoEntregaUniforme("Usado", null), "Entrega de uniforme via termo - Estado: Usado");
});

test("a tela do Termo de Entrega de Uniforme pede o responsável, exige outra pessoa, grava no histórico e o leva ao termo", () => {
  const t = le("components/modules/UniformesTermoEntrega.tsx");
  assert.match(t, /Responsável pela entrega/);
  assert.match(t, /Informe o responsável pela entrega/);
  assert.match(t, /quem entrega não pode ser quem recebe/i);
  assert.match(t, /observacao: observacaoEntregaUniforme\(item\.estado, responsavel\.nome\)/);
  assert.match(t, /responsavel: \{ nome: responsavel\.nome \}/);
  assert.match(t, /if \(v === responsavelId\) setResponsavelId\(""\)/);
  assert.match(t, /Nenhum outro empregado habilitado para entregar uniformes/);
  assert.doesNotMatch(t, /responsavel_nome/, "responsavel_nome só existe no modo demonstração");
});

test("a entrega de uniforme só oferece os habilitados, como no EPI; baixa, movimentações e relatórios oferecem todos", () => {
  assert.match(le("components/modules/UniformesTermoEntrega.tsx"), /soEmpregadosDeUniforme/);
  for (const f of ["UniformesTermoBaixa.tsx", "MovimentacoesModulo.tsx"]) assert.doesNotMatch(le(`components/modules/${f}`), /soEmpregadosDeUniforme/, f);
  assert.match(le("components/modules/EpiEntrega.tsx"), /\(modulo === "epi" \? soEmpregadosDeEpi : soEmpregadosDeUniforme\)/);
  for (const f of ["UniformesRelatorioFuncionario.tsx", "UniformesRelatorioBaixa.tsx"]) assert.doesNotMatch(le(`components/modules/${f}`), /soEmpregadosDeUniforme/, f);
});

test("o Histórico do empregado de Uniformes tem busca, início e fim, no PDF, no CSV e na tabela", () => {
  const t = le("components/modules/UniformesRelatorioFuncionario.tsx");
  assert.match(t, /filtrarHistoricoPorBuscaEPeriodo/);
  assert.match(t, /aria-label="Buscar no histórico"/);
  assert.match(t, /id="hist-inicio"/);
  assert.match(t, /id="hist-fim"/);
  assert.equal((t.match(/visiveis\.map/g) ?? []).length, 3, "PDF, CSV e tabela");
  assert.match(t, /subtitulos: \[empregado\?\.nome, \.\.\.descricaoFiltro\]/);
});

test("Parâmetros > Uniformes > Parâmetros Específicos mostra as áreas e a caixa dupla dos habilitados", () => {
  assert.match(le("routes/_authenticated/cadastros/gerais/categorias.tsx"), /categoria\.id === "cat-uniformes" && <ParametrosUniforme \/>/);
  assert.match(le("components/parametros/ParametrosUniforme.tsx"), /<HabilitarEmpregadosUniforme areas=\{areas\} \/>/);
  assert.match(le("components/parametros/HabilitarEmpregadosUniforme.tsx"), /CaixaDuplaEmpregados/);
  assert.match(le("components/parametros/ParametrosEpi.tsx"), /import \{ CartaoDeMotivos \}/);
});

test("o limite de áreas da tela é o da lista de áreas, não o dos motivos", () => {
  const cartao = le("components/parametros/CartaoDeMotivos.tsx");
  assert.match(cartao, /max = MAX_MOTIVOS/);
  assert.match(cartao, /lista\.length >= max/);
  assert.match(le("components/parametros/ParametrosUniforme.tsx"), /max=\{MAX_AREAS_UNIFORME\}/);
  assert.match(le("components/parametros/ParametrosEpi.tsx"), /max=\{MAX_AREAS_EPI\}/);
});

test("o texto da tela de habilitados dos Uniformes diz onde o filtro vale e onde todos aparecem", () => {
  const t = le("components/parametros/HabilitarEmpregadosUniforme.tsx");
  assert.match(t, /Na Entrega Uniforme, no Termo de Entrega, na devolução e nas Ocorrências só aparecem os habilitados/);
  assert.match(t, /O Termo de Baixa, as Movimentações e os relatórios mostram todos/);
});

test("nos Uniformes, se nenhum dos empregados oferecidos está na lista de habilitados, a rotina oferece todos", () => {
  const s = memoria();
  salvarEmpregadosDeUniforme([{ empregadoId: "e2", nome: "João Lima", area: "Pintor" }], s);
  assert.deepEqual(soEmpregadosDeUniforme([maria], s), [maria]);
  assert.deepEqual(soEmpregadosDeUniforme([maria, joao], s), [joao]);
});
