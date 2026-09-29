import test from 'node:test';
import assert from 'node:assert/strict';
import { listarFornecedores, salvarFornecedor, removerFornecedor, proximoCodigoFornecedor } from '../src/lib/fornecedores-demo.ts';

const storage = () => {
  const dados = new Map();
  return {
    getItem: chave => dados.get(chave) ?? null,
    setItem: (chave, valor) => dados.set(chave, valor),
  };
};

const fornecedor = {
  razao_social: 'Proteção Brasil Ltda', nome_fantasia: 'Proteção Brasil',
  cnpj: '12.345.678/0001-90', rua: 'Rua das Flores', numero: '42', bairro: 'Centro',
  cep: '01001-000', cidade: 'São Paulo', estado: 'SP', pais: 'Brasil',
  inscricao_estadual: '123456789', telefone: '(11) 99999-9999', contato: 'Ana',
  observacoes: 'Entregas às segundas', naturezas: ['EPI', 'Uniforme'],
};

test('fornecedor mantém vários tipos e todos os dados após salvar e editar', () => {
  const local = storage();
  const criado = salvarFornecedor(fornecedor, local);
  assert.deepEqual(listarFornecedores(local), [{ ...fornecedor, id: criado.id, codigo: '00001' }]);
  salvarFornecedor({ ...criado, cidade: 'Campinas', naturezas: ['Ferramentas', 'Veículos'] }, local);
  assert.equal(listarFornecedores(local)[0].cidade, 'Campinas');
  assert.deepEqual(listarFornecedores(local)[0].naturezas, ['Ferramentas', 'Veículos']);
});

test('não aceita CNPJ duplicado mesmo com pontuação diferente', () => {
  const local = storage();
  salvarFornecedor(fornecedor, local);
  assert.throws(() => salvarFornecedor({ ...fornecedor, cnpj: '12345678000190' }, local), /CNPJ já cadastrado/);
  assert.equal(listarFornecedores(local).length, 1);
});

test('excluir remove somente o fornecedor escolhido', () => {
  const local = storage();
  const primeiro = salvarFornecedor(fornecedor, local);
  const segundo = salvarFornecedor({ ...fornecedor, cnpj: '98.765.432/0001-10' }, local);
  removerFornecedor(primeiro.id, local);
  assert.deepEqual(listarFornecedores(local).map(item => item.id), [segundo.id]);
});

test('código do fornecedor é sequencial e não muda ao editar', () => {
  const local = storage();
  assert.equal(proximoCodigoFornecedor(local), '00001');
  const primeiro = salvarFornecedor(fornecedor, local);
  const segundo = salvarFornecedor({ ...fornecedor, cnpj: '98.765.432/0001-10' }, local);
  assert.equal(primeiro.codigo, '00001');
  assert.equal(segundo.codigo, '00002');
  const editado = salvarFornecedor({ ...primeiro, cidade: 'Campinas', codigo: '99999' }, local);
  assert.equal(editado.codigo, '00001');
  assert.equal(proximoCodigoFornecedor(local), '00003');
});

test('código de fornecedor excluído não é reaproveitado', () => {
  const local = storage();
  salvarFornecedor(fornecedor, local);
  const segundo = salvarFornecedor({ ...fornecedor, cnpj: '98.765.432/0001-10' }, local);
  removerFornecedor(segundo.id, local);
  const terceiro = salvarFornecedor({ ...fornecedor, cnpj: '11.222.333/0001-81' }, local);
  assert.equal(terceiro.codigo, '00003');
});

test('fornecedores antigos sem código recebem código na ordem do cadastro', () => {
  const local = storage();
  local.setItem('gemape-demo-fornecedores', JSON.stringify([
    { ...fornecedor, id: 'a' },
    { ...fornecedor, id: 'b', cnpj: '98.765.432/0001-10' },
  ]));
  assert.deepEqual(listarFornecedores(local).map(item => item.codigo), ['00001', '00002']);
  assert.equal(salvarFornecedor({ ...fornecedor, cnpj: '11.222.333/0001-81' }, local).codigo, '00003');
});

test('código antigo do preview (FOR-0001) passa para 5 dígitos sem mudar o número', () => {
  const local = storage();
  local.setItem('gemape-demo-fornecedores', JSON.stringify([{ ...fornecedor, id: 'a', codigo: 'FOR-0007' }]));
  assert.equal(listarFornecedores(local)[0].codigo, '00007');
  assert.equal(salvarFornecedor({ ...fornecedor, cnpj: '11.222.333/0001-81' }, local).codigo, '00008');
});
