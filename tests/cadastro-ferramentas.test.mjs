import test from 'node:test';
import assert from 'node:assert/strict';
import { adicionarListaFerramenta, lerParametros, salvarRegraCodigo } from '../src/lib/parametros-base.ts';
import * as cadastroFerramentas from '../src/lib/cadastro-ferramentas.ts';
const { opcaoFerramentaEmUso, prepararCadastroFerramenta } = cadastroFerramentas;

const storage = () => {
  const dados = new Map();
  return { getItem: (chave) => dados.get(chave) ?? null, setItem: (chave, valor) => dados.set(chave, valor) };
};
const campos = { categoriaFerramenta: 'Elétrica', grupoFerramenta: 'Chave de fenda', numeroSerie: 'SN-123', precoCusto: '240.50' };

test('ferramenta nova não tem subcategoria (decisão 24) e usa o próximo código global', () => {
  const local = storage();
  const resultado = prepararCadastroFerramenta({
    parametros: lerParametros(local),
    codigosExistentes: ['FER-0001', 'FER-0002', 'EPI-9999'],
    descricao: '  Chave de boca  ', estoqueMinimo: '3', ...campos,
  });
  // A coluna categoria (obrigatória no banco) recebe a categoria de ferramenta.
  assert.deepEqual(resultado, {
    codigo_sku: 'FER-0003', categoria: 'Elétrica', nome: 'Chave de boca', estoque_minimo: 3,
    categoria_ferramenta: 'Elétrica', grupo_ferramenta: 'Chave de fenda', numero_serie: 'SN-123', preco_unitario: 240.5,
    marca: null,
  });
});

test('ferramenta respeita regra alterada e preserva código ao editar', () => {
  const local = storage();
  salvarRegraCodigo('cat-ferramentas', 'FERR', '0042', local);
  const parametros = lerParametros(local);
  const entrada = { parametros, codigosExistentes: ['FER-0009'], descricao: 'Alicate', estoqueMinimo: '0', ...campos };
  assert.equal(prepararCadastroFerramenta(entrada).codigo_sku, 'FERR-0042');
  assert.equal(prepararCadastroFerramenta({ ...entrada, codigoAtual: 'FER-0009' }).codigo_sku, 'FER-0009');
});

test('ferramenta recusa estoque mínimo e descrição inválidos', () => {
  const entrada = { parametros: lerParametros(storage()), codigosExistentes: [], descricao: 'Furadeira', estoqueMinimo: '1', ...campos };
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, estoqueMinimo: '-1' }), /Estoque mínimo/);
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, estoqueMinimo: '1.5' }), /Estoque mínimo/);
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, descricao: ' ' }), /descrição/);
});

test('editar ferramenta antiga preserva a subcategoria gravada (decisão 24)', () => {
  const entrada = { parametros: lerParametros(storage()), codigosExistentes: [], descricao: 'Serra', estoqueMinimo: '1', codigoAtual: 'FER-0001', ...campos };
  const resultado = prepararCadastroFerramenta(entrada);
  assert.equal('categoria' in resultado, false, 'a edição não reescreve a coluna categoria');
  assert.equal('subcategoria_id' in resultado, false);
});

test('ferramenta exige categoria e grupo de Gerais, série real e custo válido em centavos', () => {
  const entrada = { parametros: lerParametros(storage()), codigosExistentes: [], descricao: 'Alicate', estoqueMinimo: '1', ...campos };
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, categoriaFerramenta: 'Pneumática' }), /Categoria de ferramenta/);
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, grupoFerramenta: 'Grupo avulso' }), /Grupo de ferramenta/);
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, numeroSerie: ' ' }), /Número de série/);
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, precoCusto: '' }), /Preço de custo/);
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, precoCusto: '-1' }), /Preço de custo/);
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, precoCusto: '1.234' }), /Preço de custo/);
});

test('marca nova precisa vir de Gerais; marca legada continua ao editar sem trocá-la', () => {
  const local = storage();
  adicionarListaFerramenta('marcasFerramenta', 'Bosch', local);
  const entrada = {
    parametros: lerParametros(local), codigosExistentes: [],
    descricao: 'Alicate', estoqueMinimo: '0', ...campos,
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
