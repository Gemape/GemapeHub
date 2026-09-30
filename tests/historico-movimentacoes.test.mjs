import test from 'node:test';
import assert from 'node:assert/strict';
import {
  alvoHistorico,
  linhaCsvHistorico,
  naturezaMovimentacao,
} from '../src/lib/historico-movimentacoes.ts';

const itens = [{ id: 'i1', codigo_sku: 'FER-0007', nome: 'Furadeira' }];
const veiculos = [{ id: 'v1', placa: 'ABC1D23' }];
const base = {
  id: 'm1', item_id: 'i1', veiculo_id: null, empregado_id: 'e1',
  tipo_movimentacao: 'Saida', motivo_baixa: null, quantidade: 1,
  onus_baixa: null, tipo_vistoria: null, sinalizar_ocorrencia: false,
  tipo_ocorrencia: null, conducao_ocorrencia: null,
  data_movimentacao: '2026-09-30', observacao: null,
};

test('compra é entrada; entrega e baixa são saídas', () => {
  assert.equal(naturezaMovimentacao({ ...base, tipo_movimentacao: 'Entrada' }), 'Entrada (compra)');
  assert.equal(naturezaMovimentacao(base), 'Saída (entrega)');
  assert.equal(
    naturezaMovimentacao({ ...base, motivo_baixa: 'Fornecimento ao Empregado' }),
    'Saída (entrega)',
  );
  assert.equal(naturezaMovimentacao({ ...base, motivo_baixa: 'Quebra' }), 'Saída (baixa)');
  assert.equal(naturezaMovimentacao({ ...base, tipo_movimentacao: 'Devolucao' }), 'Devolução');
  assert.equal(naturezaMovimentacao({ ...base, tipo_movimentacao: 'Vistoria' }), 'Vistoria');
});

test('a linha do histórico traz o código do item junto da descrição', () => {
  assert.deepEqual(alvoHistorico(base, itens, veiculos), { codigo: 'FER-0007', descricao: 'Furadeira' });
  assert.deepEqual(
    alvoHistorico({ ...base, item_id: null, veiculo_id: 'v1' }, itens, veiculos),
    { codigo: '—', descricao: 'ABC1D23' },
  );
  assert.deepEqual(
    alvoHistorico({ ...base, item_id: 'sumiu' }, itens, veiculos),
    { codigo: '—', descricao: '—' },
  );
});

test('a exportação do histórico tem a coluna Código antes do item', () => {
  const linha = linhaCsvHistorico({ ...base, motivo_baixa: 'Quebra' }, {
    itens, veiculos, nomeEmpregado: () => 'Ana',
  });
  assert.deepEqual(Object.keys(linha).slice(0, 4), ['Data', 'Tipo', 'Codigo', 'Item']);
  assert.equal(linha.Codigo, 'FER-0007');
  assert.equal(linha.Item, 'Furadeira');
  assert.equal(linha.Tipo, 'Saída (baixa)');
  assert.equal(linha.Empregado, 'Ana');
});
