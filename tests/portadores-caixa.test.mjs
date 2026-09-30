import test from 'node:test';
import assert from 'node:assert/strict';
import { dataBrasilia, lerPortadores, portadorAtivo, portadorNaData, registrarPortador, validarAlteracaoCaixaComPortador } from '../src/lib/portadores-caixa.ts';

const storage = () => {
  const dados = new Map();
  let gravacoes = 0;
  return {
    getItem: (chave) => dados.get(chave) ?? null,
    setItem: (chave, valor) => { gravacoes++; dados.set(chave, valor); },
    get gravacoes() { return gravacoes; },
  };
};
const caixa = { id: 'cx-1', codigo: 'CX-0001', codigo_num: 1, empresa_id: 'e1', status: 'Ativa' };
const ana = { id: 'ana', nome: 'Ana', empresa_id: 'e1', ativo: true, data_demissao: null };
const bia = { id: 'bia', nome: 'Bia', empresa_id: 'e1', ativo: true, data_demissao: null };
const base = { caixa, habilitadas: [1], status: 'Ativa', observacao: 'Primeira entrega', agora: new Date('2026-10-01T01:30:00Z') };

test('troca portador em uma gravação, encerra anterior com data de Brasília e mantém um ativo', () => {
  const local = storage();
  registrarPortador({ ...base, empregado: ana }, local);
  assert.equal(local.gravacoes, 1);
  assert.equal(portadorAtivo(lerPortadores(local), caixa.id)?.empregado_id, 'ana');
  registrarPortador({ ...base, empregado: bia, observacao: 'Troca' }, local);
  assert.equal(local.gravacoes, 2);
  const historico = lerPortadores(local);
  assert.equal(historico.length, 2);
  assert.equal(historico[0].status, 'Inativa');
  assert.equal(historico[0].data_fim, '2026-09-30');
  assert.equal(historico[1].status, 'Ativa');
  assert.equal(historico[0].caixa_codigo, 'CX-0001');
  assert.equal(historico[0].empregado_nome, 'Ana');
  assert.equal(portadorAtivo(historico, caixa.id)?.empregado_id, 'bia');
  assert.equal(dataBrasilia(base.agora), '2026-09-30');
});

test('recusa caixa desabilitada, outra empresa, empregado demitido e segundo clique sem gravar', () => {
  const local = storage();
  assert.throws(() => registrarPortador({ ...base, habilitadas: [], empregado: ana }, local), /habilitada/);
  assert.throws(() => registrarPortador({ ...base, empregado: { ...ana, empresa_id: 'e2' } }, local), /empresa/);
  assert.throws(() => registrarPortador({ ...base, empregado: { ...ana, data_demissao: '2026-09-30' } }, local), /demitido/);
  assert.equal(local.gravacoes, 0);
  registrarPortador({ ...base, empregado: ana }, local);
  assert.throws(() => registrarPortador({ ...base, empregado: ana }, local), /já é o portador ativo/);
  assert.equal(local.gravacoes, 1);
});

test('empregado manualmente inativo não pode ser portador mesmo com demissão futura', () => {
  const local = storage();
  assert.throws(() => registrarPortador({ ...base, empregado: { ...ana, ativo: false, data_demissao: '2026-10-01' } }, local), /inativo/);
  assert.equal(local.gravacoes, 0);
});

test('inativar registra fim, sem apagar histórico, e falha de escrita não altera dados', () => {
  const local = storage();
  registrarPortador({ ...base, empregado: ana }, local);
  const falha = { getItem: local.getItem, setItem: () => { throw new Error('sem espaço'); } };
  assert.throws(() => registrarPortador({ ...base, empregado: bia }, falha), /sem espaço/);
  assert.equal(portadorAtivo(lerPortadores(local), caixa.id)?.empregado_id, 'ana');
  registrarPortador({ ...base, empregado: ana, status: 'Inativa', observacao: 'Devolvida' }, local);
  assert.equal(portadorAtivo(lerPortadores(local), caixa.id), null);
  assert.equal(lerPortadores(local)[0].data_fim, '2026-09-30');
});

test('histórico completo mantém mais de mil trocas por caixa e empresa', () => {
  const local = storage();
  for (let i = 0; i < 1002; i++) {
    registrarPortador({ ...base, empregado: i % 2 ? bia : ana }, local);
  }
  assert.equal(lerPortadores(local).filter((registro) => registro.caixa_id === caixa.id && registro.empresa_id === 'e1').length, 1002);
  assert.equal(lerPortadores(local).filter((registro) => registro.status === 'Ativa').length, 1);
});

test('caixa com portador ativo não muda de empresa nem é excluída', () => {
  const local = storage();
  registrarPortador({ ...base, empregado: ana }, local);
  const historico = lerPortadores(local);
  assert.match(validarAlteracaoCaixaComPortador(caixa, historico, { empresa_id: 'e2', status: 'Ativa' }), /empresa/);
  assert.equal(validarAlteracaoCaixaComPortador(caixa, historico, { empresa_id: 'e1', status: 'Inativa' }), null);
  assert.match(validarAlteracaoCaixaComPortador(caixa, historico, null), /excluir/);
  assert.equal(validarAlteracaoCaixaComPortador(caixa, historico, { empresa_id: 'e1', status: 'Ativa' }), null);
});

test('termo retrospectivo consulta o portador da data, sem usar o portador atual', () => {
  const local = storage();
  registrarPortador({ ...base, empregado: ana, agora: new Date('2026-09-30T16:00:00Z') }, local);
  registrarPortador({ ...base, empregado: bia, agora: new Date('2026-10-02T16:00:00Z') }, local);
  const historico = lerPortadores(local);
  assert.equal(portadorNaData(historico, caixa.id, '2026-10-01')?.empregado_nome, 'Ana');
  assert.equal(portadorNaData(historico, caixa.id, '2026-10-03')?.empregado_nome, 'Bia');
  assert.equal(portadorNaData(historico, caixa.id, '2026-09-29'), null);
});
