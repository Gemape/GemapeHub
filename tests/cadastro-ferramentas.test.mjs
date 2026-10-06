import test from 'node:test';
import assert from 'node:assert/strict';
import { adicionarListaFerramenta, adicionarSubcategoria, lerParametros, salvarRegraCodigo } from '../src/lib/parametros-base.ts';
import * as cadastroFerramentas from '../src/lib/cadastro-ferramentas.ts';
const { opcaoFerramentaEmUso, prepararCadastroFerramenta, descricaoFerramenta } = cadastroFerramentas;

const storage = () => {
  const dados = new Map();
  return { getItem: (chave) => dados.get(chave) ?? null, setItem: (chave, valor) => dados.set(chave, valor) };
};
const campos = { categoriaFerramenta: 'Elétrica', grupoFerramenta: 'Chave de fenda', modelo: 'Boca 12', estoqueMinimo: '2' };

test('ferramenta nova não tem subcategoria (decisão 25) e usa o próximo código global', () => {
  const local = storage();
  const resultado = prepararCadastroFerramenta({
    parametros: lerParametros(local),
    codigosExistentes: ['FER-0001', 'FER-0002', 'EPI-9999'],
    ...campos,
  });
  // A coluna categoria (obrigatória no banco) recebe a categoria de ferramenta.
  assert.deepEqual(resultado, {
    codigo_sku: 'FER-0003', categoria: 'Elétrica', nome: 'Chave de fenda · Boca 12',
    modelo: 'Boca 12', estoque_minimo: 2,
    categoria_ferramenta: 'Elétrica', grupo_ferramenta: 'Chave de fenda',
    marca: null,
  });
});

test('ferramenta respeita regra alterada e preserva código ao editar', () => {
  const local = storage();
  salvarRegraCodigo('cat-ferramentas', 'FERR', '0042', local);
  const parametros = lerParametros(local);
  const entrada = { parametros, codigosExistentes: ['FER-0009'], ...campos };
  assert.equal(prepararCadastroFerramenta(entrada).codigo_sku, 'FERR-0042');
  assert.equal(prepararCadastroFerramenta({ ...entrada, codigoAtual: 'FER-0009' }).codigo_sku, 'FER-0009');
});

test('ferramenta exige o modelo e o estoque mínimo inteiro (decisão 54)', () => {
  const entrada = { parametros: lerParametros(storage()), codigosExistentes: [], ...campos };
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, modelo: ' ' }), /modelo/);
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, estoqueMinimo: '' }), /estoque mínimo/);
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, estoqueMinimo: '-1' }), /estoque mínimo/);
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, estoqueMinimo: '1.5' }), /estoque mínimo/);
  assert.equal(prepararCadastroFerramenta({ ...entrada, estoqueMinimo: '0' }).estoque_minimo, 0);
});

test('descrição da ferramenta é grupo, modelo e marca em sequência (decisão 54)', () => {
  assert.equal(descricaoFerramenta({ grupo: 'Furadeira', modelo: ' GSB  13 ', marca: 'Bosch' }), 'Furadeira · GSB 13 · Bosch');
  assert.equal(descricaoFerramenta({ grupo: 'Furadeira', modelo: 'GSB 13', marca: null }), 'Furadeira · GSB 13');
});

test('editar ferramenta antiga preserva a subcategoria gravada (decisão 25)', () => {
  const entrada = { parametros: lerParametros(storage()), codigosExistentes: [], estoqueMinimo: '1', codigoAtual: 'FER-0001', ...campos };
  const resultado = prepararCadastroFerramenta(entrada);
  assert.equal('categoria' in resultado, false, 'a edição não reescreve a coluna categoria');
  assert.equal('subcategoria_id' in resultado, false);
});

test('ferramenta exige categoria e grupo de Gerais', () => {
  const entrada = { parametros: lerParametros(storage()), codigosExistentes: [], ...campos };
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, categoriaFerramenta: 'Pneumática' }), /Categoria de ferramenta/);
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, grupoFerramenta: 'Grupo avulso' }), /Grupo de ferramenta/);
});

