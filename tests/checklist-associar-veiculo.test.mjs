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
const gravados = grupos.map((g) => ({ ...g, tipo: "periodico", obrigatorio: true })); // periódico é sempre obrigatório (dec 136)

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
    ["ABC1D23 >> Não definida >> Não definido", "Livre", "Não"],
  ]);
  const comResp = checklistsDaAssociacao("ABC1D23", { ...a, responsavel: resp }, grupos3);
  assert.deepEqual(comResp.map((l) => [l.nome, l.tipo]), [
    ["ABC1D23 >> Mensal >> Maria Souza", "Periódico"],
    ["ABC1D23 >> Não definida >> Maria Souza", "Avulso"],
  ]);
});

test("o tipo define a obrigatoriedade, também nas associações antigas: periódico obrigatório, avulso não (dec 136)", () => {
  const s = memoria();
  s.setItem("gemape-demo-associacoes-checklist-veiculo", JSON.stringify([{ veiculoId: "v1", responsavel: resp, atualizadoEm: "", itens: [{ grupoId: "g1", periodicidade: "Diária", obrigatorio: false }, { grupoId: "g2", tipo: "avulso", periodicidade: "Não definida", obrigatorio: true }] }]));
  assert.deepEqual(lerAssociacoes(s)[0].itens.map((i) => i.obrigatorio), [true, false]);
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
  assert.match(tela, /PERIODICIDADES_CAMPO/);
  assert.match(tela, /Responsável/);
  const rota = readFileSync(new URL("../src/routes/_authenticated/cadastros/veiculos-checklist-associar.tsx", import.meta.url), "utf8");
  assert.match(rota, /cadastros\/veiculos-checklist-associar/);
  assert.match(rota, /redirect/);
});

