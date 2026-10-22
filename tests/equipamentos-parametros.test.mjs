import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import {
  SUBCATEGORIAS_PADRAO, TIPOS_PADRAO, lerParametrosEquipamento, removerSubcategoria, removerTipo, salvarSubcategoria, salvarTipo,
} from "../src/lib/equipamentos-parametros.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const nomes = (l) => l.map((x) => x.nome);

test("as subcategorias (pai) de fábrica são as quatro das Normas Regulamentadoras", () => {
  assert.deepEqual(nomes(SUBCATEGORIAS_PADRAO), [
    "Movimentação e elevação de carga (NR-11)",
    "Maquinário industrial ferramental (NR-12 e NR-10)",
    "Sistemas pneumáticos e hidráulicos (NR-13)",
    "Equipamentos de emergência e combate a incêndio (NR-23)",
  ]);
});

test("os tipos (filho) de fábrica, cada um debaixo da sua subcategoria", () => {
  const pai = (nomeTipo) => SUBCATEGORIAS_PADRAO.find((s) => s.id === TIPOS_PADRAO.find((t) => t.nome === nomeTipo).subcategoriaId).nome;
  assert.equal(TIPOS_PADRAO.length, 8);
  for (const t of ["Empilhadeiras", "Munck", "Ponte rolante"]) assert.match(pai(t), /NR-11/, t);
  for (const t of ["Serra de corte", "Máquina de solda"]) assert.match(pai(t), /NR-12 e NR-10/, t);
  for (const t of ["Compressor de ar (vaso de pressão)", "Jato de alta pressão (lavador)"]) assert.match(pai(t), /NR-13/, t);
  assert.match(pai("Extintores de incêndio"), /NR-23/);
  assert.equal(new Set(TIPOS_PADRAO.map((t) => t.id)).size, 8, "ids únicos");
  assert.ok(TIPOS_PADRAO.every((t) => SUBCATEGORIAS_PADRAO.some((s) => s.id === t.subcategoriaId)));
});

test("sem nada salvo, a leitura traz os padrões; o primeiro cadastro grava o conjunto inteiro, padrões incluídos", () => {
  const s = memoria();
  const p = lerParametrosEquipamento(s);
  assert.equal(p.subcategorias.length, 4);
  assert.equal(p.tipos.length, 8);
  assert.equal(s.getItem("gemape-demo-equipamentos-parametros"), null, "ler não grava");
  salvarSubcategoria({ nome: "outra subcategoria" }, s);
  const depois = lerParametrosEquipamento(s);
  assert.equal(depois.subcategorias.length, 5);
  assert.equal(depois.tipos.length, 8);
});

test("subcategoria: nome capitalizado, obrigatório e único (sem diferenciar acento e maiúscula)", () => {
  const s = memoria();
  assert.equal(salvarSubcategoria({ nome: "  nova   subcategoria  " }, s).nome, "Nova subcategoria");
  assert.throws(() => salvarSubcategoria({ nome: "   " }, s), /nome da subcategoria/i);
  assert.throws(() => salvarSubcategoria({ nome: "NOVA SUBCATEGORIA" }, s), /já existe/i);
  assert.throws(() => salvarSubcategoria({ nome: "movimentacao e elevacao de carga (nr-11)" }, s), /já existe/i);
  assert.equal(lerParametrosEquipamento(s).subcategorias.length, 5);
});

test("editar a subcategoria troca o nome e mantém o id e os tipos dela", () => {
  const s = memoria();
  const nr11 = SUBCATEGORIAS_PADRAO[0];
  const e = salvarSubcategoria({ id: nr11.id, nome: "Elevação de carga (NR-11)" }, s);
  assert.equal(e.id, nr11.id);
  const p = lerParametrosEquipamento(s);
  assert.equal(p.subcategorias.find((x) => x.id === nr11.id).nome, "Elevação de carga (NR-11)");
  assert.equal(p.tipos.filter((t) => t.subcategoriaId === nr11.id).length, 3);
  assert.throws(() => salvarSubcategoria({ id: "inexistente", nome: "x" }, s), /excluída/i);
  // o próprio nome não conta como repetido
  assert.doesNotThrow(() => salvarSubcategoria({ id: nr11.id, nome: "Elevação de carga (NR-11)" }, s));
});

