import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { rotuloDaSituacao, situacaoChecklistDoVeiculo, situacaoOcorrenciasDoVeiculo, situacaoPreventivas } from "../src/lib/frota-situacao.ts";

const ler = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const HOJE = "2026-10-20";

test("preventivas: vencida vence a atenção, que vence o em dia; sem plano a coluna não se aplica", () => {
  assert.deepEqual(situacaoPreventivas(["em_dia", "atencao", "vencida", "vencida"]), { situacao: "vencida", quantidade: 2 });
  assert.deepEqual(situacaoPreventivas(["em_dia", "atencao"]), { situacao: "proximo", quantidade: 1 });
  assert.deepEqual(situacaoPreventivas(["em_dia", "sem_registro"]), { situacao: "em_dia", quantidade: 0 });
  assert.equal(situacaoPreventivas([]), null);
  assert.equal(situacaoPreventivas(["sem_registro"]), null);
});

test("ocorrências: vencida passou do prazo da tratativa, vencimento próximo vence em até dois dias, e sem aberta está em dia (prazos 2 e 5)", () => {
  const prazos = { iniciar: 7, finalizar: 5 };
  const o = (veiculoId, ocorridoEm, status = "Aberta") => ({ veiculoId, ocorridoEm, status });
  assert.deepEqual(situacaoOcorrenciasDoVeiculo([o("a", "2026-10-01T10:00")], "a", HOJE, prazos), { situacao: "vencida", quantidade: 1 });
  assert.deepEqual(situacaoOcorrenciasDoVeiculo([o("a", "2026-10-14T10:00")], "a", HOJE, prazos), { situacao: "proximo", quantidade: 1 });
  assert.deepEqual(situacaoOcorrenciasDoVeiculo([o("a", "2026-10-19T10:00"), o("a", "2026-09-01T10:00", "Encerrada"), o("b", "2026-09-01T10:00")], "a", HOJE, prazos), { situacao: "em_dia", quantidade: 0 });
  assert.deepEqual(situacaoOcorrenciasDoVeiculo([], "a", HOJE, prazos), { situacao: "em_dia", quantidade: 0 });
});

test("check list: prazo recente sem o check list é vencida, prazo que acaba em até dois dias é vencimento próximo, e sem check list periódico não se aplica", () => {
  const prev = (id, inicio, fim, extra = {}) => ({ id, veiculoId: "a", veiculoRotulo: "ABC", periodicidade: "Semanal", inicio, fim, responsavelNome: "Ana", ...extra });
  assert.deepEqual(situacaoChecklistDoVeiculo([prev("1", "2026-10-12", "2026-10-18")], [], "a", HOJE), { situacao: "vencida", quantidade: 1 });
  assert.deepEqual(situacaoChecklistDoVeiculo([prev("1", "2026-10-19", "2026-10-22")], [], "a", HOJE), { situacao: "proximo", quantidade: 1 });
  assert.deepEqual(situacaoChecklistDoVeiculo([prev("1", "2026-10-19", "2026-10-30")], [], "a", HOJE), { situacao: "em_dia", quantidade: 0 });
  // O que passou há mais de 30 dias deixa de pesar, e o opcional nunca conta.
  assert.deepEqual(situacaoChecklistDoVeiculo([prev("1", "2026-08-01", "2026-08-07"), prev("2", "2026-10-12", "2026-10-18", { obrigatorio: false })], [], "a", HOJE), { situacao: "em_dia", quantidade: 0 });
  assert.equal(situacaoChecklistDoVeiculo([], [], "a", HOJE), null);
});

test("o rótulo mostra a etiqueta e quantos itens, e traço quando não se aplica", () => {
  assert.equal(rotuloDaSituacao({ situacao: "vencida", quantidade: 3 }), "Vencida (3)");
  assert.equal(rotuloDaSituacao({ situacao: "proximo", quantidade: 1 }), "Vencimento próximo (1)");
  assert.equal(rotuloDaSituacao({ situacao: "em_dia", quantidade: 0 }), "Em dia");
  assert.equal(rotuloDaSituacao(null), "—");
});

