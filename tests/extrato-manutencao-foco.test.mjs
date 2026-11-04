import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const le = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");

test("na Manutenção, clicar no veículo abre o extrato só com as informações de manutenção", () => {
  const m = le("components/modules/ManutencaoVeiculoModulo.tsx");
  assert.match(m, /<ExtratoVeiculo veiculo=\{veiculos\.find[^\n]*foco="manutencao"/);
  const e = le("components/modules/ExtratoVeiculo.tsx");
  assert.match(e, /export type FocoExtrato = "manutencao";/);
  // Só a seção Manutenções aparece; Abastecimentos, Ocorrências e Check lists ficam de fora.
  assert.match(e, /foco === "manutencao" \? SECOES_DO_EXTRATO\.filter\(\(s\) => s\.titulo === "Manutenções"\) : SECOES_DO_EXTRATO/);
  assert.match(e, /\{secoesVisiveis\.map\(\(secaoDoExtrato\) => \(/);
  // O resumo perde a média de consumo; o título e o PDF dizem Manutenção do veículo e só levam as tabelas de manutenção.
  assert.match(e, /foco === "manutencao" \? \[\] : \[\["Média de consumo"/);
  assert.match(e, /titulo: foco === "manutencao" \? "Manutenção do veículo" : "Extrato do veículo"/);
  assert.match(e, /foco === "manutencao" && veiculo \? gerarPdf\(veiculo, TABELAS_DE_MANUTENCAO\)/);
  assert.match(e, /const TABELAS_DE_MANUTENCAO = \[0, 1, 2\];/);
});

test("as outras telas seguem abrindo o extrato completo", () => {
  for (const f of ["FrotaModulo.tsx", "OcorrenciasVeiculoModulo.tsx", "AbastecimentoVeiculoModulo.tsx"]) {
    assert.doesNotMatch(le(`components/modules/${f}`), /foco="manutencao"/, f);
  }
});
