import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  PERIODICIDADES_ASSOCIACAO, checklistsDaAssociacao, gruposAvulsosDaAssociacao, gruposDaPeriodicidade, lerAssociacoes, criarAssociacao, editarAssociacao, removerAssociacao, gruposDaAssociacao,
} from "../src/lib/checklist-associacao-veiculo.ts";
import { MENU_VEICULOS } from "../src/lib/menu-parametros.ts";

const memoria = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const resp = { id: "e1", nome: "Maria Souza" };
const grupos = [{ grupoId: "g1", periodicidade: "Diária" }, { grupoId: "g2", periodicidade: "Mensal" }];
const gravados = grupos.map((g) => ({ ...g, tipo: "periodico", obrigatorio: false }));

test("as periodicidades são Diária, Semanal, Quinzenal, Mensal e Não definida (dec 116)", () => {
  assert.deepEqual([...PERIODICIDADES_ASSOCIACAO], ["Diária", "Semanal", "Quinzenal", "Mensal", "Não definida"]);
});

test("criar associação guarda grupos com periodicidade e o responsável, uma por veículo", () => {
  const s = memoria();
  const a = criarAssociacao("v1", resp, grupos, s, new Date("2026-10-07T12:00:00Z"));
  assert.deepEqual(a.itens, gravados);
  assert.deepEqual(a.responsavel, resp);
  assert.equal(lerAssociacoes(s).length, 1);
  assert.throws(() => criarAssociacao("v1", resp, grupos, s), /já tem/i);
});

test("validações: veículo, responsável, ao menos um grupo, periodicidade válida, sem grupo repetido ou removido", () => {
  const s = memoria();
  assert.throws(() => criarAssociacao("", resp, grupos, s), /veículo/i);
  assert.throws(() => criarAssociacao("v1", { id: "", nome: "" }, grupos, s), /respons/i);
  assert.throws(() => criarAssociacao("v1", resp, [], s), /ao menos um/i);
  assert.throws(() => criarAssociacao("v1", resp, [{ grupoId: "g1", periodicidade: "" }], s), /periodicidade/i);
  assert.throws(() => criarAssociacao("v1", resp, [{ grupoId: "g1", periodicidade: "Anual" }], s), /periodicidade/i);
  assert.throws(() => criarAssociacao("v1", resp, [grupos[0], grupos[0]], s), /repetido/i);
  assert.throws(() => criarAssociacao("v1", resp, grupos, s, new Date(), ["g1"]), /não existe mais/i);
  assert.equal(lerAssociacoes(s).length, 0);
});

test("responsável não definido e grupo Não definida: check list livre, nome com Não definida/Não definido (dec 116)", () => {
  const s = memoria();
  const a = criarAssociacao("v1", null, [
    { grupoId: "g1", periodicidade: "Mensal", obrigatorio: true },
    { grupoId: "g2", tipo: "avulso", periodicidade: "" },
    { grupoId: "g3", tipo: "avulso", periodicidade: "", obrigatorio: true },
  ], s);
  assert.equal(a.responsavel, null);
  assert.equal(lerAssociacoes(s)[0].responsavel, null);
  const grupos3 = [{ id: "g1", nome: "Freios" }, { id: "g2", nome: "Luzes" }, { id: "g3", nome: "Pneus" }];
  const listas = checklistsDaAssociacao("ABC1D23", a, grupos3);
  assert.deepEqual(listas.map((l) => [l.nome, l.tipo, l.obrigatorio]), [
    ["ABC1D23 >> Mensal >> Não definido", "Periódico", "Sim"],
    ["ABC1D23 >> Não definida >> Não definido", "Livre", "Parcial"],
  ]);
  const comResp = checklistsDaAssociacao("ABC1D23", { ...a, responsavel: resp }, grupos3);
  assert.deepEqual(comResp.map((l) => [l.nome, l.tipo]), [
    ["ABC1D23 >> Mensal >> Maria Souza", "Periódico"],
    ["ABC1D23 >> Não definida >> Maria Souza", "Avulso"],
  ]);
});

test("associações antigas, sem obrigatório, são lidas como não obrigatórias", () => {
  const s = memoria();
  s.setItem("gemape-demo-associacoes-checklist-veiculo", JSON.stringify([{ veiculoId: "v1", responsavel: resp, atualizadoEm: "", itens: [{ grupoId: "g1", periodicidade: "Diária" }] }]));
  assert.equal(lerAssociacoes(s)[0].itens[0].obrigatorio, false);
});

