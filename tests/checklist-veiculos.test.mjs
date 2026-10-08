import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  lerParametros,
  adicionarSubcategoria,
  adicionarGrupoChecklistVeiculo,
  editarGrupoChecklistVeiculo,
  removerGrupoChecklistVeiculo,
  cadastrarPadraoChecklistVeiculos,
  restaurarPadroesChecklistVeiculos,
  situacaoPadraoChecklistVeiculos,
  ehGrupoChecklistPadrao,
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

test("o padrão traz as listas de leves, pesados e empilhadeiras, sem nome ou item repetido", () => {
  const nomes = CHECKLIST_VEICULOS_PADRAO.map((g) => g.nome);
  assert.equal(new Set(nomes.map((n) => n.toLowerCase())).size, nomes.length);
  assert.equal(nomes.length, 19);
  assert.equal(nomes.filter((n) => n.startsWith("Veículos leves")).length, 4);
  assert.equal(nomes.filter((n) => n.startsWith("Veículos pesados")).length, 6);
  assert.equal(nomes.filter((n) => n.startsWith("Empilhadeiras")).length, 9);
  for (const g of CHECKLIST_VEICULOS_PADRAO) {
    assert.ok(g.itens.length > 0, g.nome);
    assert.equal(new Set(g.itens.map((i) => i.toLowerCase())).size, g.itens.length, g.nome);
  }
  const total = CHECKLIST_VEICULOS_PADRAO.reduce((t, g) => t + g.itens.length, 0);
  assert.equal(total, 117);
});

test("cadastrar padrão inclui o que falta, não repete nem altera o que já existe", () => {
  const s = storage();
  adicionarGrupoChecklistVeiculo("Meu grupo", ["Meu item"], ["*"], s);
  const r = cadastrarPadraoChecklistVeiculos(s);
  assert.equal(r.grupos, CHECKLIST_VEICULOS_PADRAO.length);
  assert.equal(r.substituidos, 0);
  const d = lerParametros(s);
  assert.equal(d.itensChecklistVeiculo.length, CHECKLIST_VEICULOS_PADRAO.length + 1);
  assert.deepEqual(d.itensChecklistVeiculo.find((g) => g.nome === "Meu grupo").itens.map((i) => i.nome), ["Meu item"]);
  const doc = d.itensChecklistVeiculo.find((g) => g.nome === "Veículos leves · Segurança e documentos");
  assert.ok(doc.itens.some((i) => i.nome === "CRLV/licenciamento em dia"));
  const repetido = cadastrarPadraoChecklistVeiculos(s);
  assert.deepEqual(repetido, { grupos: 0, itens: 0, semTipo: 0, substituidos: 0, ligados: 0 });
  assert.equal(lerParametros(s).itensChecklistVeiculo.length, CHECKLIST_VEICULOS_PADRAO.length + 1);
});

test("o novo padrão substitui os grupos do padrão antigo e preserva os do responsável", () => {
  const s = storage();
  adicionarGrupoChecklistVeiculo("Carros de passeio · Exterior", ["Lataria"], ["*"], s);
  adicionarGrupoChecklistVeiculo("Motos", ["Freio"], ["*"], s);
  adicionarGrupoChecklistVeiculo("Meu grupo", ["Meu item"], ["*"], s);
  const r = cadastrarPadraoChecklistVeiculos(s);
  assert.equal(r.substituidos, 2);
  const nomes = lerParametros(s).itensChecklistVeiculo.map((g) => g.nome);
  assert.ok(!nomes.includes("Motos") && !nomes.includes("Carros de passeio · Exterior"));
  assert.ok(nomes.includes("Meu grupo"));
  assert.equal(nomes.length, CHECKLIST_VEICULOS_PADRAO.length + 1);
});

test("dados antigos sem a lista continuam abrindo", () => {
  const s = storage();
  s.setItem("gemape-demo-parametros-base", JSON.stringify({ categorias: [] }));
  assert.deepEqual(lerParametros(s).itensChecklistVeiculo, []);
});

