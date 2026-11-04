// Equipamentos > Inventário: o Extrato abre a tela interativa, na lógica do extrato do veículo (decisão 394).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ler = (c) => readFileSync(new URL(`../src/components/modules/equipamento/${c}`, import.meta.url), "utf8");

test("o Extrato do Inventário abre a tela do extrato, sem gerar o PDF direto", () => {
  const inv = ler("InventarioEquipamentoModulo.tsx");
  assert.match(inv, /<ExtratoEquipamento equipamento=\{extratoDe\}/);
  assert.doesNotMatch(inv, /gerarRelatorio|abrirDocumento|montarExtratoHtml/);
});

test("a tela tem período, Personalizar o relatório, resumo, seções coloridas e os botões de registrar", () => {
  const t = ler("ExtratoEquipamento.tsx");
  for (const x of ["Data início", "Data fim", "Personalizar o relatório", "Marcar todos", "Desmarcar todos", "Horímetro atual", "Média de consumo", "Preventivas vencidas"]) assert.ok(t.includes(x), x);
  for (const x of ["Registrar manutenção", "Registrar abastecimento", "Registrar ocorrência", "Registrar check list"]) assert.ok(t.includes(x), x);
  for (const cor of ["from-blue-800", "from-emerald-800", "from-amber-700", "from-violet-800"]) assert.ok(t.includes(cor), cor);
  assert.match(t, /Só em aberto/);
});

test("registrar a partir do extrato já vem com o equipamento escolhido", () => {
  const t = ler("ExtratoEquipamento.tsx");
  assert.equal((t.match(/equipamentoInicial=\{equipamento\.id\}/g) ?? []).length, 3);
  for (const [arq, nome] of [["ManutencaoEquipamentoModulo.tsx", "NovaManutencao"], ["AbastecimentoEquipamentoModulo.tsx", "NovoAbastecimento"], ["OcorrenciasEquipamentoModulo.tsx", "NovaOcorrencia"]]) {
    const s = ler(arq);
    assert.match(s, new RegExp(`export function ${nome}\\(`), nome);
    assert.match(s, /useState\(equipamentoInicial\)/, nome);
  }
});

test("a preventiva do equipamento fala em horas (não em km) e o extrato mantém aquisição e custo", () => {
  const t = ler("ExtratoEquipamento.tsx");
  assert.match(t, /motivoEmHoras\(s\.motivo\)/);
  assert.match(t, /adquirido em \$\{formatarData\(e\.dataAquisicao\)\}/);
  assert.match(t, /Custo de manutenção no período/);
  assert.doesNotMatch(t, /const (PONTO_TELA|TEXTO_TELA|SITUACAO)\b/, "as cores vêm do extrato do veículo");
});

test("Ocorrências do equipamento: o equipamento da lista abre o extrato só com as ocorrências (decisão 395)", () => {
  const m = ler("OcorrenciasEquipamentoModulo.tsx");
  assert.match(m, /<ExtratoEquipamento equipamento=\{equipamentos\.find\(\(e\) => e\.id === extratoDe\) \?\? null\} foco="ocorrencias"/);
  assert.match(m, /setExtratoDe\(o\.equipamentoId\)/);
  const t = ler("ExtratoEquipamento.tsx");
  assert.match(t, /Ocorrências do equipamento/);
  assert.match(t, /secoesVisiveis\.map/);
  assert.match(t, /foco && equipamento \? gerarPdf\(equipamento, FOCOS\[foco\]\.tabelas\)/);
});
