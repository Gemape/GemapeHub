import test from 'node:test';
import assert from 'node:assert/strict';
import {
  lerParametros, adicionarCategoria, renomearCategoria, removerCategoria,
  adicionarSubcategoria, renomearSubcategoria, removerSubcategoria, subcategoriasDa,
  adicionarOpcao, renomearOpcao, removerOpcao, moverOpcao, usoDaOpcao,
  autorizar, desautorizar, autorizados,
  gerarCodigo, salvarRegraCodigo, removerRegraCodigo,
  salvarCodigoFabrica, removerCodigoFabrica, combinaBusca,
} from '../src/lib/parametros-base.ts';

const storage = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};

test('parte das categorias e listas que já existiam', () => {
  const d = lerParametros(storage());
  assert.deepEqual(d.categorias.map((c) => c.nome), ['EPI', 'Uniformes', 'Ferramentas', 'Veículos']);
  assert.deepEqual(subcategoriasDa(d, 'cat-ferramentas').map((s) => s.nome),
    ['Manual', 'Elétrica', 'Pneumático', 'Hidráulica', 'Medição', 'Corte']);
  assert.ok(subcategoriasDa(d, 'cat-epi').some((s) => s.nome === 'Luva'));
  assert.ok(!d.subcategorias.some((s) => s.nome === 'Outros'));
  assert.deepEqual(d.unidades.map((u) => u.nome), ['Unidade', 'Par', 'Jogo', 'Caixa']);
});

test('categorias: sem nome repetido (ignora acento e maiúsculas) e só exclui vazia', () => {
  const s = storage();
  assert.throws(() => adicionarCategoria(' veiculos ', s), /Já existe a categoria "Veículos"/);
  assert.throws(() => adicionarCategoria('  ', s), /Informe o nome/);
  const nova = adicionarCategoria('Máquinas   pesadas', s);
  assert.equal(nova.nome, 'Máquinas pesadas');
  renomearCategoria(nova.id, 'Máquinas', s);
  adicionarSubcategoria(nova.id, 'Guindaste', s);
  assert.throws(() => removerCategoria(nova.id, s), /Exclua antes as 1 subcategoria/);
  const [sub] = subcategoriasDa(lerParametros(s), nova.id);
  removerSubcategoria(sub.id, s);
  removerCategoria(nova.id, s);
  assert.ok(!lerParametros(s).categorias.some((c) => c.id === nova.id));
});

test('subcategorias: nome único dentro da categoria', () => {
  const s = storage();
  assert.throws(() => adicionarSubcategoria('cat-epi', 'LUVA', s), /Já existe a subcategoria "Luva"/);
  adicionarSubcategoria('cat-uniformes', 'Luva', s); // outra categoria pode
  assert.throws(() => renomearSubcategoria('sub-epi-capacete', 'óculos', s), /Óculos/);
  assert.throws(() => adicionarSubcategoria('nao-existe', 'X', s), /Categoria não encontrada/);
});

test('tamanhos: ordem sequencial, renomear e excluir tira das associações', () => {
  const s = storage();
  const t = adicionarOpcao('tamanhos', '45', s);
  assert.equal(lerParametros(s).tamanhos.at(-1).nome, '45');
  moverOpcao('tamanhos', t.id, -1, s);
  assert.deepEqual(lerParametros(s).tamanhos.slice(-2).map((o) => o.nome), ['45', '44']);
  assert.throws(() => adicionarOpcao('tamanhos', 'm', s), /"M" já está cadastrado/);
  assert.throws(() => renomearOpcao('unidades', 'uni-par', 'caixa', s), /"Caixa"/);
  assert.equal(usoDaOpcao(lerParametros(s), 'unidades', 'uni-par'), 2);
  removerOpcao('unidades', 'uni-par', s);
  const d = lerParametros(s);
  assert.equal(usoDaOpcao(d, 'unidades', 'uni-par'), 0);
  assert.deepEqual(autorizados(d, 'sub-epi-botina', 'unidades'), []);
});

