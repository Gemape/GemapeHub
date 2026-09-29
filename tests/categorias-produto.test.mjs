import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adicionarSubcategoria, listarSubcategorias, opcoesSubcategoria, removerSubcategoria, renomearSubcategoria,
} from '../src/lib/categorias-produto.ts';

const storage = () => {
  const dados = new Map();
  return {
    getItem: chave => dados.get(chave) ?? null,
    setItem: (chave, valor) => dados.set(chave, valor),
  };
};

test('começa com as subcategorias que já existiam no sistema', () => {
  const lista = listarSubcategorias(storage());
  assert.ok(lista.epi.includes('Óculos') && lista.epi.includes('Luva') && lista.epi.includes('Capacete'));
  assert.deepEqual(lista.uniforme, ['Camisa', 'Calça', 'Jaqueta', 'Outros']);
  assert.ok(lista.ferramenta.includes('Elétrica'));
  assert.ok(lista.veiculo.includes('Caminhão'));
});

test('inclui subcategoria só na categoria escolhida', () => {
  const local = storage();
  assert.equal(adicionarSubcategoria('epi', '  Avental   de raspa ', local), 'Avental de raspa');
  const lista = listarSubcategorias(local);
  assert.equal(lista.epi.at(-1), 'Avental de raspa');
  assert.ok(!lista.uniforme.includes('Avental de raspa'));
});

test('não aceita nome vazio nem repetido na mesma categoria, ignorando maiúsculas e acentos', () => {
  const local = storage();
  assert.throws(() => adicionarSubcategoria('epi', '   ', local), /Informe o nome/);
  assert.throws(() => adicionarSubcategoria('epi', 'oculos', local), /já existe/);
  assert.equal(adicionarSubcategoria('uniforme', 'Luva', local), 'Luva');
});

test('renomeia mantendo a posição e bloqueia nome que já existe', () => {
  const local = storage();
  assert.equal(renomearSubcategoria('uniforme', 'Jaqueta', 'Jaqueta térmica', local), 'Jaqueta térmica');
  assert.deepEqual(listarSubcategorias(local).uniforme, ['Camisa', 'Calça', 'Jaqueta térmica', 'Outros']);
  assert.throws(() => renomearSubcategoria('uniforme', 'Camisa', 'calça', local), /já existe/);
  assert.equal(renomearSubcategoria('uniforme', 'Camisa', 'CAMISA', local), 'CAMISA');
});

test('exclui somente a subcategoria escolhida', () => {
  const local = storage();
  removerSubcategoria('veiculo', 'Van', local);
  const lista = listarSubcategorias(local);
  assert.ok(!lista.veiculo.includes('Van'));
  assert.ok(lista.veiculo.includes('Moto'));
});

test('formulário mantém o valor atual do produto mesmo se a subcategoria não existir mais', () => {
  assert.deepEqual(opcoesSubcategoria(['Luva'], 'Protetor facial'), ['Luva', 'Protetor facial']);
  assert.deepEqual(opcoesSubcategoria(['Luva'], 'Luva'), ['Luva']);
  assert.deepEqual(opcoesSubcategoria(['Luva'], null), ['Luva']);
});

test('dados corrompidos no navegador voltam para a lista padrão', () => {
  const local = storage();
  local.setItem('gemape-demo-subcategorias', '{quebrado');
  assert.ok(listarSubcategorias(local).epi.includes('Luva'));
});
