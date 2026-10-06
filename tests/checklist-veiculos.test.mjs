import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  lerParametros,
  adicionarGrupoChecklistVeiculo,
  editarGrupoChecklistVeiculo,
  removerGrupoChecklistVeiculo,
  cadastrarPadraoChecklistVeiculos,
} from "../src/lib/parametros-base.ts";
import { CHECKLIST_VEICULOS_PADRAO, chaveDoTipoVeiculo } from "../src/lib/checklist-veiculos-padrao.ts";

const storage = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};

test("grupo do check list: nome único, itens sem repetir, texto guardado como digitado", () => {
  const s = storage();
  assert.deepEqual(lerParametros(s).itensChecklistVeiculo, []);
  const g = adicionarGrupoChecklistVeiculo("  Motos  ", ["CRLV e seguro", " ", "Buzina   funcionando"], ["*"], s);
  assert.equal(g.nome, "Motos");
  assert.deepEqual(g.itens.map((i) => i.nome), ["CRLV e seguro", "Buzina funcionando"]);
  assert.throws(() => adicionarGrupoChecklistVeiculo("motos", [], ["*"], s), /já existe/i);
  assert.throws(() => adicionarGrupoChecklistVeiculo("", [], ["*"], s), /nome/i);
  assert.throws(() => adicionarGrupoChecklistVeiculo("Outro", ["Freio", "freio"], ["*"], s), /item repetido/i);
  assert.equal(lerParametros(s).itensChecklistVeiculo.length, 1);
});

test("editar mantém o id dos itens de mesmo nome; excluir remove o grupo", () => {
  const s = storage();
  const g = adicionarGrupoChecklistVeiculo("Motos", ["Freio", "Pneu"], ["*"], s);
  editarGrupoChecklistVeiculo(g.id, "Motos e motonetas", ["Pneu", "Corrente"], ["*"], s);
  const lido = lerParametros(s).itensChecklistVeiculo[0];
  assert.equal(lido.nome, "Motos e motonetas");
  assert.equal(lido.itens.find((i) => i.nome === "Pneu").id, g.itens[1].id);
  assert.deepEqual(lido.itens.map((i) => i.nome), ["Pneu", "Corrente"]);
  assert.throws(() => editarGrupoChecklistVeiculo("x", "a", [], ["*"], s), /não encontrad/i);
  removerGrupoChecklistVeiculo(g.id, s);
  assert.deepEqual(lerParametros(s).itensChecklistVeiculo, []);
  assert.throws(() => removerGrupoChecklistVeiculo(g.id, s), /não encontrad/i);
});

test("o padrão traz os 8 tipos de veículo e os itens comuns, sem nome ou item repetido", () => {
  const nomes = CHECKLIST_VEICULOS_PADRAO.map((g) => g.nome);
  assert.equal(new Set(nomes.map((n) => n.toLowerCase())).size, nomes.length);
  for (const tipo of ["Carros de passeio", "SUVs, utilitários e picapes", "Vans e furgões", "Caminhões leves e médios",
    "Caminhões pesados e cavalo mecânico", "Ônibus e micro-ônibus", "Motos", "Empilhadeiras e veículos de movimentação", "Todos os veículos"]) {
    assert.ok(nomes.some((n) => n.startsWith(tipo)), tipo);
  }
  for (const g of CHECKLIST_VEICULOS_PADRAO) {
    assert.ok(g.itens.length > 0, g.nome);
    assert.equal(new Set(g.itens.map((i) => i.toLowerCase())).size, g.itens.length, g.nome);
  }
  const total = CHECKLIST_VEICULOS_PADRAO.reduce((t, g) => t + g.itens.length, 0);
  assert.equal(total, 146);
});

test("cadastrar padrão inclui o que falta, não repete nem altera o que já existe e mantém siglas como estão", () => {
  const s = storage();
  adicionarGrupoChecklistVeiculo("motos", ["Meu item"], ["*"], s);
  const r = cadastrarPadraoChecklistVeiculos(s);
  assert.equal(r.grupos, CHECKLIST_VEICULOS_PADRAO.length - 1);
  const d = lerParametros(s);
  assert.equal(d.itensChecklistVeiculo.length, CHECKLIST_VEICULOS_PADRAO.length);
  assert.deepEqual(d.itensChecklistVeiculo.find((g) => g.nome === "motos").itens.map((i) => i.nome), ["Meu item"]);
  const doc = d.itensChecklistVeiculo.find((g) => g.nome.startsWith("Carros de passeio · Documentação"));
  assert.ok(doc.itens.some((i) => i.nome === "CRLV/licenciamento em dia"));
  const repetido = cadastrarPadraoChecklistVeiculos(s);
  assert.deepEqual(repetido, { grupos: 0, itens: 0, semTipo: 0 });
  assert.equal(lerParametros(s).itensChecklistVeiculo.length, CHECKLIST_VEICULOS_PADRAO.length);
});

