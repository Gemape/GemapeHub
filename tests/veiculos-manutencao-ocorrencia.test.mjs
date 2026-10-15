import test from "node:test";
import assert from "node:assert/strict";

import {
  lerParametros,
  adicionarAcaoManutencaoVeiculo,
  itensCriadosAcoesManutencao,
  excluirItensCriadosAcoesManutencao,
  editarAcaoManutencaoVeiculo,
  removerAcaoManutencaoVeiculo,
  adicionarTipoOcorrenciaVeiculo,
  editarTipoOcorrenciaVeiculo,
  removerTipoOcorrenciaVeiculo,
  cadastrarPadraoVeiculos,
  situacaoPadraoAcoesManutencaoVeiculo,
  restaurarPadroesAcoesManutencaoVeiculo,
  situacaoPadraoAcoesComFilhos,
  restaurarAcoesManutencaoEscolhidas,
} from "../src/lib/parametros-base.ts";
import { ACOES_MANUTENCAO_PADRAO, TIPOS_OCORRENCIA_VEICULO_PADRAO } from "../src/lib/veiculos-padrao.ts";

const storage = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};

test("os padrões trazem os 7 grupos de manutenção com subitens e os 8 tipos de ocorrência com descrição", () => {
  assert.deepEqual(ACOES_MANUTENCAO_PADRAO.map((a) => a.nome), [
    "Revisão do Sistema de Lubrificação e Filtros",
    "Revisão do Sistema de Transmissão e Fluídos",
    "Manutenção do Sistema de Freios",
    "Manutenção de Pneus e Alinhamento",
    "Revisão de Suspensão e Direção",
    "Revisão do Sistema Elétrico e Iluminação",
    "Inspeção de Segurança e Correias",
  ]);
  assert.deepEqual(ACOES_MANUTENCAO_PADRAO.map((a) => a.subitens.length), [6, 5, 8, 7, 7, 6, 6]);
  assert.deepEqual(TIPOS_OCORRENCIA_VEICULO_PADRAO.map((t) => t.nome), [
    "Furto", "Roubo", "Avaria em manobra", "Avaria por fator externo", "Avaria interna", "Infração de trânsito", "Sinistro com vítima", "Colisão em trânsito",
  ]);
  assert.ok(TIPOS_OCORRENCIA_VEICULO_PADRAO.every((t) => t.descricao.length > 10));
});

test("ações de manutenção: pai com subitens, editar mantém o id de quem já existe, sem repetir nomes", () => {
  const s = storage();
  assert.deepEqual(lerParametros(s).acoesManutencaoVeiculo, []);
  const a = adicionarAcaoManutencaoVeiculo("Manutenção de pneus", ["Calibragem", " ", "Rodízio de pneus"], s);
  assert.deepEqual(a.subitens.map((i) => i.nome), ["Calibragem", "Rodízio de pneus", "Outros"]);
  assert.throws(() => adicionarAcaoManutencaoVeiculo("manutenção de PNEUS", [], s), /já existe/i);
  assert.throws(() => adicionarAcaoManutencaoVeiculo("Outra", ["Molas", "molas"], s), /subitem repetido/i);
  const idCalibragem = a.subitens[0].id;
  editarAcaoManutencaoVeiculo(a.id, "Pneus", ["Calibragem", "Alinhamento 3D"], s);
  const lido = lerParametros(s).acoesManutencaoVeiculo[0];
  assert.equal(lido.nome, "Pneus");
  assert.deepEqual(lido.subitens.map((i) => i.nome), ["Calibragem", "Alinhamento 3D", "Outros"]);
  assert.equal(lido.subitens[0].id, idCalibragem);
  assert.throws(() => editarAcaoManutencaoVeiculo("nao-existe", "x", [], s), /não encontrad/i);
  removerAcaoManutencaoVeiculo(a.id, s);
  assert.deepEqual(lerParametros(s).acoesManutencaoVeiculo, []);
});

