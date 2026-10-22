import test from "node:test";
import assert from "node:assert/strict";

import { STATUS_EQUIPAMENTO, camposTecnicosDosGrupos, normalizarEquipamento } from "../src/lib/equipamentos.ts";
import { listarEquipamentos, removerEquipamento, salvarEquipamento } from "../src/lib/equipamentos-demo.ts";
import { TIPOS_PADRAO } from "../src/lib/equipamentos-parametros.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const hoje = new Date(2026, 9, 20, 12);
const tipo = (nome) => TIPOS_PADRAO.find((t) => t.nome === nome);
const EMPILHADEIRA = tipo("Empilhadeiras");
const geral = {
  empresaId: "empresa-demo", patrimonio: "emp-001", nome: "empilhadeira yale 2.5t", tipoId: EMPILHADEIRA.id, marca: "yale",
  modelo: "glp 25", numeroSerie: "SN-998", dataAquisicao: "2024-03-10", valorCompra: "185.000,50", status: "Ativo", setor: "estoque",
};
const ctx = (t = EMPILHADEIRA) => ({ hoje, tipo: t });
const norm = (extra = {}, t = EMPILHADEIRA) => normalizarEquipamento({ ...geral, tipoId: t.id, ...extra }, ctx(t));
const ids = (grupos) => camposTecnicosDosGrupos(grupos).map((c) => c.id);

test("os grupos de campos técnicos do tipo decidem quais campos aparecem", () => {
  assert.deepEqual(ids(["motor"]), ["propulsao", "capacidadeCarga", "horimetroInicial", "consumoEstimado", "capacidadeTanque"]);
  assert.deepEqual(ids(["eletrico"]), ["tensao", "potencia", "correnteNominal", "pressaoTrabalho", "vazaoAgua"]);
  assert.deepEqual(ids(["extintor"]), ["agente", "capacidade", "ultimaRecarga", "vencimentoTesteHidrostatico"]);
  assert.deepEqual(ids([]), []);
  assert.equal(ids(["motor", "eletrico"]).length, 10);
});

test("os tipos de fábrica trazem os grupos técnicos certos", () => {
  assert.deepEqual(tipo("Empilhadeiras").grupos, ["motor"]);
  assert.deepEqual(tipo("Munck").grupos, ["motor"]);
  assert.deepEqual(tipo("Ponte rolante").grupos, ["eletrico"]);
  assert.deepEqual(tipo("Serra de corte").grupos, ["eletrico"]);
  assert.deepEqual(tipo("Máquina de solda").grupos, ["eletrico"]);
  assert.deepEqual(tipo("Compressor de ar (vaso de pressão)").grupos, ["eletrico"]);
  assert.deepEqual(tipo("Jato de alta pressão (lavador)").grupos, ["motor", "eletrico"]);
  assert.deepEqual(tipo("Extintores de incêndio").grupos, ["extintor"]);
});

test("normaliza os dados gerais: texto capitalizado, patrimônio em maiúsculas, valor em número", () => {
  const e = norm();
  assert.equal(e.nome, "Empilhadeira yale 2.5t");
  assert.equal(e.marca, "Yale");
  assert.equal(e.setor, "Estoque");
  assert.equal(e.patrimonio, "EMP-001");
  assert.equal(e.valorCompra, 185000.5);
  assert.equal(e.tipoId, EMPILHADEIRA.id);
  assert.deepEqual(e.tecnico, {});
});

test("o tipo é obrigatório e precisa existir", () => {
  assert.throws(() => normalizarEquipamento({ ...geral, tipoId: "" }, { hoje }), /tipo do equipamento/i);
  assert.throws(() => normalizarEquipamento({ ...geral, tipoId: "outro" }, { hoje, tipo: EMPILHADEIRA }), /tipo do equipamento/i);
  assert.throws(() => normalizarEquipamento({ ...geral }, { hoje }), /tipo do equipamento/i);
});

test("todos os outros dados gerais são obrigatórios", () => {
  for (const [campo, msg] of [
    ["empresaId", /empresa/i], ["patrimonio", /patrimônio/i], ["nome", /nome/i], ["marca", /marca/i], ["modelo", /modelo/i],
    ["numeroSerie", /série/i], ["dataAquisicao", /data de aquisição/i], ["valorCompra", /valor/i], ["setor", /setor/i],
  ]) {
    assert.throws(() => norm({ [campo]: "  " }), msg, campo);
  }
  assert.throws(() => norm({ status: "Quebrado" }), /status/i);
});

