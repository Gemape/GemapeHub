import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fonte = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");

test("Frota, Manutenção, Movimentações e Ocorrências de Veículos têm campo de busca", () => {
  assert.match(fonte("components/modules/FrotaModulo.tsx"), /placeholder="Buscar por descrição ou responsável"/);
  assert.match(fonte("components/modules/FrotaModulo.tsx"), /nomeResponsavel\(v\.empregado_responsavel_id\)/);
  assert.match(fonte("components/modules/AbastecimentoVeiculoModulo.tsx"), /combinaBusca\(busca/);
  assert.match(fonte("components/modules/ManutencaoVeiculoModulo.tsx"), /combinaBusca\(busca/);
  const mov = fonte("components/modules/MovimentacoesModulo.tsx");
  assert.match(mov, /\n\s+busca\.trim\(\)\n/);
  assert.match(mov, /visiveis\.map\(/);
  assert.match(fonte("components/modules/OcorrenciasModulo.tsx"), /Buscar por descrição ou responsável/);
});

test("a busca de Movimentações aparece em Veículos e em Ferramentas, sem mudar o uniforme", () => {
  const mov = fonte("components/modules/MovimentacoesModulo.tsx");
  assert.doesNotMatch(mov, /comBusca/, "a busca vale para todos os módulos (decisão 376)");
  assert.match(mov, /<BarraDeFiltros>\s*<Input\s+aria-label="Buscar movimentação"/);
});

test("a busca de Movimentações de Ferramentas olha código, item, empregado, tipo, motivo, ônus, vistoria, ocorrência, observação e data", () => {
  const mov = fonte("components/modules/MovimentacoesModulo.tsx");
  for (const campo of ["alvoHistorico(m, itens, veiculos).codigo", "alvoHistorico(m, itens, veiculos).descricao", "naturezaMovimentacao(m)", "nomeEmpregado(m.empregado_id)", "m.motivo_baixa", "m.onus_baixa", "m.tipo_vistoria", "m.tipo_ocorrencia", "m.observacao", "formatarData(m.data_movimentacao)"]) {
    assert.ok(mov.includes(campo), campo);
  }
  assert.match(mov, /Buscar por item, código, empregado ou motivo/);
  // O Exportar CSV segue exportando todas as movimentações, não só as filtradas.
  assert.match(mov, /movimentacoes\.map\(\(m\) =>\s*linhaCsvHistorico/);
});
