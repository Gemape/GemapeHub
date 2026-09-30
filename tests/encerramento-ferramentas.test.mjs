import test from 'node:test';
import assert from 'node:assert/strict';
import { demoSupabase } from '../src/integrations/supabase/demo-client.ts';
import { bloqueioPorDemissao } from '../src/lib/empregados.ts';
import {
  lerSaldosSobResponsabilidade,
  saldosSobResponsabilidade,
  validarEncerramento,
} from '../src/lib/encerramento-ferramentas.ts';

const mov = (tipo, item, quantidade, extra = {}) => ({
  modulo: 'ferramenta', tipo_movimentacao: tipo, item_id: item, quantidade,
  empresa_id: 'emp-a', empregado_id: 'pessoa', motivo_baixa: null, ...extra,
});

test('saldo = entregue menos devolvido e baixado, por empregado, empresa e ferramenta', () => {
  const saldos = saldosSobResponsabilidade([
    mov('Saida', 'furadeira', 3),
    mov('Devolucao', 'furadeira', 1),
    mov('Saida', 'furadeira', 1, { motivo_baixa: 'Quebra' }),
    mov('Saida', 'alicate', 2, { motivo_baixa: 'Fornecimento ao Empregado' }),
    mov('Vistoria', 'alicate', 2),
    mov('Saida', 'alicate', 5, { empregado_id: 'outra-pessoa' }),
    mov('Saida', 'alicate', 5, { empresa_id: 'emp-b' }),
    mov('Saida', 'capacete', 4, { modulo: 'epi' }),
    mov('Devolucao', 'serrote', 2),
  ], { empregadoId: 'pessoa', empresaId: 'emp-a' });

  assert.deepEqual(Object.fromEntries(saldos), { furadeira: 1, alicate: 2 });
});

test('não permite devolver acima do saldo, item sem saldo nem quantidade inválida', () => {
  const saldos = new Map([['furadeira', 1], ['alicate', 2]]);
  assert.equal(validarEncerramento([{ item_id: 'alicate', quantidade: 2 }], saldos), null);
  assert.match(validarEncerramento([{ item_id: 'furadeira', quantidade: 2 }], saldos), /saldo/);
  assert.match(
    validarEncerramento(
      [{ item_id: 'alicate', quantidade: 1 }, { item_id: 'alicate', quantidade: 2 }],
      saldos,
    ),
    /saldo/,
  );
  assert.match(validarEncerramento([{ item_id: 'serrote', quantidade: 1 }], saldos), /saldo/);
  assert.match(validarEncerramento([{ item_id: 'alicate', quantidade: 0 }], saldos), /quantidade/i);
  assert.match(validarEncerramento([{ item_id: 'alicate', quantidade: 1.5 }], saldos), /quantidade/i);
  assert.match(validarEncerramento([{ item_id: '', quantidade: 1 }], saldos), /ferramenta/i);
  assert.match(validarEncerramento([], saldos), /ferramenta/i);
});

test('o encerramento devolve o saldo ao estoque local uma única vez', async () => {
  const item = crypto.randomUUID();
  await demoSupabase.from('ferramentas').insert({
    id: item, empresa_id: 'emp-a', codigo_sku: 'FER-0500', nome: 'Esmerilhadeira', estoque_atual: 5,
  });
  const estoque = async () =>
    (await demoSupabase.from('ferramentas').select('*').eq('id', item).single()).data.estoque_atual;

  await demoSupabase.from('movimentacoes').insert(mov('Saida', item, 2));
  assert.equal(await estoque(), 3);
  await demoSupabase.from('movimentacoes').insert(mov('Vistoria', item, 2));
  assert.equal(await estoque(), 3);

  const lerSaldos = async () => {
    const { data } = await demoSupabase.from('movimentacoes').select('*').eq('item_id', item);
    return saldosSobResponsabilidade(data, { empregadoId: 'pessoa', empresaId: 'emp-a' });
  };
  const devolucao = [{ item_id: item, quantidade: 2 }];
  assert.equal(validarEncerramento(devolucao, await lerSaldos()), null);
  await demoSupabase.from('movimentacoes').insert(mov('Devolucao', item, 2));
  assert.equal(await estoque(), 5);

  // Repetir o termo não devolve de novo: o saldo acabou.
  assert.match(validarEncerramento(devolucao, await lerSaldos()), /saldo/);
  assert.equal(await estoque(), 5);
});

test('saída acima do estoque local é recusada, como no banco real', async () => {
  const item = crypto.randomUUID();
  await demoSupabase.from('ferramentas').insert({ id: item, empresa_id: 'emp-a', nome: 'Trena', estoque_atual: 1 });
  const { error } = await demoSupabase.from('movimentacoes').insert(mov('Saida', item, 2));
  assert.match(error?.message ?? '', /Estoque insuficiente/);
  const { data: mesmas } = await demoSupabase.from('movimentacoes').select('*').eq('item_id', item);
  assert.equal(mesmas.length, 0);
  const { data } = await demoSupabase.from('ferramentas').select('*').eq('id', item).single();
  assert.equal(data.estoque_atual, 1);
});

test('encerramento continua permitido após a demissão (decisão 15)', () => {
  const demitido = { nome: 'Ana', ativo: false, data_demissao: '2026-09-01' };
  assert.equal(bloqueioPorDemissao(demitido, 'encerramento', '2026-09-30', '2026-09-30'), null);
});

test('o saldo é lido do histórico inteiro do empregado, não só das últimas movimentações', async () => {
  const empresa = crypto.randomUUID();
  const item = crypto.randomUUID();
  await demoSupabase.from('ferramentas').insert({ id: item, empresa_id: empresa, nome: 'Marreta', estoque_atual: 1 });
  await demoSupabase.from('movimentacoes').insert(
    mov('Saida', item, 1, { empresa_id: empresa, data_movimentacao: '2020-01-01' }),
  );
  // Muitas movimentações mais novas de outras pessoas empurram a entrega para fora da lista da tela.
  await demoSupabase.from('movimentacoes').insert(
    Array.from({ length: 1001 }, () =>
      mov('Vistoria', item, 1, { empresa_id: empresa, empregado_id: 'outra', data_movimentacao: '2026-09-30' }),
    ),
  );
  const saldos = await lerSaldosSobResponsabilidade(demoSupabase, { empregadoId: 'pessoa', empresaId: empresa });
  assert.deepEqual(Object.fromEntries(saldos), { [item]: 1 });
});

test('o termo exige a data de encerramento', () => {
  const saldos = new Map([['alicate', 2]]);
  assert.match(validarEncerramento([{ item_id: 'alicate', quantidade: 1 }], saldos, ''), /data/i);
  assert.equal(validarEncerramento([{ item_id: 'alicate', quantidade: 1 }], saldos, '2026-09-30'), null);
});