test("data de aquisição: válida, no formato certo e não pode ser futura (Brasília)", () => {
  assert.throws(() => norm({ dataAquisicao: "2024-02-30" }), /data de aquisição/i);
  assert.throws(() => norm({ dataAquisicao: "10/03/2024" }), /data de aquisição/i);
  assert.throws(() => norm({ dataAquisicao: "2026-10-21" }), /futura|depois de hoje/i);
  assert.equal(norm({ dataAquisicao: "2026-10-20" }).dataAquisicao, "2026-10-20");
  // 21h em Brasília de 20/10 já é 21/10 em UTC: a data do dia ainda é 20/10.
  const noite = new Date("2026-10-21T00:30:00Z");
  assert.equal(normalizarEquipamento({ ...geral, dataAquisicao: "2026-10-20" }, { hoje: noite, tipo: EMPILHADEIRA }).dataAquisicao, "2026-10-20");
  assert.throws(() => normalizarEquipamento({ ...geral, dataAquisicao: "2026-10-21" }, { hoje: noite, tipo: EMPILHADEIRA }), /futura|depois de hoje/i);
});

test("valor de compra: 0 ou mais, com vírgula decimal; negativo e texto são recusados", () => {
  assert.equal(norm({ valorCompra: "0" }).valorCompra, 0);
  assert.equal(norm({ valorCompra: "R$ 1.250,5" }).valorCompra, 1250.5);
  assert.throws(() => norm({ valorCompra: "-1" }), /valor/i);
  assert.throws(() => norm({ valorCompra: "abc" }), /valor/i);
});

test("só os campos técnicos dos grupos do tipo são guardados; os de outro grupo são descartados", () => {
  const e = norm({ tecnico: { propulsao: "GLP/Gás", capacidadeCarga: "2,5", capacidadeCargaUnidade: "t", tensao: "380V", agente: "CO2" } });
  assert.deepEqual(e.tecnico, { propulsao: "GLP/Gás", capacidadeCarga: "2.5", capacidadeCargaUnidade: "t" });
});

test("campo técnico numérico: aceita vírgula, recusa negativo e texto; select só aceita as opções", () => {
  const com = (tecnico) => () => norm({ tecnico });
  assert.equal(com({ horimetroInicial: "1.250,5" })().tecnico.horimetroInicial, "1250.5");
  assert.throws(com({ horimetroInicial: "-3" }), /horímetro/i);
  assert.throws(com({ consumoEstimado: "muito" }), /consumo/i);
  assert.throws(com({ propulsao: "Vapor" }), /propulsão/i);
  assert.throws(com({ capacidadeCarga: "2", capacidadeCargaUnidade: "lb" }), /unidade/i);
});

test("unidade padrão quando o número é informado sem unidade", () => {
  const e = norm({ tecnico: { potencia: "5", pressaoTrabalho: "120" } }, tipo("Máquina de solda"));
  assert.equal(e.tecnico.potenciaUnidade, "CV");
  assert.equal(e.tecnico.pressaoTrabalhoUnidade, "PSI");
});

test("extintor: agente, capacidade, última recarga e vencimento do teste hidrostático são obrigatórios", () => {
  const EXT = tipo("Extintores de incêndio");
  const completo = { agente: "CO2", capacidade: "6", capacidadeUnidade: "kg", ultimaRecarga: "2026-01-15", vencimentoTesteHidrostatico: "2031-01-15" };
  const e = norm({ tecnico: completo }, EXT);
  assert.equal(e.tecnico.agente, "CO2");
  assert.equal(e.tecnico.vencimentoTesteHidrostatico, "2031-01-15");
  for (const [campo, msg] of [["agente", /agente/i], ["capacidade", /capacidade/i], ["ultimaRecarga", /recarga/i], ["vencimentoTesteHidrostatico", /hidrostático/i]]) {
    assert.throws(() => norm({ tecnico: { ...completo, [campo]: "" } }, EXT), msg, campo);
  }
  assert.throws(() => norm({ tecnico: { ...completo, ultimaRecarga: "2026-10-25" } }, EXT), /recarga/i);
});

test("tipo sem grupo técnico guarda só os dados gerais", () => {
  const livre = { id: "tipo-livre", subcategoriaId: "sub-nr11", nome: "Livre", grupos: [] };
  const e = norm({ tipoId: "tipo-livre", tecnico: { propulsao: "Diesel" } }, livre);
  assert.deepEqual(e.tecnico, {});
});

test("status aceitos", () => {
  assert.deepEqual([...STATUS_EQUIPAMENTO], ["Ativo", "Em manutenção", "Baixado/Inativo", "Reserva"]);
});

test("salvar guarda o equipamento e listar devolve; patrimônio repetido é recusado sem gravar nada", () => {
  const s = memoria();
  const a = salvarEquipamento(geral, s, hoje);
  assert.ok(a.id);
  assert.equal(listarEquipamentos(s).length, 1);
  assert.throws(() => salvarEquipamento({ ...geral, patrimonio: " EMP-001 ", nome: "outro" }, s, hoje), /já existe/i);
  assert.equal(listarEquipamentos(s).length, 1);
  assert.equal(listarEquipamentos(s)[0].nome, "Empilhadeira yale 2.5t");
});

