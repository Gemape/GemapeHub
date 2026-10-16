import test from 'node:test';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as pb from '../src/lib/parametros-base.ts';
import * as ref from '../src/lib/subcategoria-referencia.ts';
import * as uso from '../src/lib/uso-parametros.ts';

const storage = () => {
  const dados = new Map();
  return { getItem: (chave) => dados.get(chave) ?? null, setItem: (chave, valor) => dados.set(chave, valor) };
};
const raiz = fileURLToPath(new URL('../src/', import.meta.url));
const ler = (relativo) => readFileSync(join(raiz, relativo), 'utf8');

test('categoria-base de um módulo não pode ser excluída', () => {
  const s = storage();
  for (const [id, modulo] of [['cat-epi', 'EPI'], ['cat-uniformes', 'Uniforme'], ['cat-ferramentas', 'Ferramenta'], ['cat-veiculos', 'Veículo']]) {
    for (const sub of pb.subcategoriasDa(pb.lerParametros(s), id)) pb.removerSubcategoria(sub.id, s);
    assert.throws(() => pb.removerCategoria(id, s), new RegExp(`base do cadastro de ${modulo}`));
  }
  assert.equal(pb.lerParametros(s).categorias.length, 4);
});

test('regra de código de categoria-base não pode ser excluída; a de outra categoria pode', () => {
  const s = storage();
  assert.throws(() => pb.removerRegraCodigo('cat-epi', s), /novos cadastros de EPI ficariam bloqueados/);
  assert.equal(pb.lerParametros(s).regrasCodigo.length, 4);
});

test('desativar: o parâmetro sai das listas de seleção, mas continua em Gerais', () => {
  const s = storage();
  assert.deepEqual(pb.lerParametros(s).inativos, []);
  pb.alterarAtivo('sub-epi-luva', false, s);
  let d = pb.lerParametros(s);
  assert.deepEqual(d.inativos, ['sub-epi-luva']);
  assert.equal(pb.estaAtivo(d, 'sub-epi-luva'), false);
  assert.ok(pb.subcategoriasDa(d, 'cat-epi').some((x) => x.id === 'sub-epi-luva'), 'Gerais mantém');
  assert.ok(!pb.subcategoriasAtivasDa(d, 'cat-epi').some((x) => x.id === 'sub-epi-luva'));
  pb.alterarAtivo('sub-epi-luva', false, s);
  assert.deepEqual(pb.lerParametros(s).inativos, ['sub-epi-luva'], 'sem repetir');
  pb.alterarAtivo('sub-epi-luva', true, s);
  d = pb.lerParametros(s);
  assert.equal(pb.estaAtivo(d, 'sub-epi-luva'), true);
  assert.throws(() => pb.alterarAtivo('nao-existe', false, s), /não encontrado/);
  // Categoria-base não se desativa.
  assert.throws(() => pb.alterarAtivo('cat-epi', false, s), /base/);
});

test('desativar marca e opção de ferramenta; excluir limpa o desativado', () => {
  const s = storage();
  const m = pb.adicionarListaFerramenta('marcasUniforme', 'Hering', s);
  const g = pb.adicionarListaFerramenta('gruposFerramenta', 'Catraca', s);
  pb.alterarAtivo(m.id, false, s);
  pb.alterarAtivo(g.id, false, s);
  const d = pb.lerParametros(s);
  assert.deepEqual(pb.paraSelecao(d, d.marcasUniforme).map((x) => x.nome), []);
  assert.deepEqual(pb.paraSelecao(d, d.marcasUniforme, (x) => x.nome === 'Hering').map((x) => x.nome), ['Hering']);
  pb.removerListaFerramenta('marcasUniforme', m.id, s);
  assert.deepEqual(pb.lerParametros(s).inativos, [g.id]);
  pb.alterarAtivo('sub-epi-luva', false, s);
  pb.removerSubcategoria('sub-epi-luva', s);
  assert.deepEqual(pb.lerParametros(s).inativos, [g.id]);
});

test('subcategoria desativada: cadastro antigo continua ligado, e só ele pode mantê-la', () => {
  const s = storage();
  pb.alterarAtivo('sub-epi-luva', false, s);
  const d = pb.lerParametros(s);
  const atual = ref.resolverSubcategoria(d, 'cat-epi', { subcategoria_id: 'sub-epi-luva', categoria: 'Luva' });
  assert.deepEqual(atual, { id: 'sub-epi-luva', nome: 'Luva', foraDeGerais: false, desativada: true });
  const opcoes = ref.subcategoriasParaSelecao(d, 'cat-epi', atual);
  assert.ok(opcoes.some((o) => o.id === 'sub-epi-luva' && o.desativada));
  assert.ok(!ref.subcategoriasParaSelecao(d, 'cat-epi', null).some((o) => o.id === 'sub-epi-luva'));
  assert.deepEqual(ref.subcategoriaDaSelecao('sub-epi-luva', d, 'cat-epi', atual), { id: 'sub-epi-luva', nome: 'Luva' });
  assert.throws(() => ref.subcategoriaDaSelecao('sub-epi-luva', d, 'cat-epi', null), /Subcategoria inválida/);
});