test("tipos de ocorrência: nome obrigatório e único, descrição editável, exclusão", () => {
  const s = storage();
  assert.throws(() => adicionarTipoOcorrenciaVeiculo("  ", "x", s), /nome/i);
  const t = adicionarTipoOcorrenciaVeiculo("Furto", "  Subtração do veículo   sem violência ", s);
  assert.equal(t.descricao, "Subtração do veículo sem violência");
  assert.throws(() => adicionarTipoOcorrenciaVeiculo("furto", "outra", s), /já existe/i);
  editarTipoOcorrenciaVeiculo(t.id, "Furto de veículo", "Subtração sem violência", s);
  const lido = lerParametros(s).tiposOcorrenciaVeiculo[0];
  assert.equal(lido.nome, "Furto de veículo");
  assert.equal(lido.descricao, "Subtração sem violência");
  assert.throws(() => editarTipoOcorrenciaVeiculo("nao-existe", "x", "y", s), /não encontrad/i);
  removerTipoOcorrenciaVeiculo(t.id, s);
  assert.deepEqual(lerParametros(s).tiposOcorrenciaVeiculo, []);
});

test("cadastrar padrão inclui o que falta e não repete nem altera o que já existe", () => {
  const s = storage();
  adicionarAcaoManutencaoVeiculo("manutenção do sistema de freios", ["Meu subitem"], s);
  adicionarTipoOcorrenciaVeiculo("Furto", "Minha descrição", s);
  const r = cadastrarPadraoVeiculos(s);
  assert.deepEqual(r, { acoes: ACOES_MANUTENCAO_PADRAO.length - 1, tipos: TIPOS_OCORRENCIA_VEICULO_PADRAO.length - 1 });
  const d = lerParametros(s);
  assert.equal(d.acoesManutencaoVeiculo.length, ACOES_MANUTENCAO_PADRAO.length);
  assert.deepEqual(d.acoesManutencaoVeiculo.find((a) => /freios/i.test(a.nome)).subitens.map((i) => i.nome), ["Meu subitem", "Outros"]);
  assert.equal(d.tiposOcorrenciaVeiculo.find((t) => t.nome === "Furto").descricao, "Minha descrição");
  assert.deepEqual(cadastrarPadraoVeiculos(s), { acoes: 0, tipos: 0 });
});

test("ações salvas sem subitens (versão anterior) passam a ter só o item Outros (dec 163)", () => {
  const s = storage();
  s.setItem("gemape-demo-parametros-base", JSON.stringify({ acoesManutencaoVeiculo: [{ id: "a1", nome: "Troca de pneu" }] }));
  assert.deepEqual(lerParametros(s).acoesManutencaoVeiculo[0].subitens, [{ id: "outros-a1", nome: "Outros" }]);
  // O id é fixo: a mesma leitura repetida devolve o mesmo item.
  assert.deepEqual(lerParametros(s).acoesManutencaoVeiculo[0].subitens, lerParametros(s).acoesManutencaoVeiculo[0].subitens);
});

test("dec 163: todo grupo de ações tem o item Outros, também os já cadastrados, sem duplicar nem sair ao editar", () => {
  const s = storage();
  s.setItem("gemape-demo-parametros-base", JSON.stringify({ acoesManutencaoVeiculo: [
    { id: "a1", nome: "Freios", subitens: [{ id: "s1", nome: "Pastilha" }] },
    { id: "a2", nome: "Motor", subitens: [{ id: "s2", nome: "Óleo" }, { id: "s3", nome: "outros" }] },
  ] }));
  const [freios, motor] = lerParametros(s).acoesManutencaoVeiculo;
  assert.deepEqual(freios.subitens.map((i) => i.nome), ["Pastilha", "Outros"]);
  assert.deepEqual(motor.subitens.map((i) => i.nome), ["Óleo", "outros"]);
  // Editar sem listar o Outros não o tira: volta ao fim, com o mesmo id.
  editarAcaoManutencaoVeiculo("a2", "Motor", ["Óleo"], s);
  assert.deepEqual(lerParametros(s).acoesManutencaoVeiculo[1].subitens.map((i) => i.nome), ["Óleo", "outros"]);
  // Os padrões iniciais já trazem o Outros no fim de cada grupo.
  assert.ok(ACOES_MANUTENCAO_PADRAO.every((a) => a.subitens.at(-1) === "Outros"));
});

