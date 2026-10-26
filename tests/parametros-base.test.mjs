import test from 'node:test';
import assert from 'node:assert/strict';
import {
  lerParametros, adicionarCategoria, renomearCategoria, removerCategoria,
  adicionarSubcategoria, renomearSubcategoria, removerSubcategoria, subcategoriasDa,
  adicionarOpcao, renomearOpcao, removerOpcao, moverOpcao, usoDaOpcao,
  autorizar, desautorizar, autorizados,
  gerarCodigo, salvarRegraCodigo, removerRegraCodigo, adicionarRegraCodigo, adicionarCodigoComCategoria, regrasDaCategoria, regraDoCadastro,
  salvarCodigoFabrica, removerCodigoFabrica, combinaBusca,
  enderecamentoDaCategoria, salvarEnderecamentoCategoria,
} from '../src/lib/parametros-base.ts';

const storage = () => {
  const dados = new Map();
  return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => dados.set(c, v) };
};

test('endereçamento por categoria começa em Não usa e persiste sem afetar outras categorias', () => {
  const local = storage();
  assert.equal(enderecamentoDaCategoria(lerParametros(local), 'cat-epi'), 'nao_usa');
  salvarEnderecamentoCategoria('cat-epi', 'opcional', local);
  assert.equal(enderecamentoDaCategoria(lerParametros(local), 'cat-epi'), 'opcional');
  assert.equal(enderecamentoDaCategoria(lerParametros(local), 'cat-uniformes'), 'nao_usa');
  salvarEnderecamentoCategoria('cat-epi', 'obrigatorio', local);
  assert.equal(enderecamentoDaCategoria(lerParametros(local), 'cat-epi'), 'obrigatorio');
  assert.throws(() => salvarEnderecamentoCategoria('cat-epi', 'incorreto', local), /inválido/i);
  assert.equal(enderecamentoDaCategoria(lerParametros(local), 'cat-epi'), 'obrigatorio');
});

test('categoria nova usa padrão e removê-la elimina a configuração', () => {
  const local = storage();
  const categoria = adicionarCategoria('Novidade', local);
  assert.equal(enderecamentoDaCategoria(lerParametros(local), categoria.id), 'nao_usa');
  salvarEnderecamentoCategoria(categoria.id, 'opcional', local);
  removerCategoria(categoria.id, local);
  assert.equal(lerParametros(local).enderecamentoCategorias[categoria.id], undefined);
});

test('parte das categorias e listas que já existiam', () => {
  const d = lerParametros(storage());
  assert.deepEqual(d.categorias.map((c) => c.nome), ['EPI', 'Uniformes', 'Ferramentas', 'Veículos', 'Equipamentos', 'Check list']);
  assert.deepEqual(subcategoriasDa(d, 'cat-ferramentas').map((s) => s.nome),
    ['Manual', 'Elétrica', 'Pneumático', 'Hidráulica', 'Medição', 'Corte']);
  assert.ok(subcategoriasDa(d, 'cat-epi').some((s) => s.nome === 'Luva'));
  assert.ok(!d.subcategorias.some((s) => s.nome === 'Outros'));
  assert.deepEqual(d.unidades.map((u) => u.nome), ['Unidade', 'Par', 'Jogo', 'Caixa']);
});

test('Gerais oferece categorias e grupos do MD para ferramentas, separados das subcategorias', () => {
  const dados = lerParametros(storage());
  assert.deepEqual(dados.categoriasFerramenta.map((c) => c.nome),
    ['Manual', 'Elétrica', 'Pneumático', 'Hidráulica', 'Medição', 'Corte']);
  assert.deepEqual(dados.gruposFerramenta.map((g) => g.nome),
    ['Chave de fenda', 'Chave estria', 'Chave boca', 'Meia lua', 'Combinada', 'Canhão', 'Alicates', 'Lima', 'Chave Philips', 'Chave L', 'Chave Allen', 'Cachimbo', 'Diversos']);
  assert.equal(dados.categoriasFerramenta.some((c) => c.nome === 'Ferramentas'), false);
});