test("a tela fica em Parâmetros > Veículos, com Clonar/Editar/Excluir, e não toca o Supabase", () => {
  const menu = readFileSync("src/lib/menu-parametros.ts", "utf8");
  assert.match(menu, /titulo: "Check list"[^}]*url: "\/cadastros\/veiculos-checklist"/);
  const rota = readFileSync("src/routes/_authenticated/cadastros/veiculos-checklist.tsx", "utf8");
  assert.match(rota, /ChecklistParametros/);
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

test("cadastrar padrão liga cada grupo ao tipo de veículo pelo nome da subcategoria de Gerais", async () => {
  const s = storage();
  // Empilhadeira vem de fábrica em Gerais (decisão 69); aqui ela sai para testar o caso sem o tipo.
  const { removerSubcategoria } = await import("../src/lib/parametros-base.ts");
  removerSubcategoria(lerParametros(s).subcategorias.find((x) => x.categoriaId === "cat-veiculos" && x.nome === "Empilhadeira").id, s);
  const r = cadastrarPadraoChecklistVeiculos(s);
  const d = lerParametros(s);
  const id = (nome) => d.subcategorias.find((x) => x.categoriaId === "cat-veiculos" && x.nome === nome).id;
  const grupo = (prefixo) => d.itensChecklistVeiculo.find((g) => g.nome.startsWith(prefixo));
  assert.deepEqual(grupo("Veículos leves · Mecânica").tiposVeiculo.sort(), [id("Carro"), id("Van"), id("Utilitário")].sort());
  assert.deepEqual(grupo("Veículos pesados · Mecânica").tiposVeiculo, [id("Caminhão")]);
  // sem subcategoria de empilhadeira em Gerais: os 9 grupos ficam sem tipo, com aviso
  assert.deepEqual(grupo("Empilhadeiras · Elevação").tiposVeiculo, []);
  assert.equal(r.semTipo, 9);
  // clicar de novo antes de criar o tipo mantém o aviso e não repete nada
  assert.deepEqual(cadastrarPadraoChecklistVeiculos(s), { grupos: 0, itens: 0, semTipo: 9, substituidos: 0, ligados: 0 });
  // depois de criar o tipo "Empilhadeira" em Gerais, cadastrar o padrão de novo liga os 9 grupos
  const nova = adicionarSubcategoria("cat-veiculos", "Empilhadeira", s);
  const r2 = cadastrarPadraoChecklistVeiculos(s);
  assert.equal(r2.ligados, 9);
  assert.deepEqual(lerParametros(s).itensChecklistVeiculo.find((g) => g.nome.startsWith("Empilhadeiras · Elevação")).tiposVeiculo, [nova.id]);
});

test("chave do tipo pelo nome da subcategoria", () => {
  assert.equal(chaveDoTipoVeiculo("Caminhão pesado"), "pesado");
  assert.equal(chaveDoTipoVeiculo("Caminhão"), "pesado");
  assert.equal(chaveDoTipoVeiculo("Empilhadeira"), "empilhadeira");
  assert.equal(chaveDoTipoVeiculo("Moto"), null);
  assert.equal(chaveDoTipoVeiculo("Ônibus"), "onibus");
  assert.equal(chaveDoTipoVeiculo("Utilitário"), "suv");
  assert.equal(chaveDoTipoVeiculo("Outros"), null);
});

test("apagar o tipo em Gerais tira o vínculo dos grupos do check list", async () => {
  const { removerSubcategoria } = await import("../src/lib/parametros-base.ts");
  const s = storage();
  const t = adicionarSubcategoria("cat-veiculos", "Triciclo", s);
  const g = adicionarGrupoChecklistVeiculo("Triciclos", ["Freio"], [t.id], s);
  removerSubcategoria(t.id, s);
  assert.deepEqual(lerParametros(s).itensChecklistVeiculo.find((x) => x.id === g.id).tiposVeiculo, []);
});

test("nenhum nome do padrão novo coincide com o do padrão antigo", async () => {
  const { NOMES_PADRAO_ANTIGO } = await import("../src/lib/checklist-veiculos-padrao.ts");
  assert.equal(NOMES_PADRAO_ANTIGO.length, 26);
  const novos = CHECKLIST_VEICULOS_PADRAO.map((g) => g.nome.toLowerCase());
  assert.ok(NOMES_PADRAO_ANTIGO.every((n) => !novos.includes(n.toLowerCase())));
});

test("restaurar padrão inicial: situação de cada grupo (igual, alterado, não cadastrado)", () => {
  const s = storage();
  assert.equal(situacaoPadraoChecklistVeiculos(s).length, CHECKLIST_VEICULOS_PADRAO.length);
  assert.ok(situacaoPadraoChecklistVeiculos(s).every((p) => p.situacao === "ausente"));
  cadastrarPadraoChecklistVeiculos(s);
  assert.ok(situacaoPadraoChecklistVeiculos(s).every((p) => p.situacao === "igual"));
  const g = lerParametros(s).itensChecklistVeiculo.find((x) => x.nome === "Veículos leves · Mecânica");
  editarGrupoChecklistVeiculo(g.id, g.nome, ["Só um item"], g.tiposVeiculo, s);
  removerGrupoChecklistVeiculo(lerParametros(s).itensChecklistVeiculo.find((x) => x.nome === "Veículos leves · Interior").id, s);
  const sit = Object.fromEntries(situacaoPadraoChecklistVeiculos(s).map((p) => [p.nome, p.situacao]));
  assert.equal(sit["Veículos leves · Mecânica"], "alterado");
  assert.equal(sit["Veículos leves · Interior"], "ausente");
  assert.equal(sit["Veículos leves · Exterior e pneus"], "igual");
});

test("restaurar padrão inicial volta só os marcados, mantém id e itens, recadastra o excluído (decisão 110)", () => {
  const s = storage();
  cadastrarPadraoChecklistVeiculos(s);
  const antes = lerParametros(s).itensChecklistVeiculo.find((g) => g.nome === "Veículos leves · Mecânica");
  const padrao = CHECKLIST_VEICULOS_PADRAO.find((p) => p.nome === "Veículos leves · Mecânica");
  editarGrupoChecklistVeiculo(antes.id, "veículos leves · mecânica", ["Só um item", padrao.itens[0]], ["*"], s);
  removerGrupoChecklistVeiculo(lerParametros(s).itensChecklistVeiculo.find((x) => x.nome === "Veículos leves · Interior").id, s);
  const exterior = lerParametros(s).itensChecklistVeiculo.find((x) => x.nome === "Veículos leves · Exterior e pneus");
  editarGrupoChecklistVeiculo(exterior.id, exterior.nome, ["Alterado"], exterior.tiposVeiculo, s);
  const r = restaurarPadroesChecklistVeiculos(["Veículos leves · Mecânica", "veículos leves · interior"], s);
  assert.deepEqual(r, { restaurados: 1, criados: 1, semTipo: 0 });
  const lido = lerParametros(s).itensChecklistVeiculo;
  const depois = lido.find((g) => g.id === antes.id);
  assert.equal(depois.nome, "Veículos leves · Mecânica");
  assert.deepEqual(depois.itens.map((i) => i.nome), padrao.itens);
  assert.equal(depois.itens[0].id, antes.itens[0].id);
  assert.deepEqual(depois.tiposVeiculo, antes.tiposVeiculo);
  assert.ok(lido.some((g) => g.nome === "Veículos leves · Interior"));
  // O que não foi marcado fica como estava.
  assert.deepEqual(lido.find((g) => g.id === exterior.id).itens.map((i) => i.nome), ["Alterado"]);
});

test("restaurar padrão inicial é tudo ou nada: nada marcado ou grupo fora do padrão não grava", () => {
  const s = storage();
  cadastrarPadraoChecklistVeiculos(s);
  const meu = adicionarGrupoChecklistVeiculo("Motos", ["Freio"], ["*"], s);
  const mec = lerParametros(s).itensChecklistVeiculo.find((g) => g.nome === "Veículos leves · Mecânica");
  editarGrupoChecklistVeiculo(mec.id, mec.nome, ["Só um item"], mec.tiposVeiculo, s);
  assert.equal(ehGrupoChecklistPadrao("Motos"), false);
  assert.equal(ehGrupoChecklistPadrao("veículos leves · mecânica"), true);
  assert.throws(() => restaurarPadroesChecklistVeiculos([], s), /ao menos um/i);
  assert.throws(() => restaurarPadroesChecklistVeiculos(["Veículos leves · Mecânica", "Motos"], s), /não faz parte do padrão/i);
  const lido = lerParametros(s).itensChecklistVeiculo;
  assert.deepEqual(lido.find((g) => g.id === mec.id).itens.map((i) => i.nome), ["Só um item"]);
  assert.deepEqual(lido.find((g) => g.id === meu.id).itens.map((i) => i.nome), ["Freio"]);
});

test("a lista Itens check list tem um único botão Restaurar padrão inicial, sem botão por linha (decisão 110)", () => {
  const lista = readFileSync(new URL("../src/components/parametros/VeiculosListasParametros.tsx", import.meta.url), "utf8");
  assert.match(lista, /acaoExtra=\{<RestaurarPadraoChecklist \/>\}/);
  assert.match(lista, /Restaurar padrão inicial/);
  assert.match(lista, /restaurar=\{restaurarPadroesChecklistVeiculos\}/);
  assert.match(lista, /restaurar\(marcados\)/);
  assert.match(lista, /if \(!confirm\(aviso\)\) return;/);
  assert.doesNotMatch(lista, /onRestaurar|restauravel/);
  const acoes = readFileSync(new URL("../src/components/parametros/AcoesLinha.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(acoes, /Restaurar/);
});

import { separarPorTipoVeiculo } from "../src/lib/checklist-por-tipo.ts";

test("Itens check list separados por tipo de veículo: seções na ordem de Gerais, todos os tipos e sem tipo (decisão 113)", () => {
  const tipos = [{ id: "t-carro", nome: "Carro" }, { id: "t-van", nome: "Van" }, { id: "t-cam", nome: "Caminhão" }, { id: "t-vazio", nome: "Moto" }];
  const g = (id, tiposVeiculo) => ({ id, tiposVeiculo });
  const itens = [g("a", ["t-van", "t-carro"]), g("b", ["t-cam"]), g("c", ["*"]), g("d", []), g("e", ["t-apagado"])];
  const secoes = separarPorTipoVeiculo(itens, tipos);
  assert.deepEqual(secoes.map((x) => [x.titulo, x.itens.map((i) => i.id)]), [
    ["Carro", ["a"]],
    ["Van", ["a"]],
    ["Caminhão", ["b"]],
    ["Todos os tipos de veículo", ["c"]],
    ["Sem tipo de veículo (não aparece em check list)", ["d", "e"]],
  ]);
  assert.deepEqual(separarPorTipoVeiculo([], tipos), []);
});

test("a página Check list junta Itens check list e Associar itens, com redirecionamento do endereço antigo (decisão 113)", () => {
  const menu = readFileSync("src/lib/menu-parametros.ts", "utf8");
  assert.doesNotMatch(menu, /veiculos-checklist-associar/);
  const pagina = readFileSync("src/components/parametros/ChecklistParametros.tsx", "utf8");
  assert.match(pagina, /<h1 className="text-2xl font-bold">Check list<\/h1>/);
  assert.match(pagina, /<ChecklistVeiculoLista secao \/>/);
  assert.match(pagina, /<AssociarChecklistVeiculo secao \/>/);
  const antiga = readFileSync("src/routes/_authenticated/cadastros/veiculos-checklist-associar.tsx", "utf8");
  assert.match(antiga, /redirect\(\{ to: "\/cadastros\/veiculos-checklist" \}\)/);
  const lista = readFileSync("src/components/parametros/VeiculosListasParametros.tsx", "utf8");
  assert.match(lista, /secoes=\{separarPorTipoVeiculo\(itensChecklistVeiculo, tiposDeVeiculo\)/);
  const assoc = readFileSync("src/components/parametros/AssociarChecklistVeiculo.tsx", "utf8");
  assert.match(assoc, /\{!secao && <p className="text-eyebrow">/);
});
