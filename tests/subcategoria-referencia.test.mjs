import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  adicionarSubcategoria,
  lerParametros,
  removerSubcategoria,
  renomearSubcategoria,
} from '../src/lib/parametros-base.ts';
import * as ref from '../src/lib/subcategoria-referencia.ts';
import { prepararCadastroFerramenta } from '../src/lib/cadastro-ferramentas.ts';

const storage = () => {
  const dados = new Map();
  return { getItem: (chave) => dados.get(chave) ?? null, setItem: (chave, valor) => dados.set(chave, valor) };
};
const raiz = new URL('../src/', import.meta.url).pathname;
const ler = (relativo) => readFileSync(join(raiz, relativo), 'utf8');

test('o cadastro guarda a referência: renomear em Gerais muda o nome mostrado na hora', () => {
  const local = storage();
  const registro = { subcategoria_id: 'sub-epi-capacete', categoria: 'Capacete' };
  assert.deepEqual(ref.resolverSubcategoria(lerParametros(local), 'cat-epi', registro),
    { id: 'sub-epi-capacete', nome: 'Capacete', foraDeGerais: false });
  renomearSubcategoria('sub-epi-capacete', 'Capacete de segurança', local);
  assert.equal(ref.nomeSubcategoria(lerParametros(local), 'cat-epi', registro), 'Capacete de segurança');
});

test('nome antigo sem referência é ligado à subcategoria de Gerais de mesmo nome', () => {
  const p = lerParametros(storage());
  assert.deepEqual(ref.resolverSubcategoria(p, 'cat-epi', { categoria: ' capacete ' }),
    { id: 'sub-epi-capacete', nome: 'Capacete', foraDeGerais: false });
  // Só dentro da categoria do módulo: "Elétrica" é de Ferramentas, não de EPI.
  assert.deepEqual(ref.resolverSubcategoria(p, 'cat-epi', { categoria: 'Elétrica' }),
    { id: null, nome: 'Elétrica', foraDeGerais: true });
  assert.equal(ref.resolverSubcategoria(p, 'cat-ferramentas', { categoria: 'eletrica' }).id, 'sub-ferramentas-eletrica');
  assert.equal(ref.resolverSubcategoria(p, 'cat-epi', { categoria: '' }), null);
  assert.equal(ref.resolverSubcategoria(p, 'cat-epi', {}), null);
});

test('referência a subcategoria excluída mostra o nome gravado como fora de Gerais', () => {
  const local = storage();
  const sub = adicionarSubcategoria('cat-uniformes', 'Jaleco', local);
  removerSubcategoria(sub.id, local);
  assert.deepEqual(ref.resolverSubcategoria(lerParametros(local), 'cat-uniformes', { subcategoria_id: sub.id, categoria: 'Jaleco' }),
    { id: null, nome: 'Jaleco', foraDeGerais: true });
});

test('a escolha no formulário vira referência e nome atual; a antiga é mantida', () => {
  const p = lerParametros(storage());
  assert.deepEqual(ref.subcategoriaDaSelecao('sub-epi-luva', p, 'cat-epi', null), { id: 'sub-epi-luva', nome: 'Luva' });
  const antiga = { id: null, nome: 'Bota velha', foraDeGerais: true };
  assert.deepEqual(ref.subcategoriaDaSelecao(ref.SUBCATEGORIA_LEGADA, p, 'cat-epi', antiga), { id: null, nome: 'Bota velha' });
  assert.throws(() => ref.subcategoriaDaSelecao('', p, 'cat-epi', null), /Selecione a subcategoria/);
  assert.throws(() => ref.subcategoriaDaSelecao(ref.SUBCATEGORIA_LEGADA, p, 'cat-epi', null), /Subcategoria inválida/);
  // Subcategoria de outra categoria não serve.
  assert.throws(() => ref.subcategoriaDaSelecao('sub-ferramentas-eletrica', p, 'cat-epi', null), /Subcategoria inválida/);
  assert.equal(ref.valorSelecaoSubcategoria({ id: 'sub-epi-luva', nome: 'Luva', foraDeGerais: false }), 'sub-epi-luva');
  assert.equal(ref.valorSelecaoSubcategoria(antiga), ref.SUBCATEGORIA_LEGADA);
  assert.equal(ref.valorSelecaoSubcategoria(null), '');
});

test('migração: nomes gravados nos quatro cadastros ganham a referência certa', () => {
  const p = lerParametros(storage());
  const dados = {
    epis: [{ id: 'e1', categoria: 'capacete' }, { id: 'e2', categoria: 'Inexistente' }, { id: 'e3', categoria: 'Luva', subcategoria_id: 'sub-epi-luva' }],
    uniformes: [{ id: 'u1', categoria: 'Camisa' }],
    ferramentas: [{ id: 'f1', categoria: 'Elétrica' }],
    veiculos: [{ id: 'v1', tipo: 'Carro' }, { id: 'v2', tipo: null }],
    movimentacoes: [{ id: 'm1', categoria: 'Capacete' }],
  };
  assert.equal(ref.vincularSubcategorias(dados, p), 4);
  assert.equal(dados.epis[0].subcategoria_id, 'sub-epi-capacete');
  assert.equal(dados.epis[0].categoria, 'capacete', 'o texto gravado não é apagado');
  assert.equal(dados.epis[1].subcategoria_id, undefined);
  assert.equal(dados.epis[2].subcategoria_id, 'sub-epi-luva');
  assert.equal(dados.uniformes[0].subcategoria_id, 'sub-uniformes-camisa');
  assert.equal(dados.ferramentas[0].subcategoria_id, 'sub-ferramentas-eletrica');
  assert.equal(dados.veiculos[0].subcategoria_id, 'sub-veiculos-carro');
  assert.equal(dados.veiculos[1].subcategoria_id, undefined);
  assert.equal(dados.movimentacoes[0].subcategoria_id, undefined);
  // Rodar de novo não muda nada.
  assert.equal(ref.vincularSubcategorias(dados, p), 0);
});

test('ferramenta antiga com subcategoria fora de Gerais continua editável', () => {
  const campos = { categoriaFerramenta: 'Elétrica', grupoFerramenta: 'Diversos', numeroSerie: 'SN-1', precoCusto: '10' };
  const entrada = { parametros: lerParametros(storage()), codigosExistentes: [], descricao: 'Serra', estoqueMinimo: '1', codigoAtual: 'FER-0001', ...campos };
  assert.equal(prepararCadastroFerramenta({ ...entrada, subcategoria: 'Pneumática antiga', subcategoriaAtual: 'Pneumática antiga' }).categoria, 'Pneumática antiga');
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, subcategoria: 'Pneumática antiga' }), /Subcategoria/);
});

test('os cadastros escolhem a subcategoria pela referência e mostram o nome de Gerais', () => {
  for (const arquivo of ['components/modules/CadastroProduto.tsx', 'components/modules/VeiculosCadastroModulo.tsx', 'components/modules/ItensModulo.tsx']) {
    const fonte = ler(arquivo);
    assert.match(fonte, /<SelectItem key=\{s\.id\} value=\{s\.id\}>/, arquivo);
    assert.match(fonte, /subcategoriaDaSelecao\(/, arquivo);
    assert.match(fonte, /valores\["subcategoria_id"\]/, arquivo);
    assert.match(fonte, /nomeSubcategoria\(/, arquivo);
    assert.match(fonte, /SUBCATEGORIA_LEGADA/, arquivo);
  }
  assert.match(ler('routes/_authenticated/cadastros/epi-ficha.tsx'), /nomeSubcategoria\(/);
});