test("a Frota tem as colunas na ordem pedida, com bolinha e etiqueta, e o extrato tem os links para as rotinas", () => {
  const frota = ler("components/modules/FrotaModulo.tsx");
  const cabecalho = [...frota.matchAll(/<TableHead[^>]*>([^<]*)<\/TableHead>/g)].map((m) => m[1]);
  assert.deepEqual(cabecalho, ["Veículo", "Responsável", "Situação", "Km atual", "Média km/L", "Preventivas", "Ocorrências", "Check list"]);
  assert.match(frota, /<EtiquetaVencimento valor=\{checklistDo\(v\.id\)\}/);
  // Cada bolinha abre a informação que resume (decisão 305), sem abrir o extrato da linha.
  assert.match(frota, /aoClicar=\{\(\) => setAberto\(\{ id: v\.id, secao: "sugeridas" \}\)\}/);
  assert.match(frota, /aoClicar=\{\(\) => setAberto\(\{ id: v\.id, secao: "ocorrenciasAbertas" \}\)\}/);
  assert.match(frota, /aoClicar=\{\(\) => setAberto\(\{ id: v\.id, secao: "checklists" \}\)\}/);
  assert.match(frota, /e\.stopPropagation\(\); aoClicar\(\)/);
  assert.match(frota, /table-fixed/);
  const ext = ler("components/modules/ExtratoVeiculo.tsx");
  // A bolinha abre o extrato interativo já na tabela que ela resume, sem gerar PDF (decisão 331).
  assert.match(ext, /if \(!veiculo \|\| !secao\) return;[\s\S]*extrato-tabela-\$\{TABELA_DA_SECAO\[secao\]\}/);
  assert.match(ext, /ocorrenciasAbertas: 4, checklists: 5/);
  assert.match(ext, /!soAbertas \|\| o\.status !== "Encerrada"/);
  for (const cor of ["bg-red-500", "bg-amber-400", "bg-emerald-500"]) assert.ok(frota.includes(cor), cor);
  const extrato = ler("components/modules/ExtratoVeiculo.tsx");
  // O extrato tem quatro seções com título grande em faixa colorida e os botões de cada uma (decisão 345).
  for (const titulo of ["Manutenções", "Abastecimentos", "Ocorrências", "Check lists"]) assert.ok(extrato.includes(`titulo: "${titulo}", tabelas:`), titulo);
  assert.match(extrato, /text-xl font-bold[^"]*">\{secaoDoExtrato\.titulo\}/);
  assert.match(extrato, /bg-gradient-to-r \$\{secaoDoExtrato\.faixa\}/);
  assert.match(extrato, /setRegistrando\(true\)\}>Registrar manutenção<\/Button>/);
  assert.match(extrato, /setRegistrandoAbastecimento\(true\)\}>Registrar abastecimento<\/Button>/);
  assert.match(extrato, /search=\{\{ aba: "ocorrencias", ocorrencia: dados\.ligacoes\[`\$\{n\}:\$\{k\}`\]!\.id, voltar: veiculo\.id \}\}>Tratativa<\/Link>/, "um botão Tratativa em cada linha de ocorrência");
  assert.match(extrato, /search=\{\{ aba: "checklist", veiculo: veiculo\.id, avulso: "sim", voltar: veiculo\.id \}\}>Registrar check list avulso<\/Link>/);
  assert.match(extrato, /periodicidade: dados\.realizaveis\[k\]!, voltar: veiculo\.id \}\}>Realizar check list<\/Link>/, "cada check list periódico previsto tem o botão Realizar check list");
  assert.match(ler("components/modules/ChecklistVeiculoModulo.tsx"), /useVoltarAoExtrato\(tela !== null, voltar\)/, "ao fechar o check list, volta ao extrato (decisão 346)");
  assert.match(ler("components/modules/OcorrenciasVeiculoModulo.tsx"), /useVoltarAoExtrato\(tela !== null, voltar\)/, "ao fechar a tratativa, volta ao extrato (decisão 346)");
  assert.match(frota, /setAberto\(\{ id: extratoPedido, secao: null \}\)/, "de volta, a Frota reabre o extrato");
});

test("o abastecimento de veículos filtra por data início e fim depois de montar o histórico, bloqueia período invertido e leva o período ao PDF", () => {
  const tela = ler("components/modules/AbastecimentoVeiculoModulo.tsx");
  for (const t of ["Data início", "Data fim", "Limpar período"]) assert.ok(tela.includes(t), t);
  assert.match(tela, /const periodoInvalido = !!inicio && !!fim && inicio > fim;/);
  // O corte vem depois do histórico: o km/L de cada abastecimento não perde o anterior que ficou fora do período.
  assert.ok(tela.indexOf("historicoAbastecimentos(daEmpresa") < tela.indexOf("(!inicio || a.data >= inicio) && (!fim || a.data <= fim)"));
  assert.match(tela, /Período: \$\{inicio \? formatarData\(inicio\)/);
  assert.match(tela, /disabled=\{periodoInvalido\}>Gerar PDF/);
});
