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
  observacoes: 'Entregas às segundas', categorias: ['cat-epi', 'cat-uniformes'],
};

test('fornecedor mantém vários tipos e todos os dados após salvar e editar', () => {
  const local = storage();
  const criado = salvarFornecedor(fornecedor, local);
  assert.deepEqual(listarFornecedores(local), [{ ...fornecedor, rua: 'Rua das Flores', cep: '01.001-000', telefone: '(11)9.9999.9999', id: criado.id, codigo: '00001' }]);
  salvarFornecedor({ ...criado, cidade: 'Campinas', categorias: ['cat-ferramentas', 'cat-veiculos'] }, local);
  assert.equal(listarFornecedores(local)[0].cidade, 'Campinas');
  assert.deepEqual(listarFornecedores(local)[0].categorias, ['cat-ferramentas', 'cat-veiculos']);
});

test('não aceita CNPJ duplicado mesmo com pontuação diferente', () => {
  const local = storage();
  salvarFornecedor(fornecedor, local);
  assert.throws(() => salvarFornecedor({ ...fornecedor, cnpj: '12345678000190' }, local), /CNPJ já cadastrado/);
  assert.equal(listarFornecedores(local).length, 1);
});

test('fornecedor novo formata contatos e textos cadastrais', () => {
  const local = storage();
  const criado = salvarFornecedor({
    ...fornecedor,
    razao_social: 'PROTEÇÃO BRASIL LTDA',
    cnpj: '12345678000190',
    telefone: '11987654321',
    cep: '12345678',
  }, local);
  assert.equal(criado.razao_social, 'Proteção Brasil Ltda');
  assert.equal(criado.cnpj, '12.345.678/0001-90');
  assert.equal(criado.telefone, '(11)9.8765.4321');
  assert.equal(criado.cep, '12.345-678');
  assert.throws(() => salvarFornecedor({ ...fornecedor, cnpj: '123' }, local), /CNPJ/);
  assert.throws(() => salvarFornecedor({ ...fornecedor, telefone: '123' }, local), /telefone/i);
  assert.throws(() => salvarFornecedor({ ...fornecedor, cep: '123' }, local), /CEP/);
});

test('fornecedor antigo aceita editar nome sem alterar CEP e telefone incompletos', () => {
  const local = storage();
  const criado = salvarFornecedor(fornecedor, local);
  const antigos = listarFornecedores(local);
  antigos[0].cep = '123';
  antigos[0].telefone = '456';
  local.setItem('gemape-demo-fornecedores', JSON.stringify(antigos));
  const editado = salvarFornecedor({ ...antigos[0], nome_fantasia: 'NOVA MARCA' }, local);
  assert.equal(editado.nome_fantasia, 'Nova Marca');
  assert.equal(editado.cep, '123');
  assert.equal(editado.telefone, '456');
  assert.equal(editado.id, criado.id);
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

test('naturezas antigas passam para as categorias de Cadastros > Gerais', () => {
  const local = storage();
  const { categorias, ...semCategorias } = fornecedor;
  local.setItem('gemape-demo-fornecedores', JSON.stringify([{ ...semCategorias, id: 'a', codigo: '00001', naturezas: ['EPI', 'Veículos', 'EPI'] }]));
  const [lido] = listarFornecedores(local);
  assert.deepEqual(lido.categorias, ['cat-epi', 'cat-veiculos']);
  assert.equal('naturezas' in lido, false);
  // Decisão 55: categoria é opcional.
  assert.deepEqual(salvarFornecedor({ ...fornecedor, cnpj: '11.222.333/0001-81', categorias: [] }, local).categorias, []);
});

test('nome fantasia é opcional; só a razão social é obrigatória (decisão 55)', () => {
  const local = storage();
  const salvo = salvarFornecedor({ ...fornecedor, nome_fantasia: '' }, local);
  assert.equal(salvo.nome_fantasia, '');
  assert.throws(() => salvarFornecedor({ ...fornecedor, cnpj: '11.222.333/0001-81', razao_social: ' ' }, local), /razão social/);
});

test('o formulário de fornecedor não exige nome fantasia nem categoria', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/routes/_authenticated/cadastros/fornecedores.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /id="nome_fantasia" name="nome_fantasia" required/);
  assert.match(src, /id="razao_social" name="razao_social" required/);
});
