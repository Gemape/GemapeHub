import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { DIAS_PARA_VENCER, ocorrenciaVencida, resumoOcorrenciasDoVeiculo, textoOcorrenciasDaFrota } from "../src/lib/frota-ocorrencias.ts";
import { montarFrotaHtml } from "../src/lib/frota-relatorio-html.ts";

const ler = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");

test("ocorrência vence quando continua aberta depois do prazo, e a encerrada nunca vence", () => {
  assert.equal(DIAS_PARA_VENCER, 7);
  assert.equal(ocorrenciaVencida({ ocorridoEm: "2026-10-01T10:00", status: "Aberta" }, "2026-10-08"), false); // 7 dias: ainda no prazo
  assert.equal(ocorrenciaVencida({ ocorridoEm: "2026-10-01T10:00", status: "Aberta" }, "2026-10-09"), true);
  assert.equal(ocorrenciaVencida({ ocorridoEm: "2026-10-01T10:00", status: "Em tratativa" }, "2026-10-20"), true);
  assert.equal(ocorrenciaVencida({ ocorridoEm: "2026-10-01T10:00", status: "Encerrada" }, "2026-10-20"), false);
});

test("o resumo da frota conta só as ocorrências do veículo que não foram encerradas", () => {
  const lista = [
    { veiculoId: "a", ocorridoEm: "2026-10-01T08:00", status: "Aberta" },
    { veiculoId: "a", ocorridoEm: "2026-10-18T08:00", status: "Em tratativa" },
    { veiculoId: "a", ocorridoEm: "2026-09-01T08:00", status: "Encerrada" },
    { veiculoId: "b", ocorridoEm: "2026-10-01T08:00", status: "Aberta" },
  ];
  assert.deepEqual(resumoOcorrenciasDoVeiculo(lista, "a", "2026-10-20"), { abertas: 2, vencidas: 1 });
  assert.equal(textoOcorrenciasDaFrota({ abertas: 2, vencidas: 1 }), "1 vencida(s)");
  assert.equal(textoOcorrenciasDaFrota({ abertas: 2, vencidas: 0 }), "2 em aberto");
  assert.equal(textoOcorrenciasDaFrota({ abertas: 0, vencidas: 0 }), "Sem ocorrências abertas");
});

test("o relatório e a tela da Frota têm a coluna Ocorrências", () => {
  const html = montarFrotaHtml({ empresa: "GEMAPE", geradoEm: "2026-10-07T13:00:00Z", busca: "", linhas: [{ veiculo: "A", responsavel: "", situacao: "Ativo", km: 1, vencidas: 0, ocorrenciasAbertas: 2, ocorrenciasVencidas: 1 }] });
  assert.ok(html.includes("<th>Ocorrências</th>"));
  assert.ok(html.includes("1 vencida(s)"));
  assert.match(ler("components/modules/FrotaModulo.tsx"), /<TableHead>Ocorrências<\/TableHead>/);
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
