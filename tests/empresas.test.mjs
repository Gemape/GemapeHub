import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cnpjValido, enderecoResumido, formatarCnpj, ordenarEmpresas, prepararEmpresa, statusDaEmpresa,
} from '../src/lib/empresas.ts';

const dados = {
  razao_social: '  Empresa Teste Ltda ', nome_fantasia: 'Teste', cnpj: '11222333000181', status: 'Ativa',
  rua: 'Rua A', numero: '10', bairro: 'Centro', cep: '01000-000', cidade: 'São Paulo', estado: 'SP',
};

test('CNPJ confere os dígitos verificadores', () => {
  assert.equal(cnpjValido('11.222.333/0001-81'), true);
  assert.equal(cnpjValido('11222333000181'), true);
  assert.equal(cnpjValido('11.222.333/0001-82'), false);
  assert.equal(cnpjValido('00.000.000/0000-00'), false);
  assert.equal(cnpjValido('1122233300018'), false);
});

test('prepara empresa: limpa espaços e formata o CNPJ', () => {
  const empresa = prepararEmpresa(dados, []);
  assert.equal(empresa.razao_social, 'Empresa Teste Ltda');
  assert.equal(empresa.cnpj, '11.222.333/0001-81');
  assert.equal(formatarCnpj('44555666000181'), '44.555.666/0001-81');
});

test('recusa campos obrigatórios vazios, CNPJ inválido e status desconhecido', () => {
  assert.throws(() => prepararEmpresa({ ...dados, razao_social: ' ' }, []), /razão social/);
  assert.throws(() => prepararEmpresa({ ...dados, nome_fantasia: '' }, []), /nome fantasia/);
  assert.throws(() => prepararEmpresa({ ...dados, cnpj: '123' }, []), /CNPJ inválido/);
  assert.throws(() => prepararEmpresa({ ...dados, status: 'Talvez' }, []), /status/);
});

test('não aceita CNPJ repetido, mas permite salvar a própria empresa', () => {
  const outras = [{ id: 'a', cnpj: '11.222.333/0001-81' }];
  assert.throws(() => prepararEmpresa(dados, outras), /Já existe/);
  assert.doesNotThrow(() => prepararEmpresa(dados, outras, 'a'));
});

test('status padrão é Ativa e a lista mostra ativas antes das inativas', () => {
  assert.equal(statusDaEmpresa({}), 'Ativa');
  assert.equal(statusDaEmpresa({ status: 'Inativa' }), 'Inativa');
  const ordem = ordenarEmpresas([
    { nome_fantasia: 'LAPA', status: 'Inativa' }, { nome_fantasia: 'GMP' }, { nome_fantasia: 'Alfa', status: 'Ativa' },
  ]).map(e => e.nome_fantasia);
  assert.deepEqual(ordem, ['Alfa', 'GMP', 'LAPA']);
});

test('endereço resumido junta só os campos preenchidos', () => {
  assert.equal(enderecoResumido(dados), 'Rua A, 10 · Centro · São Paulo/SP · 01000-000');
  assert.equal(enderecoResumido({ cidade: 'Recife' }), 'Recife');
  assert.equal(enderecoResumido({}), '');
});

test('edição aceita o CNPJ antigo que não mudou, mas valida um CNPJ novo', () => {
  const outras = [{ id: 'a', cnpj: '00.000.000/0000-00' }];
  const salva = prepararEmpresa({ ...dados, cnpj: '00.000.000/0000-00' }, outras, 'a');
  assert.equal(salva.cnpj, '00.000.000/0000-00');
  assert.throws(() => prepararEmpresa({ ...dados, cnpj: '12.345.678/0001-00' }, outras, 'a'), /CNPJ inválido/);
  assert.throws(() => prepararEmpresa({ ...dados, cnpj: '00.000.000/0000-00' }, []), /CNPJ inválido/);
});

test('empresa antiga sem CNPJ não trava o cadastro das outras', () => {
  const outras = [{ id: 'x', cnpj: null }];
  assert.doesNotThrow(() => prepararEmpresa(dados, outras));
});
