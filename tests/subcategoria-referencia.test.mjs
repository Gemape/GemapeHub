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
  assert.equal(ref.nomeSubcategoria(lerParametros(local), 'cat-epi', registro), 'Capacete de Segurança');
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

test('referência a subcategoria excluída e recriada com o mesmo nome volta a ser ligada', () => {
  const local = storage();
  const antiga = adicionarSubcategoria('cat-uniformes', 'Jaleco', local);
  removerSubcategoria(antiga.id, local);
  const nova = adicionarSubcategoria('cat-uniformes', 'jaleco', local);
  const registro = { subcategoria_id: antiga.id, categoria: 'Jaleco' };
  assert.deepEqual(ref.resolverSubcategoria(lerParametros(local), 'cat-uniformes', registro),
    { id: nova.id, nome: 'Jaleco', foraDeGerais: false });
  const dados = { uniformes: [registro] };
  assert.equal(ref.vincularSubcategorias(dados, lerParametros(local)), 1);
  assert.equal(registro.subcategoria_id, nova.id);
});

test('com a referência ligada, o nome gravado acompanha o nome atual de Gerais', () => {
  const local = storage();
  renomearSubcategoria('sub-epi-capacete', 'Capacete X', local);
  const dados = { epis: [{ id: 'e1', subcategoria_id: 'sub-epi-capacete', categoria: 'Capacete' }], veiculos: [{ id: 'v1', subcategoria_id: 'sub-veiculos-moto', tipo: 'Moto' }] };
  assert.equal(ref.vincularSubcategorias(dados, lerParametros(local)), 1);
  assert.equal(dados.epis[0].categoria, 'Capacete X');
  assert.equal(dados.veiculos[0].tipo, 'Moto');
  // Excluída depois: aparece com o último nome que o usuário viu.
  removerSubcategoria('sub-epi-capacete', local);
  assert.deepEqual(ref.resolverSubcategoria(lerParametros(local), 'cat-epi', dados.epis[0]),
    { id: null, nome: 'Capacete X', foraDeGerais: true });
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

test('migração: nomes gravados em EPI, Uniforme e Veículo ganham a referência certa', () => {
  const p = lerParametros(storage());
  const dados = {
    epis: [{ id: 'e1', categoria: 'capacete' }, { id: 'e2', categoria: 'Inexistente' }, { id: 'e3', categoria: 'Luva', subcategoria_id: 'sub-epi-luva' }],
    uniformes: [{ id: 'u1', categoria: 'Camisa' }],
    ferramentas: [{ id: 'f1', categoria: 'Elétrica' }],
    veiculos: [{ id: 'v1', tipo: 'Carro' }, { id: 'v2', tipo: null }],
    movimentacoes: [{ id: 'm1', categoria: 'Capacete' }],
  };
  // Ferramenta não tem subcategoria desde a decisão 25: a migração não mexe nela.
  assert.equal(ref.vincularSubcategorias(dados, p), 3);
  assert.equal(dados.epis[0].subcategoria_id, 'sub-epi-capacete');
  assert.equal(dados.epis[0].categoria, 'Capacete', 'o nome gravado passa a ser o de Gerais');
  assert.equal(dados.epis[1].categoria, 'Inexistente', 'o que não casa fica como está');
  assert.equal(dados.epis[1].subcategoria_id, undefined);
  assert.equal(dados.epis[2].subcategoria_id, 'sub-epi-luva');
  assert.equal(dados.uniformes[0].subcategoria_id, 'sub-uniformes-camisa');
  assert.equal(dados.ferramentas[0].subcategoria_id, undefined);
  assert.equal(dados.veiculos[0].subcategoria_id, 'sub-veiculos-carro');
  assert.equal(dados.veiculos[1].subcategoria_id, undefined);
  assert.equal(dados.movimentacoes[0].subcategoria_id, undefined);
  // Rodar de novo não muda nada.
  assert.equal(ref.vincularSubcategorias(dados, p), 0);
});

test('ferramenta não usa subcategoria (decisão 25)', () => {
  assert.equal('ferramentas' in ref.SUBCATEGORIA_DAS_TABELAS, false);
  const itens = ler('components/modules/ItensModulo.tsx');
  assert.doesNotMatch(itens, /Subcategoria/);
  assert.doesNotMatch(itens, /subcategoriaDaSelecao|subcategoria_id|nomeSubcategoria/);
});

test('os cadastros escolhem a subcategoria pela referência e mostram o nome de Gerais', () => {
  for (const arquivo of ['components/modules/CadastroProduto.tsx', 'components/modules/VeiculosCadastroModulo.tsx']) {
    const fonte = ler(arquivo);
    assert.match(fonte, /<SelectItem key=\{s\.id\} value=\{s\.id\}>/, arquivo);
    assert.match(fonte, /subcategoriaDaSelecao\(/, arquivo);
    assert.match(fonte, /valores\["subcategoria_id"\]/, arquivo);
    assert.match(fonte, /nomeSubcategoria\(/, arquivo);
    assert.match(fonte, /SUBCATEGORIA_LEGADA/, arquivo);
  }
  assert.match(ler('routes/_authenticated/cadastros/epi-ficha.tsx'), /nomeSubcategoria\(/);
});