test('marca nova precisa vir de Gerais; marca legada continua ao editar sem trocá-la', () => {
  const local = storage();
  adicionarListaFerramenta('marcasFerramenta', 'Bosch', local);
  const entrada = {
    parametros: lerParametros(local), codigosExistentes: [],
    ...campos,
  };
  assert.equal(prepararCadastroFerramenta({ ...entrada, marca: 'Bosch' }).marca, 'Bosch');
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, marca: 'Marca avulsa' }), /Marca de ferramenta/);
  assert.equal(prepararCadastroFerramenta({ ...entrada, marca: 'Marca antiga', marcaAtual: 'Marca antiga', codigoAtual: 'FER-0009' }).marca, 'Marca antiga');
  assert.equal(prepararCadastroFerramenta({ ...entrada, marca: 'BOSCH', marcaAtual: 'BOSCH', codigoAtual: 'FER-0009' }).marca, 'BOSCH');
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, marca: 'Outra marca', marcaAtual: 'Marca antiga', codigoAtual: 'FER-0009' }), /Marca de ferramenta/);
  assert.equal(prepararCadastroFerramenta({ ...entrada, marca: '' }).marca, null);
});

test('marca em uso é detectada também para texto legado com diferença de caixa', () => {
  assert.equal(opcaoFerramentaEmUso([{ marca: 'Bosch' }], 'marcasFerramenta', 'bosch'), true);
  assert.equal(opcaoFerramentaEmUso([{ marca: 'Bosch' }], 'marcasFerramenta', 'Makita'), false);
});

test('seleção usa o id da marca e não confunde nome cadastrado com a opção sem marca', () => {
  assert.equal(typeof cadastroFerramentas.marcaDaSelecao, 'function');
  const local = storage();
  const marca = adicionarListaFerramenta('marcasFerramenta', '__sem_marca__', local);
  const marcas = lerParametros(local).marcasFerramenta;
  assert.equal(cadastroFerramentas.marcaDaSelecao(cadastroFerramentas.selecaoMarcaCadastrada(marca.id), marcas, null), '__sem_marca__');
  assert.equal(cadastroFerramentas.marcaDaSelecao(cadastroFerramentas.SELECAO_SEM_MARCA, marcas, null), '');
  assert.equal(cadastroFerramentas.marcaDaSelecao(cadastroFerramentas.SELECAO_MARCA_LEGADA, marcas, 'BOSCH'), 'BOSCH');
  assert.throws(() => cadastroFerramentas.marcaDaSelecao('marca:id-inexistente', marcas, null), /Marca de ferramenta/);
});

test('a categoria da ferramenta é uma subcategoria de Ferramentas em Gerais (decisão 68)', () => {
  const local = storage();
  salvarRegraCodigo('cat-ferramentas', 'FER', '0001', local);
  const entrada = { parametros: lerParametros(local), codigosExistentes: [], ...campos };
  assert.equal(prepararCadastroFerramenta(entrada).categoria_ferramenta, 'Elétrica');
  // Subcategoria nova de Ferramentas vira categoria da ferramenta.
  adicionarSubcategoria('cat-ferramentas', 'Solda', local);
  assert.equal(prepararCadastroFerramenta({ ...entrada, parametros: lerParametros(local), categoriaFerramenta: 'Solda' }).categoria_ferramenta, 'Solda');
  // Categoria que não é subcategoria de Ferramentas é recusada.
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, categoriaFerramenta: 'Inexistente' }), /Categoria de ferramenta inválida/);
});

test('ferramenta antiga com categoria fora de Gerais continua editável com a categoria atual', () => {
  const local = storage();
  salvarRegraCodigo('cat-ferramentas', 'FER', '0001', local);
  const entrada = { parametros: lerParametros(local), codigosExistentes: [], ...campos, categoriaFerramenta: 'Antiga' };
  assert.throws(() => prepararCadastroFerramenta(entrada), /Categoria de ferramenta inválida/);
  assert.equal(prepararCadastroFerramenta({ ...entrada, categoriaAtual: 'Antiga', codigoAtual: 'FER-0003' }).categoria_ferramenta, 'Antiga');
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, categoriaAtual: 'Outra', codigoAtual: 'FER-0003' }), /Categoria de ferramenta inválida/);
});
