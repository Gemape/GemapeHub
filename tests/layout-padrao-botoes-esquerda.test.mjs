import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");

// Decisão 385: botões de ação no topo à esquerda, busca e filtros no topo à direita (BarraDeFiltros, que empurra para a direita).
test("o cabeçalho das páginas empilha o título e os botões, que ficam à esquerda; nenhum cabeçalho espalha os botões à direita", () => {
  for (const arq of ["components/parametros/Cabecalho.tsx", "routes/_authenticated/dashboard.tsx", "components/modules/EnderecamentoModulo.tsx", "components/parametros/PlanoManutencaoVeiculo.tsx", "components/parametros/VeiculosListasParametros.tsx"]) {
    assert.doesNotMatch(ler(arq), /<header className="flex flex-wrap items-end justify-between gap-3">/, arq);
    assert.match(ler(arq), /<header className="flex flex-col items-start gap-3">/, arq);
  }
});

test("Clientes, Fornecedores, Empresas, Empregados e Equipamentos têm os botões e a busca na mesma linha, os botões primeiro", () => {
  for (const arq of ["routes/_authenticated/cadastros/clientes.tsx", "routes/_authenticated/cadastros/fornecedores.tsx", "routes/_authenticated/empresas.tsx", "components/modules/EmpregadosCadastroModulo.tsx", "routes/_authenticated/cadastros/equipamentos.tsx"]) {
    const t = ler(arq);
    assert.match(t, /<div className="flex flex-wrap items-end gap-2">\s*<div className="flex flex-wrap items-center gap-2">[\s\S]*?Exportar CSV[\s\S]*?<BarraDeFiltros>/, arq);
    assert.doesNotMatch(t, /<header[^>]*>[\s\S]*?<\/header>[\s\S]{0,40}<div className="flex flex-wrap items-end gap-2">\s*<BarraDeFiltros>/, `${arq}: os botões não ficam fora da linha dos filtros`);
  }
});

test("as barras de botões das listas de cadastro não ficam mais à direita", () => {
  for (const arq of ["components/modules/CadastroEpi.tsx", "components/modules/CadastroProduto.tsx", "components/modules/CadastroUniforme.tsx", "components/modules/CaixasFerramentasModulo.tsx", "components/modules/ItensModulo.tsx", "components/modules/VeiculosCadastroModulo.tsx", "routes/_authenticated/epi-ordem-servico.tsx", "routes/_authenticated/epi-ficha.tsx", "components/modules/EnderecamentoModulo.tsx"]) {
    assert.doesNotMatch(ler(arq), /flex flex-wrap items-center justify-end gap-2/, arq);
  }
  assert.doesNotMatch(ler("components/modules/EstoqueModulo.tsx"), /flex flex-col items-end gap-2/);
  assert.match(ler("components/modules/EstoqueEpiModulo.tsx"), /<div className="flex flex-wrap gap-2" role="group" aria-label="Novos ou usados">/);
});
