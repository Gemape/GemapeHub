import test from 'node:test';
import assert from 'node:assert/strict';
import {
  criarSubcategoria, disponiveis, excluirSubcategorias, listarCategorias, listarSubcategorias,
  opcoesSubcategoria, removerDaSelecao, renomearSubcategoria, selecionarSubcategorias,
} from '../src/lib/categorias-produto.ts';

const storage = () => {
  const dados = new Map();
  return {
    getItem: chave => dados.get(chave) ?? null,
    setItem: (chave, valor) => dados.set(chave, valor),
  };
};

test('começa com as listas de antes selecionadas e sugestões em Disponíveis', () => {
  const categorias = listarCategorias(storage());
  assert.deepEqual(categorias.uniforme.selecionadas, ['Camisa', 'Calça', 'Jaqueta', 'Outros']);
  assert.ok(categorias.epi.selecionadas.includes('Óculos') && categorias.epi.selecionadas.includes('Luva'));
  assert.ok(disponiveis(categorias.epi).includes('Avental'));
  assert.ok(!categorias.epi.selecionadas.includes('Avental'));
  assert.ok(categorias.veiculo.selecionadas.includes('Caminhão'));
});

test('adicionar e remover movem as opções entre as duas listas', () => {
  const local = storage();
  selecionarSubcategorias('epi', ['Respirador', 'Avental'], local);
  let epi = listarCategorias(local).epi;
  assert.deepEqual(epi.selecionadas.slice(-2), ['Avental', 'Respirador']);
  assert.ok(!disponiveis(epi).includes('Avental'));
  assert.ok(listarSubcategorias(local).epi.includes('Respirador'));
  removerDaSelecao('epi', ['Avental'], local);
  epi = listarCategorias(local).epi;
  assert.ok(disponiveis(epi).includes('Avental'));
  assert.ok(!listarSubcategorias(local).epi.includes('Avental'));
});

test('nova subcategoria entra em Disponíveis; nome vazio ou repetido é recusado', () => {
  const local = storage();
  assert.equal(criarSubcategoria('epi', '  Luva   nitrílica ', local), 'Luva nitrílica');
  assert.ok(disponiveis(listarCategorias(local).epi).includes('Luva nitrílica'));
  assert.throws(() => criarSubcategoria('epi', '   ', local), /Informe o nome/);
  assert.throws(() => criarSubcategoria('epi', 'oculos', local), /já existe/);
  assert.throws(() => criarSubcategoria('epi', 'AVENTAL', local), /já existe/);
  assert.equal(criarSubcategoria('uniforme', 'Luva', local), 'Luva');
});

test('renomear troca o nome nas duas listas e mantém a posição', () => {
  const local = storage();
  renomearSubcategoria('uniforme', 'Jaqueta', 'Jaqueta térmica', local);
  renomearSubcategoria('uniforme', 'Boné', 'Boné árabe', local);
  const uniforme = listarCategorias(local).uniforme;
  assert.deepEqual(uniforme.selecionadas, ['Camisa', 'Calça', 'Jaqueta térmica', 'Outros']);
  assert.ok(disponiveis(uniforme).includes('Boné árabe'));
  assert.throws(() => renomearSubcategoria('uniforme', 'Camisa', 'calça', local), /já existe/);
});

test('excluir apaga só opções que estão em Disponíveis', () => {
  const local = storage();
  excluirSubcategorias('veiculo', ['Trator', 'Carro'], local);
  const veiculo = listarCategorias(local).veiculo;
  assert.ok(!veiculo.opcoes.includes('Trator'));
  assert.ok(veiculo.selecionadas.includes('Carro'));
});

test('lista salva na versão anterior (só as usadas) continua valendo', () => {
  const local = storage();
  local.setItem('gemape-demo-subcategorias', JSON.stringify({ epi: ['Luva', 'Capacete de aba'] }));
  const categorias = listarCategorias(local);
  assert.deepEqual(categorias.epi, { opcoes: ['Luva', 'Capacete de aba'], selecionadas: ['Luva', 'Capacete de aba'] });
  assert.deepEqual(categorias.uniforme.selecionadas, ['Camisa', 'Calça', 'Jaqueta', 'Outros']);
});

test('dados corrompidos no navegador voltam para a lista padrão', () => {
  const local = storage();
  local.setItem('gemape-demo-subcategorias', '{quebrado');
  assert.ok(listarSubcategorias(local).epi.includes('Luva'));
});

test('formulário mantém o valor atual do produto mesmo fora da seleção', () => {
  assert.deepEqual(opcoesSubcategoria(['Luva'], 'Protetor facial'), ['Luva', 'Protetor facial']);
  assert.deepEqual(opcoesSubcategoria(['Luva'], 'Luva'), ['Luva']);
  assert.deepEqual(opcoesSubcategoria(['Luva'], null), ['Luva']);
});
