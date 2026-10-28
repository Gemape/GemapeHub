import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { ocorrenciaProxima, ocorrenciaVencida, resumoOcorrenciasDoVeiculo, textoOcorrenciasDaFrota } from "../src/lib/frota-ocorrencias.ts";
import { PRAZOS_OCORRENCIAS_PADRAO, lerPrazosOcorrencias, prazoOcorrenciaValido, salvarPrazosOcorrencias } from "../src/lib/prazo-ocorrencias.ts";
import { montarFrotaHtml } from "../src/lib/frota-relatorio-html.ts";

const ler = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");

const PRAZOS = { iniciar: 2, finalizar: 5 };

test("a ocorrência aberta vence passados os dias de iniciar a tratativa; a em tratativa, os de finalizar contados do início dela; a encerrada nunca vence", () => {
  const aberta = { ocorridoEm: "2026-10-01T10:00", status: "Aberta" };
  assert.equal(ocorrenciaVencida(aberta, "2026-10-03", PRAZOS), false); // 2 dias: ainda no prazo
  assert.equal(ocorrenciaVencida(aberta, "2026-10-04", PRAZOS), true);
  const emTratativa = { ocorridoEm: "2026-10-01T10:00", status: "Em tratativa", tratativa: { registradaEm: "2026-10-10T15:00:00Z" } };
  assert.equal(ocorrenciaVencida(emTratativa, "2026-10-15", PRAZOS), false); // 5 dias depois de a tratativa começar
  assert.equal(ocorrenciaVencida(emTratativa, "2026-10-16", PRAZOS), true);
  assert.equal(ocorrenciaVencida({ ocorridoEm: "2026-10-01T10:00", status: "Encerrada" }, "2026-10-20", PRAZOS), false);
  // Prazos maiores adiam o vencimento: o que vence é o que está nos Parâmetros.
  assert.equal(ocorrenciaVencida(aberta, "2026-10-09", { iniciar: 10, finalizar: 5 }), false);
  assert.equal(ocorrenciaProxima(aberta, "2026-10-10", { iniciar: 10, finalizar: 5 }), true);
  assert.equal(ocorrenciaProxima(aberta, "2026-10-03", { iniciar: 10, finalizar: 5 }), false);
});

test("os prazos das ocorrências vêm dos Parâmetros: padrão, validação e gravação", () => {
  const memoria = () => { const d = new Map(); return { getItem: (c) => d.get(c) ?? null, setItem: (c, v) => d.set(c, v) }; };
  const s = memoria();
  assert.deepEqual(lerPrazosOcorrencias(s), PRAZOS_OCORRENCIAS_PADRAO);
  salvarPrazosOcorrencias({ iniciar: 0, finalizar: 12 }, s);
  assert.deepEqual(lerPrazosOcorrencias(s), { iniciar: 0, finalizar: 12 });
  assert.throws(() => salvarPrazosOcorrencias({ iniciar: -1, finalizar: 3 }, s), /inteiros de dias/);
  assert.throws(() => salvarPrazosOcorrencias({ iniciar: 2, finalizar: 1.5 }, s), /inteiros de dias/);
  assert.equal(prazoOcorrenciaValido(366), false);
  s.setItem("gemape-demo-ocorrencias-veiculo-prazos", "{ lixo");
  assert.deepEqual(lerPrazosOcorrencias(s), PRAZOS_OCORRENCIAS_PADRAO, "valor ilegível volta ao padrão");
});

test("o cartão Prazos das ocorrências está em Parâmetros Específicos de Veículos", () => {
  const rota = ler("routes/_authenticated/cadastros/gerais/categorias.tsx");
  assert.match(rota, /categoria\.id === "cat-veiculos" && <PrazosOcorrenciasVeiculo \/>/);
  const cartao = ler("components/parametros/PrazosOcorrenciasVeiculo.tsx");
  for (const t of ["Nº de dias para iniciar a tratativa", "Nº de dias para finalizar a tratativa", "Salvar prazos"]) assert.ok(cartao.includes(t), t);
});

test("o resumo da frota conta só as ocorrências do veículo que não foram encerradas", () => {
  const lista = [
    { veiculoId: "a", ocorridoEm: "2026-10-01T08:00", status: "Aberta" },
    { veiculoId: "a", ocorridoEm: "2026-10-18T08:00", status: "Em tratativa" },
    { veiculoId: "a", ocorridoEm: "2026-09-01T08:00", status: "Encerrada" },
    { veiculoId: "b", ocorridoEm: "2026-10-01T08:00", status: "Aberta" },
  ];
  // Aberta há 19 dias (vencida) e em tratativa sem data de início, que conta do dia da ocorrência (2026-10-18, 2 dias: ainda dentro do prazo de iniciar).
  assert.deepEqual(resumoOcorrenciasDoVeiculo(lista, "a", "2026-10-20", PRAZOS), { abertas: 2, vencidas: 1 });
  assert.equal(textoOcorrenciasDaFrota({ abertas: 2, vencidas: 1 }), "1 vencida(s)");
  assert.equal(textoOcorrenciasDaFrota({ abertas: 2, vencidas: 0 }), "2 em aberto");
  assert.equal(textoOcorrenciasDaFrota({ abertas: 0, vencidas: 0 }), "Sem ocorrências abertas");
});

test("o relatório e a tela da Frota têm a coluna Ocorrências", () => {
  const html = montarFrotaHtml({ empresa: "GEMAPE", geradoEm: "2026-10-07T13:00:00Z", busca: "", linhas: [{ veiculo: "A", responsavel: "", situacao: "Ativo", km: 1, preventivas: null, ocorrencias: { situacao: "vencida", quantidade: 1 }, checklist: null }] });
  assert.ok(html.includes("<th>Ocorrências</th>"));
  assert.ok(html.includes("Vencida (1)"));
  assert.match(ler("components/modules/FrotaModulo.tsx"), /<TableHead className="w-52">Ocorrências<\/TableHead>/);
});

test("o extrato do veículo tem período, atalhos para sugeridas, realizadas e ocorrências, e bloqueia período invertido", () => {
  const extrato = ler("components/modules/ExtratoVeiculo.tsx");
  for (const t of ["Data início", "Data fim", "Manutenções sugeridas", "Manutenções realizadas", "Extrato completo"]) assert.ok(extrato.includes(t), t);
  assert.match(extrato, /gerar\("ocorrencias"\)/);
  assert.match(extrato, /const periodoInvalido = !!inicio && !!fim && inicio > fim;/);
  assert.match(extrato, /noPeriodo\(/);
});

test("a lista de Manutenção de veículos filtra por data início e data fim e bloqueia período invertido", () => {
  const tela = ler("components/modules/ManutencaoVeiculoModulo.tsx");
  for (const t of ["Data início", "Data fim", "Limpar período"]) assert.ok(tela.includes(t), t);
  assert.match(tela, /const periodoInvalido = !!inicio && !!fim && inicio > fim;/);
  assert.match(tela, /\(!inicio \|\| m\.data >= inicio\) && \(!fim \|\| m\.data <= fim\)/);
});
