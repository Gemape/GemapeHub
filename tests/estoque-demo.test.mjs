import test from 'node:test';
import assert from 'node:assert/strict';
import { demoSupabase } from '../src/integrations/supabase/demo-client.ts';
import { validarTermoResponsabilidade } from '../src/lib/encerramento-ferramentas.ts';

// Mesma conta dos gatilhos do banco real (gemape_compra e gemape_movimentacao).
for (const [tabela, compras, modulo] of [
  ['epis', 'compras_epis', 'epi'],
  ['uniformes', 'compras_uniformes', 'uniforme'],
]) {
  test(`compra em ${compras} vira entrada e soma no estoque`, async () => {
    const item = crypto.randomUUID();
    await demoSupabase.from(tabela).insert({ id: item, empresa_id: 'emp-a', nome: 'Item', estoque_atual: 2 });
    const { error } = await demoSupabase.from(compras).insert({
      empresa_id: 'emp-a', item_id: item, fornecedor: 'ACME', nota_fiscal: '123',
      data_compra: '2026-09-30', quantidade: 5, valor_unitario: 10,
    });
    assert.equal(error, null);
    const { data } = await demoSupabase.from(tabela).select('*').eq('id', item).single();
    assert.equal(data.estoque_atual, 7);
    const { data: entradas } = await demoSupabase.from('movimentacoes').select('*').eq('item_id', item);
    assert.equal(entradas.length, 1);
    assert.equal(entradas[0].tipo_movimentacao, 'Entrada');
    assert.equal(entradas[0].modulo, modulo);
    assert.equal(entradas[0].quantidade, 5);
    // valor_total é coluna calculada no banco real (quantidade × valor unitário).
    const { data: [compra] } = await demoSupabase.from(compras).select('*').eq('item_id', item);
    assert.equal(compra.valor_total, 50);
  });

  test(`valor total da compra em ${compras} é calculado em centavos`, async () => {
    const item = crypto.randomUUID();
    await demoSupabase.from(tabela).insert({ id: item, empresa_id: 'emp-a', nome: 'Item', estoque_atual: 0 });
    await demoSupabase.from(compras).insert({
      empresa_id: 'emp-a', item_id: item, fornecedor: 'ACME', data_compra: '2026-09-30',
      quantidade: 3, valor_unitario: 0.1,
    });
    const { data: [compra] } = await demoSupabase.from(compras).select('*').eq('item_id', item);
    assert.equal(compra.valor_total, 0.3);
  });

  test(`compra inválida em ${compras} é recusada sem mexer no estoque`, async () => {
    const item = crypto.randomUUID();
    await demoSupabase.from(tabela).insert({ id: item, empresa_id: 'emp-a', nome: 'Item', estoque_atual: 2 });
    const { error } = await demoSupabase.from(compras).insert({
      empresa_id: 'emp-a', item_id: item, fornecedor: 'ACME', data_compra: '2026-09-30',
      quantidade: 0, valor_unitario: 10,
    });
    assert.match(error?.message ?? '', /inválid/);
    const { data } = await demoSupabase.from(tabela).select('*').eq('id', item).single();
    assert.equal(data.estoque_atual, 2);
    const { data: lista } = await demoSupabase.from(compras).select('*').eq('item_id', item);
    assert.equal(lista.length, 0);
  });
}

test('termo de responsabilidade não entrega acima do estoque disponível', () => {
  const itens = [
    { id: 'furadeira', nome: 'Furadeira', estoque_atual: 2 },
    { id: 'alicate', nome: 'Alicate', estoque_atual: 0 },
  ];
  assert.equal(validarTermoResponsabilidade([{ item_id: 'furadeira', quantidade: 2 }], itens), null);
  assert.match(validarTermoResponsabilidade([{ item_id: 'furadeira', quantidade: 3 }], itens), /estoque/);
  assert.match(
    validarTermoResponsabilidade(
      [{ item_id: 'furadeira', quantidade: 1 }, { item_id: 'furadeira', quantidade: 2 }],
      itens,
    ),
    /estoque/,
  );
  assert.match(validarTermoResponsabilidade([{ item_id: 'alicate', quantidade: 1 }], itens), /estoque/);
  assert.match(validarTermoResponsabilidade([{ item_id: 'furadeira', quantidade: 0 }], itens), /quantidade/i);
  assert.match(validarTermoResponsabilidade([{ item_id: '', quantidade: 1 }], itens), /ferramenta/i);
  assert.match(validarTermoResponsabilidade([], itens), /ferramenta/i);
});