test("não dá para excluir uma subcategoria que ainda tem tipos; vazia, pode", () => {
  const s = memoria();
  assert.throws(() => removerSubcategoria(SUBCATEGORIAS_PADRAO[0].id, s), /3 tipos/);
  assert.equal(lerParametrosEquipamento(s).subcategorias.length, 4);
  const nova = salvarSubcategoria({ nome: "Vazia" }, s);
  removerSubcategoria(nova.id, s);
  assert.deepEqual(nomes(lerParametrosEquipamento(s).subcategorias), nomes(SUBCATEGORIAS_PADRAO));
  assert.throws(() => removerSubcategoria("inexistente", s), /excluída/i);
});

test("tipo: precisa de uma subcategoria que existe, nome obrigatório e único", () => {
  const s = memoria();
  const nr13 = SUBCATEGORIAS_PADRAO[2].id;
  const t = salvarTipo({ subcategoriaId: nr13, nome: "caldeira" }, s);
  assert.equal(t.nome, "Caldeira");
  assert.equal(t.subcategoriaId, nr13);
  assert.throws(() => salvarTipo({ subcategoriaId: "nao-existe", nome: "x" }, s), /subcategoria/i);
  assert.throws(() => salvarTipo({ subcategoriaId: nr13, nome: " " }, s), /nome do tipo/i);
  assert.throws(() => salvarTipo({ subcategoriaId: nr13, nome: "CALDEIRA" }, s), /já existe/i);
  assert.throws(() => salvarTipo({ subcategoriaId: SUBCATEGORIAS_PADRAO[0].id, nome: "caldeira" }, s), /já existe/i);
  assert.equal(lerParametrosEquipamento(s).tipos.length, 9);
});

test("editar o tipo pode mudar o nome e passar para outra subcategoria (pai)", () => {
  const s = memoria();
  const solda = TIPOS_PADRAO.find((x) => x.nome === "Máquina de solda");
  const e = salvarTipo({ id: solda.id, subcategoriaId: SUBCATEGORIAS_PADRAO[0].id, nome: "Máquina de solda elétrica" }, s);
  assert.equal(e.id, solda.id);
  assert.equal(e.subcategoriaId, SUBCATEGORIAS_PADRAO[0].id);
  assert.equal(lerParametrosEquipamento(s).tipos.length, 8);
  assert.throws(() => salvarTipo({ id: "inexistente", subcategoriaId: SUBCATEGORIAS_PADRAO[0].id, nome: "x" }, s), /excluído/i);
});

test("excluir o tipo tira só ele", () => {
  const s = memoria();
  const alvo = TIPOS_PADRAO[0];
  removerTipo(alvo.id, s);
  const p = lerParametrosEquipamento(s);
  assert.equal(p.tipos.length, 7);
  assert.ok(!p.tipos.some((t) => t.id === alvo.id));
  assert.equal(p.subcategorias.length, 4);
  assert.throws(() => removerTipo("inexistente", s), /excluído/i);
});

test("dado salvo ilegível não é sobrescrito: a leitura vem vazia e gravar recusa", () => {
  const s = memoria();
  s.setItem("gemape-demo-equipamentos-parametros", "{quebrado");
  assert.deepEqual(lerParametrosEquipamento(s), { subcategorias: [], tipos: [] });
  assert.throws(() => salvarSubcategoria({ nome: "x" }, s), /ilegíveis/i);
  assert.throws(() => salvarTipo({ subcategoriaId: SUBCATEGORIAS_PADRAO[0].id, nome: "x" }, s), /ilegíveis/i);
  assert.equal(s.getItem("gemape-demo-equipamentos-parametros"), "{quebrado");
});

test("erro de validação não grava nada (tudo ou nada)", () => {
  const s = memoria();
  assert.throws(() => salvarSubcategoria({ nome: "" }, s));
  assert.throws(() => salvarTipo({ subcategoriaId: "x", nome: "y" }, s));
  assert.equal(s.getItem("gemape-demo-equipamentos-parametros"), null);
});

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");

