import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { demoSupabase } from '../src/integrations/supabase/demo-client.ts';
import { lerParametros } from '../src/lib/parametros-base.ts';
import { alternarTamanhoSelecionado, estadoEstoqueModulo, preservarMinimosNaoSelecionados, tamanhosDisponiveisDoProduto } from '../src/lib/estoque-tamanho.ts';

const produto = { id: crypto.randomUUID(), empresa_id: 'emp-a', nome: 'Botina', codigo_sku: 'EPI-9010', categoria: 'Botina', subcategoria_id: 'sub-epi-botina', estoque_atual: 3, estoque_minimo: 2, saldos_tamanho: { 'tam-37': 1, 'tam-38': 2 }, minimos_tamanho: { 'tam-37': 2, 'tam-38': 0 } };

test('clique inclui, persiste no demo e segundo clique remove o tamanho', async () => {
  const p = lerParametros(null);
  const ids = tamanhosDisponiveisDoProduto(p, 'epi', produto).map(t => t.id);
  const primeiro = ids[0];
  assert.ok(primeiro);
  const selecionados = alternarTamanhoSelecionado([], primeiro);
  assert.deepEqual(selecionados, [primeiro]);
  assert.equal((await demoSupabase.from('epis').insert({ ...produto, tamanhos_selecionados: selecionados })).error, null);
  assert.deepEqual((await demoSupabase.from('epis').select('*').eq('id', produto.id).single()).data.tamanhos_selecionados, [primeiro]);
  const removidos = alternarTamanhoSelecionado(selecionados, primeiro);
  assert.deepEqual(removidos, []);
  assert.equal((await demoSupabase.from('epis').update({ tamanhos_selecionados: removidos }).eq('id', produto.id)).error, null);
  assert.deepEqual((await demoSupabase.from('epis').select('*').eq('id', produto.id).single()).data.tamanhos_selecionados, []);
});

test('aba de Estoque mostra detalhes apenas dos tamanhos selecionados', () => {
  const p = lerParametros(null);
  const ids = tamanhosDisponiveisDoProduto(p, 'epi', produto).map(t => t.id);
  const item = { ...produto, saldos_tamanho: { [ids[0]]: 1, [ids[1]]: 2 }, minimos_tamanho: { [ids[0]]: 2, [ids[1]]: 3 }, tamanhos_selecionados: [ids[0]] };
  const estado = estadoEstoqueModulo(p, 'epi', item);
  assert.match(estado.detalheSaldo, /37: 1/);
  assert.doesNotMatch(estado.detalheSaldo, /38/);
  assert.match(estado.detalheMinimo, /37: 2/);
  assert.doesNotMatch(estado.detalheMinimo, /38/);
});

test('sem tamanho selecionado o módulo não produz alerta de mínimo antigo', () => {
  const estado = estadoEstoqueModulo(lerParametros(null), 'epi', { ...produto, estoque_atual: 1, tamanhos_selecionados: [] });
  assert.equal(estado.alerta, false);
  assert.equal(estado.detalheMinimo, '');
});

test('desmarcar um tamanho preserva seu mínimo histórico no produto', () => {
  assert.deepEqual(preservarMinimosNaoSelecionados({ 'tam-37': 2, 'tam-38': 4 }, ['tam-37'], { 'tam-37': 3 }), { 'tam-37': 3, 'tam-38': 4 });
});

test('cadastro apresenta chips como botões com estado pressionado', () => {
  const fonte = readFileSync(new URL('../src/components/modules/CadastroProduto.tsx', import.meta.url), 'utf8');
  assert.match(fonte, /aria-pressed=\{tamanhosSelecionados\.includes/);
  assert.match(fonte, /tamanhos_selecionados/);
});
