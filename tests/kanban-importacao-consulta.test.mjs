import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { corrigirCpf, corrigirData, lerCsv, sugerirMapeamento, valoresDaLinha } from "../src/lib/planilha-importacao.ts";
import { lerConsultas, montarConsulta, removerConsulta, salvarConsulta } from "../src/lib/consulta-personalizada.ts";
import { podeMoverOsEq } from "../src/lib/registros-equipamento.ts";

const fonte = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("CSV: separador ; , ou tab, aspas com separador e aspas dentro, BOM e linhas vazias", () => {
  assert.deepEqual(lerCsv('﻿Nome;CPF\n"Silva; Maria";123\n\n'), [["Nome", "CPF"], ["Silva; Maria", "123"]]);
  assert.deepEqual(lerCsv('a,b\r\n"x ""y""",2'), [["a", "b"], ['x "y"', "2"]]);
  assert.deepEqual(lerCsv("a\tb\n1\t2"), [["a", "b"], ["1", "2"]]);
  assert.deepEqual(lerCsv("a;b\n\n1;2\n;\n"), [["a", "b"], [], ["1", "2"]], "a linha em branco do meio fica, para o número bater com a planilha");
});

test("de-para: cabeçalho curto (Nº) não casa com campo por uma letra", () => {
  const m = sugerirMapeamento(["Nº", "Nome"], [{ id: "matricula", rotulo: "Matrícula", sinonimos: ["livro pagina"] }, { id: "nome", rotulo: "Nome", sinonimos: [] }]);
  assert.deepEqual(m, { matricula: -1, nome: 1 });
});

test("de-para: sugere pelo cabeçalho (acento, caixa, sinônimo) e cada coluna serve a um campo só", () => {
  const campos = [
    { id: "nome", rotulo: "Nome", sinonimos: ["colaborador"] },
    { id: "cpf", rotulo: "CPF", sinonimos: [] },
    { id: "data_admissao", rotulo: "Admissão", sinonimos: ["data de admissao"] },
    { id: "matricula", rotulo: "Matrícula", sinonimos: [] },
  ];
  const m = sugerirMapeamento(["COLABORADOR", "Cpf", "Data de Admissão", "Setor"], campos);
  assert.deepEqual(m, { nome: 0, cpf: 1, data_admissao: 2, matricula: -1 });
  assert.deepEqual(valoresDaLinha(["Ana", "1"], { nome: 0, cpf: 1, matricula: -1 }), { nome: "Ana", cpf: "1", matricula: "" });
});

test("correção de formato: datas em vários padrões e número do Excel; CPF com pontos e zeros da frente", () => {
  assert.equal(corrigirData("05/03/2024"), "2024-03-05");
  assert.equal(corrigirData("5-3-24"), "2024-03-05");
  assert.equal(corrigirData("2024-03-05"), "2024-03-05");
  assert.equal(corrigirData("45356"), "2024-03-05", "número de série do Excel");
  assert.equal(corrigirData(""), "");
  assert.equal(corrigirData("31/02/2024"), null, "dia que não existe");
  assert.equal(corrigirData("ontem"), null);
  assert.equal(corrigirCpf("12345678909"), "123.456.789-09");
  assert.equal(corrigirCpf("1234567890"), "012.345.678-90", "o Excel come o zero da frente");
  assert.equal(corrigirCpf("123.456.789-09"), "123.456.789-09");
});

