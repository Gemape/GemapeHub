import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPOS_FICHA, fichaVazia, lerFichas, removerFicha, salvarFicha } from '../src/lib/fichas-epi.ts';
import { proximoCodigo } from '../src/lib/parametros-base.ts';

const storage = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};
const completa = () => Object.fromEntries(CAMPOS_FICHA.map((c) => [c.chave, ` ${c.rotulo} `]));

test('código do EPI: segue a sequência sem repetir', () => {
  const regra = { sigla: 'EPI', inicial: '0001' };
  assert.equal(proximoCodigo(regra, []), 'EPI-0001');
  assert.equal(proximoCodigo(regra, ['EPI-0001', 'epi-0007', 'UNI-0020', 'EPI-X', null]), 'EPI-0008');
  assert.equal(proximoCodigo({ sigla: 'EPI', inicial: '0100' }, ['EPI-0003']), 'EPI-0100');
  assert.equal(proximoCodigo(regra, ['EPI-9999']), 'EPI-10000');
});

test('ficha de EPI: os sete campos são obrigatórios e o texto é aparado', () => {
  const s = storage();
  assert.equal(CAMPOS_FICHA.length, 7);
  assert.throws(() => salvarFicha('', completa(), s), /Selecione o EPI/);
  assert.throws(() => salvarFicha('epi-1', { ...completa(), descarte: '  ' }, s), /Preencha "Descarte"/);
  const f = salvarFicha('epi-1', completa(), s, new Date('2026-09-30T12:00:00Z'));
  assert.equal(f.setores, 'Setores aplicáveis');
  assert.equal(f.atualizadaEm, '2026-09-30T12:00:00.000Z');
});

test('ficha de EPI: uma por EPI, editar substitui e excluir remove', () => {
  const s = storage();
  salvarFicha('epi-1', completa(), s);
  salvarFicha('epi-2', completa(), s);
  salvarFicha('epi-1', { ...completa(), setores: 'Manutenção' }, s);
  const fichas = lerFichas(s);
  assert.equal(fichas.length, 2);
  assert.equal(fichas.find((f) => f.epiId === 'epi-1').setores, 'Manutenção');
  removerFicha('epi-2', s);
  assert.deepEqual(lerFichas(s).map((f) => f.epiId), ['epi-1']);
});

test('fichas salvas ilegíveis não são apagadas', () => {
  const s = storage();
  s.setItem('gemape-demo-fichas-epi', '{quebrado');
  assert.deepEqual(lerFichas(s), []);
  assert.throws(() => salvarFicha('epi-1', completa(), s), /não puderam ser lidas/);
  assert.equal(s.getItem('gemape-demo-fichas-epi'), '{quebrado');
  assert.deepEqual(Object.keys(fichaVazia()), CAMPOS_FICHA.map((c) => c.chave));
});
