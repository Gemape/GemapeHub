import test from "node:test";
import assert from "node:assert/strict";

import {
  CATEGORIAS_EQUIPAMENTO, STATUS_EQUIPAMENTO, camposTecnicosDaCategoria, gruposDaCategoria, normalizarEquipamento,
} from "../src/lib/equipamentos.ts";
import { listarEquipamentos, removerEquipamento, salvarEquipamento } from "../src/lib/equipamentos-demo.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const hoje = new Date(2026, 9, 20, 12);
const geral = {
  empresaId: "empresa-demo", patrimonio: "emp-001", nome: "empilhadeira yale 2.5t", categoria: "maquina-veiculo", marca: "yale",
  modelo: "glp 25", numeroSerie: "SN-998", dataAquisicao: "2024-03-10", valorCompra: "185.000,50", status: "Ativo", setor: "estoque",
};
const ids = (cat) => camposTecnicosDaCategoria(cat).map((c) => c.id);

test("a categoria decide quais grupos de campos técnicos aparecem", () => {
  assert.deepEqual(gruposDaCategoria("maquina-veiculo"), ["motor"]);
  assert.deepEqual(gruposDaCategoria("maquinario-eletrico"), ["eletrico"]);
  assert.deepEqual(gruposDaCategoria("seguranca"), ["extintor"]);
  assert.deepEqual(gruposDaCategoria("ferramental"), []);
  assert.deepEqual(gruposDaCategoria("jato-alta-pressao"), ["motor", "eletrico"]);
  assert.deepEqual(gruposDaCategoria("nao-existe"), []);
  assert.equal(CATEGORIAS_EQUIPAMENTO.length, 5);
});

test("máquina e veículo mostra só propulsão, carga, horímetro, consumo e tanque", () => {
  assert.deepEqual(ids("maquina-veiculo"), ["propulsao", "capacidadeCarga", "horimetroInicial", "consumoEstimado", "capacidadeTanque"]);
});

test("maquinário elétrico mostra só tensão, potência, corrente, pressão e vazão", () => {
  assert.deepEqual(ids("maquinario-eletrico"), ["tensao", "potencia", "correnteNominal", "pressaoTrabalho", "vazaoAgua"]);
});

test("extintor mostra só agente, capacidade, última recarga e teste hidrostático", () => {
  assert.deepEqual(ids("seguranca"), ["agente", "capacidade", "ultimaRecarga", "vencimentoTesteHidrostatico"]);
});

test("ferramental não tem especificação técnica e o jato de alta pressão junta os dois grupos", () => {
  assert.deepEqual(ids("ferramental"), []);
  assert.equal(ids("jato-alta-pressao").length, 10);
});

test("normaliza os dados gerais: texto capitalizado, patrimônio em maiúsculas, valor em número", () => {
  const e = normalizarEquipamento(geral, { hoje });
  assert.equal(e.nome, "Empilhadeira yale 2.5t");
  assert.equal(e.marca, "Yale");
  assert.equal(e.setor, "Estoque");
  assert.equal(e.patrimonio, "EMP-001");
  assert.equal(e.valorCompra, 185000.5);
  assert.deepEqual(e.tecnico, {});
});

test("todos os dados gerais são obrigatórios", () => {
  for (const [campo, msg] of [
    ["empresaId", /empresa/i], ["patrimonio", /patrimônio/i], ["nome", /nome/i], ["marca", /marca/i], ["modelo", /modelo/i],
    ["numeroSerie", /série/i], ["dataAquisicao", /data de aquisição/i], ["valorCompra", /valor/i], ["setor", /setor/i],
  ]) {
    assert.throws(() => normalizarEquipamento({ ...geral, [campo]: "  " }, { hoje }), msg, campo);
  }
  assert.throws(() => normalizarEquipamento({ ...geral, categoria: "outra" }, { hoje }), /categoria/i);
  assert.throws(() => normalizarEquipamento({ ...geral, status: "Quebrado" }, { hoje }), /status/i);
});

test("data de aquisição: válida, no formato certo e não pode ser futura (Brasília)", () => {
  assert.throws(() => normalizarEquipamento({ ...geral, dataAquisicao: "2024-02-30" }, { hoje }), /data de aquisição/i);
  assert.throws(() => normalizarEquipamento({ ...geral, dataAquisicao: "10/03/2024" }, { hoje }), /data de aquisição/i);
  assert.throws(() => normalizarEquipamento({ ...geral, dataAquisicao: "2026-10-21" }, { hoje }), /futura|depois de hoje/i);
  assert.equal(normalizarEquipamento({ ...geral, dataAquisicao: "2026-10-20" }, { hoje }).dataAquisicao, "2026-10-20");
  // 21h em Brasília de 20/10 já é 21/10 em UTC: a data do dia ainda é 20/10.
  const noite = new Date("2026-10-21T00:30:00Z");
  assert.equal(normalizarEquipamento({ ...geral, dataAquisicao: "2026-10-20" }, { hoje: noite }).dataAquisicao, "2026-10-20");
  assert.throws(() => normalizarEquipamento({ ...geral, dataAquisicao: "2026-10-21" }, { hoje: noite }), /futura|depois de hoje/i);
});