test("monte sua consulta: agrupa pelos campos marcados, soma quantidade e custo, respeita o período", () => {
  const movs = [
    { data_movimentacao: "2026-11-02", tipo_movimentacao: "Saida", quantidade: 2, empresa_id: "e", empregado_id: "p1", item_id: "luva", preco_unitario_registrado: 10 },
    { data_movimentacao: "2026-11-03", tipo_movimentacao: "Saida", quantidade: 1, empresa_id: "e", empregado_id: "p2", item_id: "luva", preco_unitario_registrado: 10 },
    { data_movimentacao: "2026-11-04", tipo_movimentacao: "Saida", quantidade: 1, empresa_id: "e", empregado_id: "p1", item_id: "bota", preco_unitario_registrado: 80 },
    { data_movimentacao: "2026-10-01", tipo_movimentacao: "Saida", quantidade: 9, empresa_id: "e", empregado_id: "p1", item_id: "luva", preco_unitario_registrado: 10 },
  ];
  const nomes = { empresa: () => "Gemape", empregado: (id) => id, cargo: (id) => (id === "p1" ? "Mecânico" : "Eletricista"), item: (id) => (id === "luva" ? "Luva" : "Bota") };
  const r = montarConsulta(movs, nomes, { dimensoes: ["cargo", "item"], medidas: ["custo", "quantidade"], inicio: "2026-11-01", fim: "2026-11-30" });
  assert.deepEqual(r.map((l) => [l.chaves, l.valores]), [[["Mecânico", "Bota"], [80, 1]], [["Mecânico", "Luva"], [20, 2]], [["Eletricista", "Luva"], [10, 1]]]);
  const total = montarConsulta(movs, nomes, { dimensoes: [], medidas: ["registros"], inicio: "", fim: "" });
  assert.deepEqual(total.map((l) => l.valores), [[4]], "sem campo marcado, uma linha com o total");
  // Entrada não se soma às entregas: o padrão é só o consumo (entregas), e cada tipo tem o seu filtro.
  const comEntrada = [...movs, { data_movimentacao: "2026-11-05", tipo_movimentacao: "Entrada", quantidade: 100, empresa_id: "e", empregado_id: null, item_id: "luva", preco_unitario_registrado: 10 }];
  assert.deepEqual(montarConsulta(comEntrada, nomes, { dimensoes: [], medidas: ["quantidade"], inicio: "", fim: "" })[0].valores, [13]);
  assert.deepEqual(montarConsulta(comEntrada, nomes, { dimensoes: [], medidas: ["quantidade"], inicio: "", fim: "", movimentos: "entrada" })[0].valores, [100]);
  assert.deepEqual(montarConsulta(comEntrada, nomes, { dimensoes: [], medidas: ["quantidade"], inicio: "", fim: "", movimentos: "todos" })[0].valores, [113]);
});

test("consultas salvas: por perfil, substitui pelo mesmo nome, exige nome e valor a somar, e apaga", () => {
  const mem = new Map();
  const a = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const base = { modulo: "epi", dimensoes: ["item"], medidas: ["custo"], inicio: "", fim: "" };
  salvarConsulta("u1", { ...base, nome: "Custo por item" }, a);
  salvarConsulta("u1", { ...base, nome: "custo por item", dimensoes: ["cargo"] }, a);
  assert.equal(lerConsultas("u1", a).length, 1);
  assert.deepEqual(lerConsultas("u1", a)[0].dimensoes, ["cargo"]);
  assert.equal(lerConsultas("u2", a).length, 0, "cada perfil vê só as suas");
  assert.throws(() => salvarConsulta("u1", { ...base, nome: "  " }, a), /nome/);
  assert.throws(() => salvarConsulta("u1", { ...base, nome: "x", medidas: [] }, a), /somar/);
  assert.equal(removerConsulta("u1", lerConsultas("u1", a)[0].id, a).length, 0);
});

test("quadro das ordens: só avança (Pendente → Em andamento → Concluída), nunca volta nem mexe na cancelada", () => {
  assert.equal(podeMoverOsEq("Pendente", "Em andamento"), true);
  assert.equal(podeMoverOsEq("Pendente", "Concluída"), true);
  assert.equal(podeMoverOsEq("Em andamento", "Concluída"), true);
  assert.equal(podeMoverOsEq("Em andamento", "Pendente"), false);
  assert.equal(podeMoverOsEq("Concluída", "Em andamento"), false);
  assert.equal(podeMoverOsEq("Cancelada", "Concluída"), false);
});

test("telas ligadas: quadro na manutenção, importar planilha nos empregados e Monte sua consulta nos Relatórios", () => {
  const m = fonte("src/components/modules/equipamento/ManutencaoEquipamentoModulo.tsx");
  assert.match(m, /<QuadroKanban/);
  assert.match(m, /statusInicial="Concluída"/, "concluir pelo quadro abre o formulário");
  assert.match(fonte("src/components/QuadroKanban.tsx"), /Mover para \{proxima\.titulo\}/, "alternativa ao arrastar");
  assert.match(fonte("src/components/modules/EmpregadosCadastroModulo.tsx"), /<ImportarEmpregados/);
  const imp = fonte("src/components/modules/ImportarEmpregados.tsx");
  assert.match(imp, /prepararEmpregado\(/, "mesma regra do cadastro");
  assert.match(imp, /slice\(0, 5\)/, "prévia das 5 primeiras linhas");
  assert.match(fonte("src/components/modules/PaginaModulo.tsx"), /value="consulta"[^>]*>\s*<MonteSuaConsulta modulo=\{modulo\} \/>/);
});