test("editar troca grupos, periodicidade, responsável e veículo (tudo ou nada); excluir remove", () => {
  const s = memoria();
  criarAssociacao("v1", resp, grupos, s);
  criarAssociacao("v2", resp, [grupos[0]], s);
  assert.throws(() => editarAssociacao("v1", { veiculoId: "v2", responsavel: resp, itens: grupos }, s), /já tem/i);
  assert.deepEqual(lerAssociacoes(s).find((a) => a.veiculoId === "v1").itens, gravados);
  const nova = editarAssociacao("v1", { veiculoId: "v3", responsavel: { id: "e2", nome: "João" }, itens: [{ grupoId: "g2", periodicidade: "Quinzenal" }] }, s);
  assert.equal(nova.veiculoId, "v3");
  assert.equal(lerAssociacoes(s).some((a) => a.veiculoId === "v1"), false);
  removerAssociacao("v3", s);
  assert.deepEqual(lerAssociacoes(s).map((a) => a.veiculoId), ["v2"]);
});

test("dados ilegíveis não são sobrescritos", () => {
  const s = memoria();
  s.setItem("gemape-demo-associacoes-checklist-veiculo", "{quebrado");
  assert.throws(() => criarAssociacao("v1", resp, grupos, s), /não puderam ser lidas/i);
  assert.equal(s.getItem("gemape-demo-associacoes-checklist-veiculo"), "{quebrado");
});

test("gruposDaAssociacao ignora grupo que já não existe em Itens check list", () => {
  const s = memoria();
  const a = criarAssociacao("v1", resp, grupos, s);
  assert.deepEqual(
    gruposDaAssociacao(a, [{ id: "g2", nome: "Pesados · Pneus" }]).map((g) => [g.nome, g.periodicidade]),
    [["Pesados · Pneus", "Mensal"]],
  );
});

test("menu: um item Check list reúne Itens check list e Associar itens (decisão 113)", () => {
  const checklist = MENU_VEICULOS.find((i) => i.url === "/cadastros/veiculos-checklist");
  assert.equal(checklist.titulo, "Check list");
  assert.equal(checklist.icone, "ListChecks");
  assert.equal(MENU_VEICULOS.find((i) => i.url === "/cadastros/veiculos-checklist-associar"), undefined);
});

test("a tela existe e usa os grupos de Itens check list, periodicidade e responsável", () => {
  const tela = readFileSync(new URL("../src/components/parametros/AssociarChecklistVeiculo.tsx", import.meta.url), "utf8");
  assert.match(tela, /itensChecklistVeiculo/);
  assert.match(tela, /PERIODICIDADES_ASSOCIACAO/);
  assert.match(tela, /Responsável/);
  const rota = readFileSync(new URL("../src/routes/_authenticated/cadastros/veiculos-checklist-associar.tsx", import.meta.url), "utf8");
  assert.match(rota, /cadastros\/veiculos-checklist-associar/);
  assert.match(rota, /redirect/);
});