test("dados antigos sem as novas listas continuam legíveis", () => {
  const s = storage();
  s.setItem("gemape-demo-parametros-base", JSON.stringify({ marcasVeiculo: [{ id: "m1", nome: "Fiat" }] }));
  const d = lerParametros(s);
  assert.deepEqual(d.acoesManutencaoVeiculo, []);
  assert.deepEqual(d.tiposOcorrenciaVeiculo, []);
  assert.equal(d.marcasVeiculo[0].nome, "Fiat");
});

import { readFileSync } from "node:fs";

test("Parâmetros > Veículos é um grupo com cadastro, ações de manutenção e tipos de ocorrência", () => {
  const menu = readFileSync("src/lib/menu-parametros.ts", "utf8");
  const sidebar = readFileSync("src/components/layout/AppSidebar.tsx", "utf8");
  for (const url of ["/cadastros/veiculos", "/cadastros/veiculos-manutencao", "/cadastros/veiculos-tipos-ocorrencia"]) {
    assert.ok(menu.includes(`url: "${url}"`), url);
  }
  assert.match(sidebar, /<MenuVeiculos pathname=\{pathname\} \/>/);
  assert.doesNotMatch(sidebar, /titulo: "Veículos", url: "\/cadastros\/veiculos"/);
});

test("as listas usam Clonar/Editar/Excluir, Cadastrar padrão, trava de duplo clique e não tocam o Supabase", () => {
  const tela = readFileSync("src/components/parametros/VeiculosListasParametros.tsx", "utf8");
  assert.match(tela, /<AcoesLinha/);
  assert.match(tela, /onClonar=/);
  assert.match(tela, /Cadastrar padrão/);
  assert.match(tela, /salvando\.current/);
  assert.doesNotMatch(tela, /supabase/i);
});

test("registrar manutenção do veículo: escolhe o pai, marca os filhos, só no modo demonstração", () => {
  const tela = readFileSync("src/components/modules/MovimentacoesModulo.tsx", "utf8");
  const seletor = readFileSync("src/components/modules/SeletorAcaoManutencao.tsx", "utf8");
  assert.match(tela, /ehVeiculo && MODO_DEMO/);
  assert.match(tela, /Marque ao menos um subitem/);
  assert.match(tela, /acaoManut\.subitens\.length > 0/);
  assert.match(tela, /subitens_manutencao/);
  assert.match(seletor, /<Checkbox/);
  assert.match(seletor, /acao\.subitens\.map/);
});

