import test from 'node:test';
import assert from 'node:assert/strict';
import { adicionarSubcategoria, lerParametros, salvarRegraCodigo } from '../src/lib/parametros-base.ts';
import { prepararCadastroFerramenta } from '../src/lib/cadastro-ferramentas.ts';

const storage = () => {
  const dados = new Map();
  return { getItem: (chave) => dados.get(chave) ?? null, setItem: (chave, valor) => dados.set(chave, valor) };
};
const campos = { categoriaFerramenta: 'Elétrica', grupoFerramenta: 'Chave de fenda', numeroSerie: 'SN-123', precoCusto: '240.50' };

test('ferramenta usa subcategoria de Gerais e próximo código global ao salvar', () => {
  const local = storage();
  adicionarSubcategoria('cat-ferramentas', 'Aperto', local);
  const resultado = prepararCadastroFerramenta({
    parametros: lerParametros(local),
    codigosExistentes: ['FER-0001', 'FER-0002', 'EPI-9999'],
    subcategoria: 'Aperto', descricao: '  Chave de boca  ', estoqueMinimo: '3', ...campos,
  });
  assert.deepEqual(resultado, {
    codigo_sku: 'FER-0003', categoria: 'Aperto', nome: 'Chave de boca', estoque_minimo: 3,
    categoria_ferramenta: 'Elétrica', grupo_ferramenta: 'Chave de fenda', numero_serie: 'SN-123', preco_unitario: 240.5,
  });
});

test('ferramenta respeita regra alterada e preserva código ao editar', () => {
  const local = storage();
  salvarRegraCodigo('cat-ferramentas', 'FERR', '0042', local);
  const parametros = lerParametros(local);
  const entrada = { parametros, codigosExistentes: ['FER-0009'], subcategoria: 'Manual', descricao: 'Alicate', estoqueMinimo: '0', ...campos };
  assert.equal(prepararCadastroFerramenta(entrada).codigo_sku, 'FERR-0042');
  assert.equal(prepararCadastroFerramenta({ ...entrada, codigoAtual: 'FER-0009' }).codigo_sku, 'FER-0009');
});

test('ferramenta recusa subcategoria fora de Gerais e estoque mínimo inválido', () => {
  const entrada = { parametros: lerParametros(storage()), codigosExistentes: [], subcategoria: 'Outra', descricao: 'Furadeira', estoqueMinimo: '1', ...campos };
  assert.throws(() => prepararCadastroFerramenta(entrada), /Subcategoria/);
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, subcategoria: 'Elétrica', estoqueMinimo: '-1' }), /Estoque mínimo/);
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, subcategoria: 'Elétrica', estoqueMinimo: '1.5' }), /Estoque mínimo/);
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, subcategoria: 'Elétrica', descricao: ' ' }), /descrição/);
});

test('ferramenta exige categoria e grupo de Gerais, série real e custo válido em centavos', () => {
  const entrada = { parametros: lerParametros(storage()), codigosExistentes: [], subcategoria: 'Manual', descricao: 'Alicate', estoqueMinimo: '1', ...campos };
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, categoriaFerramenta: 'Pneumática' }), /Categoria de ferramenta/);
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, grupoFerramenta: 'Grupo avulso' }), /Grupo de ferramenta/);
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, numeroSerie: ' ' }), /Número de série/);
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, precoCusto: '' }), /Preço de custo/);
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, precoCusto: '-1' }), /Preço de custo/);
  assert.throws(() => prepararCadastroFerramenta({ ...entrada, precoCusto: '1.234' }), /Preço de custo/);
});