test('uso da subcategoria lista onde ela é usada, pela referência ou pelo nome', () => {
  const d = pb.lerParametros(storage());
  const sub = d.subcategorias.find((x) => x.id === 'sub-epi-capacete');
  const cadastros = {
    epis: [
      { codigo_sku: 'EPI-0001', subcategoria_id: 'sub-epi-capacete', categoria: 'Capacete' },
      { codigo_sku: 'EPI-0002', categoria: 'capacete' },
      { codigo_sku: 'EPI-0003', categoria: 'Luva' },
    ],
    uniformes: [{ codigo_sku: 'UNI-0001', categoria: 'Capacete' }],
    ferramentas: [], veiculos: [],
  };
  assert.deepEqual(uso.usoDaSubcategoria(sub, d, cadastros), [{ modulo: 'EPI', codigos: ['EPI-0001', 'EPI-0002'] }]);
  const moto = d.subcategorias.find((x) => x.id === 'sub-veiculos-moto');
  assert.deepEqual(uso.usoDaSubcategoria(moto, d, { veiculos: [{ placa: 'ABC-1234', tipo: 'Moto' }] }), [{ modulo: 'Veículo', codigos: ['ABC-1234'] }]);
});

test('o aviso diz onde o parâmetro é usado, sem lista enorme', () => {
  assert.equal(uso.descreverUso([{ modulo: 'EPI', codigos: ['EPI-0001', 'EPI-0002'] }]), 'EPI: EPI-0001, EPI-0002');
  const muitos = Array.from({ length: 8 }, (_, i) => `FER-000${i + 1}`);
  assert.equal(uso.descreverUso([{ modulo: 'Ferramenta', codigos: muitos }, { modulo: 'Veículo', codigos: ['ABC-1234'] }]),
    'Ferramenta: FER-0001, FER-0002, FER-0003, FER-0004, FER-0005 e mais 3; Veículo: ABC-1234');
  assert.equal(uso.descreverUso([]), '');
});

test('uso por campo de nome (marca, categoria e grupo de ferramenta) devolve os códigos', () => {
  const registros = [{ codigo_sku: 'FER-0001', marca: 'Bosch' }, { codigo_sku: 'FER-0002', marca: 'bosch' }, { codigo_sku: 'FER-0003', marca: 'Makita' }];
  assert.deepEqual(uso.usoPorNome(registros, 'marca', 'BOSCH', 'Ferramenta'), [{ modulo: 'Ferramenta', codigos: ['FER-0001', 'FER-0002'] }]);
  assert.deepEqual(uso.usoPorNome(registros, 'marca', 'Tramontina', 'Ferramenta'), []);
  assert.deepEqual(uso.usoPorNome([{ placa: 'ABC-1234', marca: 'Fiat' }], 'marca', 'Fiat', 'Veículo'), [{ modulo: 'Veículo', codigos: ['ABC-1234'] }]);
});

test('fornecedor não tem mais categoria e não bloqueia a exclusão de categoria (decisão 55)', () => {
  assert.equal('usoDaCategoria' in uso, false);
});

test('as telas de Gerais conferem o uso antes de excluir e oferecem desativar', () => {
  const categorias = ler('routes/_authenticated/cadastros/gerais/categorias.tsx');
  assert.match(categorias, /usoDaSubcategoria\(/);
  assert.doesNotMatch(categorias, /usoDaCategoria\(/);
  assert.match(categorias, /descreverUso\(/);
  assert.match(categorias, /onAlternarAtivo=/);
  const lista = ler('components/parametros/ListaEditavel.tsx');
  assert.match(lista, /`Desativar \$\{item\.nome\}`/);
  assert.match(lista, /`Reativar \$\{item\.nome\}`/);
  assert.match(ler('routes/_authenticated/cadastros/gerais/codigo-produto.tsx'), /CATEGORIAS_BASE/);
  for (const arquivo of ['components/modules/CadastroProduto.tsx', 'components/modules/VeiculosCadastroModulo.tsx']) {
    assert.match(ler(arquivo), /subcategoriasParaSelecao\(/, arquivo);
  }
  for (const arquivo of ['components/modules/CadastroProduto.tsx', 'components/modules/VeiculosCadastroModulo.tsx', 'components/modules/ItensModulo.tsx']) {
    assert.match(ler(arquivo), /paraSelecao\(/, arquivo);
  }
});

test('revisão: conferências usam o cliente ativo e mantêm o valor atual na edição', () => {
  const categorias = ler('routes/_authenticated/cadastros/gerais/categorias.tsx');
  // A marca de ferramenta existe no banco real: confere com o cliente ativo.
  assert.match(categorias, /supabase\.from\("ferramentas"\)\.select\("codigo_sku,nome,marca"\)/);
  // Parâmetro já desativado não sugere desativar de novo.
  assert.match(categorias, /estaAtivo\(dados, item\.id\)/);
  // Dois cliques rápidos em excluir não abrem duas confirmações.
  assert.match(categorias, /ocupado\.current/);
  for (const arquivo of ['components/modules/CadastroProduto.tsx', 'components/modules/VeiculosCadastroModulo.tsx']) {
    assert.match(ler(arquivo), /selecaoMarca\(m\.id\) === marcaInicial\.valor/, arquivo);
  }
  const itens = ler('components/modules/ItensModulo.tsx');
  assert.match(itens, /c\.nome === categoriaFerramentaInicial/);
  assert.match(itens, /defaultValue=\{categoriaFerramentaInicial\}/);
});