test("a tela de Parâmetros lista por veículo e check list, com tipo, obrigatório e responsável Não definido (dec 116)", () => {
  const tela = readFileSync(new URL("../src/components/parametros/AssociarChecklistVeiculo.tsx", import.meta.url), "utf8");
  assert.match(tela, /checklistsDaAssociacao\(/);
  assert.doesNotMatch(tela, /obrigatorio-\$\{i\.grupoId\}/); // sem checkbox por grupo (dec 129)
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

test("Parâmetros > Veículos > Check list mostra primeiro os itens e depois Associar itens a um veículo (dec 148); o diálogo tem o campo Tipo de check list, Periódico ou Avulso (dec 119)", () => {
  const pagina = readFileSync(new URL("../src/components/parametros/ChecklistParametros.tsx", import.meta.url), "utf8");
  assert.ok(pagina.indexOf("<ChecklistVeiculoLista secao />") < pagina.indexOf("<AssociarChecklistVeiculo secao />"));
  const tela = readFileSync(new URL("../src/components/parametros/AssociarChecklistVeiculo.tsx", import.meta.url), "utf8");
  assert.match(tela, /htmlFor="assoc-periodicidade">Periodicidade/); // dec 137: o campo Tipo virou Periodicidade, com Avulso
  assert.match(tela, /const AVULSO = "Avulso"/);
});

// ---------- Telas de cadastro por cima da janela Associar (decisão 120) ----------
test("a janela Associar abre itens, veículos e empregados por cima, ao lado do diálogo e sem perder o preenchimento (dec 120)", () => {
  const lerSrc = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");
  const tela = lerSrc("components/parametros/AssociarChecklistVeiculo.tsx");
  assert.match(tela, /<DialogCadastroVeiculos aberto=\{veiculosAberto\}/);
  assert.match(tela, /<DialogCadastroEmpregados aberto=\{empregadosAberto\}/);
  // os três ficam depois do fechamento do diálogo da associação: nunca dentro dele
  const fimDialogo = tela.indexOf("</Dialog>");
  assert.ok(fimDialogo > 0 && tela.indexOf("<DialogCadastroVeiculos") > fimDialogo);
  assert.ok(tela.indexOf("<DialogCadastroEmpregados") > fimDialogo);
  for (const rotulo of ["Cadastrar veículo", "Cadastrar empregado"]) assert.match(tela, new RegExp(rotulo));
  assert.match(tela, /canWrite/);
  assert.match(tela, /invalidateQueries\(\{ queryKey: \["veiculos-checklist-assoc"\]/);
  assert.match(tela, /invalidateQueries\(\{ queryKey: \["empregados-checklist-assoc"\]/);
  assert.match(lerSrc("components/modules/DialogCadastroEmpregados.tsx"), /<EmpregadosCadastroModulo direto /);
  assert.match(lerSrc("routes/_authenticated/empregados.tsx"), /component: EmpregadosCadastroModulo/);
});

test("a janela Associar tem só Veículo, Responsável e Periodicidade (com Avulso); periódico é obrigatório e avulso não (dec 136 e 137)", () => {
  const tela = readFileSync(new URL("../src/components/parametros/AssociarChecklistVeiculo.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(tela, /assoc-obrigatoriedade/);
  assert.doesNotMatch(tela, /Misto \(por grupo\)/);
  const ordem = ["assoc-veiculo", "assoc-responsavel", "assoc-periodicidade"].map((id) => tela.indexOf(`htmlFor="${id}"`));
  assert.ok(ordem.every((n) => n > 0) && ordem[0] < ordem[1] && ordem[1] < ordem[2]);
  assert.match(tela, /\["Diária", "Semanal", "Quinzenal", "Mensal", AVULSO\]/);
  assert.match(tela, /tipo: "avulso", periodicidade: "", obrigatorio: false/);
  assert.match(tela, /tipo: "periodico", periodicidade: periodicidade as PeriodicidadeAssociacao, obrigatorio: true/);
  assert.match(tela, /gruposAplicaveis\(grupos, subcategoriaIdEscolhida, periodicidade === AVULSO\)/); // itens = grupos do tipo do veículo, escolhidos por checkbox (dec 148)
  for (const fora of ["Grupos de itens", "Habilitar", "resumo-habilitados", "Grupos habilitados", "Periodicidade do item"]) assert.doesNotMatch(tela, new RegExp(fora));
});

test("na janela Associar a periodicidade vem antes e vale para todos; os itens do check list são escolhidos por checkbox (dec 148)", () => {
  const tela = readFileSync(new URL("../src/components/parametros/AssociarChecklistVeiculo.tsx", import.meta.url), "utf8");
  const ordem = ["assoc-periodicidade", "Itens que compõem o check list"].map((t) => tela.indexOf(t));
  assert.ok(ordem[0] > 0 && ordem[0] < ordem[1]); // periodicidade antes da escolha dos itens
  assert.match(tela, /data-testid="associar-itens"/);
  assert.match(tela, /id=\{`assoc-grupo-\$\{g\.id\}`\}/); // um checkbox por grupo
  assert.match(tela, /id=\{`assoc-item-\$\{i\.id\}`\}/); // e um por item dentro dele (escolha item a item)
  assert.match(tela, /A periodicidade vale para todos os itens marcados/);
  assert.match(tela, /escolha, item a item/);
  assert.match(tela, /aplicaveis\.filter\(\(g\) => marcadosDoGrupo\(g\)\.length > 0\)/); // só os grupos com itens marcados viram a associação
  // a periodicidade não é por item: cada item marcado recebe a mesma
  assert.match(tela, /periodicidade: periodicidade as PeriodicidadeAssociacao, obrigatorio: true/);
});

test("os itens vêm do tipo do veículo e o avulso vale para qualquer veículo (dec 155, substitui a 153)", () => {
  const tela = readFileSync("src/components/parametros/AssociarChecklistVeiculo.tsx", "utf8");
  assert.doesNotMatch(tela, /tipoPermiteAvulso|avulsoLiberado|só veículos leves/);
  assert.match(tela, /const aplicaveis = veiculoEscolhido \? gruposAplicaveis\(grupos, subcategoriaIdEscolhida, periodicidade === AVULSO\)/); // sem esperar a periodicidade
  assert.match(tela, /Escolha o veículo para ver os itens\./);
  const modulo = readFileSync("src/components/modules/ChecklistVeiculoModulo.tsx", "utf8");
  assert.doesNotMatch(modulo, /tipoPermiteAvulso/);
});

test("Clonar, Editar e Excluir ficam só no cabeçalho de cada check list, não nas linhas dos itens (dec 156)", () => {
  const tela = readFileSync("src/components/parametros/AssociarChecklistVeiculo.tsx", "utf8");
  assert.equal((tela.match(/<AcoesLinha/g) ?? []).length, 1); // um por check list (veículo)
  const cabecalho = tela.indexOf("<AcoesLinha");
  const linhaDoItem = tela.indexOf("listas.map((c) =>");
  assert.ok(cabecalho < linhaDoItem); // os botões estão antes das linhas dos itens
  assert.match(tela, /Associar itens<\/Button>/);
});

test("Clonar abre com veículo, responsável, periodicidade e itens do original, e exige trocar o veículo (dec 156)", () => {
  const tela = readFileSync("src/components/parametros/AssociarChecklistVeiculo.tsx", "utf8");
  assert.match(tela, /setVeiculoId\(a \? a\.veiculoId : ""\)/);
  assert.match(tela, /setEscolhidos\(a \? daEscolhida\.flatMap/);
  assert.match(tela, /v\.id === clonandoDe/);
  assert.match(tela, /veiculoId === clonandoDe/);
  assert.match(tela, /Escolha outro veículo para o clone/);
});

test("a janela Associar tem o link Cadastrar itens de check list, aberto ao lado do formulário (dec 158)", () => {
  const tela = readFileSync("src/components/parametros/AssociarChecklistVeiculo.tsx", "utf8");
  assert.match(tela, /linkCadastro\("Cadastrar itens de check list", \(\) => setItensAberto\(true\)\)/);
  assert.match(tela, /<DialogItensChecklist aberto=\{itensAberto\} onAbrirMudou=\{setItensAberto\} \/>/);
  // Fica depois de fechar o diálogo da associação: o que foi preenchido continua montado.
  assert.ok(tela.indexOf("</Dialog>\n\n      {/* Ao lado") < tela.indexOf("<DialogItensChecklist"));
});

test("Editar ou Clonar um check list antigo com mais de uma periodicidade avisa e mostra só a escolhida (revisão #204)", () => {
  const tela = readFileSync("src/components/parametros/AssociarChecklistVeiculo.tsx", "utf8");
  assert.match(tela, /daEscolhida\.length < daAssociacao\.length/);
  assert.match(tela, /tinha mais de uma periodicidade/);
  assert.match(tela, /setEscolhidos\(a \? daEscolhida\.flatMap/);
});