test("a tela de Parâmetros lista por veículo e check list, com tipo, obrigatório e responsável Não definido (dec 116)", () => {
  const tela = readFileSync(new URL("../src/components/parametros/AssociarChecklistVeiculo.tsx", import.meta.url), "utf8");
  assert.match(tela, /checklistsDaAssociacao\(/);
  assert.match(tela, /Check list obrigatório/);
  assert.match(tela, /SEM_RESPONSAVEL/);
  assert.match(tela, /<th className="px-3 py-2">Tipo<\/th>/);
  assert.match(tela, /<th className="px-3 py-2">Obrigatório<\/th>/);
});

test("cada grupo é do check list periódico ou do avulso; avulso fica sem periodicidade e periódico exige uma (dec 119)", () => {
  const s = memoria();
  assert.throws(() => criarAssociacao("v1", null, [{ grupoId: "g1", tipo: "periodico", periodicidade: "Não definida" }], s), /periodicidade/i);
  assert.throws(() => criarAssociacao("v1", null, [{ grupoId: "g1", periodicidade: "" }], s), /periodicidade/i); // sem tipo = periódico
  const a = criarAssociacao("v1", resp, [
    { grupoId: "g1", tipo: "periodico", periodicidade: "Diária", obrigatorio: true },
    { grupoId: "g2", tipo: "periodico", periodicidade: "Mensal" },
    { grupoId: "g3", tipo: "avulso", periodicidade: "Mensal" }, // a periodicidade enviada é ignorada no avulso
  ], s);
  assert.deepEqual(a.itens.map((i) => [i.grupoId, i.tipo, i.periodicidade]), [
    ["g1", "periodico", "Diária"], ["g2", "periodico", "Mensal"], ["g3", "avulso", "Não definida"],
  ]);
  assert.deepEqual(gruposDaPeriodicidade(a, "Diário").map((i) => i.grupoId), ["g1"]);
  assert.deepEqual(gruposDaPeriodicidade(a, "Mensal").map((i) => i.grupoId), ["g2"]);
  assert.deepEqual(gruposAvulsosDaAssociacao(a).map((i) => i.grupoId), ["g3"]);
  assert.deepEqual(gruposDaPeriodicidade(null, "Mensal"), []);
});

test("associações sem tipo gravado: periódico se tinha periodicidade definida, senão avulso (dec 119)", () => {
  const s = memoria();
  s.setItem("gemape-demo-associacoes-checklist-veiculo", JSON.stringify([{ veiculoId: "v1", responsavel: resp, atualizadoEm: "", itens: [
    { grupoId: "g1", periodicidade: "Semanal" }, { grupoId: "g2", periodicidade: "Não definida" },
  ] }]));
  assert.deepEqual(lerAssociacoes(s)[0].itens.map((i) => i.tipo), ["periodico", "avulso"]);
});

test("Parâmetros > Veículos > Check list mostra primeiro Associar itens e depois os itens; o diálogo tem o campo Tipo de check list, Periódico ou Avulso (dec 119)", () => {
  const pagina = readFileSync(new URL("../src/components/parametros/ChecklistParametros.tsx", import.meta.url), "utf8");
  assert.ok(pagina.indexOf("<AssociarChecklistVeiculo secao />") < pagina.indexOf("<ChecklistVeiculoLista secao />"));
  const tela = readFileSync(new URL("../src/components/parametros/AssociarChecklistVeiculo.tsx", import.meta.url), "utf8");
  assert.match(tela, /htmlFor="assoc-tipo">Tipo de check list/);
  assert.match(tela, /tipo: tipoAtual/);
  assert.match(tela, /i\.tipo === tipoAtual/);
});

// ---------- Telas de cadastro por cima da janela Associar (decisão 120) ----------
test("a janela Associar abre itens, veículos e empregados por cima, ao lado do diálogo e sem perder o preenchimento (dec 120)", () => {
  const lerSrc = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
  const tela = lerSrc("components/parametros/AssociarChecklistVeiculo.tsx");
  assert.match(tela, /<DialogItensChecklist aberto=\{itensAberto\}/);
  assert.match(tela, /<DialogCadastroVeiculos aberto=\{veiculosAberto\}/);
  assert.match(tela, /<DialogCadastroEmpregados aberto=\{empregadosAberto\}/);
  // os três ficam depois do fechamento do diálogo da associação: nunca dentro dele
  const fimDialogo = tela.indexOf("</Dialog>");
  assert.ok(fimDialogo > 0 && tela.indexOf("<DialogItensChecklist") > fimDialogo);
  assert.ok(tela.indexOf("<DialogCadastroEmpregados") > fimDialogo);
  for (const rotulo of ["Cadastrar veículo", "Cadastrar empregado", "Cadastrar itens de check list"]) assert.match(tela, new RegExp(rotulo));
  assert.match(tela, /canWrite/);
  assert.match(tela, /invalidateQueries\(\{ queryKey: \["veiculos-checklist-assoc"\]/);
  assert.match(tela, /invalidateQueries\(\{ queryKey: \["empregados-checklist-assoc"\]/);
  assert.match(lerSrc("components/modules/DialogCadastroEmpregados.tsx"), /<EmpregadosCadastroModulo \/>/);
  assert.match(lerSrc("routes/_authenticated/empregados.tsx"), /component: EmpregadosCadastroModulo/);
});

test("a janela Associar tem o campo Check list: Obrigatório ou Não obrigatório, que vale para os grupos do tipo (dec 126)", () => {
  const tela = readFileSync(new URL("../src/components/parametros/AssociarChecklistVeiculo.tsx", import.meta.url), "utf8");
  assert.match(tela, /htmlFor="assoc-obrigatoriedade">Check list</);
  assert.match(tela, /<SelectItem value="obrigatorio">Obrigatório<\/SelectItem>/);
  assert.match(tela, /<SelectItem value="nao_obrigatorio">Não obrigatório<\/SelectItem>/);
  assert.match(tela, /obrigatorio: obrigatoriedade === "obrigatorio" \}/); // grupo habilitado depois herda o campo
  assert.match(tela, /i\.tipo === tipoAtual \? \{ \.\.\.i, obrigatorio \} : i/); // trocar o campo vale para os grupos do tipo
  assert.match(tela, /placeholder="Misto \(por grupo\)"/);
});