test("valor de compra: 0 ou mais, com vírgula decimal; negativo e texto são recusados", () => {
  assert.equal(normalizarEquipamento({ ...geral, valorCompra: "0" }, { hoje }).valorCompra, 0);
  assert.equal(normalizarEquipamento({ ...geral, valorCompra: "R$ 1.250,5" }, { hoje }).valorCompra, 1250.5);
  assert.throws(() => normalizarEquipamento({ ...geral, valorCompra: "-1" }, { hoje }), /valor/i);
  assert.throws(() => normalizarEquipamento({ ...geral, valorCompra: "abc" }, { hoje }), /valor/i);
});

test("só os campos técnicos da categoria escolhida são guardados; os de outra categoria são descartados", () => {
  const e = normalizarEquipamento({
    ...geral,
    tecnico: { propulsao: "GLP/Gás", capacidadeCarga: "2,5", capacidadeCargaUnidade: "t", tensao: "380V", agente: "CO2" },
  }, { hoje });
  assert.deepEqual(e.tecnico, { propulsao: "GLP/Gás", capacidadeCarga: "2.5", capacidadeCargaUnidade: "t" });
});

test("campo técnico numérico: aceita vírgula, recusa negativo e texto; select só aceita as opções", () => {
  const com = (tecnico) => () => normalizarEquipamento({ ...geral, tecnico }, { hoje });
  assert.equal(com({ horimetroInicial: "1.250,5" })().tecnico.horimetroInicial, "1250.5");
  assert.throws(com({ horimetroInicial: "-3" }), /horímetro/i);
  assert.throws(com({ consumoEstimado: "muito" }), /consumo/i);
  assert.throws(com({ propulsao: "Vapor" }), /propulsão/i);
  assert.throws(com({ capacidadeCarga: "2", capacidadeCargaUnidade: "lb" }), /unidade/i);
});

test("unidade padrão quando o número é informado sem unidade", () => {
  const e = normalizarEquipamento({ ...geral, categoria: "maquinario-eletrico", tecnico: { potencia: "5", pressaoTrabalho: "120" } }, { hoje });
  assert.equal(e.tecnico.potenciaUnidade, "CV");
  assert.equal(e.tecnico.pressaoTrabalhoUnidade, "PSI");
});

test("extintor: agente, capacidade, última recarga e vencimento do teste hidrostático são obrigatórios", () => {
  const ext = { ...geral, categoria: "seguranca" };
  const completo = { agente: "CO2", capacidade: "6", capacidadeUnidade: "kg", ultimaRecarga: "2026-01-15", vencimentoTesteHidrostatico: "2031-01-15" };
  const e = normalizarEquipamento({ ...ext, tecnico: completo }, { hoje });
  assert.equal(e.tecnico.agente, "CO2");
  assert.equal(e.tecnico.vencimentoTesteHidrostatico, "2031-01-15");
  for (const [campo, msg] of [["agente", /agente/i], ["capacidade", /capacidade/i], ["ultimaRecarga", /recarga/i], ["vencimentoTesteHidrostatico", /hidrostático/i]]) {
    assert.throws(() => normalizarEquipamento({ ...ext, tecnico: { ...completo, [campo]: "" } }, { hoje }), msg, campo);
  }
  assert.throws(() => normalizarEquipamento({ ...ext, tecnico: { ...completo, ultimaRecarga: "2026-10-25" } }, { hoje }), /recarga/i);
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

test("revisão: ponto de milhar (como se escreve no Brasil) vale como milhar, não como decimal", () => {
  const valor = (v) => normalizarEquipamento({ ...geral, valorCompra: v }, { hoje }).valorCompra;
  const carga = (v) => normalizarEquipamento({ ...geral, tecnico: { capacidadeCarga: v } }, { hoje }).tecnico.capacidadeCarga;
  assert.equal(valor("185.000"), 185000);
  assert.equal(valor("1.234.567"), 1234567);
  assert.equal(valor("1.250,50"), 1250.5);
  assert.equal(valor("12.50"), 12.5);
  assert.equal(carga("2.500"), "2500");
  assert.equal(carga("2,5"), "2.5");
  assert.equal(carga("0.125"), "0.125");
  assert.equal(carga("1.25"), "1.25");
});
