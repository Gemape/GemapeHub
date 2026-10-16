import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ler = (c) => readFileSync(new URL(`../src/${c}`, import.meta.url), "utf8");

test("tabelas viram cartões no celular, só abaixo de 640 px, com rótulo vindo do cabeçalho (dec 232)", () => {
  const tabela = ler("components/ui/table.tsx");
  assert.match(tabela, /tabela-cartoes/);
  assert.match(tabela, /data-label/);
  assert.match(tabela, /semCartoes/);
  const css = ler("styles.css");
  assert.match(css, /@media \(max-width: 639px\)\s*\{\s*\.tabela-cartoes table/);
  assert.match(css, /attr\(data-label\)/);
});

test("as listas de Parâmetros de Veículos e Ferramentas usam o mesmo componente de tabela (dec 232)", () => {
  for (const arquivo of ["PlanoManutencaoVeiculo", "AssociarChecklistVeiculo", "SubgruposFerramenta", "VeiculosListasParametros"]) {
    const fonte = ler(`components/parametros/${arquivo}.tsx`);
    assert.doesNotMatch(fonte, /<table /, arquivo);
    assert.match(fonte, /<Table className="w-full text-sm">/, arquivo);
  }
});

test("botões e campos têm área de toque maior só no celular (dec 232)", () => {
  assert.match(ler("components/ui/button.tsx"), /h-9 px-4 py-2 max-sm:h-11/);
  assert.match(ler("components/ui/input.tsx"), /h-9 max-sm:h-11/);
});

test("nas janelas, Salvar e Cancelar ficam fixos no rodapé só no celular (dec 232)", () => {
  assert.match(ler("components/ui/dialog.tsx"), /max-sm:sticky max-sm:bottom-0/);
});

test("duas telas que estouravam a largura no celular foram corrigidas (dec 232)", () => {
  assert.match(ler("components/parametros/VeiculosListasParametros.tsx"), /className="flex flex-wrap gap-2"/);
  assert.match(ler("components/parametros/ListaEditavel.tsx"), /className="panel min-w-0 space-y-3 p-4"/);
});