test("salvar usa os grupos técnicos do tipo, que vêm dos Parâmetros Específicos", () => {
  const s = memoria();
  const e = salvarEquipamento({ ...geral, tipoId: tipo("Extintores de incêndio").id, tecnico: { agente: "Água", capacidade: "10", capacidadeUnidade: "L", ultimaRecarga: "2026-01-01", vencimentoTesteHidrostatico: "2031-01-01", propulsao: "Diesel" } }, s, hoje);
  assert.equal(e.tecnico.agente, "Água");
  assert.equal(e.tecnico.propulsao, undefined);
  assert.throws(() => salvarEquipamento({ ...geral, patrimonio: "X-1", tipoId: "nao-existe" }, s, hoje), /tipo do equipamento/i);
});

test("editar troca os dados e mantém o id; o próprio patrimônio não conta como repetido", () => {
  const s = memoria();
  const a = salvarEquipamento(geral, s, hoje);
  const e = salvarEquipamento({ ...geral, id: a.id, nome: "empilhadeira nova", status: "Em manutenção" }, s, hoje);
  assert.equal(e.id, a.id);
  assert.equal(listarEquipamentos(s).length, 1);
  assert.equal(listarEquipamentos(s)[0].status, "Em manutenção");
  assert.throws(() => salvarEquipamento({ ...geral, id: "inexistente" }, s, hoje), /excluído/i);
});

test("remover tira só o equipamento escolhido", () => {
  const s = memoria();
  const a = salvarEquipamento(geral, s, hoje);
  const b = salvarEquipamento({ ...geral, patrimonio: "EMP-002" }, s, hoje);
  removerEquipamento(a.id, s);
  assert.deepEqual(listarEquipamentos(s).map((x) => x.id), [b.id]);
});

test("equipamento salvo antes dos tipos (com categoria e sem tipoId) continua na lista, com o tipo em branco", () => {
  const s = memoria();
  s.setItem("gemape-demo-equipamentos", JSON.stringify([{ id: "x1", empresaId: "e", patrimonio: "OLD-1", nome: "Antigo", categoria: "maquina-veiculo", marca: "M", modelo: "M", numeroSerie: "1", dataAquisicao: "2024-01-01", valorCompra: 1, status: "Ativo", setor: "S", tecnico: {}, criadoEm: "2024-01-01T00:00:00Z" }]));
  const lista = listarEquipamentos(s);
  assert.equal(lista.length, 1);
  assert.equal(lista[0].tipoId, "");
  // para salvar de novo, ele precisa de um tipo
  assert.throws(() => salvarEquipamento({ ...geral, id: "x1", patrimonio: "OLD-1", tipoId: "" }, s, hoje), /tipo do equipamento/i);
  const e = salvarEquipamento({ ...geral, id: "x1", patrimonio: "OLD-1" }, s, hoje);
  assert.equal(e.tipoId, EMPILHADEIRA.id);
});

test("dado salvo ilegível não é sobrescrito: a lista vem vazia e gravar recusa", () => {
  const s = memoria();
  s.setItem("gemape-demo-equipamentos", "{quebrado");
  assert.deepEqual(listarEquipamentos(s), []);
  assert.throws(() => salvarEquipamento(geral, s, hoje), /ilegíveis/i);
  assert.equal(s.getItem("gemape-demo-equipamentos"), "{quebrado");
});

test("erro de validação não grava nada (tudo ou nada)", () => {
  const s = memoria();
  assert.throws(() => salvarEquipamento({ ...geral, valorCompra: "x" }, s, hoje), /valor/i);
  assert.equal(s.getItem("gemape-demo-equipamentos"), null);
});

test("o nome do equipamento é só texto: nada é interpretado ao guardar (a tela escapa ao mostrar)", () => {
  const s = memoria();
  const e = salvarEquipamento({ ...geral, nome: "<img src=x onerror=alert(1)>" }, s, hoje);
  assert.match(e.nome, /^<img src=x onerror=alert\(1\)>$/i);
  assert.equal(listarEquipamentos(s)[0].nome, e.nome);
});

test("ponto de milhar (como se escreve no Brasil) vale como milhar, não como decimal", () => {
  const valor = (v) => norm({ valorCompra: v }).valorCompra;
  const carga = (v) => norm({ tecnico: { capacidadeCarga: v } }).tecnico.capacidadeCarga;
  assert.equal(valor("185.000"), 185000);
  assert.equal(valor("1.234.567"), 1234567);
  assert.equal(valor("1.250,50"), 1250.5);
  assert.equal(valor("12.50"), 12.5);
  assert.equal(carga("2.500"), "2500");
  assert.equal(carga("2,5"), "2.5");
  assert.equal(carga("0.125"), "0.125");
  assert.equal(carga("1.25"), "1.25");
});