test('associação: autoriza e desautoriza mantendo a ordem da lista', () => {
  const s = storage();
  autorizar('sub-uniformes-camisa', 'tamanhos', ['tam-g', 'tam-p', 'tam-m', 'nao-existe'], s);
  assert.deepEqual(autorizados(lerParametros(s), 'sub-uniformes-camisa', 'tamanhos').map((o) => o.nome), ['P', 'M', 'G']);
  desautorizar('sub-uniformes-camisa', 'tamanhos', ['tam-m'], s);
  assert.deepEqual(autorizados(lerParametros(s), 'sub-uniformes-camisa', 'tamanhos').map((o) => o.nome), ['P', 'G']);
  removerSubcategoria('sub-uniformes-camisa', s);
  assert.ok(!lerParametros(s).associacoes.some((a) => a.subcategoriaId === 'sub-uniformes-camisa'));
});

test('código do produto: sigla e numeração inicial', () => {
  const s = storage();
  assert.equal(gerarCodigo({ sigla: 'EPI', inicial: '001' }), 'EPI-001');
  assert.equal(gerarCodigo({ sigla: 'EPI', inicial: '001' }, 2), 'EPI-003');
  assert.equal(gerarCodigo({ sigla: 'VEI', inicial: '9' }, 1), 'VEI-10');
  const r = salvarRegraCodigo('cat-veiculos', ' vei ', '0100', s);
  assert.deepEqual(r, { categoriaId: 'cat-veiculos', sigla: 'VEI', inicial: '0100' });
  assert.throws(() => salvarRegraCodigo('cat-veiculos', 'EPI', '1', s), /já é usada em EPI/);
  assert.throws(() => salvarRegraCodigo('cat-veiculos', 'V E', '1', s), /sigla/);
  assert.throws(() => salvarRegraCodigo('cat-veiculos', 'VEI', '000', s), /maior que zero/);
  assert.throws(() => salvarRegraCodigo('cat-veiculos', 'VEI', '1a', s), /só números/);
  salvarRegraCodigo('cat-epi', 'EPI', '1000', s); // a própria categoria pode manter a sigla
  removerRegraCodigo('cat-veiculos', s);
  assert.equal(lerParametros(s).regrasCodigo.length, 3);
});

test('código de fábrica: CA obrigatório para EPI e sem código repetido por fornecedor', () => {
  const s = storage();
  const base = {
    empresa_id: 'e1', tabela: 'epis', codigo_produto: 'EPI-001', nome_produto: 'Capacete',
    fornecedor_id: 'f1', fornecedor_nome: 'Proteção Brasil', codigo_fornecedor: 'CAP-778', ca: '',
  };
  assert.throws(() => salvarCodigoFabrica(base, undefined, s), /CA/);
  const c = salvarCodigoFabrica({ ...base, ca: ' 12345 ' }, undefined, s);
  assert.equal(c.ca, '12345');
  assert.throws(() => salvarCodigoFabrica({ ...base, ca: '1', codigo_fornecedor: 'cap-778' }, undefined, s), /já está associado a EPI-001/);
  // Outro fornecedor pode usar o mesmo código.
  salvarCodigoFabrica({ ...base, ca: '1', fornecedor_id: 'f2' }, undefined, s);
  // Fora de EPI o CA é descartado.
  const u = salvarCodigoFabrica({ ...base, tabela: 'uniformes', codigo_fornecedor: 'CAM-1', ca: '999' }, undefined, s);
  assert.equal(u.ca, '');
  salvarCodigoFabrica({ ...base, ca: '12345', codigo_fornecedor: 'CAP-779' }, c.id, s);
  assert.equal(lerParametros(s).codigosFabrica.find((x) => x.id === c.id).codigo_fornecedor, 'CAP-779');
  assert.throws(() => salvarCodigoFabrica({ ...base, fornecedor_id: '' }, undefined, s), /fornecedor/);
  removerCodigoFabrica(c.id, s);
  assert.equal(lerParametros(s).codigosFabrica.length, 2);
});

test('dados salvos com defeito voltam ao padrão', () => {
  const s = storage();
  s.setItem('gemape-demo-parametros-base', '{quebrado');
  assert.equal(lerParametros(s).categorias.length, 4);
  s.setItem('gemape-demo-parametros-base', JSON.stringify({ categorias: [{ id: 'x', nome: 'Só esta' }] }));
  const d = lerParametros(s);
  assert.deepEqual(d.categorias, [{ id: 'x', nome: 'Só esta' }]);
  assert.equal(d.unidades.length, 4);
});

test('busca por palavras sem acento', () => {
  assert.ok(combinaBusca('oculos prot', 'Óculos de proteção', 'EPI-002'));
  assert.ok(!combinaBusca('luva', 'Óculos'));
  assert.ok(combinaBusca('', 'qualquer'));
});