test("a tela existe, mostra pai e filho e usa as ações padrão das listas (Editar e Excluir)", () => {
  assert.ok(existsSync(new URL("../src/routes/_authenticated/cadastros/equipamentos-especificos.tsx", import.meta.url)));
  const tela = ler("components/parametros/EquipamentosEspecificos.tsx");
  assert.match(tela, /Cadastrar subcategoria/);
  assert.match(tela, /Cadastrar tipo/);
  assert.match(tela, /AcoesLinha/);
  assert.match(tela, /\.filter\(\(t\) => t\.subcategoriaId/);
  assert.match(tela, /trava\.current/);
  assert.doesNotMatch(tela, /dangerouslySetInnerHTML|innerHTML/);
});

test("Parâmetros Específicos entra no menu de Equipamentos e no cartão da tela inicial", async () => {
  const { MENU_EQUIPAMENTOS } = await import("../src/lib/menu-parametros.ts");
  assert.deepEqual(MENU_EQUIPAMENTOS.map((i) => [i.titulo, i.url]), [
    ["Cadastrar equipamento", "/cadastros/equipamentos"],
    ["Parâmetros Específicos", "/cadastros/equipamentos-especificos"],
    ["Check list de manutenção", "/cadastros/equipamentos-checklist"],
    ["Check list de vistoria", "/cadastros/equipamentos-checklist"],
  ]);
  const { gruposDoInicio } = await import("../src/lib/inicio.ts");
  const card = gruposDoInicio(true).find((g) => g.titulo === "Módulos").cartoes.find((c) => c.titulo === "Equipamentos");
  assert.deepEqual(card.itens.filter((i) => i.secao === "Parâmetros").map((i) => i.titulo), ["Cadastrar equipamento", "Parâmetros Específicos", "Check list de manutenção", "Check list de vistoria"]);
  assert.equal(card.url, undefined);
});

test("o tipo guarda os grupos de campos técnicos que aparecem no cadastro do equipamento", () => {
  const s = memoria();
  const nr13 = SUBCATEGORIAS_PADRAO[2].id;
  const t = salvarTipo({ subcategoriaId: nr13, nome: "caldeira", grupos: ["eletrico", "motor"] }, s);
  assert.deepEqual(t.grupos, ["eletrico", "motor"]);
  assert.deepEqual(salvarTipo({ subcategoriaId: nr13, nome: "outro" }, s).grupos, [], "sem grupos por padrão");
  assert.throws(() => salvarTipo({ subcategoriaId: nr13, nome: "x1", grupos: ["asa-delta"] }, s), /campos técnicos/i);
  assert.deepEqual(salvarTipo({ subcategoriaId: nr13, nome: "x2", grupos: ["motor", "motor"] }, s).grupos, ["motor"], "sem repetir");
});

test("editar o tipo sem informar os grupos mantém os que ele já tinha", () => {
  const s = memoria();
  const jato = TIPOS_PADRAO.find((t) => t.nome === "Jato de alta pressão (lavador)");
  const e = salvarTipo({ id: jato.id, subcategoriaId: jato.subcategoriaId, nome: "Jato de alta pressão (lavador) novo" }, s);
  assert.deepEqual(e.grupos, ["motor", "eletrico"]);
  assert.deepEqual(salvarTipo({ id: jato.id, subcategoriaId: jato.subcategoriaId, nome: "Jato de alta pressão (lavador) novo", grupos: [] }, s).grupos, []);
});

test("tipo salvo antes dos grupos (sem o campo) recebe o padrão do mesmo id, ou nenhum grupo", () => {
  const s = memoria();
  s.setItem("gemape-demo-equipamentos-parametros", JSON.stringify({
    subcategorias: SUBCATEGORIAS_PADRAO,
    tipos: [{ id: "tipo-munck", subcategoriaId: "sub-nr11", nome: "Munck" }, { id: "tipo-meu", subcategoriaId: "sub-nr11", nome: "Meu" }],
  }));
  const tipos = lerParametrosEquipamento(s).tipos;
  assert.deepEqual(tipos.find((t) => t.id === "tipo-munck").grupos, ["motor"]);
  assert.deepEqual(tipos.find((t) => t.id === "tipo-meu").grupos, []);
});

test("não se exclui um tipo que algum equipamento usa", () => {
  const s = memoria();
  assert.throws(() => removerTipo("tipo-munck", s, (id) => (id === "tipo-munck" ? 2 : 0)), /2 equipamentos/);
  assert.equal(lerParametrosEquipamento(s).tipos.length, 8);
  removerTipo("tipo-munck", s, () => 0);
  assert.equal(lerParametrosEquipamento(s).tipos.length, 7);
});

test("a janela do tipo pede os campos técnicos que aparecem no cadastro do equipamento", () => {
  const tela = readFileSync(new URL("../src/components/parametros/EquipamentosEspecificos.tsx", import.meta.url), "utf8");
  assert.match(tela, /GRUPOS_TECNICOS/);
  assert.match(tela, /TITULO_GRUPO_TECNICO/);
  assert.match(tela, /Checkbox/);
  assert.match(tela, /grupos,\s*\}\)|grupos \}\)|, grupos\b/);
});

test("excluir um tipo consulta os equipamentos que o usam", () => {
  const tela = readFileSync(new URL("../src/components/parametros/EquipamentosEspecificos.tsx", import.meta.url), "utf8");
  assert.match(tela, /listarEquipamentos/);
  assert.match(tela, /removerTipo\(t\.id, undefined, /);
});