test("restaurar padrão inicial das ações: situação, só os marcados, id mantido, excluída recadastrada (decisão 111)", () => {
  const s = storage();
  assert.equal(situacaoPadraoAcoesManutencaoVeiculo(s).length, ACOES_MANUTENCAO_PADRAO.length);
  assert.ok(situacaoPadraoAcoesManutencaoVeiculo(s).every((a) => a.situacao === "ausente"));
  cadastrarPadraoVeiculos(s);
  assert.ok(situacaoPadraoAcoesManutencaoVeiculo(s).every((a) => a.situacao === "igual"));
  const [a, b, c] = lerParametros(s).acoesManutencaoVeiculo;
  editarAcaoManutencaoVeiculo(a.id, a.nome, ["Só um subitem", a.subitens[0].nome], s);
  editarAcaoManutencaoVeiculo(c.id, c.nome, ["Outro"], s);
  removerAcaoManutencaoVeiculo(b.id, s);
  const sit = Object.fromEntries(situacaoPadraoAcoesManutencaoVeiculo(s).map((x) => [x.nome, x.situacao]));
  assert.equal(sit[a.nome], "alterado");
  assert.equal(sit[b.nome], "ausente");
  const r = restaurarPadroesAcoesManutencaoVeiculo([a.nome.toLowerCase(), b.nome], s);
  assert.deepEqual(r, { restaurados: 1, criados: 1 });
  const lido = lerParametros(s).acoesManutencaoVeiculo;
  const depoisA = lido.find((x) => x.id === a.id);
  assert.deepEqual(depoisA.subitens.map((i) => i.nome), a.subitens.map((i) => i.nome));
  assert.equal(depoisA.subitens[0].id, a.subitens[0].id);
  assert.ok(lido.some((x) => x.nome === b.nome));
  assert.deepEqual(lido.find((x) => x.id === c.id).subitens.map((i) => i.nome), ["Outro", "Outros"]);
});

test("restaurar padrão inicial das ações é tudo ou nada e só aceita ações do padrão", () => {
  const s = storage();
  cadastrarPadraoVeiculos(s);
  const meu = adicionarAcaoManutencaoVeiculo("Minha ação", ["Item"], s);
  const [a] = lerParametros(s).acoesManutencaoVeiculo;
  editarAcaoManutencaoVeiculo(a.id, a.nome, ["Só um"], s);
  assert.throws(() => restaurarPadroesAcoesManutencaoVeiculo([], s), /ao menos um/i);
  assert.throws(() => restaurarPadroesAcoesManutencaoVeiculo([a.nome, "Minha ação"], s), /não faz parte do padrão/i);
  const lido = lerParametros(s).acoesManutencaoVeiculo;
  assert.deepEqual(lido.find((x) => x.id === a.id).subitens.map((i) => i.nome), ["Só um", "Outros"]);
  assert.ok(lido.some((x) => x.id === meu.id));
});

