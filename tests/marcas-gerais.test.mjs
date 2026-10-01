import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  adicionarListaFerramenta,
  lerParametros,
  removerListaFerramenta,
  renomearListaFerramenta,
} from '../src/lib/parametros-base.ts';
import * as marcas from '../src/lib/marcas-gerais.ts';

const storage = () => {
  const dados = new Map();
  return { getItem: (chave) => dados.get(chave) ?? null, setItem: (chave, valor) => dados.set(chave, valor) };
};
const raiz = new URL('../src/', import.meta.url).pathname;
const ler = (relativo) => readFileSync(join(raiz, relativo), 'utf8');

test('Gerais tem marcas de uniformes e de veículos, começando vazias e sem duplicar', () => {
  const local = storage();
  for (const lista of ['marcasUniforme', 'marcasVeiculo']) {
    assert.deepEqual(lerParametros(local)[lista], [], lista);
    const marca = adicionarListaFerramenta(lista, ' Hering ', local);
    assert.equal(lerParametros(local)[lista][0].nome, 'Hering');
    assert.throws(() => adicionarListaFerramenta(lista, 'HERING', local), /Já existe/);
    renomearListaFerramenta(lista, marca.id, 'Malwee', local);
    assert.equal(lerParametros(local)[lista][0].nome, 'Malwee');
    removerListaFerramenta(lista, marca.id, local);
    assert.deepEqual(lerParametros(local)[lista], [], lista);
  }
  // Cada módulo tem a sua lista: a marca de uniforme não aparece nas outras.
  adicionarListaFerramenta('marcasUniforme', 'Hering', local);
  assert.deepEqual(lerParametros(local).marcasVeiculo, []);
  assert.deepEqual(lerParametros(local).marcasFerramenta, []);
});

test('parâmetros salvos antes das marcas novas continuam válidos', () => {
  const local = storage();
  local.setItem('gemape-demo-parametros-base', JSON.stringify({ marcasFerramenta: [{ id: 'm1', nome: 'Bosch' }] }));
  const dados = lerParametros(local);
  assert.deepEqual(dados.marcasUniforme, []);
  assert.deepEqual(dados.marcasVeiculo, []);
  assert.equal(dados.marcasFerramenta[0].nome, 'Bosch');
});

test('seleção inicial: marca de Gerais pelo id, marca antiga digitada como legada, vazio como sem marca', () => {
  const lista = [{ id: 'm1', nome: 'Hering' }];
  assert.deepEqual(marcas.selecaoInicialMarca(lista, 'Hering'), { valor: marcas.selecaoMarca('m1'), legada: null });
  // Grafia diferente da de Gerais fica como está, para não ser reescrita sem querer ao salvar.
  assert.deepEqual(marcas.selecaoInicialMarca(lista, 'hering'), { valor: marcas.MARCA_LEGADA, legada: 'hering' });
  assert.deepEqual(marcas.selecaoInicialMarca(lista, 'Marca Velha'), { valor: marcas.MARCA_LEGADA, legada: 'Marca Velha' });
  assert.deepEqual(marcas.selecaoInicialMarca(lista, null), { valor: marcas.SEM_MARCA, legada: null });
  assert.deepEqual(marcas.selecaoInicialMarca(lista, '   '), { valor: marcas.SEM_MARCA, legada: null });
});

test('marca escolhida vira o nome de Gerais; a antiga é preservada ao editar outros campos', () => {
  const lista = [{ id: 'm1', nome: 'Hering' }, { id: 'm2', nome: 'sem-marca' }];
  assert.equal(marcas.marcaDaSelecao(marcas.selecaoMarca('m1'), lista, null), 'Hering');
  // Uma marca chamada "sem-marca" não se confunde com a opção Sem marca.
  assert.equal(marcas.marcaDaSelecao(marcas.selecaoMarca('m2'), lista, null), 'sem-marca');
  assert.equal(marcas.marcaDaSelecao(marcas.SEM_MARCA, lista, 'Antiga'), '');
  assert.equal(marcas.marcaDaSelecao(marcas.MARCA_LEGADA, lista, 'Marca Velha'), 'Marca Velha');
  assert.throws(() => marcas.marcaDaSelecao(marcas.MARCA_LEGADA, lista, null), /Escolha uma marca de Cadastros > Gerais/);
  assert.throws(() => marcas.marcaDaSelecao('marca:apagada', lista, null), /Escolha uma marca de Cadastros > Gerais/);
  assert.throws(() => marcas.marcaDaSelecao('Hering digitada', lista, null), /Escolha uma marca de Cadastros > Gerais/);
});

test('marca obrigatória (veículo) recusa Sem marca', () => {
  const lista = [{ id: 'm1', nome: 'Fiat' }];
  assert.throws(() => marcas.marcaDaSelecao(marcas.SEM_MARCA, lista, null, { obrigatoria: true }), /Selecione a marca/);
  assert.throws(() => marcas.marcaDaSelecao('', lista, null, { obrigatoria: true }), /Selecione a marca/);
  assert.equal(marcas.marcaDaSelecao(marcas.selecaoMarca('m1'), lista, null, { obrigatoria: true }), 'Fiat');
  assert.equal(marcas.marcaDaSelecao(marcas.MARCA_LEGADA, lista, 'VW', { obrigatoria: true }), 'VW');
});

test('marca em uso por um cadastro é reconhecida sem diferença de acento ou maiúscula', () => {
  const registros = [{ marca: 'Citroën' }, { marca: null }, {}];
  assert.equal(marcas.marcaEmUso(registros, 'CITROEN'), true);
  assert.equal(marcas.marcaEmUso(registros, 'Fiat'), false);
});

test('Uniforme e Veículo escolhem a marca numa lista de Gerais, sem campo digitado', () => {
  for (const [arquivo, lista] of [
    ['components/modules/CadastroProduto.tsx', 'marcasUniforme'],
    ['components/modules/VeiculosCadastroModulo.tsx', 'marcasVeiculo'],
  ]) {
    const fonte = ler(arquivo);
    assert.doesNotMatch(fonte, /<Input[^>]*id="marca"/, arquivo);
    assert.match(fonte, /<Select[^>]*name="marca"/, arquivo);
    assert.match(fonte, new RegExp(`parametros\\.${lista}`), arquivo);
    assert.match(fonte, /fora de Cadastros &gt; Gerais/, arquivo);
  }
});

test('Gerais mostra e protege as marcas de uniformes e de veículos', () => {
  const fonte = ler('routes/_authenticated/cadastros/gerais/categorias.tsx');
  assert.match(fonte, /Marcas de uniformes/);
  assert.match(fonte, /Marcas de veículos/);
  assert.match(fonte, /from\("uniformes"\)\.select\("marca"\)/);
  // Veículo tem a coluna marca no banco real: a conferência usa o cliente ativo.
  assert.match(fonte, /supabase\.from\("veiculos"\)\.select\("marca"\)/);
  assert.doesNotMatch(fonte, /demoSupabase\.from\("veiculos"\)/);
});

test('a lista fixa CATEGORIAS_FERRAMENTA não existe mais', () => {
  const arquivos = (dir) => readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho];
  });
  const usos = arquivos(raiz).filter((c) => /\.(ts|tsx)$/.test(c) && /\bCATEGORIAS_FERRAMENTA\b/.test(readFileSync(c, 'utf8')));
  assert.deepEqual(usos, []);
});
