import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const le = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");

test("na Manutenção e nas Ocorrências, clicar no veículo abre o extrato só com as informações daquele assunto", () => {
  assert.match(le("components/modules/ManutencaoVeiculoModulo.tsx"), /<ExtratoVeiculo veiculo=\{veiculos\.find[^\n]*foco="manutencao"/);
  assert.match(le("components/modules/OcorrenciasVeiculoModulo.tsx"), /<ExtratoVeiculo veiculo=\{veiculos\.find[^\n]*foco="ocorrencias"/);
  const e = le("components/modules/ExtratoVeiculo.tsx");
  assert.match(e, /export type FocoExtrato = "manutencao" \| "ocorrencias";/);
  // Só a seção do foco aparece; as outras ficam de fora.
  assert.match(e, /foco \? SECOES_DO_EXTRATO\.filter\(\(s\) => s\.titulo === FOCOS\[foco\]\.secao\) : SECOES_DO_EXTRATO/);
  assert.match(e, /\{secoesVisiveis\.map\(\(secaoDoExtrato\) => \(/);
  assert.match(e, /manutencao: \{ titulo: "Manutenção do veículo", secao: "Manutenções", tabelas: \[0, 1, 2\]/);
  assert.match(e, /ocorrencias: \{ titulo: "Ocorrências do veículo", secao: "Ocorrências", tabelas: \[4\]/);
  // Título, resumo e PDF acompanham o foco; o PDF sai direto, sem escolher seções.
  assert.match(e, /titulo: foco \? FOCOS\[foco\]\.titulo : "Extrato do veículo"/);
  assert.match(e, /foco && veiculo \? gerarPdf\(veiculo, FOCOS\[foco\]\.tabelas\) : setPersonalizando\(true\)/);
  assert.match(e, /resumoDo\(dados, foco\)/);
});

test("o resumo do foco leva só o que é do assunto: Manutenção sem média de consumo, Ocorrências só com o km", () => {
  const e = le("components/modules/ExtratoVeiculo.tsx");
  assert.match(e, /resumo: \["km", "vencidas"\]/);
  assert.match(e, /resumo: \["km"\]/);
  assert.match(e, /\(foco \? FOCOS\[foco\]\.resumo : \(\["km", "media", "vencidas"\] as const\)\)/);
});

test("a Frota e o Abastecimento seguem abrindo o extrato completo", () => {
  for (const f of ["FrotaModulo.tsx", "AbastecimentoVeiculoModulo.tsx"]) assert.doesNotMatch(le(`components/modules/${f}`), /foco="/, f);
});