test("a lista Ações de manutenção tem o botão Restaurar configurações iniciais (decisões 111 e 141)", () => {
  const lista = readFileSync(new URL("../src/components/parametros/VeiculosListasParametros.tsx", import.meta.url), "utf8");
  assert.match(lista, /acaoExtra=\{\(cadastrar\) => <RestaurarPadraoAcoes aoCadastrar=\{cadastrar\} \/>\}/);
  assert.match(lista, /Restaurar configurações iniciais\n\s*<\/Button>/);
  assert.match(lista, /restaurarAcoesManutencaoEscolhidas\(/);
  assert.match(lista, /if \(!confirm\(aviso\)\) return;/);
});

test("Ações de manutenção e Plano de manutenções ficam numa só página, Manutenção (decisão 112)", () => {
  const menu = readFileSync("src/lib/menu-parametros.ts", "utf8");
  assert.match(menu, /titulo: "Manutenção", url: "\/cadastros\/veiculos-manutencao"/);
  assert.doesNotMatch(menu, /url: "\/cadastros\/veiculos-(acoes|plano)-manutencao"/);
  const pagina = readFileSync("src/components/parametros/ManutencaoParametros.tsx", "utf8");
  assert.match(pagina, /<h1 className="text-2xl font-bold">Manutenção<\/h1>/);
  assert.match(pagina, /<AcoesManutencaoVeiculoLista secao \/>/);
  assert.match(pagina, /<PlanoManutencaoVeiculo secao \/>/);
  for (const antiga of ["veiculos-acoes-manutencao", "veiculos-plano-manutencao"]) {
    const rota = readFileSync(`src/routes/_authenticated/cadastros/${antiga}.tsx`, "utf8");
    assert.match(rota, /redirect\(\{ to: "\/cadastros\/veiculos-manutencao" \}\)/);
  }
  const nova = readFileSync("src/routes/_authenticated/cadastros/veiculos-manutencao.tsx", "utf8");
  assert.match(nova, /component: ManutencaoParametros/);
  // Em seção, as duas listas trocam o h1 por h2 e o caminho fica só no cabeçalho da página.
  const lista = readFileSync("src/components/parametros/VeiculosListasParametros.tsx", "utf8");
  assert.match(lista, /\{!secao && <p className="text-eyebrow">/);
  const plano = readFileSync("src/components/parametros/PlanoManutencaoVeiculo.tsx", "utf8");
  assert.match(plano, /\{!secao && <p className="text-eyebrow">/);
});

test("Ações de manutenção não têm o botão Cadastrar padrão; as outras listas de Veículos mantêm (dec 140)", () => {
  const tela = readFileSync("src/components/parametros/VeiculosListasParametros.tsx", "utf8");
  const acoes = tela.slice(tela.indexOf("titulo=\"Ações de manutenção\""), tela.indexOf("export function TiposOcorrenciaVeiculoLista"));
  assert.doesNotMatch(acoes, /onPadrao/);
  assert.match(acoes, /RestaurarPadraoAcoes/);
  assert.match(tela, /\{onPadrao && \(/); // o botão só aparece quando a lista pede
  const tipos = tela.slice(tela.indexOf("export function TiposOcorrenciaVeiculoLista"), tela.indexOf("const ROTULO_SITUACAO"));
  assert.match(tipos, /onPadrao=/);
});

test("restaurar configurações iniciais escolhendo pais e filhos: só os filhos marcados voltam, o resto fica (dec 142)", () => {
  const s = storage();
  cadastrarPadraoVeiculos(s);
  const sit0 = situacaoPadraoAcoesComFilhos(s);
  assert.equal(sit0.length, 7);
  assert.ok(sit0.every((p) => p.situacao === "igual" && p.filhos.every((f) => f.existe)));
  const [a, b, c] = lerParametros(s).acoesManutencaoVeiculo;
  // A tem só 1 filho do padrão e um do responsável; B foi excluída; C ganhou um filho do responsável.
  editarAcaoManutencaoVeiculo(a.id, a.nome, [a.subitens[0].nome, "Filho meu"], s);
  removerAcaoManutencaoVeiculo(b.id, s);
  editarAcaoManutencaoVeiculo(c.id, c.nome, [...c.subitens.map((i) => i.nome), "Extra do responsável"], s);
  const sit = situacaoPadraoAcoesComFilhos(s);
  assert.equal(sit[0].situacao, "alterado");
  assert.deepEqual(sit[0].filhos.map((f) => f.existe), [true, false, false, false, false, true]); // o Outros nunca sai do grupo (dec 163)
  assert.equal(sit[1].situacao, "ausente");
  assert.ok(sit[1].filhos.every((f) => !f.existe));
  const padraoA = ACOES_MANUTENCAO_PADRAO[0].subitens;
  const padraoB = ACOES_MANUTENCAO_PADRAO[1].subitens;
  const r = restaurarAcoesManutencaoEscolhidas([
    { nome: sit[0].nome, filhos: [padraoA[2]] }, // só o 3º filho de A
    { nome: sit[1].nome, filhos: [padraoB[0], padraoB[3]] }, // B de novo, só com 2 filhos
  ], s);
  assert.deepEqual(r, { restaurados: 1, criados: 1, filhos: 3 });
  const lido = lerParametros(s).acoesManutencaoVeiculo;
  const depoisA = lido.find((x) => x.id === a.id);
  assert.equal(depoisA.nome, sit[0].nome); // pai volta ao nome inicial
  assert.deepEqual(depoisA.subitens.map((i) => i.nome.toLowerCase()), [padraoA[0], padraoA[2], "Outros", "Filho meu"].map((i) => i.toLowerCase())); // 1º (já existia), 3º (marcado) e o do responsável; 2º, 4º e 5º não foram marcados
  assert.equal(depoisA.subitens[0].id, a.subitens[0].id);
  const novoB = lido.find((x) => x.nome === sit[1].nome);
  assert.equal(novoB.subitens.length, 3); // 2 marcados e o Outros, que todo grupo tem (dec 163)
  assert.ok(lido.find((x) => x.id === c.id).subitens.some((i) => i.nome === "Extra do responsável")); // pai não marcado não muda
});

test("restaurar com pais e filhos é tudo ou nada e só aceita itens do padrão (dec 142)", () => {
  const s = storage();
  cadastrarPadraoVeiculos(s);
  const antes = JSON.stringify(lerParametros(s).acoesManutencaoVeiculo);
  const pai = ACOES_MANUTENCAO_PADRAO[0].nome;
  assert.throws(() => restaurarAcoesManutencaoEscolhidas([], s), /ao menos uma/i);
  assert.throws(() => restaurarAcoesManutencaoEscolhidas([{ nome: "Minha ação", filhos: [] }], s), /não faz parte do padrão/i);
  assert.throws(() => restaurarAcoesManutencaoEscolhidas([{ nome: pai, filhos: [ACOES_MANUTENCAO_PADRAO[0].subitens[0]] }, { nome: pai, filhos: ["Inventado"] }], s), /não faz parte do padrão/i);
  assert.equal(JSON.stringify(lerParametros(s).acoesManutencaoVeiculo), antes);
});

test("a janela de restaurar das ações tem checkbox por pai e por filho, marcar filho marca o pai (dec 142)", () => {
  const lista = readFileSync("src/components/parametros/VeiculosListasParametros.tsx", "utf8");
  const trecho = lista.slice(lista.indexOf("function RestaurarPadraoAcoes"), lista.indexOf("export function ChecklistVeiculoLista"));
  assert.match(trecho, /restaurar-pai-\$\{n\}/);
  assert.match(trecho, /restaurar-filho-\$\{n\}-\$\{m\}/);
  assert.match(trecho, /situacaoPadraoAcoesComFilhos\(\)/);
  assert.match(trecho, /Marcar um filho marca também o pai/);
  assert.match(trecho, /disabled=\{\(totalPais === 0 && totalCriados === 0\) \|\| travado\}/);
});

test("a lista de restaurar mostra o que o responsável criou: ações novas e subitens extras do padrão (dec 144)", () => {
  const s = storage();
  cadastrarPadraoVeiculos(s);
  assert.deepEqual(itensCriadosAcoesManutencao(s), []); // só o padrão: nada criado
  const [a] = lerParametros(s).acoesManutencaoVeiculo;
  editarAcaoManutencaoVeiculo(a.id, a.nome, [...a.subitens.map((i) => i.nome), "Filho meu"], s);
  adicionarAcaoManutencaoVeiculo("Minha ação", ["Sub 1", "Sub 2"], s);
  const criados = itensCriadosAcoesManutencao(s);
  assert.equal(criados.length, 2);
  assert.deepEqual([criados[0].doPadrao, criados[0].filhos.map((f) => f.nome)], [true, ["Filho meu"]]);
  assert.deepEqual([criados[1].nome, criados[1].doPadrao, criados[1].filhos.map((f) => f.nome)], ["Minha ação", false, ["Sub 1", "Sub 2"]]);
  const antes = JSON.stringify(lerParametros(s));
  assert.equal(JSON.stringify(lerParametros(s)), antes); // só lista, não altera
  const tela = readFileSync("src/components/parametros/VeiculosListasParametros.tsx", "utf8");
  assert.match(tela, /Criados por você/);
  assert.match(tela, /itensCriadosAcoesManutencao\(\)/);
});

test("salvar em Ações de manutenção pergunta Sim ou Não antes de gravar (dec 145)", () => {
  const alerta = readFileSync("src/components/parametros/AlertaPainelManutencao.tsx", "utf8");
  assert.match(alerta, /As alterações feitas modificarão o painel de manutenções na rotina de parâmetros\. Definitivamente\. Tem certeza que deseja fazer isso\?/);
  assert.match(alerta, /<AlertDialogCancel>Não<\/AlertDialogCancel>/);
  assert.match(alerta, /<AlertDialogAction onClick=\{onSim\}>Sim<\/AlertDialogAction>/);
  const tela = readFileSync("src/components/parametros/VeiculosListasParametros.tsx", "utf8");
  assert.match(tela, /acaoExtra=\{\(cadastrar\) => <RestaurarPadraoAcoes aoCadastrar=\{cadastrar\} \/>\}\s*alertaPainel/); // cadastrar/editar ação
  const restaurar = tela.slice(tela.indexOf("function RestaurarPadraoAcoes"));
  assert.match(restaurar, /<AlertaPainelManutencao aberto=\{aviso !== null\}/); // restaurar configurações iniciais
  assert.doesNotMatch(restaurar.slice(restaurar.indexOf("function salvar"), restaurar.indexOf("function gravar")), /confirm\(/);
});

test("o Plano de manutenções também pergunta Sim ou Não antes de gravar, com o texto novo (dec 146)", () => {
  const plano = readFileSync("src/components/parametros/PlanoManutencaoVeiculo.tsx", "utf8");
  assert.match(plano, /<AlertaPainelManutencao/);
  const salvar = plano.slice(plano.indexOf("function salvar"), plano.indexOf("function gravar"));
  assert.match(salvar, /setConfirmando\(true\)/);
  assert.doesNotMatch(salvar, /executar\(/);
});

test("o texto de apoio da página Manutenção permite revisar o painel e avisa que não desfaz (dec 147)", () => {
  const pagina = readFileSync("src/components/parametros/ManutencaoParametros.tsx", "utf8");
  assert.match(pagina, /Permite revisar o painel de manutenções, redefinir seus itens e a organização deles\. O que for salvo não poderá ser desfeito\./);
  assert.doesNotMatch(pagina, /primeiro as ações, depois o plano/);
});

test("excluir itens criados marcados na janela de restaurar (dec 151)", () => {
  const s = storage();
  cadastrarPadraoVeiculos(s);
  const [a] = lerParametros(s).acoesManutencaoVeiculo;
  editarAcaoManutencaoVeiculo(a.id, a.nome, [...a.subitens.map((i) => i.nome), "Filho meu", "Outro meu"], s);
  adicionarAcaoManutencaoVeiculo("Minha ação", ["Sub 1", "Sub 2"], s);
  const [doPadrao, minha] = itensCriadosAcoesManutencao(s);
  assert.throws(() => excluirItensCriadosAcoesManutencao([], s), /Marque ao menos um/);
  // filho extra de ação do padrão: some só ele
  assert.deepEqual(excluirItensCriadosAcoesManutencao([doPadrao.filhos[0].id], s), { acoes: 0, subitens: 1 });
  // pai criado marcado: a ação inteira some
  assert.deepEqual(excluirItensCriadosAcoesManutencao([minha.id], s), { acoes: 1, subitens: 2 });
  // pai do padrão marcado: somem os extras, a ação e o padrão ficam
  assert.deepEqual(excluirItensCriadosAcoesManutencao([doPadrao.id], s), { acoes: 0, subitens: 1 });
  assert.deepEqual(itensCriadosAcoesManutencao(s), []);
  assert.ok(lerParametros(s).acoesManutencaoVeiculo.some((x) => x.id === a.id));
  // ids do padrão não são apagados por aqui
  assert.throws(() => excluirItensCriadosAcoesManutencao([a.id, a.subitens[0].id], s), /Marque ao menos um/);
  const tela = readFileSync("src/components/parametros/VeiculosListasParametros.tsx", "utf8");
  assert.match(tela, /excluirItensCriadosAcoesManutencao\(conferidos\)/);
  assert.match(tela, /isAdmin && <Checkbox id=\{`criado-pai-/);
});