test("dados antigos sem a lista continuam abrindo", () => {
  const s = storage();
  s.setItem("gemape-demo-parametros-base", JSON.stringify({ categorias: [] }));
  assert.deepEqual(lerParametros(s).itensChecklistVeiculo, []);
});

test("a tela fica em Parâmetros > Veículos, com Clonar/Editar/Excluir, e não toca o Supabase", () => {
  const menu = readFileSync("src/lib/menu-parametros.ts", "utf8");
  assert.match(menu, /titulo: "Itens check list"[^}]*url: "\/cadastros\/veiculos-checklist"/);
  const rota = readFileSync("src/routes/_authenticated/cadastros/veiculos-checklist.tsx", "utf8");
  assert.match(rota, /ChecklistVeiculoLista/);
  const tela = readFileSync("src/components/parametros/VeiculosListasParametros.tsx", "utf8");
  assert.match(tela, /export function ChecklistVeiculoLista/);
  assert.match(tela, /onClonar=/);
  assert.doesNotMatch(tela, /supabase\.(from|rpc)/);
  assert.doesNotMatch(readFileSync("src/lib/checklist-veiculos-padrao.ts", "utf8"), /supabase/i);
});

test("grupo escolhe o tipo de veículo: todos, ou subcategorias de Veículos que existem", () => {
  const s = storage();
  const carro = lerParametros(s).subcategorias.find((x) => x.categoriaId === "cat-veiculos" && x.nome === "Carro");
  const g = adicionarGrupoChecklistVeiculo("Meu grupo", ["Item"], [carro.id, carro.id], s);
  assert.deepEqual(g.tiposVeiculo, [carro.id]);
  assert.deepEqual(adicionarGrupoChecklistVeiculo("Outro", [], ["x", "*"], s).tiposVeiculo, ["*"]);
  assert.throws(() => adicionarGrupoChecklistVeiculo("Sem tipo", [], [], s), /tipo de veículo/i);
  assert.throws(() => adicionarGrupoChecklistVeiculo("Tipo falso", [], ["nao-existe"], s), /não encontrado/i);
  assert.throws(() => editarGrupoChecklistVeiculo(g.id, "Meu grupo", [], [], s), /tipo de veículo/i);
  assert.equal(lerParametros(s).itensChecklistVeiculo.length, 2);
});

test("dados da decisão 62, sem tipo de veículo, passam a valer para todos", () => {
  const s = storage();
  s.setItem("gemape-demo-parametros-base", JSON.stringify({ itensChecklistVeiculo: [{ id: "g", nome: "Motos", itens: [{ id: "i", nome: "Freio" }] }] }));
  assert.deepEqual(lerParametros(s).itensChecklistVeiculo[0].tiposVeiculo, ["*"]);
});

test("cadastrar padrão liga cada grupo ao tipo de veículo pelo nome da subcategoria de Gerais", () => {
  const s = storage();
  cadastrarPadraoChecklistVeiculos(s);
  const d = lerParametros(s);
  const id = (nome) => d.subcategorias.find((x) => x.categoriaId === "cat-veiculos" && x.nome === nome).id;
  const grupo = (prefixo) => d.itensChecklistVeiculo.find((g) => g.nome.startsWith(prefixo));
  assert.deepEqual(grupo("Carros de passeio · Exterior").tiposVeiculo.sort(), [id("Carro"), id("Van"), id("Utilitário")].sort());
  assert.deepEqual(grupo("Motos").tiposVeiculo, [id("Moto")]);
  assert.deepEqual(grupo("SUVs, utilitários e picapes · Caçamba").tiposVeiculo, [id("Utilitário")]);
  assert.deepEqual(grupo("Vans e furgões").tiposVeiculo, [id("Van")]);
  assert.deepEqual(grupo("Caminhões leves e médios · Freios").tiposVeiculo, [id("Caminhão")]);
  assert.deepEqual(grupo("Todos os veículos").tiposVeiculo, ["*"]);
  // sem subcategoria de ônibus, empilhadeira ou caminhão pesado em Gerais: ficam sem tipo
  assert.deepEqual(grupo("Ônibus e micro-ônibus · Acessibilidade").tiposVeiculo, []);
  assert.deepEqual(grupo("Caminhões pesados e cavalo mecânico · Sistema pneumático").tiposVeiculo, []);
});

test("chave do tipo pelo nome da subcategoria", () => {
  assert.equal(chaveDoTipoVeiculo("Caminhão pesado"), "pesado");
  assert.equal(chaveDoTipoVeiculo("Caminhão"), "leve");
  assert.equal(chaveDoTipoVeiculo("Ônibus"), "onibus");
  assert.equal(chaveDoTipoVeiculo("Utilitário"), "suv");
  assert.equal(chaveDoTipoVeiculo("Outros"), null);
});