test('listas de categorias e grupos de ferramentas em Gerais aceitam novas opções sem duplicar', async () => {
  const { adicionarListaFerramenta, renomearListaFerramenta, removerListaFerramenta } = await import('../src/lib/parametros-base.ts');
  const local = storage();
  const grupo = adicionarListaFerramenta('gruposFerramenta', 'Chave catraca', local);
  assert.ok(lerParametros(local).gruposFerramenta.some((g) => g.id === grupo.id));
  assert.throws(() => adicionarListaFerramenta('gruposFerramenta', 'chave CATRACA', local), /Já existe/);
  renomearListaFerramenta('gruposFerramenta', grupo.id, 'Catraca', local);
  assert.equal(lerParametros(local).gruposFerramenta.find((g) => g.id === grupo.id).nome, 'Catraca');
  removerListaFerramenta('gruposFerramenta', grupo.id, local);
  assert.ok(!lerParametros(local).gruposFerramenta.some((g) => g.id === grupo.id));
  assert.equal(adicionarListaFerramenta('categoriasFerramenta', 'Solda', local).nome, 'Solda');
});

test('marcas de ferramentas começam vazias e podem ser cadastradas sem duplicação', async () => {
  const { adicionarListaFerramenta, renomearListaFerramenta, removerListaFerramenta } = await import('../src/lib/parametros-base.ts');
  const local = storage();
  assert.deepEqual(lerParametros(local).marcasFerramenta, []);
  const marca = adicionarListaFerramenta('marcasFerramenta', ' Bosch ', local);
  assert.equal(lerParametros(local).marcasFerramenta[0].nome, 'Bosch');
  assert.throws(() => adicionarListaFerramenta('marcasFerramenta', 'BOSCH', local), /Já existe/);
  renomearListaFerramenta('marcasFerramenta', marca.id, 'Makita', local);
  assert.equal(lerParametros(local).marcasFerramenta[0].nome, 'Makita');
  removerListaFerramenta('marcasFerramenta', marca.id, local);
  assert.deepEqual(lerParametros(local).marcasFerramenta, []);
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

test('categorias e subcategorias novas recebem capitalização cadastral', () => {
  const s = storage();
  const categoria = adicionarCategoria('MÁQUINAS DE CORTE', s);
  assert.equal(categoria.nome, 'Máquinas de corte');
  const sub = adicionarSubcategoria(categoria.id, 'SERRA CIRCULAR', s);
  assert.equal(sub.nome, 'Serra circular');
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
  // O tamanho novo entra na posição da sequência (49 fica entre 48 e 50); mover continua valendo.
  const t = adicionarOpcao('tamanhos', '49', s);
  const nomes = () => lerParametros(s).tamanhos.map((o) => o.nome);
  assert.deepEqual(nomes().slice(nomes().indexOf('49') - 1, nomes().indexOf('49') + 2), ['48', '49', '50']);
  moverOpcao('tamanhos', t.id, -1, s);
  assert.deepEqual(nomes().slice(nomes().indexOf('49'), nomes().indexOf('49') + 3), ['49', '48', '50']);
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

test('código do produto: sigla e numeração de 4 dígitos', () => {
  const s = storage();
  const d = lerParametros(s);
  assert.deepEqual(d.regrasCodigo.map((r) => gerarCodigo(r)), ['EPI-0001', 'UNI-0001', 'FER-0001', 'VEI-0001', 'EQP-0001', 'CHK-0001']);
  assert.equal(gerarCodigo({ sigla: 'EPI', inicial: '0001' }, 2), 'EPI-0003');
  assert.equal(gerarCodigo({ sigla: 'EPI', inicial: '9999' }, 1), 'EPI-10000');
  const r = salvarRegraCodigo('cat-veiculos', ' vei ', '1', s);
  assert.deepEqual(r, { categoriaId: 'cat-veiculos', sigla: 'VEI', inicial: '0001' });
  assert.equal(salvarRegraCodigo('cat-veiculos', 'VEI', '0100', s).inicial, '0100');
  assert.throws(() => salvarRegraCodigo('cat-veiculos', 'EPI', '1', s), /já é usada em EPI/);
  assert.throws(() => salvarRegraCodigo('cat-veiculos', 'V E', '1', s), /sigla/);
  assert.throws(() => salvarRegraCodigo('cat-veiculos', 'VEI', '0000', s), /maior que zero/);
  assert.throws(() => salvarRegraCodigo('cat-veiculos', 'VEI', '1a', s), /só números/);
  assert.throws(() => salvarRegraCodigo('cat-veiculos', 'VEI', '12345', s), /4 dígitos/);
  salvarRegraCodigo('cat-epi', 'EPI', '1000', s); // a própria categoria pode manter a sigla
  // A regra de uma categoria-base de módulo não sai (PR C); a de outra categoria, sim.
  assert.throws(() => removerRegraCodigo('cat-veiculos', s), /novos cadastros/);
  const maquinas = adicionarCategoria('Máquinas', s);
  salvarRegraCodigo(maquinas.id, 'MAQ', '1', s);
  removerRegraCodigo(maquinas.id, s);
  assert.equal(lerParametros(s).regrasCodigo.length, 6);
});

test('regras salvas com 3 dígitos passam para 4', () => {
  const s = storage();
  s.setItem('gemape-demo-parametros-base', JSON.stringify({ regrasCodigo: [{ categoriaId: 'cat-epi', sigla: 'EPI', inicial: '001' }] }));
  assert.equal(gerarCodigo(lerParametros(s).regrasCodigo[0]), 'EPI-0001');
});

test('código de fábrica: CA obrigatório para EPI e sem código repetido por fornecedor', () => {
  const s = storage();
  const base = {
    empresa_id: 'e1', tabela: 'epis', codigo_produto: 'EPI-0001', nome_produto: 'Capacete',
    fornecedor_id: 'f1', fornecedor_nome: 'Proteção Brasil', codigo_fornecedor: 'CAP-778', ca: '',
  };
  assert.throws(() => salvarCodigoFabrica(base, undefined, s), /CA/);
  const c = salvarCodigoFabrica({ ...base, ca: ' 12345 ' }, undefined, s);
  assert.equal(c.ca, '12345');
  assert.throws(() => salvarCodigoFabrica({ ...base, ca: '1', codigo_fornecedor: 'cap-778' }, undefined, s), /já está associado a EPI-0001/);
  // Outro fornecedor pode usar o mesmo código.
  salvarCodigoFabrica({ ...base, ca: '1', fornecedor_id: 'f2' }, undefined, s);
  // Outra empresa também pode (cada empresa tem seus produtos).
  const outra = salvarCodigoFabrica({ ...base, ca: '1', empresa_id: 'e2' }, undefined, s);
  removerCodigoFabrica(outra.id, s);
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
  assert.equal(lerParametros(s).categorias.length, 6);
  s.setItem('gemape-demo-parametros-base', JSON.stringify({ categorias: [{ id: 'x', nome: 'Só esta' }] }));
  const d = lerParametros(s);
  assert.deepEqual(d.categorias, [{ id: 'x', nome: 'Só esta' }, { id: 'cat-equipamentos', nome: 'Equipamentos' }, { id: 'cat-checklist', nome: 'Check list' }]);
  assert.equal(d.unidades.length, 4);
});

test('busca por palavras sem acento', () => {
  assert.ok(combinaBusca('oculos prot', 'Óculos de proteção', 'EPI-0002'));
  assert.ok(!combinaBusca('luva', 'Óculos'));
  assert.ok(combinaBusca('', 'qualquer'));
});

test('dados salvos ilegíveis não são apagados por uma alteração', () => {
  const s = storage();
  s.setItem('gemape-demo-parametros-base', '{quebrado');
  assert.throws(() => adicionarCategoria('Nova', s), /não puderam ser lidos/);
  assert.equal(s.getItem('gemape-demo-parametros-base'), '{quebrado');
  s.setItem('gemape-demo-parametros-base', JSON.stringify({ regrasCodigo: [{ categoriaId: 'cat-epi', sigla: 'EPI', inicial: 7 }] }));
  assert.equal(gerarCodigo(lerParametros(s).regrasCodigo[0]), 'EPI-0007');
});

test('código do uniforme: sequência UNI independente da de EPI', async () => {
  const { proximoCodigo } = await import('../src/lib/parametros-base.ts');
  const regra = lerParametros(storage()).regrasCodigo.find((r) => r.categoriaId === 'cat-uniformes');
  assert.equal(proximoCodigo(regra, ['UNI-0001', 'EPI-0009']), 'UNI-0002');
});

test('código do produto: várias siglas na mesma categoria, a primeira é a padrão', () => {
  const s = storage();
  const nova = adicionarRegraCodigo('cat-epi', ' luv ', '1', s);
  assert.deepEqual(nova, { categoriaId: 'cat-epi', sigla: 'LUV', inicial: '0001' });
  const regras = lerParametros(s).regrasCodigo;
  assert.deepEqual(regrasDaCategoria(regras, 'cat-epi').map((r) => r.sigla), ['EPI', 'LUV']);
  assert.equal(regras.length, 7);
  // Sem escolha (ou sigla que sumiu) vale a padrão; com escolha vale a escolhida.
  assert.equal(regraDoCadastro(regras, 'cat-epi')?.sigla, 'EPI');
  assert.equal(regraDoCadastro(regras, 'cat-epi', 'LUV')?.sigla, 'LUV');
  assert.equal(regraDoCadastro(regras, 'cat-epi', 'XXX')?.sigla, 'EPI');
  assert.equal(regraDoCadastro([], 'cat-epi'), null);
  // A sigla é única no sistema, na própria categoria ou em outra.
  assert.throws(() => adicionarRegraCodigo('cat-epi', 'LUV', '5', s), /já é usada em EPI/);
  assert.throws(() => adicionarRegraCodigo('cat-uniformes', 'LUV', '5', s), /já é usada em EPI/);
  assert.throws(() => adicionarRegraCodigo('cat-epi', 'V E', '1', s), /sigla/);
  assert.equal(lerParametros(s).regrasCodigo.length, 7);
});

test('código do produto: editar uma regra pela sigla anterior e excluir só a escolhida', () => {
  const s = storage();
  adicionarRegraCodigo('cat-epi', 'LUV', '1', s);
  // Editar a segunda não mexe na padrão.
  salvarRegraCodigo('cat-epi', 'LUVA', '0200', s, 'LUV');
  assert.deepEqual(regrasDaCategoria(lerParametros(s).regrasCodigo, 'cat-epi').map((r) => `${r.sigla}:${r.inicial}`), ['EPI:0001', 'LUVA:0200']);
  // Sem a sigla anterior vale a padrão (como antes).
  salvarRegraCodigo('cat-epi', 'EPI', '0050', s);
  assert.equal(regraDoCadastro(lerParametros(s).regrasCodigo, 'cat-epi')?.inicial, '0050');
  assert.throws(() => salvarRegraCodigo('cat-epi', 'ABC', '1', s, 'NAO'), /não existe mais/);
  // Excluir uma das duas é permitido; a última de uma categoria de módulo não sai.
  removerRegraCodigo('cat-epi', s, 'LUVA');
  assert.deepEqual(regrasDaCategoria(lerParametros(s).regrasCodigo, 'cat-epi').map((r) => r.sigla), ['EPI']);
  assert.throws(() => removerRegraCodigo('cat-epi', s, 'EPI'), /novos cadastros de EPI ficariam bloqueados/);
  // Excluir a padrão quando há outra: a outra vira a padrão.
  adicionarRegraCodigo('cat-epi', 'LUV', '1', s);
  removerRegraCodigo('cat-epi', s, 'EPI');
  assert.equal(regraDoCadastro(lerParametros(s).regrasCodigo, 'cat-epi')?.sigla, 'LUV');
  // Remover a categoria leva todas as regras dela.
  const maq = adicionarCategoria('Máquinas', s);
  adicionarRegraCodigo(maq.id, 'MAQ', '1', s);
  adicionarRegraCodigo(maq.id, 'MQ2', '1', s);
  removerCategoria(maq.id, s);
  assert.equal(regrasDaCategoria(lerParametros(s).regrasCodigo, maq.id).length, 0);
});

test('código do produto: Novo código cria a categoria digitada com sigla e numeração (dec 228)', () => {
  const s = storage();
  const r = adicionarCodigoComCategoria('  máquinas  ', 'maq', '5', s);
  assert.equal(r.categoriaNova, true);
  assert.equal(r.categoria.nome, 'Máquinas');
  assert.deepEqual(r.regra, { categoriaId: r.categoria.id, sigla: 'MAQ', inicial: '0005' });
  const d = lerParametros(s);
  assert.ok(d.categorias.some((c) => c.id === r.categoria.id));
  // Nome de categoria que já existe só ganha mais uma sigla, sem duplicar a categoria.
  const antes = d.categorias.length;
  const outra = adicionarCodigoComCategoria('EPI', 'LUV', '1', s);
  assert.equal(outra.categoriaNova, false);
  assert.equal(outra.categoria.id, 'cat-epi');
  assert.equal(lerParametros(s).categorias.length, antes);
  assert.deepEqual(regrasDaCategoria(lerParametros(s).regrasCodigo, 'cat-epi').map((x) => x.sigla), ['EPI', 'LUV']);
});

test('código do produto: Novo código com erro não deixa categoria solta (dec 228)', () => {
  const s = storage();
  const antes = lerParametros(s).categorias.length;
  assert.throws(() => adicionarCodigoComCategoria('Máquinas', 'EPI', '1', s), /já é usada em EPI/);
  assert.throws(() => adicionarCodigoComCategoria('Máquinas', 'MAQ', '0', s), /numeração/);
  assert.throws(() => adicionarCodigoComCategoria('   ', 'MAQ', '1', s), /categoria/);
  assert.equal(lerParametros(s).categorias.length, antes);
});

test('código do produto: Equipamentos (EQP) e Check list (CHK) têm linha própria, também para quem já tinha o cadastro salvo', () => {
  const s = storage();
  const novo = lerParametros(s);
  assert.deepEqual(novo.regrasCodigo.filter((r) => ['cat-equipamentos', 'cat-checklist'].includes(r.categoriaId)).map((r) => `${r.sigla}-${r.inicial}`), ['EQP-0001', 'CHK-0001']);
  assert.equal(gerarCodigo({ sigla: 'CHK', inicial: '0001' }, 4), 'CHK-0005');
  // Cadastro salvo antes (só com os quatro módulos): ganha as duas linhas sem mexer no que existe.
  const antigo = { ...novo, categorias: novo.categorias.slice(0, 4), regrasCodigo: novo.regrasCodigo.slice(0, 4).map((r) => (r.sigla === 'EPI' ? { ...r, inicial: '0100' } : r)) };
  s.setItem('gemape-demo-parametros-base', JSON.stringify(antigo));
  const depois = lerParametros(s);
  assert.deepEqual(depois.categorias.map((c) => c.nome), ['EPI', 'Uniformes', 'Ferramentas', 'Veículos', 'Equipamentos', 'Check list']);
  assert.deepEqual(depois.regrasCodigo.map((r) => r.sigla), ['EPI', 'UNI', 'FER', 'VEI', 'EQP', 'CHK']);
  assert.equal(depois.regrasCodigo[0].inicial, '0100', 'a numeração que a pessoa mudou fica');
  // Sigla já usada por outra categoria não é tomada.
  s.setItem('gemape-demo-parametros-base', JSON.stringify({ ...antigo, regrasCodigo: [...antigo.regrasCodigo, { categoriaId: 'cat-epi', sigla: 'CHK', inicial: '0001' }] }));
  assert.equal(lerParametros(s).regrasCodigo.filter((r) => r.sigla === 'CHK').length, 1);
  assert.throws(() => removerRegraCodigo('cat-checklist', storage()), /novos cadastros de Check list ficariam bloqueados/);
});

test('Equipamentos e Check list ficam só na tabela de códigos: as telas de categorias e de tamanhos não os listam', async () => {
  const { categoriasDeCadastro, CATEGORIAS_SO_DE_CODIGO } = await import('../src/lib/parametros-base.ts');
  const d = lerParametros(storage());
  assert.deepEqual(categoriasDeCadastro(d.categorias).map((c) => c.nome), ['EPI', 'Uniformes', 'Ferramentas', 'Veículos']);
  assert.deepEqual([...CATEGORIAS_SO_DE_CODIGO], ['cat-equipamentos', 'cat-checklist']);
  assert.equal(d.categorias.length, 6, 'a tabela de códigos continua com as seis');
});
